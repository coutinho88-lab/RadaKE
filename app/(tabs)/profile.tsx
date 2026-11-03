import { StyleSheet, Text, View } from "react-native";

export default function ProfileRoute() {
  return (
    <View style={styles.screen}>
      <View style={styles.avatar}>
        <Text style={styles.avatarText}>Y</Text>
      </View>
      <Text style={styles.name}>Your profile</Text>
      <Text style={styles.bio}>Sign in to add a bio, share posts, and follow friends.</Text>
      <Text style={styles.note}>Authentication and profile editing are not wired up yet.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { alignItems: "center", backgroundColor: "#FAF9FF", flex: 1, justifyContent: "center", padding: 28 },
  avatar: {
    alignItems: "center",
    backgroundColor: "#E9E3FF",
    borderRadius: 42,
    height: 84,
    justifyContent: "center",
    width: 84,
  },
  avatarText: { color: "#5B43C2", fontSize: 30, fontWeight: "700" },
  name: { color: "#211D2B", fontSize: 24, fontWeight: "800", marginTop: 16 },
  bio: { color: "#777386", fontSize: 14, lineHeight: 21, marginTop: 8, textAlign: "center" },
  note: { color: "#9692A0", fontSize: 12, marginTop: 18, textAlign: "center" },
});
