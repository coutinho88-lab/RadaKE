import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { PreviewStoreProvider } from "@/lib/preview-store";

export default function RootLayout() {
  return (
    <PreviewStoreProvider>
      <StatusBar style="dark" />
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
    </PreviewStoreProvider>
  );
}
