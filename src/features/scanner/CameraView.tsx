import { useRef, useState } from "react";
import { ActivityIndicator, Alert, Pressable, StyleSheet, Text, View } from "react-native";
import { CameraView, useCameraPermissions } from "expo-camera";
import * as ImageManipulator from "expo-image-manipulator";
import { useNutritionStore } from "../nutrition/store";
import { AnalysisFailedError, AnalysisUnavailableError, analyzeFoodImage } from "./ai.service";
import { grantAnalysisConsent, hasAnalysisConsent } from "./consent";

export default function ScannerScreen() {
  const [permission, requestPermission] = useCameraPermissions();
  const [loading, setLoading] = useState(false);
  const [cameraReady, setCameraReady] = useState(false);
  const [consented, setConsented] = useState(hasAnalysisConsent);
  const cameraRef = useRef<CameraView>(null);
  const captureInFlight = useRef(false);
  const addEntry = useNutritionStore((state) => state.addEntry);

  if (!consented) {
    return (
      <View style={styles.centered}>
        <Text style={styles.title}>Before you scan</Text>
        <Text style={styles.body}>
          MacroLens sends the meal photo to Google Gemini to estimate calories and macros. The photo
          is not saved in your log. Estimates are not medical or dietary advice. If you decline, the
          photo stays on this device and nothing is uploaded.
        </Text>
        <Pressable
          style={styles.primaryButton}
          onPress={() => {
            grantAnalysisConsent();
            setConsented(true);
          }}
        >
          <Text style={styles.primaryLabel}>Agree and continue</Text>
        </Pressable>
        <Text style={styles.note}>You can use the log without scanning.</Text>
      </View>
    );
  }

  if (!permission) {
    return <View style={styles.centered} />;
  }

  if (!permission.granted) {
    return (
      <View style={styles.centered}>
        <Text style={styles.body}>
          MacroLens needs the camera to photograph a meal. Photos are sent only after you agree.
        </Text>
        <Pressable style={styles.primaryButton} onPress={() => void requestPermission()}>
          <Text style={styles.primaryLabel}>Grant camera access</Text>
        </Pressable>
      </View>
    );
  }

  const takePicture = async () => {
    if (captureInFlight.current || !cameraRef.current || !cameraReady || !hasAnalysisConsent()) return;
    captureInFlight.current = true;
    setLoading(true);
    try {
      const photo = await withTimeout(cameraRef.current.takePictureAsync({ quality: 0.5 }), 8_000);
      if (!photo?.uri) {
        Alert.alert("Error", "Could not capture a photo.");
        return;
      }

      const resized = await ImageManipulator.manipulateAsync(
        photo.uri,
        [{ resize: { width: 512 } }],
        { base64: true, compress: 0.7, format: ImageManipulator.SaveFormat.JPEG },
      );
      if (!resized.base64) {
        Alert.alert("Error", "Could not prepare the photo.");
        return;
      }

      const result = await analyzeFoodImage(resized.base64);
      if (!result) {
        Alert.alert("No food found", "Could not identify food. Try getting closer.");
        return;
      }

      Alert.alert("Food detected", `Found: ${result.name} (~${result.calories} kcal)`, [
        {
          text: "Log it",
          onPress: () => addEntry(result),
        },
        { text: "Cancel", style: "cancel" },
      ]);
    } catch (error) {
      if (error instanceof AnalysisUnavailableError) {
        Alert.alert(
          "Analysis unavailable",
          "The meal analysis service is not configured. The photo was not uploaded.",
        );
        return;
      }
      if (error instanceof AnalysisFailedError) {
        Alert.alert("Analysis failed", "The photo could not be analyzed and was not added to your log.");
        return;
      }
      Alert.alert("Error", "Something went wrong. The photo was not added to your log.");
    } finally {
      captureInFlight.current = false;
      setLoading(false);
    }
  };

  return (
    <View style={styles.cameraRoot}>
      <CameraView
        style={styles.camera}
        facing="back"
        mode="picture"
        ref={cameraRef}
        onCameraReady={() => setCameraReady(true)}
      >
        <View style={styles.overlay}>
          <View style={styles.frame}>
            <View style={[styles.corner, styles.cornerTopLeft]} />
            <View style={[styles.corner, styles.cornerTopRight]} />
            <View style={[styles.corner, styles.cornerBottomLeft]} />
            <View style={[styles.corner, styles.cornerBottomRight]} />
            {loading ? <ActivityIndicator size="large" color="#4ade80" /> : null}
          </View>
          <View style={styles.shutterRow}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Identify food"
              disabled={loading || !cameraReady}
              onPress={() => void takePicture()}
              style={styles.shutterOuter}
            >
              <View style={styles.shutterInner} />
            </Pressable>
            <Text style={styles.shutterLabel}>Tap to identify</Text>
          </View>
        </View>
      </CameraView>
    </View>
  );
}

function withTimeout<T>(work: Promise<T>, ms: number): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error("timeout")), ms);
    work.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (error: unknown) => {
        clearTimeout(timer);
        reject(error);
      },
    );
  });
}

const styles = StyleSheet.create({
  centered: {
    flex: 1,
    justifyContent: "center",
    backgroundColor: "#000",
    padding: 24,
    gap: 16,
  },
  title: {
    color: "#fff",
    fontSize: 28,
    fontWeight: "700",
  },
  body: {
    color: "#e5e7eb",
    fontSize: 16,
    lineHeight: 24,
  },
  note: {
    color: "#9ca3af",
    fontSize: 14,
  },
  primaryButton: {
    alignSelf: "flex-start",
    backgroundColor: "#4ade80",
    borderRadius: 999,
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  primaryLabel: {
    color: "#052e16",
    fontWeight: "700",
  },
  cameraRoot: {
    flex: 1,
    backgroundColor: "#000",
  },
  camera: {
    flex: 1,
  },
  overlay: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  frame: {
    width: 256,
    height: 256,
    borderWidth: 2,
    borderColor: "rgba(255,255,255,0.3)",
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
  },
  corner: {
    position: "absolute",
    width: 32,
    height: 32,
    borderColor: "#4ade80",
  },
  cornerTopLeft: {
    top: 0,
    left: 0,
    borderTopWidth: 4,
    borderLeftWidth: 4,
    borderTopLeftRadius: 12,
  },
  cornerTopRight: {
    top: 0,
    right: 0,
    borderTopWidth: 4,
    borderRightWidth: 4,
    borderTopRightRadius: 12,
  },
  cornerBottomLeft: {
    bottom: 0,
    left: 0,
    borderBottomWidth: 4,
    borderLeftWidth: 4,
    borderBottomLeftRadius: 12,
  },
  cornerBottomRight: {
    bottom: 0,
    right: 0,
    borderBottomWidth: 4,
    borderRightWidth: 4,
    borderBottomRightRadius: 12,
  },
  shutterRow: {
    position: "absolute",
    bottom: 40,
    alignItems: "center",
    width: "100%",
  },
  shutterOuter: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 4,
    borderColor: "#fff",
    backgroundColor: "rgba(255,255,255,0.2)",
    alignItems: "center",
    justifyContent: "center",
  },
  shutterInner: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: "#fff",
  },
  shutterLabel: {
    color: "#fff",
    marginTop: 16,
    fontWeight: "700",
    letterSpacing: 2,
    textTransform: "uppercase",
    fontSize: 12,
  },
});
