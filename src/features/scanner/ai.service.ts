import { normalizeJpegBase64, sanitizeEstimate, type FoodEstimate } from "../nutrition/estimate";

const REQUEST_TIMEOUT_MS = 25_000;
const MAX_RESPONSE_CHARS = 4_000;

export class AnalysisUnavailableError extends Error {
  constructor() {
    super("Analysis service is not configured.");
    this.name = "AnalysisUnavailableError";
  }
}

export class AnalysisFailedError extends Error {
  constructor() {
    super("Analysis failed.");
    this.name = "AnalysisFailedError";
  }
}

export async function analyzeFoodImage(base64Image: string): Promise<FoodEstimate | null> {
  const image = normalizeJpegBase64(base64Image);
  if (!image) return null;

  const endpoint = analysisEndpoint(process.env.EXPO_PUBLIC_API_BASE_URL);
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ imageBase64: image }),
      signal: controller.signal,
    });
    if (response.status === 401 || response.status === 403) {
      throw new AnalysisFailedError();
    }
    if (!response.ok) throw new AnalysisFailedError();
    const declaredLength = Number(response.headers.get("content-length") ?? "0");
    if (Number.isFinite(declaredLength) && declaredLength > MAX_RESPONSE_CHARS) return null;
    const text = await response.text();
    if (text.length > MAX_RESPONSE_CHARS) return null;
    const body = JSON.parse(text) as unknown;
    if (!body || typeof body !== "object" || Array.isArray(body)) return null;
    const estimate = (body as { estimate?: unknown }).estimate;
    if (estimate === null) return null;
    return sanitizeEstimate(estimate);
  } finally {
    clearTimeout(timer);
  }
}

function analysisEndpoint(rawBase: string | undefined): URL {
  const base = rawBase?.trim() ?? "";
  if (!/^https?:\/\//i.test(base)) {
    throw new AnalysisUnavailableError();
  }
  let endpoint: URL;
  try {
    endpoint = new URL("analyze", base.endsWith("/") ? base : `${base}/`);
  } catch {
    throw new AnalysisUnavailableError();
  }
  if (endpoint.username || endpoint.password || (endpoint.protocol !== "http:" && endpoint.protocol !== "https:")) {
    throw new AnalysisUnavailableError();
  }
  return endpoint;
}
