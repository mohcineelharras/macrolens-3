import assert from "node:assert/strict";
import test from "node:test";
import { normalizeJpegBase64, parseModelOutput, sanitizeEstimate } from "../src/features/nutrition/estimate";

const jpeg = Buffer.from("macro-lens-jpeg-placeholder-bytes").toString("base64");

test("parses a fenced model payload and drops extra fields", () => {
  const estimate = parseModelOutput(
    '```json\n{"name":"Oatmeal","calories":180,"protein":6,"carbs":32,"fat":3,"confidence":0.9,"__proto__":{"admin":true}}\n```',
  );
  assert.deepEqual(estimate, { name: "Oatmeal", calories: 180, protein: 6, carbs: 32, fat: 3 });
});

test("rejects model output that is not a nutrition estimate", () => {
  assert.equal(parseModelOutput("null"), null);
  assert.equal(parseModelOutput("not json"), null);
  assert.equal(parseModelOutput('{"name":"Soup"}'), null);
  assert.equal(parseModelOutput('{"name":"Soup","calories":"lots","protein":1,"carbs":1,"fat":1}'), null);
  assert.equal(parseModelOutput('{"name":"Soup","calories":90000,"protein":1,"carbs":1,"fat":1}'), null);
  assert.equal(sanitizeEstimate(["banana"]), null);
  assert.equal(parseModelOutput(`{"name":"${"a".repeat(81)}","calories":1,"protein":1,"carbs":1,"fat":1}`), null);
});

test("strips control characters and accepts numeric strings", () => {
  const estimate = sanitizeEstimate({
    name: "  Yogurt\nbowl  ",
    calories: "120",
    protein: "10.26",
    carbs: "8",
    fat: "4",
  });
  assert.deepEqual(estimate, { name: "Yogurt bowl", calories: 120, protein: 10.3, carbs: 8, fat: 4 });
});

test("accepts a resized jpeg payload and rejects other data URLs", () => {
  assert.equal(normalizeJpegBase64(`data:image/jpeg;base64,${jpeg}`), jpeg);
  assert.equal(normalizeJpegBase64("data:image/png;base64,aaaa"), null);
  assert.equal(normalizeJpegBase64("@@@"), null);
  assert.equal(normalizeJpegBase64("a".repeat(2_000_000)), null);
});
