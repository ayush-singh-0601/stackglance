import { createConnection, createServer, type Server } from "node:net";

import { ipcRequestSchema, type IpcRequest, type IpcResponse } from "./protocol.js";

const MAX_MESSAGE_BYTES = 64 * 1024;

export interface IpcServer {
  server: Server;
  close: () => Promise<void>;
}

export async function startIpcServer(
  socketPath: string,
  handler: (request: IpcRequest) => Promise<IpcResponse> | IpcResponse,
): Promise<IpcServer> {
  const server = createServer((socket) => {
    socket.setEncoding("utf8");
    let buffer = "";
    socket.on("data", (chunk: string) => {
      buffer += chunk;
      if (Buffer.byteLength(buffer) > MAX_MESSAGE_BYTES) {
        socket.end(`${JSON.stringify({ ok: false, error: "message too large" })}\n`);
        return;
      }
      const newline = buffer.indexOf("\n");
      if (newline < 0) return;
      const line = buffer.slice(0, newline);
      buffer = "";
      void Promise.resolve()
        .then(() => ipcRequestSchema.parse(JSON.parse(line) as unknown))
        .then(handler)
        .then((response) => socket.end(`${JSON.stringify(response)}\n`))
        .catch((error: unknown) =>
          socket.end(`${JSON.stringify({ ok: false, error: String(error) })}\n`),
        );
    });
  });

  await new Promise<void>((resolve, reject) => {
    server.once("error", reject);
    server.listen(socketPath, () => {
      server.off("error", reject);
      resolve();
    });
  });

  return {
    server,
    close: () =>
      new Promise<void>((resolve, reject) => {
        server.close((error) => (error === undefined ? resolve() : reject(error)));
      }),
  };
}

export async function sendIpcRequest(
  socketPath: string,
  request: IpcRequest,
  timeoutMs = 1_000,
): Promise<IpcResponse> {
  return new Promise<IpcResponse>((resolve, reject) => {
    const socket = createConnection(socketPath);
    let buffer = "";
    const timeout = setTimeout(
      () => socket.destroy(new Error("DevRadar daemon timed out")),
      timeoutMs,
    );
    socket.setEncoding("utf8");
    socket.once("connect", () => socket.write(`${JSON.stringify(request)}\n`));
    socket.on("data", (chunk: string) => {
      buffer += chunk;
      const newline = buffer.indexOf("\n");
      if (newline >= 0) socket.end();
    });
    socket.once("end", () => {
      clearTimeout(timeout);
      try {
        resolve(JSON.parse(buffer.trim()) as IpcResponse);
      } catch (error) {
        reject(error instanceof Error ? error : new Error(String(error)));
      }
    });
    socket.once("error", (error) => {
      clearTimeout(timeout);
      reject(error);
    });
  });
}
