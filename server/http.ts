import { timingSafeEqual } from "node:crypto";
import { createServer, type IncomingMessage, type Server, type ServerResponse } from "node:http";
import { normalizeJpegBase64, type FoodEstimate } from "../src/features/nutrition/estimate";

export type AnalyzeFn = (imageBase64: string) => Promise<FoodEstimate | null>;

type CreateServerOptions = {
  analyze: AnalyzeFn;
  token?: string;
  maxRequests?: number;
  windowMs?: number;
  maxBodyBytes?: number;
};

const DEFAULT_MAX_REQUESTS = 12;
const DEFAULT_WINDOW_MS = 60_000;
const DEFAULT_MAX_BODY_BYTES = 1_000_000;

export function createAnalyzeServer(options: CreateServerOptions): Server {
  const maxRequests = options.maxRequests ?? DEFAULT_MAX_REQUESTS;
  const windowMs = options.windowMs ?? DEFAULT_WINDOW_MS;
  const maxBodyBytes = options.maxBodyBytes ?? DEFAULT_MAX_BODY_BYTES;
  const hits = new Map<string, number[]>();

  return createServer(async (req, res) => {
    req.setTimeout(15_000);
    try {
      if (!applyCors(req, res)) {
        sendJson(res, 403, { error: "Origin is not allowed" });
        return;
      }
      if (req.method === "OPTIONS") {
        res.writeHead(204);
        res.end();
        return;
      }

      const path = (req.url ?? "/").split("?")[0];
      if (req.method === "GET" && path === "/health") {
        sendJson(res, 200, { ok: true });
        return;
      }
      if (req.method !== "POST" || path !== "/analyze") {
        sendJson(res, 404, { error: "Not found" });
        return;
      }
      if (options.token && !bearerMatches(req.headers.authorization, options.token)) {
        sendJson(res, 401, { error: "Unauthorized" });
        return;
      }
      if (!allowRequest(hits, clientAddress(req), maxRequests, windowMs)) {
        sendJson(res, 429, { error: "Too many requests" });
        return;
      }

      const contentType = req.headers["content-type"] ?? "";
      if (!contentType.toLowerCase().startsWith("application/json")) {
        sendJson(res, 415, { error: "Expected JSON" });
        return;
      }

      const raw = await readBody(req, maxBodyBytes);
      if (raw === "too_large") {
        sendJson(res, 413, { error: "Image is too large" });
        return;
      }

      let parsed: unknown;
      try {
        parsed = JSON.parse(raw);
      } catch {
        sendJson(res, 400, { error: "Invalid request" });
        return;
      }
      if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
        sendJson(res, 400, { error: "Invalid request" });
        return;
      }

      const image = normalizeJpegBase64((parsed as { imageBase64?: unknown }).imageBase64);
      if (!image) {
        sendJson(res, 400, { error: "Invalid image" });
        return;
      }

      req.setTimeout(0);
      const estimate = await withTimeout(options.analyze(image), 20_000);
      sendJson(res, 200, { estimate });
    } catch {
      if (!res.headersSent) sendJson(res, 500, { error: "Analysis failed" });
    }
  });
}

function applyCors(req: IncomingMessage, res: ServerResponse): boolean {
  const origin = req.headers.origin;
  if (!origin) return true;
  if (!isLoopbackOrigin(origin)) return false;
  res.setHeader("Access-Control-Allow-Origin", origin);
  res.setHeader("Vary", "Origin");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  res.setHeader("Access-Control-Max-Age", "600");
  return true;
}

function isLoopbackOrigin(origin: string): boolean {
  try {
    const url = new URL(origin);
    return (
      (url.protocol === "http:" || url.protocol === "https:") &&
      (url.hostname === "localhost" || url.hostname === "127.0.0.1" || url.hostname === "[::1]" || url.hostname === "::1")
    );
  } catch {
    return false;
  }
}

function bearerMatches(header: string | undefined, expected: string): boolean {
  if (!header?.startsWith("Bearer ")) return false;
  const provided = header.slice("Bearer ".length);
  const left = Buffer.from(provided);
  const right = Buffer.from(expected);
  if (left.length !== right.length || left.length === 0) return false;
  return timingSafeEqual(left, right);
}

function allowRequest(hits: Map<string, number[]>, key: string, maxRequests: number, windowMs: number): boolean {
  const now = Date.now();
  const recent = (hits.get(key) ?? []).filter((stamp) => now - stamp < windowMs);
  if (recent.length >= maxRequests) {
    hits.set(key, recent);
    return false;
  }
  recent.push(now);
  if (!hits.has(key) && hits.size >= 1000) {
    const oldest = hits.keys().next().value;
    if (oldest) hits.delete(oldest);
  }
  hits.set(key, recent);
  return true;
}

function clientAddress(req: IncomingMessage): string {
  return req.socket.remoteAddress ?? "unknown";
}

function readBody(req: IncomingMessage, maxBodyBytes: number): Promise<string | "too_large"> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    let size = 0;
    let tooLarge = Number(req.headers["content-length"] ?? "0") > maxBodyBytes;
    let settled = false;
    const finish = (value: string | "too_large") => {
      if (settled) return;
      settled = true;
      resolve(value);
    };
    req.on("data", (chunk: Buffer) => {
      size += chunk.length;
      if (tooLarge || size > maxBodyBytes) {
        tooLarge = true;
        chunks.length = 0;
        if (size > maxBodyBytes + 65_536) {
          finish("too_large");
          req.destroy();
        }
        return;
      }
      chunks.push(chunk);
    });
    req.on("end", () => finish(tooLarge ? "too_large" : Buffer.concat(chunks).toString("utf8")));
    req.on("error", (error) => {
      if (settled) return;
      settled = true;
      reject(error);
    });
  });
}

function withTimeout<T>(work: Promise<T>, ms: number): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error("timeout")), ms);
    work.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (error: unknown) => {
        clearTimeout(timer);
        reject(error);
      },
    );
  });
}

function sendJson(res: ServerResponse, status: number, body: unknown): void {
  const payload = JSON.stringify(body);
  res.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Content-Length": Buffer.byteLength(payload),
    "Cache-Control": "no-store",
    "X-Content-Type-Options": "nosniff",
  });
  res.end(payload);
}
