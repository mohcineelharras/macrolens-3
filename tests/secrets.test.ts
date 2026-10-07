import assert from "node:assert/strict";
import test from "node:test";
import { scanText } from "../scripts/check-no-client-secrets.js";

test("flags a client file that constructs the Gemini SDK", () => {
  const violations = scanText(
    "src/features/scanner/ai.service.ts",
    'import { GoogleGenerativeAI } from "@google/generative-ai";\nconst client = new GoogleGenerativeAI("placeholder");\n',
  );
  assert.ok(violations.some((violation) => violation.includes("gemini-sdk")));
  assert.ok(violations.some((violation) => violation.includes("gemini-client")));
});

test("allows the server to read the key from the environment", () => {
  const violations = scanText(
    "server/gemini.ts",
    "const apiKey = process.env.GEMINI_API_KEY?.trim();\n",
  );
  assert.deepEqual(violations, []);
});

test("flags a nonempty key assignment and a public secret name", () => {
  assert.ok(
    scanText(".env", "GEMINI_API_KEY=local-value\n").some((violation) =>
      violation.includes("nonempty-GEMINI_API_KEY"),
    ),
  );
  const publicName = ["EXPO", "PUBLIC", "GEMINI", "API", "KEY"].join("_");
  assert.ok(
    scanText("src/config.ts", `const token = process.env.${publicName};\n`).some((violation) =>
      violation.includes("public-secret"),
    ),
  );
});
