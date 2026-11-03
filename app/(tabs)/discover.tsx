import { Ionicons } from "@expo/vector-icons";
import { useMemo, useState } from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { previewDiscoverItems } from "@/lib/preview-data";

const trendingSearches = ["Outdoors", "City after dark", "Local makers"];

export default function DiscoverRoute() {
  const [query, setQuery] = useState("");
  const results = useMemo(() => {
    const term = query.trim().toLocaleLowerCase();
    if (!term) return previewDiscoverItems;
    return previewDiscoverItems.filter((item) =>
      `${item.category} ${item.title} ${item.description} ${item.source}`
        .toLocaleLowerCase()
        .includes(term),
    );
  }, [query]);

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
    >
      <Text style={styles.preview}>DISCOVER · TRENDING & COMMUNITY NEWS</Text>
      <View style={styles.searchBox}>
        <Ionicons name="search" color="#777386" size={20} />
        <TextInput
          accessibilityLabel="Search Discover"
          value={query}
          onChangeText={setQuery}
          placeholder="Search posts, topics, and news"
          returnKeyType="search"
          style={styles.searchInput}
        />
        {query.length > 0 && (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Clear search"
            onPress={() => setQuery("")}
            hitSlop={8}
          >
            <Ionicons name="close-circle" color="#9692A0" size={19} />
          </Pressable>
        )}
      </View>
      <Text style={styles.sectionTitle}>Popular searches</Text>
      <View style={styles.trends}>
        {trendingSearches.map((trend) => (
          <Pressable
            key={trend}
            accessibilityRole="button"
            onPress={() => setQuery(trend)}
            style={styles.trendChip}
          >
            <Ionicons name="trending-up" color="#5B43C2" size={15} />
            <Text style={styles.trendText}>{trend}</Text>
          </Pressable>
        ))}
      </View>
      <View style={styles.resultsHeading}>
        <Text style={styles.sectionTitle}>
          {query ? "Search results" : "Trending & news"}
        </Text>
        <Text style={styles.resultCount}>{results.length}</Text>
      </View>
      {results.length === 0 ? (
        <View style={styles.empty}>
          <Ionicons name="search-outline" size={28} color="#9692A0" />
          <Text style={styles.emptyTitle}>No matches yet</Text>
          <Text style={styles.emptyText}>
            Try another keyword to search the preview directory.
          </Text>
        </View>
      ) : (
        results.map((item, index) => (
          <View key={item.id} style={styles.resultCard}>
            <View
              style={[
                styles.resultIcon,
                item.category === "NEWS" && styles.newsIcon,
              ]}
            >
              <Ionicons
                name={item.category === "NEWS" ? "newspaper-outline" : "flame-outline"}
                color={item.category === "NEWS" ? "#2583F7" : "#E77A40"}
                size={21}
              />
            </View>
            <View style={styles.resultDetails}>
              <Text style={styles.category}>{item.category} · #{index + 1}</Text>
              <Text style={styles.resultTitle}>{item.title}</Text>
              <Text style={styles.description}>{item.description}</Text>
              <Text style={styles.source}>{item.source}</Text>
            </View>
            <Ionicons name="chevron-forward" color="#9692A0" size={18} />
          </View>
        ))
      )}
      <Text style={styles.disclaimer}>
        Preview content only. Connect a search and news provider to discover live public posts and news.
      </Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { backgroundColor: "#FAF9FF", flex: 1 },
  content: {
    alignSelf: "center",
    maxWidth: 760,
    paddingBottom: 28,
    paddingHorizontal: 20,
    paddingTop: 16,
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
    paddingHorizontal: 9,
    paddingVertical: 5,
  },
  searchBox: {
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderColor: "#E8E4EF",
    borderRadius: 14,
    borderWidth: 1,
    flexDirection: "row",
    gap: 10,
    marginTop: 18,
    minHeight: 50,
    paddingHorizontal: 14,
  },
  searchInput: { color: "#211D2B", flex: 1, fontSize: 14 },
  sectionTitle: { color: "#211D2B", fontSize: 17, fontWeight: "800" },
  trends: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 11 },
  trendChip: {
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderColor: "#E8E4EF",
    borderRadius: 18,
    borderWidth: 1,
    flexDirection: "row",
    gap: 6,
    paddingHorizontal: 11,
    paddingVertical: 8,
  },
  trendText: { color: "#514D5B", fontSize: 12, fontWeight: "600" },
  resultsHeading: { alignItems: "center", flexDirection: "row", gap: 8, marginBottom: 9, marginTop: 26 },
  resultCount: { color: "#9692A0", fontSize: 12 },
  resultCard: {
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderBottomColor: "#EEEAF5",
    borderBottomWidth: 1,
    flexDirection: "row",
    gap: 12,
    paddingHorizontal: 12,
    paddingVertical: 14,
  },
  resultIcon: {
    alignItems: "center",
    backgroundColor: "#FFF1E8",
    borderRadius: 22,
    height: 44,
    justifyContent: "center",
    width: 44,
  },
  newsIcon: { backgroundColor: "#EAF3FF" },
  resultDetails: { flex: 1 },
  category: { color: "#777386", fontSize: 9, fontWeight: "800", letterSpacing: 0.8 },
  resultTitle: { color: "#211D2B", fontSize: 14, fontWeight: "700", marginTop: 4 },
  description: { color: "#777386", fontSize: 12, lineHeight: 18, marginTop: 3 },
  source: { color: "#9692A0", fontSize: 10, marginTop: 6 },
  empty: { alignItems: "center", backgroundColor: "#FFFFFF", borderRadius: 14, marginTop: 8, padding: 28 },
  emptyTitle: { color: "#211D2B", fontSize: 15, fontWeight: "700", marginTop: 9 },
  emptyText: { color: "#777386", fontSize: 12, marginTop: 5, textAlign: "center" },
  disclaimer: { color: "#9692A0", fontSize: 11, lineHeight: 17, marginTop: 18 },
});
