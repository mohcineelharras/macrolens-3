#!/usr/bin/env node
/**
 * Fails if client source embeds a Gemini key, the Gemini SDK, or a proxy token.
 * Server code may read GEMINI_API_KEY from the environment.
 */
const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const clientRoots = ["src", "app", "components", "constants", "hooks"];
const textExtensions = new Set([
  ".js",
  ".jsx",
  ".ts",
  ".tsx",
  ".json",
  ".md",
  ".yml",
  ".yaml",
  ".css",
  ".example",
  ".gitignore",
]);

const keyPatterns = [
  { name: "google-api-key", regex: /AIza[0-9A-Za-z_-]{20,}/ },
  { name: "assigned-gemini-key", regex: /GEMINI_API_KEY\s*[:=]\s*['"][^'"]+['"]/ },
  { name: "assigned-proxy-token", regex: /ANALYZE_API_TOKEN\s*[:=]\s*['"][^'"]+['"]/ },
  { name: "public-secret", regex: /EXPO_PUBLIC_[A-Z0-9_]*(KEY|TOKEN|SECRET)/ },
];

const clientOnlyPatterns = [
  { name: "gemini-sdk", regex: /@google\/generative-ai/ },
  { name: "gemini-client", regex: /GoogleGenerativeAI/ },
  { name: "gemini-env", regex: /GEMINI_API_KEY/ },
  { name: "proxy-token", regex: /ANALYZE_API_TOKEN/ },
];

function scanText(relativePath, text) {
  const violations = [];
  const normalized = relativePath.split(path.sep).join("/");
  const isClient = clientRoots.some(
    (dir) => normalized === dir || normalized.startsWith(`${dir}/`),
  );
  const patterns = isClient ? keyPatterns.concat(clientOnlyPatterns) : keyPatterns;
  for (const pattern of patterns) {
    if (pattern.regex.test(text)) {
      violations.push(`${normalized}: ${pattern.name}`);
    }
  }
  const envAssignment = /^(?:export\s+)?(GEMINI_API_KEY|ANALYZE_API_TOKEN)=(.+)$/gm;
  for (const match of text.matchAll(envAssignment)) {
    if (match[2].trim()) {
      violations.push(`${normalized}: nonempty-${match[1]}`);
    }
  }
  return violations;
}

function shouldScan(filePath) {
  const base = path.basename(filePath);
  if (base === "check-no-client-secrets.js" || base === "package-lock.json") return false;
  if (textExtensions.has(path.extname(filePath)) || base.startsWith(".env")) return true;
  return false;
}

function walk(directory, found = []) {
  if (!fs.existsSync(directory)) return found;
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    if (entry.name === "node_modules" || entry.name === ".git" || entry.name === ".expo" || entry.name === "dist") {
      continue;
    }
    const fullPath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      walk(fullPath, found);
    } else if (entry.isFile() && shouldScan(fullPath)) {
      const text = fs.readFileSync(fullPath, "utf8");
      if (text.includes("\0")) continue;
      found.push(...scanText(path.relative(root, fullPath), text));
    }
  }
  return found;
}

function gitignoreCoversEnv() {
  const gitignore = fs.readFileSync(path.join(root, ".gitignore"), "utf8");
  return gitignore.split("\n").some((line) => line.trim() === ".env");
}

function main() {
  const violations = walk(root);
  if (!gitignoreCoversEnv()) {
    violations.push(".gitignore: missing .env");
  }
  if (violations.length > 0) {
    console.error("Client secret check failed:");
    for (const violation of violations) console.error(`- ${violation}`);
    process.exit(1);
  }
  console.log("Client secret check passed.");
}

if (require.main === module) {
  main();
}

module.exports = { scanText, gitignoreCoversEnv };
