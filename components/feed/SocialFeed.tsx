import { useState } from "react";
import {
  FlatList,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { previewPosts, previewStories } from "@/lib/preview-data";

export default function SocialFeed() {
  const [likedPosts, setLikedPosts] = useState<string[]>([]);

  function toggleLike(postId: string) {
    setLikedPosts((current) =>
      current.includes(postId)
        ? current.filter((id) => id !== postId)
        : [...current, postId],
    );
  }

  return (
    <View style={styles.screen}>
      <View style={styles.header}>
        <Text style={styles.logo}>instachat</Text>
        <Text style={styles.headerAction}>♡</Text>
      </View>
      <Text style={styles.preview}>PREVIEW · Sample posts and stories</Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.storyScroll}
        contentContainerStyle={styles.stories}
      >
        {previewStories.map((story) => (
          <View key={story.id} style={styles.story}>
            <View style={styles.storyRing}>
              <View style={styles.storyAvatar}>
                <Text style={styles.storyInitial}>{story.name.slice(0, 1)}</Text>
              </View>
            </View>
            <Text numberOfLines={1} style={styles.storyName}>{story.name}</Text>
          </View>
        ))}
      </ScrollView>
      <FlatList
        data={previewPosts}
        keyExtractor={(post) => post.id}
        contentContainerStyle={styles.posts}
        renderItem={({ item }) => {
          const liked = likedPosts.includes(item.id);
          return (
            <View style={styles.post}>
              <View style={styles.postHeader}>
                <View style={styles.postAvatar}><Text style={styles.storyInitial}>{item.author.slice(0, 1)}</Text></View>
                <View style={styles.authorInfo}>
                  <Text style={styles.author}>{item.author}</Text>
                  <Text style={styles.location}>{item.location}</Text>
                </View>
                <Text style={styles.more}>•••</Text>
              </View>
              <Image source={{ uri: item.image }} style={styles.postImage} />
              <View style={styles.postActions}>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={liked ? "Unlike post" : "Like post"}
                  onPress={() => toggleLike(item.id)}
                >
                  <Text style={[styles.like, liked && styles.liked]}>{liked ? "♥" : "♡"}</Text>
                </Pressable>
                <Text style={styles.action}>◯</Text>
                <Text style={styles.action}>↗</Text>
                <Text style={styles.bookmark}>⌑</Text>
              </View>
              <Text style={styles.likes}>{item.likes + (liked ? 1 : 0)} likes</Text>
              <Text style={styles.caption}>
                <Text style={styles.author}>{item.author} </Text>{item.caption}
              </Text>
              <Text style={styles.comments}>View all {item.comments} comments</Text>
            </View>
          );
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    alignSelf: "center",
    backgroundColor: "#FAF9FF",
    flex: 1,
    maxWidth: 620,
    paddingTop: 54,
    width: "100%",
  },
  header: { alignItems: "center", borderBottomColor: "#EEEAF5", borderBottomWidth: 1, flexDirection: "row", justifyContent: "space-between", paddingHorizontal: 18, paddingBottom: 12 },
  logo: { color: "#211D2B", fontSize: 24, fontWeight: "800", letterSpacing: -1 },
  headerAction: { color: "#211D2B", fontSize: 27 },
  preview: {
    alignSelf: "flex-start",
    backgroundColor: "#F0EDFA",
    borderRadius: 10,
    color: "#5B43C2",
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 0.4,
    marginHorizontal: 18,
    marginTop: 9,
    paddingHorizontal: 9,
    paddingVertical: 4,
  },
  storyScroll: { flexGrow: 0, flexShrink: 0, height: 104 },
  stories: { gap: 14, paddingHorizontal: 16, paddingVertical: 11 },
  story: { alignItems: "center", flexShrink: 0, width: 62 },
  storyRing: { alignItems: "center", borderColor: "#A58BFF", borderRadius: 31, borderWidth: 2, height: 62, justifyContent: "center", width: 62 },
  storyAvatar: { alignItems: "center", backgroundColor: "#E9E3FF", borderRadius: 25, height: 50, justifyContent: "center", width: 50 },
  storyInitial: { color: "#5B43C2", fontSize: 17, fontWeight: "700" },
  storyName: { color: "#514D5B", fontSize: 10, marginTop: 5, maxWidth: 60 },
  posts: { paddingBottom: 18 },
  post: { backgroundColor: "#FFFFFF", borderBottomColor: "#EEEAF5", borderBottomWidth: 1, marginBottom: 12, paddingBottom: 13 },
  postHeader: { alignItems: "center", flexDirection: "row", paddingHorizontal: 14, paddingVertical: 10 },
  postAvatar: { alignItems: "center", backgroundColor: "#E9E3FF", borderRadius: 17, height: 34, justifyContent: "center", width: 34 },
  authorInfo: { flex: 1, marginLeft: 9 },
  author: { color: "#211D2B", fontSize: 13, fontWeight: "700" },
  location: { color: "#777386", fontSize: 10, marginTop: 2 },
  more: { color: "#514D5B", fontWeight: "700", letterSpacing: 2 },
  postImage: { aspectRatio: 1, backgroundColor: "#E9E3FF", width: "100%" },
  postActions: { alignItems: "center", flexDirection: "row", gap: 16, paddingHorizontal: 14, paddingTop: 10 },
  like: { color: "#211D2B", fontSize: 26 },
  liked: { color: "#E34468" },
  action: { color: "#211D2B", fontSize: 22 },
  bookmark: { color: "#211D2B", fontSize: 24, marginLeft: "auto" },
  likes: { color: "#211D2B", fontSize: 12, fontWeight: "700", paddingHorizontal: 14, paddingTop: 4 },
  caption: { color: "#514D5B", fontSize: 12, lineHeight: 18, paddingHorizontal: 14, paddingTop: 4 },
  comments: { color: "#9692A0", fontSize: 11, paddingHorizontal: 14, paddingTop: 3 },
});
