import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { ActivityIndicator, StyleSheet, View } from "react-native";
import AuthScreen from "@/components/auth/AuthScreen";
import { AuthProvider, useAuth } from "@/lib/auth";
import { PreviewStoreProvider } from "@/lib/preview-store";

function RootNavigator() {
  const { session, ready, error } = useAuth();

  if (!ready) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator color="#6C4CF1" />
      </View>
    );
  }
  if (!session) return <AuthScreen authError={error} />;

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(tabs)" />
      <Stack.Screen
        name="chat/[id]"
        options={{ headerShown: true, title: "Conversation" }}
      />
      <Stack.Screen
        name="profile"
        options={{ headerShown: true, title: "Profile" }}
      />
    </Stack>
  );
}

const styles = StyleSheet.create({
  loading: {
    alignItems: "center",
    backgroundColor: "#FAF9FF",
    flex: 1,
    justifyContent: "center",
  },
});

export default function RootLayout() {
  return (
    <PreviewStoreProvider>
      <AuthProvider>
        <StatusBar style="dark" />
        <RootNavigator />
      </AuthProvider>
    </PreviewStoreProvider>
  );
}
