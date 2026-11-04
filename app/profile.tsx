import { useEffect, useState } from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/lib/supabase";

type Contact = { id: string; username: string };

export default function ProfileRoute() {
  const { session } = useAuth();
  const user = session?.user;
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState(user?.email ?? "");
  const [phone, setPhone] = useState("");
  const [dateOfBirth, setDateOfBirth] = useState("");
  const [sex, setSex] = useState("");
  const [bio, setBio] = useState("");
  const [about, setAbout] = useState("");
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [contactUsername, setContactUsername] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [passwordConfirmation, setPasswordConfirmation] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    if (!user || !supabase) return;
    const client = supabase;
    const currentUser = user;
    let active = true;

    async function loadProfile() {
      setLoading(true);
      setError(null);
      const [publicResult, privateResult, savedContactsResult] = await Promise.all([
        client
          .from("public_profiles")
          .select("username, bio, about")
          .eq("user_id", currentUser.id)
          .maybeSingle(),
        client
          .from("private_profiles")
          .select("phone_number, date_of_birth, sex")
          .eq("user_id", currentUser.id)
          .maybeSingle(),
        client
          .from("saved_contacts")
          .select("contact_id")
          .eq("owner_id", currentUser.id),
      ]);

      const firstError =
        publicResult.error ?? privateResult.error ?? savedContactsResult.error;
      if (firstError) {
        if (active) setError(`Could not load your profile: ${firstError.message}`);
      } else {
        const contactIds = (savedContactsResult.data ?? []).map(
          (contact) => contact.contact_id,
        );
        const contactsResult = contactIds.length
          ? await client
              .from("public_profiles")
              .select("user_id, username")
              .in("user_id", contactIds)
          : { data: [], error: null };
        if (contactsResult.error) {
          if (active) {
            setError(`Could not load saved contacts: ${contactsResult.error.message}`);
          }
        } else if (active) {
          setUsername(
            publicResult.data?.username ??
              String(currentUser.user_metadata.username ?? ""),
          );
          setEmail(currentUser.email ?? "");
          setBio(publicResult.data?.bio ?? "");
          setAbout(publicResult.data?.about ?? "");
          setPhone(
            privateResult.data?.phone_number ??
              String(currentUser.user_metadata.phone_number ?? ""),
          );
          setDateOfBirth(privateResult.data?.date_of_birth ?? "");
          setSex(privateResult.data?.sex ?? "");
          setContacts(
            (contactsResult.data ?? []).map((contact) => ({
              id: contact.user_id,
              username: contact.username,
            })),
          );
        }
      }
      if (active) setLoading(false);
    }

    void loadProfile().catch((reason: unknown) => {
      if (!active) return;
      setError(
        reason instanceof Error
          ? `Could not load your profile: ${reason.message}`
          : "Could not load your profile.",
      );
      setLoading(false);
    });

    return () => {
      active = false;
    };
  }, [user]);

  async function saveProfile() {
    if (!user || !supabase) return;
    setError(null);
    setNotice(null);

    const normalizedUsername = username.trim().toLowerCase();
    if (!/^[a-z0-9_]{3,30}$/.test(normalizedUsername)) {
      setError("Username must be 3–30 characters: letters, numbers, or underscores.");
      return;
    }
    if (phone.trim().replace(/\D/g, "").length < 7) {
      setError("Enter a valid phone number.");
      return;
    }
    const normalizedDate = dateOfBirth.trim();
    if (normalizedDate && !/^\d{4}-\d{2}-\d{2}$/.test(normalizedDate)) {
      setError("Enter your date of birth as YYYY-MM-DD, or leave it blank.");
      return;
    }

    setSaving(true);
    try {
      const { error: publicError } = await supabase
        .from("public_profiles")
        .update({
          username: normalizedUsername,
          bio: bio.trim(),
          about: about.trim(),
        })
        .eq("user_id", user.id)
        .select("user_id")
        .single();
      if (publicError) throw publicError;

      const { error: privateError } = await supabase
        .from("private_profiles")
        .update({
          phone_number: phone.trim(),
          date_of_birth: normalizedDate || null,
          sex: sex.trim() || null,
        })
        .eq("user_id", user.id)
        .select("user_id")
        .single();
      if (privateError) throw privateError;
      setNotice("Your profile has been saved.");
    } catch (reason) {
      setError(
        reason instanceof Error
          ? `Could not save your profile: ${reason.message}`
          : "Could not save your profile.",
      );
    } finally {
      setSaving(false);
    }
  }

  async function saveAccountChanges() {
    if (!user || !supabase) return;
    setError(null);
    setNotice(null);

    const normalizedEmail = email.trim().toLowerCase();
    const emailChanged = normalizedEmail !== (user.email ?? "");
    if (!normalizedEmail) {
      setError("Email address cannot be empty.");
      return;
    }
    if (newPassword && newPassword.length < 8) {
      setError("Use a password with at least 8 characters.");
      return;
    }
    if (newPassword !== passwordConfirmation) {
      setError("The new passwords do not match.");
      return;
    }
    if (!emailChanged && !newPassword) {
      setError("Enter a new email address or password to update.");
      return;
    }

    setSaving(true);
    try {
      const { error: updateError } = await supabase.auth.updateUser({
        ...(emailChanged ? { email: normalizedEmail } : {}),
        ...(newPassword ? { password: newPassword } : {}),
      });
      if (updateError) throw updateError;
      setNewPassword("");
      setPasswordConfirmation("");
      setNotice(
        emailChanged
          ? "Account updated. Check your email to confirm the new address."
          : "Your password has been updated.",
      );
    } catch (reason) {
      setError(
        reason instanceof Error
          ? `Could not update your account: ${reason.message}`
          : "Could not update your account.",
      );
    } finally {
      setSaving(false);
    }
  }

  async function addContact() {
    if (!user || !supabase) return;
    setError(null);
    setNotice(null);
    const normalizedUsername = contactUsername.trim().toLowerCase();
    if (!normalizedUsername) {
      setError("Enter the username of the contact to save.");
      return;
    }

    setSaving(true);
    try {
      const { data: contact, error: lookupError } = await supabase
        .from("public_profiles")
        .select("user_id, username")
        .eq("username", normalizedUsername)
        .maybeSingle();
      if (lookupError) throw lookupError;
      if (!contact) {
        setError("No account has that username.");
        return;
      }
      if (contact.user_id === user.id) {
        setError("You cannot add your own account as a saved contact.");
        return;
      }
      const { error: insertError } = await supabase.from("saved_contacts").insert({
        owner_id: user.id,
        contact_id: contact.user_id,
      });
      if (insertError) throw insertError;
      setContacts((current) => [
        ...current,
        { id: contact.user_id, username: contact.username },
      ]);
      setContactUsername("");
      setNotice(`${contact.username} was added to your saved contacts.`);
    } catch (reason) {
      setError(
        reason instanceof Error
          ? `Could not add saved contact: ${reason.message}`
          : "Could not add saved contact.",
      );
    } finally {
      setSaving(false);
    }
  }

  async function removeContact(contact: Contact) {
    if (!user || !supabase) return;
    setError(null);
    setNotice(null);
    setSaving(true);
    try {
      const { error: deleteError } = await supabase
        .from("saved_contacts")
        .delete()
        .eq("owner_id", user.id)
        .eq("contact_id", contact.id);
      if (deleteError) throw deleteError;
      setContacts((current) => current.filter((entry) => entry.id !== contact.id));
      setNotice(`${contact.username} was removed from your saved contacts.`);
    } catch (reason) {
      setError(
        reason instanceof Error
          ? `Could not remove saved contact: ${reason.message}`
          : "Could not remove saved contact.",
      );
    } finally {
      setSaving(false);
    }
  }

  async function signOut() {
    if (!supabase) return;
    setError(null);
    try {
      const { error: signOutError } = await supabase.auth.signOut();
      if (signOutError) throw signOutError;
    } catch (reason) {
      setError(
        reason instanceof Error
          ? `Could not sign out: ${reason.message}`
          : "Could not sign out.",
      );
    }
  }

  if (!user || !supabase) return null;

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
    >
      <View style={styles.avatar}>
        <Text style={styles.avatarText}>
          {(username.trim() || user.email || "Y").slice(0, 1).toUpperCase()}
        </Text>
      </View>
      <Text style={styles.heading}>Your profile</Text>
      <Text style={styles.subtitle}>Manage your account and profile details.</Text>

      {error && <Text accessibilityRole="alert" style={styles.error}>{error}</Text>}
      {notice && <Text style={styles.notice}>{notice}</Text>}
      {loading && <Text style={styles.loading}>Loading profile…</Text>}

      <Section title="Public profile">
        <Text style={styles.privacyNote}>
          Username, email, bio, and about are visible to everyone, including people viewing the feed.
        </Text>
        <Field label="Username" value={username} onChangeText={setUsername} />
        <Field label="Bio" value={bio} onChangeText={setBio} maxLength={160} />
        <Field
          label="About"
          value={about}
          onChangeText={setAbout}
          maxLength={600}
          multiline
        />
      </Section>

      <Section title="Private details">
        <Text style={styles.privacyNote}>
          Phone, date of birth, and sex are visible only to you and people you save as contacts.
        </Text>
        <Field label="Phone number" value={phone} onChangeText={setPhone} keyboardType="phone-pad" />
        <Field
          label="Date of birth (optional)"
          value={dateOfBirth}
          onChangeText={setDateOfBirth}
          placeholder="YYYY-MM-DD"
        />
        <Field
          label="Sex (optional)"
          value={sex}
          onChangeText={setSex}
          placeholder="Enter if you want to share"
        />
        <PrimaryButton title={saving ? "Saving…" : "Save profile"} disabled={saving} onPress={() => void saveProfile()} />
      </Section>

      <Section title="Account security">
        <Text style={styles.privacyNote}>
          Passwords are managed securely by Supabase and are never stored in your profile.
        </Text>
        <Field
          label="Email (public)"
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
        />
        <Field
          label="New password"
          value={newPassword}
          onChangeText={setNewPassword}
          secureTextEntry
          placeholder="Leave blank to keep your current password"
        />
        <Field
          label="Confirm new password"
          value={passwordConfirmation}
          onChangeText={setPasswordConfirmation}
          secureTextEntry
        />
        <PrimaryButton
          title={saving ? "Updating…" : "Update email or password"}
          disabled={saving}
          onPress={() => void saveAccountChanges()}
        />
      </Section>

      <Section title="Saved contacts">
        <Text style={styles.privacyNote}>
          People you save can see your private details. Add them by their exact username.
        </Text>
        <View style={styles.contactComposer}>
          <TextInput
            accessibilityLabel="Username to add as a saved contact"
            autoCapitalize="none"
            autoCorrect={false}
            onChangeText={setContactUsername}
            placeholder="Username"
            placeholderTextColor="#A6A1B0"
            value={contactUsername}
            style={[styles.input, styles.contactInput]}
          />
          <Pressable
            accessibilityRole="button"
            disabled={saving}
            onPress={() => void addContact()}
            style={[styles.addButton, saving && styles.disabled]}
          >
            <Text style={styles.addButtonText}>Add</Text>
          </Pressable>
        </View>
        {contacts.length ? (
          contacts.map((contact) => (
            <View key={contact.id} style={styles.contactRow}>
              <Text style={styles.contactName}>@{contact.username}</Text>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`Remove ${contact.username} from saved contacts`}
                disabled={saving}
                onPress={() => void removeContact(contact)}
              >
                <Text style={styles.removeText}>Remove</Text>
              </Pressable>
            </View>
          ))
        ) : (
          <Text style={styles.emptyContacts}>No saved contacts yet.</Text>
        )}
      </Section>

      <Pressable accessibilityRole="button" onPress={() => void signOut()} style={styles.signOut}>
        <Text style={styles.signOutText}>Sign out</Text>
      </Pressable>
    </ScrollView>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {children}
    </View>
  );
}

type FieldProps = {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  placeholder?: string;
  keyboardType?: "default" | "email-address" | "phone-pad";
  secureTextEntry?: boolean;
  multiline?: boolean;
  maxLength?: number;
};

function Field({ label, value, onChangeText, ...inputProps }: FieldProps) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        {...inputProps}
        autoCapitalize="none"
        autoCorrect={false}
        onChangeText={onChangeText}
        placeholderTextColor="#A6A1B0"
        value={value}
        style={[styles.input, inputProps.multiline && styles.multiline]}
      />
    </View>
  );
}

function PrimaryButton({
  title,
  disabled,
  onPress,
}: {
  title: string;
  disabled: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled}
      onPress={onPress}
      style={[styles.primaryButton, disabled && styles.disabled]}
    >
      <Text style={styles.primaryText}>{title}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screen: { backgroundColor: "#FAF9FF", flex: 1 },
  content: { alignSelf: "center", maxWidth: 720, padding: 20, width: "100%" },
  avatar: {
    alignItems: "center",
    alignSelf: "center",
    backgroundColor: "#E9E3FF",
    borderRadius: 36,
    height: 72,
    justifyContent: "center",
    marginTop: 8,
    width: 72,
  },
  avatarText: { color: "#5B43C2", fontSize: 26, fontWeight: "800" },
  heading: { color: "#211D2B", fontSize: 23, fontWeight: "800", marginTop: 10, textAlign: "center" },
  subtitle: { color: "#777386", fontSize: 13, marginBottom: 8, marginTop: 5, textAlign: "center" },
  loading: { color: "#777386", fontSize: 13, marginVertical: 8, textAlign: "center" },
  section: {
    backgroundColor: "#FFFFFF",
    borderColor: "#EEEAF5",
    borderRadius: 16,
    borderWidth: 1,
    marginTop: 14,
    padding: 16,
  },
  sectionTitle: { color: "#211D2B", fontSize: 16, fontWeight: "800", marginBottom: 10 },
  privacyNote: { color: "#777386", fontSize: 12, lineHeight: 18, marginBottom: 12 },
  field: { marginBottom: 12 },
  label: { color: "#514D5B", fontSize: 12, fontWeight: "700", marginBottom: 6 },
  input: {
    backgroundColor: "#FAF9FF",
    borderColor: "#E8E4EF",
    borderRadius: 10,
    borderWidth: 1,
    color: "#211D2B",
    fontSize: 14,
    minHeight: 44,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  multiline: { minHeight: 84, textAlignVertical: "top" },
  primaryButton: {
    alignItems: "center",
    backgroundColor: "#6C4CF1",
    borderRadius: 10,
    justifyContent: "center",
    minHeight: 45,
    marginTop: 2,
  },
  primaryText: { color: "#FFFFFF", fontSize: 14, fontWeight: "800" },
  disabled: { opacity: 0.55 },
  contactComposer: { alignItems: "center", flexDirection: "row", gap: 8 },
  contactInput: { flex: 1 },
  addButton: {
    alignItems: "center",
    backgroundColor: "#6C4CF1",
    borderRadius: 10,
    justifyContent: "center",
    minHeight: 44,
    paddingHorizontal: 17,
  },
  addButtonText: { color: "#FFFFFF", fontSize: 13, fontWeight: "800" },
  contactRow: {
    alignItems: "center",
    borderBottomColor: "#EEEAF5",
    borderBottomWidth: 1,
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 12,
  },
  contactName: { color: "#211D2B", fontSize: 14, fontWeight: "700" },
  removeText: { color: "#A51D2D", fontSize: 12, fontWeight: "700" },
  emptyContacts: { color: "#9692A0", fontSize: 13, marginTop: 12 },
  signOut: { alignItems: "center", paddingVertical: 20 },
  signOutText: { color: "#A51D2D", fontSize: 14, fontWeight: "800" },
  error: {
    backgroundColor: "#FFF0F0",
    borderRadius: 9,
    color: "#A51D2D",
    fontSize: 13,
    lineHeight: 19,
    marginTop: 10,
    padding: 10,
  },
  notice: {
    backgroundColor: "#EEF8F1",
    borderRadius: 9,
    color: "#24613B",
    fontSize: 13,
    lineHeight: 19,
    marginTop: 10,
    padding: 10,
  },
});
