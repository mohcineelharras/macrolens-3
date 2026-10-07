export type MacroTotals = {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
};

type DatedMacros = MacroTotals & {
  timestamp: number;
};

export function isSameLocalDay(timestamp: number, now: number): boolean {
  if (!Number.isFinite(timestamp) || !Number.isFinite(now)) return false;
  const left = new Date(timestamp);
  const right = new Date(now);
  return (
    left.getFullYear() === right.getFullYear() &&
    left.getMonth() === right.getMonth() &&
    left.getDate() === right.getDate()
  );
}

export function sumEntriesForLocalDay(entries: readonly DatedMacros[], now: number): MacroTotals {
  return entries.reduce<MacroTotals>(
    (totals, entry) => {
      if (!isSameLocalDay(entry.timestamp, now)) return totals;
      return {
        calories: totals.calories + entry.calories,
        protein: totals.protein + entry.protein,
        carbs: totals.carbs + entry.carbs,
        fat: totals.fat + entry.fat,
      };
    },
    { calories: 0, protein: 0, carbs: 0, fat: 0 },
  );
}
