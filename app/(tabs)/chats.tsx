import { useRouter } from "expo-router";
import { FlatList, Pressable, StyleSheet, Text, View } from "react-native";
import { previewChats } from "@/lib/preview-data";

export default function ChatsRoute() {
  const router = useRouter();

  return (
    <View style={styles.screen}>
      <Text style={styles.eyebrow}>PREVIEW · LOCAL SAMPLE DATA</Text>
      <Text style={styles.title}>Messages</Text>
      <FlatList
        data={previewChats}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => (
          <Pressable
            accessibilityRole="button"
            style={styles.row}
            onPress={() => router.push(`/chat/${item.id}`)}
          >
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{item.name.slice(0, 1)}</Text>
            </View>
            <View style={styles.details}>
              <View style={styles.nameLine}>
                <Text style={styles.name}>{item.name}</Text>
                <Text style={styles.time}>{item.time}</Text>
              </View>
              <View style={styles.messageLine}>
                <Text numberOfLines={1} style={styles.message}>
                  {item.lastMessage}
                </Text>
                {item.unread > 0 && (
                  <View style={styles.badge}>
                    <Text style={styles.badgeText}>{item.unread}</Text>
                  </View>
                )}
              </View>
            </View>
          </Pressable>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    alignSelf: "center",
    backgroundColor: "#FAF9FF",
    flex: 1,
    maxWidth: 760,
    paddingTop: 62,
    width: "100%",
  },
  eyebrow: {
    color: "#777386",
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 1.1,
    marginHorizontal: 20,
  },
  title: {
    color: "#211D2B",
    fontSize: 30,
    fontWeight: "800",
    marginHorizontal: 20,
    marginTop: 5,
    marginBottom: 18,
  },
  list: { paddingHorizontal: 18, paddingBottom: 24 },
  row: {
    alignItems: "center",
    flexDirection: "row",
    gap: 12,
    paddingVertical: 12,
  },
  avatar: {
    alignItems: "center",
    backgroundColor: "#E9E3FF",
    borderRadius: 28,
    height: 54,
    justifyContent: "center",
    width: 54,
  },
  avatarText: { color: "#5B43C2", fontSize: 20, fontWeight: "700" },
  details: { borderBottomColor: "#EEEAF5", borderBottomWidth: 1, flex: 1, paddingBottom: 12 },
  nameLine: { alignItems: "center", flexDirection: "row", justifyContent: "space-between" },
  name: { color: "#211D2B", fontSize: 16, fontWeight: "700" },
  time: { color: "#9692A0", fontSize: 11 },
  messageLine: { alignItems: "center", flexDirection: "row", justifyContent: "space-between", marginTop: 5 },
  message: { color: "#777386", flex: 1, fontSize: 13, marginRight: 8 },
  badge: {
    alignItems: "center",
    backgroundColor: "#6C4CF1",
    borderRadius: 10,
    height: 20,
    justifyContent: "center",
    minWidth: 20,
    paddingHorizontal: 5,
  },
  badgeText: { color: "#FFFFFF", fontSize: 11, fontWeight: "700" },
});
