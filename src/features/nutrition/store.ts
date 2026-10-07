import { create } from "zustand";
import { sanitizeEstimate } from "./estimate";
import { sumEntriesForLocalDay, type MacroTotals } from "./day";

export interface MacroEntry {
  id: string;
  name: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  timestamp: number;
}

interface NutritionState {
  entries: MacroEntry[];
  targets: {
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
  };
  addEntry: (entry: Omit<MacroEntry, "id" | "timestamp">) => void;
  todayTotals: (now?: number) => MacroTotals;
}

let entrySequence = 0;

export function createEntryId(now = Date.now()): string {
  entrySequence += 1;
  return `${now.toString(36)}-${entrySequence.toString(36)}`;
}

export const useNutritionStore = create<NutritionState>((set, get) => ({
  entries: [],
  targets: {
    calories: 2200,
    protein: 160,
    carbs: 200,
    fat: 70,
  },
  addEntry: (entry) => {
    const safe = sanitizeEstimate(entry);
    if (!safe) return;
    const timestamp = Date.now();
    set((state) => ({
      entries: [
        {
          ...safe,
          id: createEntryId(timestamp),
          timestamp,
        },
        ...state.entries,
      ],
    }));
  },
  todayTotals: (now = Date.now()) => sumEntriesForLocalDay(get().entries, now),
}));
