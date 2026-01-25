import React from 'react';
import { View, Text, ScrollView } from 'react-native';
import { useNutritionStore } from '../../features/nutrition/store';

export default function LogScreen() {
    const { entries, todayTotals } = useNutritionStore();
    const totals = todayTotals();

    return (
        <View className="flex-1 bg-black p-4 pt-10">
            <Text className="text-white text-3xl font-bold mb-6">Daily Log</Text>

            {/* Totals Card */}
            <View className="bg-gray-900 p-6 rounded-2xl mb-6 flex-row justify-between border border-gray-800">
                <View>
                    <Text className="text-gray-400 text-xs uppercase">Calories</Text>
                    <Text className="text-white text-2xl font-bold">{totals.calories}</Text>
                </View>
                <View>
                    <Text className="text-gray-400 text-xs uppercase">Protein</Text>
                    <Text className="text-green-400 text-xl font-bold">{totals.protein}g</Text>
                </View>
                <View>
                    <Text className="text-gray-400 text-xs uppercase">Carbs</Text>
                    <Text className="text-blue-400 text-xl font-bold">{totals.carbs}g</Text>
                </View>
                <View>
                    <Text className="text-gray-400 text-xs uppercase">Fat</Text>
                    <Text className="text-yellow-400 text-xl font-bold">{totals.fat}g</Text>
                </View>
            </View>

            <ScrollView>
                {entries.map(entry => (
                    <View key={entry.id} className="bg-gray-900/50 p-4 rounded-xl mb-3 flex-row justify-between items-center border border-gray-800">
                        <View>
                            <Text className="text-white font-bold text-lg">{entry.name}</Text>
                            <Text className="text-gray-500 text-xs">
                                P: {entry.protein}g • C: {entry.carbs}g • F: {entry.fat}g
                            </Text>
                        </View>
                        <Text className="text-white font-mono font-bold">{entry.calories}</Text>
                    </View>
                ))}
                {entries.length === 0 && (
                    <Text className="text-gray-600 text-center mt-10">No entries yet. Scan some food!</Text>
                )}
            </ScrollView>
        </View>
    );
}
