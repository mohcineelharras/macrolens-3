import React, { useState, useRef } from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { CameraView, useCameraPermissions, CameraType } from 'expo-camera';
import * as ImageManipulator from 'expo-image-manipulator';
import { analyzeFoodImage } from './ai.service';
import { useNutritionStore } from '../nutrition/store';

export default function ScannerScreen() {
    const [permission, requestPermission] = useCameraPermissions();
    const [loading, setLoading] = useState(false);
    const cameraRef = useRef<CameraView>(null);
    const addEntry = useNutritionStore(state => state.addEntry);

    if (!permission) {
        return <View />;
    }

    if (!permission.granted) {
        return (
            <View className="flex-1 justify-center items-center bg-black">
                <Text className="text-white mb-4">We need camera access to see your food.</Text>
                <TouchableOpacity onPress={requestPermission} className="bg-green-500 px-6 py-3 rounded-full">
                    <Text className="font-bold">Grant Permission</Text>
                </TouchableOpacity>
            </View>
        );
    }

    const takePicture = async () => {
        if (cameraRef.current && !loading) {
            setLoading(true);
            try {
                const photo = await cameraRef.current.takePictureAsync({ quality: 0.5, base64: true });

                // Resize for speed (optional, if camera is high res)
                const manipResult = await ImageManipulator.manipulateAsync(
                    photo!.uri,
                    [{ resize: { width: 512 } }],
                    { base64: true, compress: 0.7, format: ImageManipulator.SaveFormat.JPEG }
                );

                // Analyze
                const result = await analyzeFoodImage(manipResult.base64!);

                if (result) {
                    Alert.alert(
                        "Food Detected",
                        `Found: ${result.name} (~${result.calories} kcal)`,
                        [
                            {
                                text: "Log It",
                                onPress: () => {
                                    addEntry({
                                        name: result.name,
                                        calories: result.calories,
                                        protein: result.protein,
                                        carbs: result.carbs,
                                        fat: result.fat
                                    });
                                }
                            },
                            { text: "Cancel", style: "cancel" }
                        ]
                    )
                } else {
                    Alert.alert("Error", "Could not identify food. Try getting closer.");
                }

            } catch (e) {
                console.error(e);
                Alert.alert("Error", "Something went wrong.");
            } finally {
                setLoading(false);
            }
        }
    };

    return (
        <View className="flex-1 bg-black">
            <CameraView
                style={{ flex: 1 }}
                facing="back"
                ref={cameraRef}
            >
                {/* HUD Overlay */}
                <View className="flex-1 justify-center items-center relative">
                    <View className="w-64 h-64 border-2 border-white/30 rounded-3xl relative">
                        {/* HUD Corners */}
                        <View className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-green-400 rounded-tl-xl" />
                        <View className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-green-400 rounded-tr-xl" />
                        <View className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-green-400 rounded-bl-xl" />
                        <View className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-green-400 rounded-br-xl" />

                        {loading && <ActivityIndicator size="large" color="#4ade80" className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />}
                    </View>

                    <View className="absolute bottom-10 w-full items-center">
                        <TouchableOpacity
                            onPress={takePicture}
                            disabled={loading}
                            className="w-20 h-20 bg-white/20 rounded-full border-4 border-white justify-center items-center"
                        >
                            <View className="w-16 h-16 bg-white rounded-full" />
                        </TouchableOpacity>
                        <Text className="text-white mt-4 font-bold tracking-widest text-xs uppercase">Tap to Identify</Text>
                    </View>
                </View>
            </CameraView>
        </View>
    );
}
