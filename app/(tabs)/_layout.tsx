import { Tabs } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

const tabIcons = {
  index: "home-outline",
  chats: "chatbubbles-outline",
  discover: "compass-outline",
  profile: "person-circle-outline",
} as const;

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarPosition: "bottom",
        tabBarActiveTintColor: "#6C4CF1",
        tabBarInactiveTintColor: "#8B8B98",
        tabBarStyle: { height: 76, paddingTop: 8, paddingBottom: 16 },
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
      <Tabs.Screen name="index" options={{ title: "Feed" }} />
      <Tabs.Screen name="chats" options={{ title: "Chats" }} />
      <Tabs.Screen name="discover" options={{ title: "Discover" }} />
      <Tabs.Screen name="profile" options={{ title: "Profile" }} />
    </Tabs>
  );
}
