import { ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { isSameLocalDay } from "../../features/nutrition/day";
import { useNutritionStore } from "../../features/nutrition/store";

export default function LogScreen() {
  const insets = useSafeAreaInsets();
  const entries = useNutritionStore((state) => state.entries);
  const todayTotals = useNutritionStore((state) => state.todayTotals);
  const now = Date.now();
  const totals = todayTotals(now);
  const todaysEntries = entries.filter((entry) => isSameLocalDay(entry.timestamp, now));

  return (
    <View style={[styles.screen, { paddingTop: insets.top + 16 }]}>
      <Text style={styles.title}>Daily log</Text>
      <View style={styles.totals}>
        <Metric label="Calories" value={String(totals.calories)} />
        <Metric label="Protein" value={`${totals.protein}g`} accent="#4ade80" />
        <Metric label="Carbs" value={`${totals.carbs}g`} accent="#60a5fa" />
        <Metric label="Fat" value={`${totals.fat}g`} accent="#facc15" />
      </View>
      <ScrollView>
        {todaysEntries.map((entry) => (
          <View key={entry.id} style={styles.row}>
            <View>
              <Text style={styles.name}>{entry.name}</Text>
              <Text style={styles.macros}>
                P: {entry.protein}g · C: {entry.carbs}g · F: {entry.fat}g
              </Text>
            </View>
            <Text style={styles.calories}>{entry.calories}</Text>
          </View>
        ))}
        {todaysEntries.length === 0 ? (
          <Text style={styles.empty}>No entries yet today. Scan some food.</Text>
        ) : null}
      </ScrollView>
    </View>
  );
}

function Metric({ label, value, accent = "#fff" }: { label: string; value: string; accent?: string }) {
  return (
    <View>
      <Text style={styles.metricLabel}>{label}</Text>
      <Text style={[styles.metricValue, { color: accent }]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#000",
    paddingHorizontal: 16,
  },
  title: {
    color: "#fff",
    fontSize: 32,
    fontWeight: "700",
    marginBottom: 20,
  },
  totals: {
    backgroundColor: "#111827",
    borderColor: "#1f2937",
    borderWidth: 1,
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    flexDirection: "row",
    justifyContent: "space-between",
  },
  metricLabel: {
    color: "#9ca3af",
    fontSize: 11,
    textTransform: "uppercase",
  },
  metricValue: {
    fontSize: 20,
    fontWeight: "700",
    marginTop: 4,
  },
  row: {
    backgroundColor: "rgba(17,24,39,0.5)",
    borderColor: "#1f2937",
    borderWidth: 1,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  name: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "700",
  },
  macros: {
    color: "#6b7280",
    fontSize: 12,
    marginTop: 4,
  },
  calories: {
    color: "#fff",
    fontWeight: "700",
    fontVariant: ["tabular-nums"],
  },
  empty: {
    color: "#4b5563",
    textAlign: "center",
    marginTop: 40,
  },
});
