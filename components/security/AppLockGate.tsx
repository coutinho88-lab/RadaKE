import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  AppState,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import * as LocalAuthentication from "expo-local-authentication";
import { useAuth } from "@/lib/auth";
import { useAppSettings } from "@/lib/app-settings";

export default function AppLockGate({ children }: { children: React.ReactNode }) {
  const { session } = useAuth();
  const { settings } = useAppSettings();
  const [locked, setLocked] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const hasPrompted = useRef(false);

  useEffect(() => {
    if (!session || !settings.biometricLock) {
      setLocked(false);
      hasPrompted.current = false;
      return;
    }
    if (!hasPrompted.current) {
      hasPrompted.current = true;
      setLocked(true);
    }
  }, [session, settings.biometricLock]);

  useEffect(() => {
    const subscription = AppState.addEventListener("change", (nextState) => {
      if (nextState !== "active" && session && settings.biometricLock) {
        setLocked(true);
        setError(null);
      }
    });
    return () => subscription.remove();
  }, [session, settings.biometricLock]);

  async function unlock() {
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: "Unlock InstaChat",
        cancelLabel: "Cancel",
        disableDeviceFallback: false,
      });
      if (result.success) {
        setLocked(false);
      } else if (result.error !== "user_cancel" && result.error !== "app_cancel") {
        setError("Device authentication did not succeed. Try again or sign out.");
      }
    } catch (reason) {
      setError(
        reason instanceof Error
          ? `Could not start device authentication: ${reason.message}`
          : "Could not start device authentication.",
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      {children}
      <Modal visible={locked && Boolean(session) && settings.biometricLock} transparent animationType="fade">
        <View style={styles.backdrop}>
          <View style={styles.card}>
            <Text style={styles.title}>InstaChat is locked</Text>
            <Text style={styles.description}>
              Unlock with your device biometrics or device passcode.
            </Text>
            {error && <Text accessibilityRole="alert" style={styles.error}>{error}</Text>}
            <Pressable
              accessibilityRole="button"
              disabled={busy}
              onPress={() => void unlock()}
              style={[styles.button, busy && styles.disabled]}
            >
              {busy ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.buttonText}>Unlock</Text>
              )}
            </Pressable>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  backdrop: { alignItems: "center", backgroundColor: "rgba(20, 17, 29, 0.88)", flex: 1, justifyContent: "center", padding: 24 },
  card: { backgroundColor: "#FFFFFF", borderRadius: 20, maxWidth: 380, padding: 24, width: "100%" },
  title: { color: "#211D2B", fontSize: 21, fontWeight: "800", textAlign: "center" },
  description: { color: "#777386", fontSize: 14, lineHeight: 20, marginTop: 10, textAlign: "center" },
  error: { color: "#A51D2D", fontSize: 12, marginTop: 12, textAlign: "center" },
  button: { alignItems: "center", backgroundColor: "#6C4CF1", borderRadius: 12, justifyContent: "center", marginTop: 20, minHeight: 48 },
  buttonText: { color: "#FFFFFF", fontSize: 15, fontWeight: "800" },
  disabled: { opacity: 0.55 },
});
