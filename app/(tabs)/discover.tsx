import { StyleSheet, Text, View } from "react-native";

export default function DiscoverRoute() {
  return (
    <View style={styles.screen}>
      <Text style={styles.eyebrow}>COMING SOON</Text>
      <Text style={styles.title}>Discover & Reels</Text>
      <Text style={styles.body}>
        A place for short videos and new creators. Video upload and discovery
        will be connected after the media backend is configured.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { backgroundColor: "#FAF9FF", flex: 1, justifyContent: "center", padding: 28 },
  eyebrow: { color: "#777386", fontSize: 10, fontWeight: "700", letterSpacing: 1.1 },
  title: { color: "#211D2B", fontSize: 28, fontWeight: "800", marginTop: 8 },
  body: { color: "#777386", fontSize: 15, lineHeight: 23, marginTop: 10 },
});
