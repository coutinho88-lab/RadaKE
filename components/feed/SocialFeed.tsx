import { Ionicons } from "@expo/vector-icons";
import { useState } from "react";
import {
  FlatList,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import {
  previewComments,
  previewPosts,
} from "@/lib/preview-data";

type Post = (typeof previewPosts)[number];
type FeedModal =
  | { post: Post; mode: "comments" | "repost" | "quote" }
  | null;
type Quote = { id: string; post: Post; text: string };

export default function SocialFeed() {
  const [likedPosts, setLikedPosts] = useState<string[]>([]);
  const [repostedPosts, setRepostedPosts] = useState<string[]>([]);
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [comments, setComments] = useState<Record<string, string[]>>(
    () => Object.fromEntries(Object.entries(previewComments).map(([id, entries]) => [id, [...entries]])),
  );
  const [modal, setModal] = useState<FeedModal>(null);
  const [commentDraft, setCommentDraft] = useState("");
  const [quoteDraft, setQuoteDraft] = useState("");

  function toggleLike(postId: string) {
    setLikedPosts((current) =>
      current.includes(postId)
        ? current.filter((id) => id !== postId)
        : [...current, postId],
    );
  }

  function closeModal() {
    setModal(null);
    setCommentDraft("");
    setQuoteDraft("");
  }

  function addComment() {
    const text = commentDraft.trim();
    if (!text || modal?.mode !== "comments") return;
    setComments((current) => ({
      ...current,
      [modal.post.id]: [...(current[modal.post.id] ?? []), text],
    }));
    setCommentDraft("");
  }

  function addQuote() {
    const text = quoteDraft.trim();
    if (!text || modal?.mode !== "quote") return;
    setQuotes((current) => [
      { id: `${modal.post.id}-${Date.now()}`, post: modal.post, text },
      ...current,
    ]);
    closeModal();
  }

  function repost(postId: string) {
    setRepostedPosts((current) =>
      current.includes(postId) ? current : [...current, postId],
    );
    closeModal();
  }

  return (
    <View style={styles.screen}>
      <Text style={styles.preview}>PUBLIC FEED · SAMPLE POSTS</Text>
      <FlatList
        data={previewPosts}
        keyExtractor={(post) => post.id}
        contentContainerStyle={styles.posts}
        ListHeaderComponent={
          quotes.length > 0 ? (
            <View style={styles.quotes}>
              {quotes.map((quote) => (
                <View key={quote.id} style={styles.quoteCard}>
                  <Text style={styles.quoteByline}>You reposted with a quote</Text>
                  <Text style={styles.quoteText}>{quote.text}</Text>
                  <View style={styles.quotedPost}>
                    <Text style={styles.author}>{quote.post.author}</Text>
                    <Text style={styles.quotedCaption}>{quote.post.caption}</Text>
                  </View>
                </View>
              ))}
            </View>
          ) : null
        }
        renderItem={({ item }) => {
          const liked = likedPosts.includes(item.id);
          const reposted = repostedPosts.includes(item.id);
          const initialComments = previewComments[item.id]?.length ?? 0;
          const addedComments = Math.max(
            0,
            (comments[item.id]?.length ?? 0) - initialComments,
          );
          return (
            <View style={styles.post}>
              <View style={styles.postHeader}>
                <View style={styles.postAvatar}>
                  <Text style={styles.avatarInitial}>{item.author.slice(0, 1)}</Text>
                </View>
                <View style={styles.authorInfo}>
                  <Text style={styles.author}>{item.author}</Text>
                  <Text style={styles.location}>{item.location}</Text>
                </View>
                <Ionicons name="ellipsis-horizontal" size={20} color="#514D5B" />
              </View>
              <Image source={{ uri: item.image }} style={styles.postImage} />
              <View style={styles.postActions}>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={liked ? "Unlike post" : "Like post"}
                  onPress={() => toggleLike(item.id)}
                  style={styles.actionButton}
                >
                  <Ionicons
                    name={liked ? "heart" : "heart-outline"}
                    color={liked ? "#E34468" : "#211D2B"}
                    size={25}
                  />
                </Pressable>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`View comments on ${item.author}'s post`}
                  onPress={() => setModal({ post: item, mode: "comments" })}
                  style={styles.actionButton}
                >
                  <Ionicons name="chatbubble-outline" color="#211D2B" size={23} />
                </Pressable>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`Repost ${item.author}'s post`}
                  onPress={() => setModal({ post: item, mode: "repost" })}
                  style={styles.actionButton}
                >
                  <Ionicons
                    name="repeat-outline"
                    color={reposted ? "#2583F7" : "#211D2B"}
                    size={24}
                  />
                </Pressable>
                <Ionicons
                  name="bookmark-outline"
                  color="#211D2B"
                  size={23}
                  style={styles.bookmark}
                />
              </View>
              <Text style={styles.likes}>
                {item.likes + (liked ? 1 : 0)} likes
              </Text>
              <Text style={styles.caption}>
                <Text style={styles.author}>{item.author} </Text>
                {item.caption}
              </Text>
              <Pressable
                accessibilityRole="button"
                onPress={() => setModal({ post: item, mode: "comments" })}
                style={styles.commentLink}
              >
                <Text style={styles.comments}>
                  View all {item.comments + addedComments} comments
                </Text>
              </Pressable>
              <Text style={styles.repostCount}>
                {item.reposts + (reposted ? 1 : 0)} reposts
              </Text>
            </View>
          );
        }}
      />
      <Modal
        transparent
        visible={Boolean(modal)}
        animationType="fade"
        onRequestClose={closeModal}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          style={styles.modalBackdrop}
        >
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {modal?.mode === "comments"
                  ? "Comments"
                  : modal?.mode === "quote"
                    ? "Quote repost"
                    : "Share this post"}
              </Text>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Close"
                onPress={closeModal}
                hitSlop={10}
              >
                <Ionicons name="close" size={24} color="#514D5B" />
              </Pressable>
            </View>
            {modal?.mode === "comments" && (
              <>
                <ScrollView style={styles.commentList}>
                  {(comments[modal.post.id] ?? []).map((comment, index) => (
                    <View key={`${modal.post.id}-comment-${index}`} style={styles.commentRow}>
                      <View style={styles.commentAvatar}>
                        <Text style={styles.commentAvatarText}>
                          {index < (previewComments[modal.post.id]?.length ?? 0)
                            ? "F"
                            : "Y"}
                        </Text>
                      </View>
                      <Text style={styles.commentText}>{comment}</Text>
                    </View>
                  ))}
                </ScrollView>
                <View style={styles.composer}>
                  <TextInput
                    accessibilityLabel="Write a comment"
                    value={commentDraft}
                    onChangeText={setCommentDraft}
                    onSubmitEditing={addComment}
                    placeholder="Add a comment…"
                    returnKeyType="send"
                    style={styles.input}
                  />
                  <Pressable
                    accessibilityRole="button"
                    disabled={!commentDraft.trim()}
                    onPress={addComment}
                    style={styles.sendButton}
                  >
                    <Text style={styles.sendText}>Post</Text>
                  </Pressable>
                </View>
              </>
            )}
            {modal?.mode === "repost" && (
              <View style={styles.shareOptions}>
                <Pressable
                  accessibilityRole="button"
                  onPress={() => repost(modal.post.id)}
                  style={styles.shareOption}
                >
                  <Ionicons name="repeat-outline" size={22} color="#2583F7" />
                  <View>
                    <Text style={styles.shareOptionTitle}>Repost</Text>
                    <Text style={styles.shareOptionDescription}>
                      Share this post with your followers
                    </Text>
                  </View>
                </Pressable>
                <Pressable
                  accessibilityRole="button"
                  onPress={() => setModal({ post: modal.post, mode: "quote" })}
                  style={styles.shareOption}
                >
                  <Ionicons name="chatbox-ellipses-outline" size={22} color="#5B43C2" />
                  <View>
                    <Text style={styles.shareOptionTitle}>Quote post</Text>
                    <Text style={styles.shareOptionDescription}>
                      Add your comment before reposting
                    </Text>
                  </View>
                </Pressable>
              </View>
            )}
            {modal?.mode === "quote" && (
              <>
                <TextInput
                  accessibilityLabel="Write a quote"
                  multiline
                  autoFocus
                  value={quoteDraft}
                  onChangeText={setQuoteDraft}
                  placeholder="What do you think about this?"
                  style={styles.quoteInput}
                />
                <View style={styles.quotedPost}>
                  <Text style={styles.author}>{modal.post.author}</Text>
                  <Text style={styles.quotedCaption}>{modal.post.caption}</Text>
                </View>
                <Pressable
                  accessibilityRole="button"
                  disabled={!quoteDraft.trim()}
                  onPress={addQuote}
                  style={[styles.quoteSubmit, !quoteDraft.trim() && styles.disabled]}
                >
                  <Text style={styles.quoteSubmitText}>Quote repost</Text>
                </Pressable>
              </>
            )}
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    alignSelf: "center",
    backgroundColor: "#FAF9FF",
    flex: 1,
    maxWidth: 620,
    width: "100%",
  },
  preview: {
    alignSelf: "flex-start",
    backgroundColor: "#F0EDFA",
    borderRadius: 10,
    color: "#5B43C2",
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 0.4,
    marginHorizontal: 18,
    marginTop: 12,
    paddingHorizontal: 9,
    paddingVertical: 5,
  },
  posts: { paddingBottom: 18 },
  quotes: { paddingTop: 10 },
  quoteCard: {
    backgroundColor: "#FFFFFF",
    borderBottomColor: "#EEEAF5",
    borderBottomWidth: 1,
    marginBottom: 10,
    padding: 14,
  },
  quoteByline: { color: "#777386", fontSize: 11, fontWeight: "600" },
  quoteText: { color: "#211D2B", fontSize: 14, lineHeight: 21, marginTop: 8 },
  quotedPost: {
    borderColor: "#E8E4EF",
    borderRadius: 10,
    borderWidth: 1,
    marginTop: 10,
    padding: 12,
  },
  quotedCaption: { color: "#777386", fontSize: 12, lineHeight: 18, marginTop: 4 },
  post: {
    backgroundColor: "#FFFFFF",
    borderBottomColor: "#EEEAF5",
    borderBottomWidth: 1,
    marginBottom: 12,
    paddingBottom: 13,
  },
  postHeader: { alignItems: "center", flexDirection: "row", paddingHorizontal: 14, paddingVertical: 10 },
  postAvatar: {
    alignItems: "center",
    backgroundColor: "#E9E3FF",
    borderRadius: 17,
    height: 34,
    justifyContent: "center",
    width: 34,
  },
  avatarInitial: { color: "#5B43C2", fontSize: 16, fontWeight: "700" },
  authorInfo: { flex: 1, marginLeft: 9 },
  author: { color: "#211D2B", fontSize: 13, fontWeight: "700" },
  location: { color: "#777386", fontSize: 10, marginTop: 2 },
  postImage: { aspectRatio: 1, backgroundColor: "#E9E3FF", width: "100%" },
  postActions: { alignItems: "center", flexDirection: "row", gap: 14, paddingHorizontal: 14, paddingTop: 8 },
  actionButton: { alignItems: "center", justifyContent: "center", minHeight: 34, minWidth: 30 },
  bookmark: { marginLeft: "auto" },
  likes: { color: "#211D2B", fontSize: 12, fontWeight: "700", paddingHorizontal: 14, paddingTop: 4 },
  caption: { color: "#514D5B", fontSize: 12, lineHeight: 18, paddingHorizontal: 14, paddingTop: 4 },
  commentLink: { alignSelf: "flex-start" },
  comments: { color: "#9692A0", fontSize: 11, paddingHorizontal: 14, paddingTop: 5 },
  repostCount: { color: "#9692A0", fontSize: 10, paddingHorizontal: 14, paddingTop: 3 },
  modalBackdrop: {
    alignItems: "center",
    backgroundColor: "rgba(25, 20, 38, 0.48)",
    flex: 1,
    justifyContent: "center",
    padding: 18,
  },
  modalCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    maxHeight: "80%",
    maxWidth: 480,
    overflow: "hidden",
    padding: 18,
    width: "100%",
  },
  modalHeader: { alignItems: "center", flexDirection: "row", justifyContent: "space-between", paddingBottom: 14 },
  modalTitle: { color: "#211D2B", fontSize: 18, fontWeight: "800" },
  commentList: { maxHeight: 360, minHeight: 70 },
  commentRow: { alignItems: "center", flexDirection: "row", gap: 10, paddingVertical: 9 },
  commentAvatar: {
    alignItems: "center",
    backgroundColor: "#E9E3FF",
    borderRadius: 16,
    height: 32,
    justifyContent: "center",
    width: 32,
  },
  commentAvatarText: { color: "#5B43C2", fontSize: 12, fontWeight: "700" },
  commentText: { color: "#514D5B", flex: 1, fontSize: 13 },
  composer: { alignItems: "center", borderTopColor: "#EEEAF5", borderTopWidth: 1, flexDirection: "row", gap: 8, paddingTop: 12 },
  input: { backgroundColor: "#F5F3F9", borderRadius: 20, color: "#211D2B", flex: 1, minHeight: 40, paddingHorizontal: 14 },
  sendButton: { paddingHorizontal: 8, paddingVertical: 10 },
  sendText: { color: "#5B43C2", fontSize: 13, fontWeight: "700" },
  shareOptions: { gap: 6 },
  shareOption: { alignItems: "center", flexDirection: "row", gap: 14, paddingVertical: 13 },
  shareOptionTitle: { color: "#211D2B", fontSize: 14, fontWeight: "700" },
  shareOptionDescription: { color: "#777386", fontSize: 12, marginTop: 3 },
  quoteInput: { backgroundColor: "#F8F7FB", borderRadius: 12, color: "#211D2B", minHeight: 100, padding: 12, textAlignVertical: "top" },
  quoteSubmit: { alignItems: "center", backgroundColor: "#6C4CF1", borderRadius: 22, marginTop: 16, paddingVertical: 12 },
  quoteSubmitText: { color: "#FFFFFF", fontSize: 13, fontWeight: "700" },
  disabled: { opacity: 0.45 },
});
