import assert from "node:assert/strict";
import { createRequire } from "node:module";
import path from "node:path";
import test from "node:test";

const require = createRequire(__filename);

function isBlocked(blockList: RegExp | readonly RegExp[], filePath: string): boolean {
  const patterns = Array.isArray(blockList) ? blockList : [blockList];
  return patterns.some((pattern) => pattern.test(filePath));
}

test("Metro cannot bundle the server or the Gemini SDK into the app", () => {
  const config = require("../metro.config.js") as {
    resolver: { blockList: RegExp | RegExp[] };
  };
  const blockList = config.resolver.blockList;
  assert.equal(isBlocked(blockList, path.resolve("node_modules/@google/generative-ai/dist/index.js")), true);
  assert.equal(isBlocked(blockList, path.resolve("server/gemini.ts")), true);
  assert.equal(isBlocked(blockList, path.resolve("src/features/scanner/ai.service.ts")), false);
});
