import assert from "node:assert/strict";
import { once } from "node:events";
import { request, type Server } from "node:http";
import test from "node:test";
import { resolveServerConfig } from "../server/config";
import { redactSecrets } from "../server/gemini";
import { createAnalyzeServer } from "../server/http";
import { AnalysisFailedError, analyzeFoodImage } from "../src/features/scanner/ai.service";

const jpeg = Buffer.from("macro-lens-jpeg-placeholder-bytes").toString("base64");
const boom = Buffer.from("macro-lens-jpeg-placeholder-boom!!").toString("base64");

async function listen(server: Server): Promise<number> {
  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  const address = server.address();
  if (!address || typeof address === "string") throw new Error("missing port");
  return address.port;
}

function call(
  port: number,
  path: string,
  options: { method?: string; body?: string; headers?: Record<string, string> } = {},
): Promise<{ status: number; body: unknown; raw: string }> {
  return new Promise((resolve, reject) => {
    const req = request(
      {
        hostname: "127.0.0.1",
        port,
        path,
        method: options.method ?? "GET",
        headers: options.headers,
      },
      (res) => {
        const chunks: Buffer[] = [];
        res.on("data", (chunk: Buffer) => chunks.push(chunk));
        res.on("end", () => {
          const raw = Buffer.concat(chunks).toString("utf8");
          resolve({
            status: res.statusCode ?? 0,
            raw,
            body: raw ? (JSON.parse(raw) as unknown) : null,
          });
        });
      },
    );
    req.on("error", reject);
    if (options.body) req.write(options.body);
    req.end();
  });
}

test("server config never returns the api key and refuses a public bind", () => {
  const secret = `test-key-${"a".repeat(12)}`;
  const config = resolveServerConfig({ GEMINI_API_KEY: secret, HOST: "127.0.0.1" });
  assert.equal("apiKey" in config, false);
  assert.equal(JSON.stringify(config).includes(secret), false);
  assert.throws(() => resolveServerConfig({ HOST: "127.0.0.1" }), /server environment/);
  assert.throws(
    () => resolveServerConfig({ GEMINI_API_KEY: secret, HOST: "0.0.0.0" }),
    /non-loopback/,
  );
  assert.throws(
    () => resolveServerConfig({ GEMINI_API_KEY: secret, NODE_ENV: "production" }),
    /ANALYZE_API_TOKEN/,
  );
});

test("redacts secrets from provider errors", () => {
  const key = `AIza${"Sy"}${"A".repeat(30)}`;
  const redacted = redactSecrets(`request failed for ?key=${key}`);
  assert.equal(redacted.includes(key), false);
  assert.match(redacted, /\[redacted\]/);
});

test("analyze endpoint enforces auth, size, origin, and response shape", async () => {
  const seen: string[] = [];
  const server = createAnalyzeServer({
    token: "local-test-token",
    maxRequests: 3,
    maxBodyBytes: 200,
    analyze: async (image) => {
      seen.push(image);
      if (image === boom) throw new Error("marker-should-not-leak");
      return { name: "Toast", calories: 80, protein: 3, carbs: 14, fat: 1 };
    },
  });
  const port = await listen(server);
  try {
    const health = await call(port, "/health");
    assert.equal(health.status, 200);

    const blockedOrigin = await call(port, "/analyze", {
      method: "POST",
      headers: {
        origin: "https://evil.example",
        "content-type": "application/json",
        authorization: "Bearer local-test-token",
      },
      body: JSON.stringify({ imageBase64: jpeg }),
    });
    assert.equal(blockedOrigin.status, 403);

    const missingToken = await call(port, "/analyze", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ imageBase64: jpeg }),
    });
    assert.equal(missingToken.status, 401);

    const ok = await call(port, "/analyze", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: "Bearer local-test-token",
        origin: "http://127.0.0.1:8081",
      },
      body: JSON.stringify({ imageBase64: `data:image/jpeg;base64,${jpeg}` }),
    });
    assert.equal(ok.status, 200);
    assert.deepEqual(ok.body, {
      estimate: { name: "Toast", calories: 80, protein: 3, carbs: 14, fat: 1 },
    });
    assert.equal(seen[0], jpeg);

    const leaked = await call(port, "/analyze", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: "Bearer local-test-token",
      },
      body: JSON.stringify({ imageBase64: boom }),
    });
    assert.equal(leaked.status, 500);
    assert.equal(leaked.raw.includes("marker-should-not-leak"), false);

    const oversized = await call(port, "/analyze", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: "Bearer local-test-token",
      },
      body: "x".repeat(250),
    });
    assert.equal(oversized.status, 413);

    const limited = await call(port, "/analyze", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: "Bearer local-test-token",
      },
      body: JSON.stringify({ imageBase64: jpeg }),
    });
    assert.equal(limited.status, 429);
  } finally {
    server.close();
  }
});

test("the client treats an authenticated server as unavailable instead of calling Gemini", async () => {
  const server = createAnalyzeServer({
    token: "server-only-token",
    analyze: async () => ({ name: "Should not return", calories: 1, protein: 1, carbs: 1, fat: 1 }),
  });
  const port = await listen(server);
  const previous = process.env.EXPO_PUBLIC_API_BASE_URL;
  process.env.EXPO_PUBLIC_API_BASE_URL = `http://127.0.0.1:${port}`;
  try {
    await assert.rejects(() => analyzeFoodImage(jpeg), AnalysisFailedError);
  } finally {
    if (previous === undefined) delete process.env.EXPO_PUBLIC_API_BASE_URL;
    else process.env.EXPO_PUBLIC_API_BASE_URL = previous;
    server.close();
  }
});

test("the client calls the configured server and does not embed a provider key", async () => {
  const server = createAnalyzeServer({
    analyze: async () => ({ name: "Banana", calories: 105, protein: 1.3, carbs: 27, fat: 0.4 }),
  });
  const port = await listen(server);
  const previous = process.env.EXPO_PUBLIC_API_BASE_URL;
  process.env.EXPO_PUBLIC_API_BASE_URL = `http://127.0.0.1:${port}`;
  try {
    const estimate = await analyzeFoodImage(jpeg);
    assert.deepEqual(estimate, { name: "Banana", calories: 105, protein: 1.3, carbs: 27, fat: 0.4 });
    delete process.env.EXPO_PUBLIC_API_BASE_URL;
    await assert.rejects(() => analyzeFoodImage(jpeg), /not configured/);
  } finally {
    if (previous === undefined) delete process.env.EXPO_PUBLIC_API_BASE_URL;
    else process.env.EXPO_PUBLIC_API_BASE_URL = previous;
    server.close();
  }
});
