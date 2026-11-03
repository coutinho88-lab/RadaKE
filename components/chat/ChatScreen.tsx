import { useMemo, useState } from "react";
import {
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { previewChats, previewMessages } from "@/lib/preview-data";

type Props = { conversationId: string };

export default function ChatScreen({ conversationId }: Props) {
  const chat = previewChats.find((item) => item.id === conversationId);
  const [draft, setDraft] = useState("");
  const [sentMessages, setSentMessages] = useState<string[]>([]);
  const messages = useMemo(
    () => [...(previewMessages[conversationId] ?? []), ...sentMessages],
    [conversationId, sentMessages],
  );

  function sendMessage() {
    const text = draft.trim();
    if (!text) return;
    setSentMessages((current) => [...current, text]);
    setDraft("");
  }

  if (!chat) {
    return (
      <View style={styles.empty}>
        <Text style={styles.emptyText}>Conversation not found.</Text>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.screen}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      keyboardVerticalOffset={Platform.OS === "ios" ? 88 : 0}
    >
      <View style={styles.previewNotice}>
        <Text style={styles.previewText}>PREVIEW · Messages stay on this device</Text>
      </View>
      <View style={styles.chatHeader}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{chat.name.slice(0, 1)}</Text>
        </View>
        <View>
          <Text style={styles.chatName}>{chat.name}</Text>
          <Text style={styles.presence}>last seen recently</Text>
        </View>
      </View>
      <FlatList
        data={messages}
        keyExtractor={(_, index) => `${conversationId}-${index}`}
        contentContainerStyle={styles.timeline}
        renderItem={({ item, index }) => {
          const own = index >= (previewMessages[conversationId]?.length ?? 0);
          return (
            <View style={[styles.bubble, own ? styles.ownBubble : styles.theirBubble]}>
              <Text style={[styles.bubbleText, own && styles.ownText]}>{item}</Text>
              {own && <Text style={styles.receipt}>✓✓</Text>}
            </View>
          );
        }}
        ListEmptyComponent={
          <Text style={styles.emptyText}>Say hello to start the conversation.</Text>
        }
      />
      <View style={styles.composer}>
        <TextInput
          accessibilityLabel="Message"
          value={draft}
          onChangeText={setDraft}
          onSubmitEditing={sendMessage}
          placeholder="Write a message…"
          returnKeyType="send"
          style={styles.input}
        />
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Send message"
          onPress={sendMessage}
          style={styles.sendButton}
        >
          <Text style={styles.sendText}>Send</Text>
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: {
    alignSelf: "center",
    backgroundColor: "#FAF9FF",
    flex: 1,
    maxWidth: 820,
    width: "100%",
  },
  previewNotice: { alignItems: "center", backgroundColor: "#F0EDFA", paddingVertical: 7 },
  previewText: { color: "#777386", fontSize: 10, fontWeight: "700", letterSpacing: 0.5 },
  chatHeader: {
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderBottomColor: "#EEEAF5",
    borderBottomWidth: 1,
    flexDirection: "row",
    gap: 11,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  avatar: { alignItems: "center", backgroundColor: "#E9E3FF", borderRadius: 20, height: 40, justifyContent: "center", width: 40 },
  avatarText: { color: "#5B43C2", fontSize: 16, fontWeight: "700" },
  chatName: { color: "#211D2B", fontSize: 15, fontWeight: "700" },
  presence: { color: "#9692A0", fontSize: 11, marginTop: 2 },
  timeline: { flexGrow: 1, justifyContent: "flex-end", padding: 16 },
  bubble: { borderRadius: 18, marginBottom: 9, maxWidth: "82%", paddingHorizontal: 13, paddingTop: 10, paddingBottom: 7 },
  ownBubble: { alignSelf: "flex-end", backgroundColor: "#6C4CF1", borderBottomRightRadius: 5 },
  theirBubble: { alignSelf: "flex-start", backgroundColor: "#FFFFFF", borderBottomLeftRadius: 5 },
  bubbleText: { color: "#302C38", fontSize: 14, lineHeight: 20 },
  ownText: { color: "#FFFFFF" },
  receipt: { alignSelf: "flex-end", color: "#BDEBFF", fontSize: 10, marginTop: 2 },
  composer: { alignItems: "center", backgroundColor: "#FFFFFF", borderTopColor: "#EEEAF5", borderTopWidth: 1, flexDirection: "row", gap: 8, padding: 12 },
  input: { backgroundColor: "#F5F3F9", borderRadius: 22, color: "#211D2B", flex: 1, minHeight: 42, paddingHorizontal: 15 },
  sendButton: { alignItems: "center", backgroundColor: "#6C4CF1", borderRadius: 21, justifyContent: "center", minHeight: 42, paddingHorizontal: 16 },
  sendText: { color: "#FFFFFF", fontSize: 13, fontWeight: "700" },
  empty: { alignItems: "center", backgroundColor: "#FAF9FF", flex: 1, justifyContent: "center" },
  emptyText: { color: "#777386", fontSize: 14, textAlign: "center" },
});
