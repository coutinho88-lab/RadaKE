import { Tabs } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { Pressable, StyleSheet } from "react-native";
import { useAppSettings } from "@/lib/app-settings";

const tabIcons = {
  index: "chatbubbles-outline",
  feed: "home-outline",
  discover: "compass-outline",
} as const;

function ProfileButton() {
  const router = useRouter();

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Open profile"
      onPress={() => router.push("/profile")}
      style={styles.profileButton}
    >
      <Ionicons name="person-circle-outline" size={30} color="#5B43C2" />
    </Pressable>
  );
}

export default function TabLayout() {
  const { settings } = useAppSettings();
  const dark = settings.theme === "dark";

  return (
    <Tabs
      screenOptions={({ route }) => ({
        headerShown: true,
        headerTitleStyle: { color: dark ? "#F4F1F8" : "#211D2B", fontSize: 17, fontWeight: "800" },
        headerStyle: { backgroundColor: dark ? "#15121C" : "#FAF9FF" },
        sceneStyle: { backgroundColor: dark ? "#15121C" : "#FAF9FF" },
        headerShadowVisible: false,
        headerRight: () => <ProfileButton />,
        tabBarPosition: "bottom",
        tabBarActiveTintColor: "#6C4CF1",
        tabBarInactiveTintColor: "#8B8B98",
        tabBarStyle: { backgroundColor: dark ? "#211E29" : "#FFFFFF", borderTopColor: dark ? "#393442" : "#EEEAF5", height: 76, paddingTop: 8, paddingBottom: 16 },
        tabBarLabelStyle: { fontSize: 11 },
        tabBarIcon: ({ color, size }) => (
          <Ionicons
            name={tabIcons[route.name as keyof typeof tabIcons]}
            color={color}
            size={size}
          />
        ),
      })}
    >
      <Tabs.Screen name="index" options={{ title: "Chats" }} />
      <Tabs.Screen name="feed" options={{ title: "Feed" }} />
      <Tabs.Screen name="discover" options={{ title: "Discover" }} />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  profileButton: { marginRight: 14, padding: 3 },
});
