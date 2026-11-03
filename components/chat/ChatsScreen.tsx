import { Ionicons } from "@expo/vector-icons";
import * as ImageManipulator from "expo-image-manipulator";
import * as ImagePicker from "expo-image-picker";
import { useRouter } from "expo-router";
import { useMemo, useState } from "react";
import {
  FlatList,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { previewChats } from "@/lib/preview-data";
import { RadaPost, usePreviewStore } from "@/lib/preview-store";

const DAY_MS = 24 * 60 * 60 * 1000;

export default function ChatsScreen() {
  const router = useRouter();
  const store = usePreviewStore();
  const [radaCaption, setRadaCaption] = useState("");
  const [activeRadaId, setActiveRadaId] = useState<string | null>(null);
  const [replyDraft, setReplyDraft] = useState("");
  const [error, setError] = useState<string | null>(null);
  const ownRada = useMemo(
    () =>
      store.radas
        .filter((rada) => rada.authorId === "you")
        .sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt))[0],
    [store.radas],
  );
  const activeRada = store.radas.find((rada) => rada.id === activeRadaId);

  async function createRada() {
    setError(null);
    if (!store.ready) return;
    try {
      if (Platform.OS !== "web") {
        const permission =
          await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (!permission.granted) {
          setError("Allow photo-library access to choose a Rada image.");
          return;
        }
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        allowsEditing: true,
        quality: 0.72,
      });
      if (result.canceled) return;
      const selected = result.assets[0];
      if (!selected) {
        setError("This image could not be loaded. Please choose another photo.");
        return;
      }
      const resized = await ImageManipulator.manipulateAsync(
        selected.uri,
        [{ resize: { width: 1000 } }],
        { compress: 0.62, format: ImageManipulator.SaveFormat.JPEG, base64: true },
      );
      const imageData = resized.base64;
      if (!imageData) {
        setError("This image could not be loaded. Please choose another photo.");
        return;
      }
      store.publishRada(
        `data:image/jpeg;base64,${imageData}`,
        radaCaption.trim(),
      );
      setRadaCaption("");
    } catch (reason) {
      setError(
        reason instanceof Error
          ? `Could not create your Rada: ${reason.message}`
          : "Could not create your Rada.",
      );
    }
  }

  function openRada(rada: RadaPost) {
    store.recordRadaView(rada.id);
    setActiveRadaId(rada.id);
  }

  function sendReply() {
    const text = replyDraft.trim();
    if (!activeRada || activeRada.authorId === "you" || !text) return;
    store.commentRada(activeRada.id, text);
    setReplyDraft("");
  }

  return (
    <View style={styles.screen}>
      <FlatList
        data={previewChats}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        ListHeaderComponent={
          <View>
            <View style={styles.radaHeading}>
              <View>
                <Text style={styles.sectionTitle}>Private Rada</Text>
                <Text style={styles.sectionNote}>Only saved contacts · 24 hours</Text>
              </View>
              <View style={styles.addButtonWrap}>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={
                    ownRada ? "View your latest Rada" : "Create a private Rada"
                  }
                  disabled={!store.ready}
                  onPress={() =>
                    ownRada ? openRada(ownRada) : void createRada()
                  }
                  style={[
                    styles.addButton,
                    ownRada && styles.hasOwnRada,
                    !store.ready && styles.disabled,
                  ]}
                >
                  {ownRada ? (
                    <Image
                      source={{ uri: ownRada.image }}
                      style={styles.ownRadaThumb}
                    />
                  ) : (
                    <Ionicons name="add" size={28} color="#FFFFFF" />
                  )}
                </Pressable>
                {ownRada && (
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="Create another private Rada"
                    disabled={!store.ready}
                    onPress={() => void createRada()}
                    style={styles.addBadge}
                  >
                    <Ionicons name="add" size={13} color="#FFFFFF" />
                  </Pressable>
                )}
              </View>
            </View>
            {ownRada && (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="View your Rada and its insights"
                onPress={() => openRada(ownRada)}
                style={styles.ownRadaInfo}
              >
                <Text style={styles.ownRadaLabel}>Your latest Rada</Text>
                <Text style={styles.expiryText}>
                  Expires in {formatRemaining(ownRada.expiresAt)}
                </Text>
              </Pressable>
            )}
            <View style={styles.captionComposer}>
              <Ionicons name="lock-closed-outline" size={17} color="#5B43C2" />
              <TextInput
                accessibilityLabel="Private Rada text"
                value={radaCaption}
                onChangeText={setRadaCaption}
                maxLength={280}
                placeholder="Share a private update…"
                style={styles.captionInput}
              />
              <Text style={styles.characterCount}>{radaCaption.length}/280</Text>
            </View>
            <Text style={styles.eyebrow}>CHATS · SAVED CONTACTS</Text>
            {error && <Text accessibilityRole="alert" style={styles.error}>{error}</Text>}
            {store.storageError && (
              <Text accessibilityRole="alert" style={styles.error}>
                {store.storageError}
              </Text>
            )}
          </View>
        }
        renderItem={({ item }) => {
          const rada = store.radas.find(
            (entry) =>
              entry.authorId === item.id && Date.parse(entry.expiresAt) > Date.now(),
          );
          const lastPrivateMessage = store.privateMessages[item.id];
          const lastMessage =
            lastPrivateMessage?.[lastPrivateMessage.length - 1] ?? item.lastMessage;
          return (
            <View style={styles.row}>
              {item.savedContact && rada ? (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`View ${item.name}'s private Rada`}
                  onPress={() => openRada(rada)}
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
                    {lastMessage}
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
        visible={Boolean(activeRada)}
        animationType="fade"
        onRequestClose={() => {
          setActiveRadaId(null);
          setReplyDraft("");
        }}
      >
        {activeRada && (
          <KeyboardAvoidingView
            style={styles.radaScreen}
            behavior={Platform.OS === "ios" ? "padding" : undefined}
          >
            <View style={styles.radaHeader}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Close Rada"
                onPress={() => {
                  setActiveRadaId(null);
                  setReplyDraft("");
                }}
                style={styles.closeButton}
              >
                <Ionicons name="close" size={26} color="#FFFFFF" />
              </Pressable>
              <View>
                <Text style={styles.radaAuthor}>{activeRada.authorName}</Text>
                <Text style={styles.radaTime}>
                  Expires in {formatRemaining(activeRada.expiresAt)}
                </Text>
              </View>
              <Text style={styles.radaLabel}>RADA</Text>
            </View>
            <Image
              source={{ uri: activeRada.image }}
              style={styles.radaImage}
              resizeMode="contain"
            />
            <View style={styles.radaFooter}>
              {activeRada.caption ? (
                <Text style={styles.radaCaption}>{activeRada.caption}</Text>
              ) : null}
              {activeRada.authorId === "you" ? (
                <View style={styles.insights}>
                  <Text style={styles.insightsTitle}>Rada insights</Text>
                  <Text style={styles.insightLine}>
                    {activeRada.viewers.length}{" "}
                    {activeRada.viewers.length === 1 ? "viewer" : "viewers"}
                  </Text>
                  {activeRada.viewers.map((viewer) => (
                    <Text key={viewer.id} style={styles.insightDetail}>
                      {viewer.name} · viewed {formatAge(viewer.viewedAt)}
                    </Text>
                  ))}
                  <Text style={styles.insightLine}>
                    {activeRada.reactions.length}{" "}
                    {activeRada.reactions.length === 1 ? "heart" : "hearts"}
                  </Text>
                  {activeRada.reactions.map((reaction) => (
                    <Text key={reaction.id} style={styles.insightDetail}>
                      ♥ {reaction.name}
                    </Text>
                  ))}
                  <Text style={styles.insightLine}>
                    {activeRada.comments.length} private comments
                  </Text>
                  {activeRada.comments.map((comment) => (
                    <Text key={comment.id} style={styles.insightDetail}>
                      {comment.authorName}: {comment.text}
                    </Text>
                  ))}
                  {activeRada.viewers.length === 0 && (
                    <Text style={styles.radaPrivacy}>
                      Views and reactions from saved contacts will appear here.
                    </Text>
                  )}
                </View>
              ) : (
                <>
                  <View style={styles.radaViewerActions}>
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel={
                        activeRada.reactions.some((reaction) => reaction.id === "you")
                          ? "Unlike Rada"
                          : "Like Rada"
                      }
                      onPress={() => store.toggleRadaLike(activeRada.id)}
                      style={styles.heartButton}
                    >
                      <Ionicons
                        name={
                          activeRada.reactions.some((reaction) => reaction.id === "you")
                            ? "heart"
                            : "heart-outline"
                        }
                        size={25}
                        color={
                          activeRada.reactions.some((reaction) => reaction.id === "you")
                            ? "#FF6482"
                            : "#FFFFFF"
                        }
                      />
                      <Text style={styles.actionCount}>
                        {activeRada.reactions.length}
                      </Text>
                    </Pressable>
                    <Text style={styles.radaPrivacy}>
                      Shared privately with saved contacts
                    </Text>
                  </View>
                  {activeRada.comments.map((comment) => (
                    <Text key={comment.id} style={styles.commentLine}>
                      <Text style={styles.commentAuthor}>{comment.authorName}: </Text>
                      {comment.text}
                    </Text>
                  ))}
                  <View style={styles.replyComposer}>
                    <TextInput
                      accessibilityLabel="Comment on this private Rada"
                      value={replyDraft}
                      onChangeText={setReplyDraft}
                      onSubmitEditing={sendReply}
                      placeholder="Reply privately…"
                      returnKeyType="send"
                      style={styles.replyInput}
                    />
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel="Send private Rada comment"
                      disabled={!replyDraft.trim()}
                      onPress={sendReply}
                      style={[styles.replySend, !replyDraft.trim() && styles.disabled]}
                    >
                      <Ionicons name="send" size={18} color="#FFFFFF" />
                    </Pressable>
                  </View>
                </>
              )}
              <Text style={styles.privacyFooter}>
                Private preview · expires 24 hours after posting
              </Text>
            </View>
          </KeyboardAvoidingView>
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

function formatRemaining(expiresAt: string) {
  const remaining = Math.max(0, Date.parse(expiresAt) - Date.now());
  const hours = Math.floor(remaining / (60 * 60 * 1000));
  const minutes = Math.floor((remaining % (60 * 60 * 1000)) / (60 * 1000));
  return `${hours}h ${minutes}m`;
}

function formatAge(date: string) {
  const minutes = Math.max(0, Math.floor((Date.now() - Date.parse(date)) / 60000));
  return minutes < 1 ? "just now" : `${minutes}m ago`;
}

const styles = StyleSheet.create({
  screen: {
    alignSelf: "center",
    backgroundColor: "#FAF9FF",
    flex: 1,
    maxWidth: 760,
    width: "100%",
  },
  list: { paddingHorizontal: 18, paddingBottom: 24 },
  radaHeading: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 2,
    paddingTop: 12,
  },
  sectionTitle: { color: "#211D2B", fontSize: 17, fontWeight: "800" },
  sectionNote: { color: "#777386", fontSize: 11, marginTop: 3 },
  addButton: {
    alignItems: "center",
    backgroundColor: "#2583F7",
    borderRadius: 28,
    height: 56,
    justifyContent: "center",
    width: 56,
  },
  hasOwnRada: { backgroundColor: "transparent", borderColor: "#2583F7", borderWidth: 3 },
  addButtonWrap: { height: 56, position: "relative", width: 56 },
  ownRadaThumb: { borderRadius: 25, height: 50, width: 50 },
  addBadge: {
    alignItems: "center",
    backgroundColor: "#2583F7",
    borderColor: "#FFFFFF",
    borderRadius: 11,
    borderWidth: 2,
    bottom: -3,
    height: 22,
    justifyContent: "center",
    position: "absolute",
    right: -3,
    width: 22,
  },
  ownRadaInfo: { alignSelf: "flex-start", marginTop: 5 },
  ownRadaLabel: { color: "#514D5B", fontSize: 11, fontWeight: "700" },
  expiryText: { color: "#9692A0", fontSize: 10, marginTop: 2 },
  captionComposer: {
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderColor: "#E8E4EF",
    borderRadius: 13,
    borderWidth: 1,
    flexDirection: "row",
    gap: 8,
    marginTop: 12,
    minHeight: 46,
    paddingHorizontal: 12,
  },
  captionInput: { color: "#211D2B", flex: 1, fontSize: 13 },
  characterCount: { color: "#9692A0", fontSize: 10 },
  eyebrow: {
    alignSelf: "flex-start",
    backgroundColor: "#F0EDFA",
    borderRadius: 10,
    color: "#5B43C2",
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 0.6,
    marginTop: 18,
    paddingHorizontal: 9,
    paddingVertical: 5,
  },
  error: {
    backgroundColor: "#FFF0F0",
    borderRadius: 8,
    color: "#A51D2D",
    fontSize: 12,
    marginTop: 8,
    padding: 9,
  },
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
  radaScreen: { backgroundColor: "#16131C", flex: 1 },
  radaHeader: { alignItems: "center", flexDirection: "row", gap: 14, paddingHorizontal: 18, paddingTop: 24 },
  closeButton: { padding: 8 },
  radaAuthor: { color: "#FFFFFF", fontSize: 15, fontWeight: "700" },
  radaTime: { color: "#C8C4D0", fontSize: 12, marginTop: 3 },
  radaLabel: { color: "#80B8FF", fontSize: 12, fontWeight: "800", letterSpacing: 1.4, marginLeft: "auto" },
  radaImage: { flex: 1, minHeight: 180, width: "100%" },
  radaFooter: { paddingBottom: 20, paddingHorizontal: 20, paddingTop: 12 },
  radaCaption: { color: "#FFFFFF", fontSize: 15, marginBottom: 8 },
  insights: { maxHeight: 180 },
  insightsTitle: { color: "#FFFFFF", fontSize: 15, fontWeight: "800", marginBottom: 7 },
  insightLine: { color: "#FFFFFF", fontSize: 12, fontWeight: "700", marginTop: 5 },
  insightDetail: { color: "#D5D0DD", fontSize: 12, marginTop: 3 },
  radaPrivacy: { color: "#C8C4D0", flex: 1, fontSize: 11, marginLeft: 8 },
  radaViewerActions: { alignItems: "center", flexDirection: "row" },
  heartButton: { alignItems: "center", flexDirection: "row", gap: 6, paddingVertical: 4 },
  actionCount: { color: "#FFFFFF", fontSize: 12 },
  commentLine: { color: "#E7E3EB", fontSize: 12, lineHeight: 17, marginTop: 6 },
  commentAuthor: { color: "#FFFFFF", fontWeight: "700" },
  replyComposer: { alignItems: "center", flexDirection: "row", gap: 9, marginTop: 11 },
  replyInput: {
    backgroundColor: "#2A2632",
    borderColor: "#514D5B",
    borderRadius: 22,
    borderWidth: 1,
    color: "#FFFFFF",
    flex: 1,
    minHeight: 42,
    paddingHorizontal: 15,
  },
  replySend: {
    alignItems: "center",
    backgroundColor: "#2583F7",
    borderRadius: 22,
    height: 42,
    justifyContent: "center",
    width: 42,
  },
  disabled: { opacity: 0.45 },
  privacyFooter: { color: "#9692A0", fontSize: 10, marginTop: 9 },
});
