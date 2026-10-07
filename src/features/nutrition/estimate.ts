export type FoodEstimate = {
  name: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
};

const NAME_MAX = 80;
const CALORIE_MAX = 5000;
const MACRO_MAX = 500;
export const MAX_IMAGE_BYTES = 750_000;

export function parseModelOutput(text: string): FoodEstimate | null {
  if (typeof text !== "string" || text.length > 2000) return null;
  const cleaned = text.replace(/```json/gi, "").replace(/```/g, "").trim();
  if (!cleaned || cleaned.toLowerCase() === "null") return null;
  try {
    return sanitizeEstimate(JSON.parse(cleaned) as unknown);
  } catch {
    return null;
  }
}

export function sanitizeEstimate(value: unknown): FoodEstimate | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const record = value as Record<string, unknown>;
  const name = sanitizeName(record.name);
  const calories = sanitizeNumber(record.calories, CALORIE_MAX, true);
  const protein = sanitizeNumber(record.protein, MACRO_MAX, false);
  const carbs = sanitizeNumber(record.carbs, MACRO_MAX, false);
  const fat = sanitizeNumber(record.fat, MACRO_MAX, false);
  if (!name || calories === null || protein === null || carbs === null || fat === null) {
    return null;
  }
  return { name, calories, protein, carbs, fat };
}

export function normalizeJpegBase64(input: unknown): string | null {
  if (typeof input !== "string") return null;
  const trimmed = input.trim();
  const dataUrl = /^data:(image\/jpeg|image\/jpg);base64,([A-Za-z0-9+/=\s]+)$/i.exec(trimmed);
  if (trimmed.startsWith("data:") && !dataUrl) return null;
  const payload = (dataUrl ? dataUrl[2] : trimmed).replace(/\s/g, "");
  const maxChars = Math.ceil((MAX_IMAGE_BYTES * 4) / 3) + 4;
  if (payload.length < 44 || payload.length > maxChars) return null;
  if (payload.length % 4 !== 0 || !/^[A-Za-z0-9+/]+={0,2}$/.test(payload)) return null;
  const padding = payload.endsWith("==") ? 2 : payload.endsWith("=") ? 1 : 0;
  const bytes = (payload.length * 3) / 4 - padding;
  if (bytes < 32 || bytes > MAX_IMAGE_BYTES) return null;
  return payload;
}

function sanitizeName(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const cleaned = value.replace(/[\u0000-\u001F\u007F]/g, " ").replace(/\s+/g, " ").trim();
  if (!cleaned || cleaned.length > NAME_MAX) return null;
  return cleaned;
}

function sanitizeNumber(value: unknown, max: number, integer: boolean): number | null {
  let numeric: number;
  if (typeof value === "number") {
    numeric = value;
  } else if (typeof value === "string" && /^(?:\d+|\d+\.\d+)$/.test(value)) {
    numeric = Number(value);
  } else {
    return null;
  }
  if (!Number.isFinite(numeric) || numeric < 0 || numeric > max) return null;
  return integer ? Math.round(numeric) : Math.round(numeric * 10) / 10;
}
