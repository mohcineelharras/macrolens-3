import { GoogleGenerativeAI } from "@google/generative-ai";

// Initialize Gemini (In real app, use Env Var)
// WARNING: Do not commit real keys. User must provide key.
const genAI = new GoogleGenerativeAI("YOUR_GEMINI_API_KEY");

export const analyzeFoodImage = async (base64Image: string): Promise<any> => {
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    const prompt = `
    Analyze this food image. Identify the dish and estimate the portion size.
    Return ONLY a valid JSON object with this structure:
    {
      "name": "Dish Name",
      "calories": 0,
      "protein": 0,
      "carbs": 0,
      "fat": 0,
      "confidence": 0.95
    }
    If no food is detected, return null.
    Do not use markdown blocks. Just raw JSON.
  `;

    try {
        const result = await model.generateContent([
            prompt,
            {
                inlineData: {
                    data: base64Image,
                    mimeType: "image/jpeg",
                },
            },
        ]);
        const response = await result.response;
        const text = response.text();

        // Cleanup markdown if present
        const cleanedText = text.replace(/```json/g, '').replace(/```/g, '').trim();
        return JSON.parse(cleanedText);
    } catch (error) {
        console.error("AI Error:", error);
        return null;
    }
};
