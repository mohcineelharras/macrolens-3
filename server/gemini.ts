import { GoogleGenerativeAI } from "@google/generative-ai";
import { parseModelOutput, type FoodEstimate } from "../src/features/nutrition/estimate";

const PROMPT = `Analyze this food image. Identify the dish and estimate the portion size.
Return ONLY a valid JSON object with this structure:
{"name":"Dish Name","calories":0,"protein":0,"carbs":0,"fat":0}
Use numbers, not strings. If no food is detected, return null.
Do not use markdown.`;

export function redactSecrets(message: string): string {
  return message
    .replace(/AIza[0-9A-Za-z_-]{10,}/g, "[redacted]")
    .replace(/([?&]key=)[^&\s]+/gi, "$1[redacted]");
}

export async function analyzeWithGemini(imageBase64: string): Promise<FoodEstimate | null> {
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY is not set");
  }
  const modelName = process.env.GEMINI_MODEL?.trim() || "gemini-2.5-flash";
  const model = new GoogleGenerativeAI(apiKey).getGenerativeModel({
    model: modelName,
    generationConfig: {
      temperature: 0.2,
      maxOutputTokens: 256,
      responseMimeType: "application/json",
    },
  });

  try {
    const result = await model.generateContent([
      PROMPT,
      { inlineData: { data: imageBase64, mimeType: "image/jpeg" } },
    ]);
    return parseModelOutput(result.response.text());
  } catch (error) {
    const message = error instanceof Error ? error.message : "analysis failed";
    console.error(`Gemini analysis failed: ${redactSecrets(message)}`);
    throw new Error("Analysis failed");
  }
}
