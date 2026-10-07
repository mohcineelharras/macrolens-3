import assert from "node:assert/strict";
import test from "node:test";
import { isSameLocalDay, sumEntriesForLocalDay } from "../src/features/nutrition/day";
import { createEntryId, useNutritionStore } from "../src/features/nutrition/store";

function atLocalNoon(year: number, month: number, day: number): number {
  return new Date(year, month - 1, day, 12, 0, 0, 0).getTime();
}

test("daily totals ignore other local days", () => {
  const today = atLocalNoon(2026, 10, 7);
  const yesterday = atLocalNoon(2026, 10, 6);
  assert.equal(isSameLocalDay(today, today + 60_000), true);
  assert.equal(isSameLocalDay(yesterday, today), false);
  const totals = sumEntriesForLocalDay(
    [
      { calories: 100, protein: 10, carbs: 5, fat: 2, timestamp: today },
      { calories: 900, protein: 90, carbs: 90, fat: 90, timestamp: yesterday },
    ],
    today,
  );
  assert.deepEqual(totals, { calories: 100, protein: 10, carbs: 5, fat: 2 });
});

test("the store drops invalid entries and ids are not Math.random", () => {
  useNutritionStore.setState({ entries: [] });
  useNutritionStore.getState().addEntry({
    name: "Apple",
    calories: 95,
    protein: 0.5,
    carbs: 25,
    fat: 0.3,
  });
  useNutritionStore.getState().addEntry({
    name: "Bad",
    calories: Number.NaN,
    protein: 1,
    carbs: 1,
    fat: 1,
  });
  const entries = useNutritionStore.getState().entries;
  assert.equal(entries.length, 1);
  assert.equal(entries[0]?.name, "Apple");
  assert.match(entries[0]?.id ?? "", /^[0-9a-z]+-[0-9a-z]+$/);
  assert.equal(createEntryId().includes("."), false);
});
