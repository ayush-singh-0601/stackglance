import { lookup as dnsLookup } from "node:dns/promises";
import { request } from "node:https";
import { isIP, type LookupFunction } from "node:net";

export interface SafeFetchOptions {
  allowedHosts: readonly string[];
  headers?: Readonly<Record<string, string>>;
  method?: "GET" | "POST";
  body?: string;
  timeoutMs?: number;
  maxBytes?: number;
  maxRedirects?: number;
  resolve?: AddressResolver;
}

export interface ResolvedAddress {
  address: string;
  family: number;
}

export type AddressResolver = (
  hostname: string,
  options: { all: true; verbatim: true },
) => Promise<readonly ResolvedAddress[]>;

const defaultResolver: AddressResolver = (hostname, options) => dnsLookup(hostname, options);

export interface SafeResponse {
  url: string;
  status: number;
  headers: Readonly<Record<string, string | string[] | undefined>>;
  body: string;
}

export function createPinnedLookup(chosen: ResolvedAddress): LookupFunction {
  return (_hostname, options, callback) => {
    if (options.all === true) callback(null, [chosen]);
    else callback(null, chosen.address, chosen.family);
  };
}

export function isPublicIp(address: string): boolean {
  const family = isIP(address);
  if (family === 4) {
    const octets = address.split(".").map(Number);
    const [a = 0, b = 0, c = 0] = octets;
    return !(
      a === 0 ||
      a === 10 ||
      a === 127 ||
      (a === 100 && b >= 64 && b <= 127) ||
      (a === 169 && b === 254) ||
      (a === 172 && b >= 16 && b <= 31) ||
      (a === 192 && b === 0 && c === 0) ||
      (a === 192 && b === 0 && c === 2) ||
      (a === 192 && b === 168) ||
      (a === 198 && b >= 18 && b <= 19) ||
      (a === 198 && b === 51 && c === 100) ||
      (a === 203 && b === 0 && c === 113) ||
      a >= 224
    );
  }
  if (family === 6) {
    const normalized = address.toLowerCase();
    if (normalized.startsWith("::ffff:")) return isPublicIp(normalized.slice(7));
    return !(
      normalized === "::" ||
      normalized === "::1" ||
      normalized.startsWith("fc") ||
      normalized.startsWith("fd") ||
      normalized.startsWith("fe8") ||
      normalized.startsWith("fe9") ||
      normalized.startsWith("fea") ||
      normalized.startsWith("feb") ||
      normalized.startsWith("2001:db8")
    );
  }
  return false;
}

export async function validateRemoteUrl(
  rawUrl: string,
  allowedHosts: readonly string[],
  resolve: AddressResolver = defaultResolver,
): Promise<{ url: URL; addresses: readonly ResolvedAddress[] }> {
  const url = new URL(rawUrl);
  if (url.protocol !== "https:") throw new Error("Only HTTPS feed URLs are allowed");
  if (url.username !== "" || url.password !== "")
    throw new Error("Feed URLs cannot contain credentials");
  if (url.port !== "" && url.port !== "443") throw new Error("Feed URLs must use port 443");
  if (!allowedHosts.includes(url.hostname.toLowerCase()))
    throw new Error(`Feed host is not allowlisted: ${url.hostname}`);
  const addresses = await resolve(url.hostname, { all: true, verbatim: true });
  if (addresses.length === 0 || addresses.some(({ address }) => !isPublicIp(address))) {
    throw new Error(`Feed host did not resolve exclusively to public addresses: ${url.hostname}`);
  }
  return { url, addresses };
}

export async function safeFetchText(
  rawUrl: string,
  options: SafeFetchOptions,
): Promise<SafeResponse> {
  const timeoutMs = options.timeoutMs ?? 8_000;
  const maxBytes = options.maxBytes ?? 2 * 1024 * 1024;
  const maxRedirects = options.maxRedirects ?? 3;
  const resolve = options.resolve ?? defaultResolver;
  const method = options.method ?? "GET";
  const body = options.body ?? "";
  if (Buffer.byteLength(body) > 256 * 1024)
    throw new Error("Feed request body exceeded size limit");
  return fetchValidated(
    rawUrl,
    options.allowedHosts,
    options.headers ?? {},
    method,
    body,
    resolve,
    timeoutMs,
    maxBytes,
    maxRedirects,
  );
}

async function fetchValidated(
  rawUrl: string,
  allowedHosts: readonly string[],
  headers: Readonly<Record<string, string>>,
  method: "GET" | "POST",
  body: string,
  resolve: AddressResolver,
  timeoutMs: number,
  maxBytes: number,
  redirectsLeft: number,
): Promise<SafeResponse> {
  const { url, addresses } = await validateRemoteUrl(rawUrl, allowedHosts, resolve);
  const chosen = addresses[0]!;
  const response = await new Promise<SafeResponse>((resolveResponse, reject) => {
    const call = request(
      url,
      {
        method,
        headers: {
          "accept-encoding": "identity",
          "user-agent": "StackGlance/0.1",
          ...(body === "" ? {} : { "content-length": Buffer.byteLength(body) }),
          ...headers,
        },
        lookup: createPinnedLookup(chosen),
      },
      (incoming) => {
        const chunks: Buffer[] = [];
        let size = 0;
        incoming.on("data", (chunk: Buffer) => {
          size += chunk.length;
          if (size > maxBytes) incoming.destroy(new Error("Feed response exceeded size limit"));
          else chunks.push(chunk);
        });
        incoming.once("end", () =>
          resolveResponse({
            url: url.toString(),
            status: incoming.statusCode ?? 0,
            headers: incoming.headers,
            body: Buffer.concat(chunks).toString("utf8"),
          }),
        );
      },
    );
    call.setTimeout(timeoutMs, () => call.destroy(new Error("Feed request timed out")));
    call.once("error", reject);
    call.end(body);
  });

  if (response.status >= 300 && response.status < 400) {
    const location = response.headers.location;
    if (typeof location !== "string") throw new Error("Feed redirect did not include a location");
    if (redirectsLeft <= 0) throw new Error("Feed exceeded redirect limit");
    if (method !== "GET") throw new Error("POST feed requests cannot be redirected");
    return fetchValidated(
      new URL(location, url).toString(),
      allowedHosts,
      headers,
      method,
      body,
      resolve,
      timeoutMs,
      maxBytes,
      redirectsLeft - 1,
    );
  }
  if (response.status < 200 || response.status >= 300)
    throw new Error(`Feed returned HTTP ${response.status}`);
  return response;
}
