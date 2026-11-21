// Practice #11 – mounts POST /api/explain on the Vite dev and preview servers (Node side only).
import type { IncomingMessage, ServerResponse } from "node:http";
import type { Plugin } from "vite";
import { LIMITS } from "../src/explain/contract";
import { handleExplain, type HandlerDeps } from "./explainHandler";

function readBody(req: IncomingMessage, limit: number): Promise<string | null> {
  return new Promise((resolve, reject) => {
    let size = 0;
    const chunks: Buffer[] = [];
    let tooBig = false;
    req.on("data", (chunk: Buffer) => {
      size += chunk.length;
      if (size > limit) tooBig = true;
      else chunks.push(chunk);
    });
    req.on("end", () => resolve(tooBig ? null : Buffer.concat(chunks).toString("utf8")));
    req.on("error", reject);
  });
}

function send(res: ServerResponse, status: number, body: unknown) {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Cache-Control", "no-store");
  res.end(JSON.stringify(body));
}

export function explainApiPlugin(deps: HandlerDeps): Plugin {
  const middleware = async (req: IncomingMessage, res: ServerResponse, next: () => void) => {
    if (req.url?.split("?")[0] !== "/api/explain") return next();
    if (req.method !== "POST") return send(res, 405, { error: "Use POST." });
    if (!(req.headers["content-type"] ?? "").includes("application/json")) {
      return send(res, 415, { error: "Content-Type must be application/json." });
    }
    try {
      const body = await readBody(req, LIMITS.requestBytesMax);
      if (body === null) return send(res, 413, { error: "Request is too large." });
      const result = await handleExplain(body, deps);
      send(res, result.status, result.body);
    } catch {
      send(res, 500, { error: "SERVER_ERROR" });
    }
  };
  return {
    name: "smart-campus-explain-api",
    configureServer(server) {
      server.middlewares.use(middleware);
    },
    configurePreviewServer(server) {
      server.middlewares.use(middleware);
    },
  };
}
