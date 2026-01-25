import { create } from 'zustand';

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
    addEntry: (entry: Omit<MacroEntry, 'id' | 'timestamp'>) => void;
    todayTotals: () => { calories: number, protein: number, carbs: number, fat: number };
}

export const useNutritionStore = create<NutritionState>((set, get) => ({
    entries: [],
    targets: {
        calories: 2200,
        protein: 160,
        carbs: 200,
        fat: 70
    },
    addEntry: (entry) => set((state) => ({
        entries: [
            {
                ...entry,
                id: Math.random().toString(36).substring(7),
                timestamp: Date.now()
            },
            ...state.entries
        ]
    })),
    todayTotals: () => {
        // In a real app, filter by day. For MVP, sum all.
        const { entries } = get();
        return entries.reduce((acc, curr) => ({
            calories: acc.calories + curr.calories,
            protein: acc.protein + curr.protein,
            carbs: acc.carbs + curr.carbs,
            fat: acc.fat + curr.fat
        }), { calories: 0, protein: 0, carbs: 0, fat: 0 });
    }
}));
