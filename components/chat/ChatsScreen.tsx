import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import {
  FlatList,
  Image,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { previewChats } from "@/lib/preview-data";
import { useState } from "react";

export default function ChatsRoute() {
  const router = useRouter();
  const [activeRada, setActiveRada] =
    useState<(typeof previewChats)[number] | null>(null);

  return (
    <View style={styles.screen}>
      <Text style={styles.eyebrow}>CHATS · PRIVATE RADA FROM SAVED CONTACTS</Text>
      <FlatList
        data={previewChats}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => {
          const canViewRada = item.savedContact && Boolean(item.radaPost);
          return (
            <View style={styles.row}>
              {canViewRada ? (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`View ${item.name}'s private Rada`}
                  onPress={() => setActiveRada(item)}
                  style={styles.radaRing}
                >
                  <Avatar name={item.name} />
                  <View style={styles.radaBadge}>
                    <Text style={styles.radaBadgeText}>R</Text>
                  </View>
                </Pressable>
              ) : (
                <View style={styles.avatarWrap}>
                  <Avatar name={item.name} />
                </View>
              )}
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`Open chat with ${item.name}`}
                style={styles.details}
                onPress={() => router.push(`/chat/${item.id}`)}
              >
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
              </Pressable>
            </View>
          );
        }}
      />
      <Modal
        visible={Boolean(activeRada?.radaPost && activeRada.savedContact)}
        animationType="fade"
        onRequestClose={() => setActiveRada(null)}
      >
        {activeRada?.radaPost && activeRada.savedContact && (
          <View style={styles.radaScreen}>
            <View style={styles.radaHeader}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Close Rada"
                onPress={() => setActiveRada(null)}
                style={styles.closeButton}
              >
                <Ionicons name="close" size={26} color="#FFFFFF" />
              </Pressable>
              <View>
                <Text style={styles.radaAuthor}>{activeRada.name}</Text>
                <Text style={styles.radaTime}>{activeRada.radaPost.time}</Text>
              </View>
              <Text style={styles.radaLabel}>RADA</Text>
            </View>
            <Image
              source={{ uri: activeRada.radaPost.image }}
              style={styles.radaImage}
              resizeMode="contain"
            />
            <View style={styles.radaFooter}>
              <Text style={styles.radaCaption}>{activeRada.radaPost.caption}</Text>
              <Text style={styles.radaPrivacy}>
                Shared privately with saved contacts
              </Text>
            </View>
          </View>
        )}
      </Modal>
    </View>
  );
}

function Avatar({ name }: { name: string }) {
  return (
    <View style={styles.avatar}>
      <Text style={styles.avatarText}>{name.slice(0, 1)}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    alignSelf: "center",
    backgroundColor: "#FAF9FF",
    flex: 1,
    maxWidth: 760,
    width: "100%",
  },
  eyebrow: {
    alignSelf: "flex-start",
    backgroundColor: "#F0EDFA",
    borderRadius: 10,
    color: "#5B43C2",
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 0.6,
    marginHorizontal: 18,
    marginTop: 16,
    paddingHorizontal: 9,
    paddingVertical: 5,
  },
  list: { paddingHorizontal: 18, paddingBottom: 24, paddingTop: 8 },
  row: { alignItems: "center", flexDirection: "row", gap: 12, minHeight: 78 },
  avatarWrap: { height: 58, justifyContent: "center", width: 58 },
  avatar: {
    alignItems: "center",
    backgroundColor: "#E9E3FF",
    borderRadius: 25,
    height: 50,
    justifyContent: "center",
    width: 50,
  },
  avatarText: { color: "#5B43C2", fontSize: 20, fontWeight: "700" },
  radaRing: {
    alignItems: "center",
    borderColor: "#2583F7",
    borderRadius: 30,
    borderWidth: 2,
    height: 58,
    justifyContent: "center",
    position: "relative",
    width: 58,
  },
  radaBadge: {
    alignItems: "center",
    backgroundColor: "#2583F7",
    borderColor: "#FFFFFF",
    borderRadius: 9,
    borderWidth: 1,
    height: 18,
    justifyContent: "center",
    position: "absolute",
    right: -2,
    top: -1,
    width: 18,
  },
  radaBadgeText: { color: "#FFFFFF", fontSize: 9, fontWeight: "800" },
  details: {
    alignSelf: "stretch",
    borderBottomColor: "#EEEAF5",
    borderBottomWidth: 1,
    flex: 1,
    justifyContent: "center",
    paddingVertical: 12,
  },
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
  radaScreen: { backgroundColor: "#16131C", flex: 1, justifyContent: "space-between" },
  radaHeader: { alignItems: "center", flexDirection: "row", gap: 14, paddingHorizontal: 18, paddingTop: 24 },
  closeButton: { padding: 8 },
  radaAuthor: { color: "#FFFFFF", fontSize: 15, fontWeight: "700" },
  radaTime: { color: "#C8C4D0", fontSize: 12, marginTop: 3 },
  radaLabel: { color: "#80B8FF", fontSize: 12, fontWeight: "800", letterSpacing: 1.4, marginLeft: "auto" },
  radaImage: { flex: 1, width: "100%" },
  radaFooter: { paddingBottom: 28, paddingHorizontal: 20, paddingTop: 14 },
  radaCaption: { color: "#FFFFFF", fontSize: 16 },
  radaPrivacy: { color: "#C8C4D0", fontSize: 12, marginTop: 8 },
});
