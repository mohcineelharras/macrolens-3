export type ServerConfig = {
  host: string;
  port: number;
  token?: string;
};

export function isLoopbackHost(host: string): boolean {
  const normalized = host.trim().toLowerCase().replace(/^\[|\]$/g, "");
  return normalized === "localhost" || normalized === "127.0.0.1" || normalized === "::1";
}

type ServerEnv = {
  GEMINI_API_KEY?: string;
  ANALYZE_API_TOKEN?: string;
  HOST?: string;
  PORT?: string;
  NODE_ENV?: string;
};

export function resolveServerConfig(env: ServerEnv): ServerConfig {
  const apiKey = env.GEMINI_API_KEY?.trim() ?? "";
  if (!apiKey) {
    throw new Error(
      "GEMINI_API_KEY must be set in the server environment and must not be placed in the app.",
    );
  }

  const host = env.HOST?.trim() || "127.0.0.1";
  const token = env.ANALYZE_API_TOKEN?.trim() || undefined;
  const production = env.NODE_ENV === "production";
  if ((production || !isLoopbackHost(host)) && !token) {
    throw new Error(
      production
        ? "ANALYZE_API_TOKEN is required when NODE_ENV=production. Do not put that token in the app."
        : "Refusing to listen on a non-loopback host without ANALYZE_API_TOKEN.",
    );
  }

  const port = env.PORT === undefined || env.PORT === "" ? 8787 : Number(env.PORT);
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error("PORT must be an integer from 1 to 65535.");
  }

  return { host, port, token };
}
