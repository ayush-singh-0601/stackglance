import { describe, expect, it } from "vitest";

import { isPublicIp, validateRemoteUrl } from "../src/feeds/safe-fetch.js";

describe("safe feed fetching", () => {
  it("rejects private, loopback, metadata, and documentation ranges", () => {
    expect(["127.0.0.1", "10.0.0.1", "169.254.169.254", "192.168.1.1", "::1", "2001:db8::1"].every((ip) => !isPublicIp(ip))).toBe(
      true,
    );
    expect(isPublicIp("1.1.1.1")).toBe(true);
  });

  it("requires HTTPS, an allowlisted host, and exclusively public DNS", async () => {
    const publicDns = () => Promise.resolve([{ address: "1.1.1.1", family: 4 }]);
    await expect(validateRemoteUrl("http://feeds.example.com/rss", ["feeds.example.com"], publicDns)).rejects.toThrow(
      "HTTPS",
    );
    await expect(validateRemoteUrl("https://evil.example/rss", ["feeds.example.com"], publicDns)).rejects.toThrow(
      "allowlisted",
    );
    const privateDns = () => Promise.resolve([{ address: "127.0.0.1", family: 4 }]);
    await expect(validateRemoteUrl("https://feeds.example.com/rss", ["feeds.example.com"], privateDns)).rejects.toThrow(
      "public",
    );
    await expect(validateRemoteUrl("https://feeds.example.com/rss", ["feeds.example.com"], publicDns)).resolves.toMatchObject({
      url: { hostname: "feeds.example.com" },
    });
  });
});
