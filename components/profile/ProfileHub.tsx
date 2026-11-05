import { Ionicons } from "@expo/vector-icons";
import * as ImageManipulator from "expo-image-manipulator";
import * as ImagePicker from "expo-image-picker";
import * as LocalAuthentication from "expo-local-authentication";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from "react-native";
import { useAppSettings, bubbleColors, type AppSettings } from "@/lib/app-settings";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/lib/supabase";

type SettingsPage =
  | "home"
  | "profile"
  | "account"
  | "privacy"
  | "chats"
  | "appearance"
  | "notifications"
  | "storage"
  | "security"
  | "help";
type Contact = { id: string; username: string };
type ProfileData = {
  fullName: string;
  username: string;
  email: string;
  phone: string;
  dateOfBirth: string;
  sex: string;
  bio: string;
  about: string;
  picturePath: string | null;
};

const pageTitles: Record<SettingsPage, string> = {
  home: "Profile & settings",
  profile: "Profile details",
  account: "Account",
  privacy: "Privacy",
  chats: "Chats",
  appearance: "Appearance",
  notifications: "Notifications",
  storage: "Storage & data",
  security: "Security",
  help: "Help & about",
};

const initialProfile: ProfileData = {
  fullName: "",
  username: "",
  email: "",
  phone: "",
  dateOfBirth: "",
  sex: "",
  bio: "",
  about: "",
  picturePath: null,
};

export default function ProfileHub() {
  const { session } = useAuth();
  const { settings, updateSettings } = useAppSettings();
  const user = session?.user;
  const dark = settings.theme === "dark";
  const [page, setPage] = useState<SettingsPage>("home");
  const [profile, setProfile] = useState<ProfileData>(initialProfile);
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [blockedUsers, setBlockedUsers] = useState<Contact[]>([]);
  const [contactInput, setContactInput] = useState("");
  const [blockInput, setBlockInput] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deletePhrase, setDeletePhrase] = useState("");

  useEffect(() => {
    if (!user || !supabase) return;
    const client = supabase;
    const currentUser = user;
    let active = true;

    async function loadProfile() {
      setLoading(true);
      setError(null);
      const [publicResult, privateResult, contactsResult, blocksResult] =
        await Promise.all([
          client
            .from("public_profiles")
            .select(
              "full_name, username, bio, about, profile_picture_path, profile_picture_visibility",
            )
            .eq("user_id", currentUser.id)
            .maybeSingle(),
          client
            .from("private_profiles")
            .select("phone_number, date_of_birth, sex, rada_visibility, allow_links, allow_group_invites")
            .eq("user_id", currentUser.id)
            .maybeSingle(),
          client.from("saved_contacts").select("contact_id").eq("owner_id", currentUser.id),
          client
            .from("user_blocks")
            .select("blocked_id, blocked_username")
            .eq("blocker_id", currentUser.id),
        ]);
      const firstError =
        publicResult.error ??
        privateResult.error ??
        contactsResult.error ??
        blocksResult.error;
      if (firstError) throw firstError;

      const contactIds = (contactsResult.data ?? []).map((item) => item.contact_id);
      const [contactNames] = await Promise.all([
        contactIds.length
          ? client.from("public_profiles").select("user_id, username").in("user_id", contactIds)
          : Promise.resolve({ data: [], error: null }),
      ]);
      if (contactNames.error) throw contactNames.error;
      if (!active) return;

      const publicProfile = publicResult.data;
      const privateProfile = privateResult.data;
      setProfile({
        fullName: publicProfile?.full_name ?? String(currentUser.user_metadata.full_name ?? ""),
        username:
          publicProfile?.username ?? String(currentUser.user_metadata.username ?? ""),
        email: currentUser.email ?? "",
        phone:
          privateProfile?.phone_number ??
          String(currentUser.user_metadata.phone_number ?? ""),
        dateOfBirth: privateProfile?.date_of_birth ?? "",
        sex: privateProfile?.sex ?? "",
        bio: publicProfile?.bio ?? "",
        about: publicProfile?.about ?? "",
        picturePath: publicProfile?.profile_picture_path ?? null,
      });
      setContacts(
        (contactNames.data ?? []).map((item) => ({
          id: item.user_id,
          username: item.username,
        })),
      );
      setBlockedUsers(
        (blocksResult.data ?? []).map((item) => ({
          id: item.blocked_id,
          username: item.blocked_username,
        })),
      );
      updateSettings({
        profilePhotoVisibility:
          publicProfile?.profile_picture_visibility ?? "everyone",
        radaVisibility: privateProfile?.rada_visibility ?? "contacts",
        allowLinks: privateProfile?.allow_links ?? true,
        allowGroupInvites: privateProfile?.allow_group_invites ?? true,
      });
      if (publicProfile?.profile_picture_path) {
        const { data: signedPhoto, error: photoError } = await client.storage
          .from("profile-photos")
          .createSignedUrl(publicProfile.profile_picture_path, 3600);
        if (photoError) {
          setError(`Could not load your profile photo: ${photoError.message}`);
        } else if (active) {
          setPhotoUrl(signedPhoto.signedUrl);
        }
      } else {
        setPhotoUrl(null);
      }
    }

    void loadProfile()
      .catch((reason: unknown) => {
        if (active) {
          setError(
            reason instanceof Error
              ? `Could not load your profile: ${reason.message}`
              : "Could not load your profile.",
          );
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [user, updateSettings]);

  function updateProfile<K extends keyof ProfileData>(key: K, value: ProfileData[K]) {
    setProfile((current) => ({ ...current, [key]: value }));
  }

  function reportError(reason: unknown, action: string) {
    setError(
      reason instanceof Error
        ? `${action}: ${reason.message}`
        : `${action}. Please try again.`,
    );
  }

  async function saveProfile() {
    if (!user || !supabase) return;
    const username = profile.username.trim().toLowerCase();
    if (!/^[a-z0-9_]{3,30}$/.test(username)) {
      setError("Username must be 3–30 characters: letters, numbers, or underscores.");
      return;
    }
    if (profile.phone.trim().replace(/\D/g, "").length < 7) {
      setError("Enter a valid phone number.");
      return;
    }
    const birthday = profile.dateOfBirth.trim();
    if (birthday && !/^\d{4}-\d{2}-\d{2}$/.test(birthday)) {
      setError("Enter your date of birth as YYYY-MM-DD, or leave it blank.");
      return;
    }
    setError(null);
    setNotice(null);
    setSaving(true);
    try {
      const { error: publicError } = await supabase
        .from("public_profiles")
        .update({
          full_name: profile.fullName.trim(),
          username,
          bio: profile.bio.trim(),
          about: profile.about.trim(),
        })
        .eq("user_id", user.id);
      if (publicError) throw publicError;
      const { error: privateError } = await supabase
        .from("private_profiles")
        .update({
          phone_number: profile.phone.trim(),
          date_of_birth: birthday || null,
          sex: profile.sex.trim() || null,
        })
        .eq("user_id", user.id);
      if (privateError) throw privateError;
      setProfile((current) => ({ ...current, username }));
      setNotice("Your profile details are saved.");
    } catch (reason) {
      reportError(reason, "Could not save your profile");
    } finally {
      setSaving(false);
    }
  }

  async function pickProfilePhoto() {
    if (!user || !supabase) return;
    setError(null);
    try {
      if (Platform.OS !== "web") {
        const permission =
          await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (!permission.granted) {
          setError("Allow photo-library access to choose a profile picture.");
          return;
        }
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });
      if (result.canceled) return;
      const selected = result.assets[0];
      if (!selected) {
        setError("This image could not be loaded. Please choose another photo.");
        return;
      }
      const resized = await ImageManipulator.manipulateAsync(
        selected.uri,
        [{ resize: { width: 512, height: 512 } }],
        { compress: 0.8, format: ImageManipulator.SaveFormat.JPEG, base64: true },
      );
      if (!resized.base64) {
        setError("This image could not be loaded. Please choose another photo.");
        return;
      }
      const binary = atob(resized.base64);
      const bytes = new Uint8Array(binary.length);
      for (let index = 0; index < binary.length; index += 1) {
        bytes[index] = binary.charCodeAt(index);
      }
      const path = `${user.id}/avatar.jpg`;
      setSaving(true);
      const { error: uploadError } = await supabase.storage
        .from("profile-photos")
        .upload(path, bytes, {
          contentType: "image/jpeg",
          upsert: true,
        });
      if (uploadError) throw uploadError;
      const { error: updateError } = await supabase
        .from("public_profiles")
        .update({ profile_picture_path: path })
        .eq("user_id", user.id);
      if (updateError) throw updateError;
      const { data: signedPhoto, error: signedError } = await supabase.storage
        .from("profile-photos")
        .createSignedUrl(path, 3600);
      if (signedError) throw signedError;
      updateProfile("picturePath", path);
      setPhotoUrl(signedPhoto.signedUrl);
      setNotice("Your profile picture has been updated.");
    } catch (reason) {
      reportError(reason, "Could not update your profile picture");
    } finally {
      setSaving(false);
    }
  }

  async function removeProfilePhoto() {
    if (!user || !supabase || !profile.picturePath) return;
    setSaving(true);
    setError(null);
    setNotice(null);
    try {
      const { error: updateError } = await supabase
        .from("public_profiles")
        .update({ profile_picture_path: null })
        .eq("user_id", user.id);
      if (updateError) throw updateError;
      const { error: removeError } = await supabase.storage
        .from("profile-photos")
        .remove([profile.picturePath]);
      if (removeError) throw removeError;
      updateProfile("picturePath", null);
      setPhotoUrl(null);
      setNotice("Your profile picture has been removed.");
    } catch (reason) {
      reportError(reason, "Could not remove your profile picture");
    } finally {
      setSaving(false);
    }
  }

  async function updatePrivacy<K extends keyof Pick<
    AppSettings,
    "profilePhotoVisibility" | "radaVisibility" | "allowLinks" | "allowGroupInvites"
  >>(key: K, value: AppSettings[K]) {
    if (!user || !supabase) return;
    setError(null);
    setNotice(null);
    setSaving(true);
    try {
      const publicKeys = ["profilePhotoVisibility"] as const;
      if (publicKeys.includes(key as "profilePhotoVisibility")) {
        const { error: updateError } = await supabase
          .from("public_profiles")
          .update({ profile_picture_visibility: value })
          .eq("user_id", user.id);
        if (updateError) throw updateError;
      } else {
        const privateField =
          key === "radaVisibility"
            ? { rada_visibility: value }
            : key === "allowLinks"
              ? { allow_links: value }
              : { allow_group_invites: value };
        const { error: updateError } = await supabase
          .from("private_profiles")
          .update(privateField)
          .eq("user_id", user.id);
        if (updateError) throw updateError;
      }
      updateSettings({ [key]: value });
      setNotice("Privacy setting updated.");
    } catch (reason) {
      reportError(reason, "Could not save privacy setting");
    } finally {
      setSaving(false);
    }
  }

  async function addContact() {
    if (!user || !supabase) return;
    const username = contactInput.trim().toLowerCase();
    if (!username) {
      setError("Enter the username of the contact to save.");
      return;
    }
    setError(null);
    setNotice(null);
    setSaving(true);
    try {
      const { data: contact, error: lookupError } = await supabase
        .from("public_profiles")
        .select("user_id, username")
        .eq("username", username)
        .maybeSingle();
      if (lookupError) throw lookupError;
      if (!contact) throw new Error("No account has that username.");
      if (contact.user_id === user.id) {
        throw new Error("You cannot add your own account as a saved contact.");
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
      setContactInput("");
      setNotice(`${contact.username} was added to your saved contacts.`);
    } catch (reason) {
      reportError(reason, "Could not add saved contact");
    } finally {
      setSaving(false);
    }
  }

  async function blockAccount() {
    if (!user || !supabase) return;
    const username = blockInput.trim().replace(/^@/, "").toLowerCase();
    if (!username) {
      setError("Enter the username to block.");
      return;
    }
    setError(null);
    setNotice(null);
    setSaving(true);
    try {
      const { data: target, error: lookupError } = await supabase
        .from("public_profiles")
        .select("user_id, username")
        .eq("username", username)
        .maybeSingle();
      if (lookupError) throw lookupError;
      if (!target) throw new Error("No account has that username.");
      if (target.user_id === user.id) throw new Error("You cannot block your own account.");
      const { error: blockError } = await supabase.from("user_blocks").insert({
        blocker_id: user.id,
        blocked_id: target.user_id,
        blocked_username: target.username,
      });
      if (blockError) throw blockError;
      setBlockedUsers((current) => [
        ...current,
        { id: target.user_id, username: target.username },
      ]);
      setBlockInput("");
      setNotice(`@${target.username} is blocked. Profile and private-photo access is restricted both ways.`);
    } catch (reason) {
      reportError(reason, "Could not block account");
    } finally {
      setSaving(false);
    }
  }

  async function unblockAccount(target: Contact) {
    if (!user || !supabase) return;
    setSaving(true);
    setError(null);
    setNotice(null);
    try {
      const { error: unblockError } = await supabase
        .from("user_blocks")
        .delete()
        .eq("blocker_id", user.id)
        .eq("blocked_id", target.id);
      if (unblockError) throw unblockError;
      setBlockedUsers((current) => current.filter((entry) => entry.id !== target.id));
      setNotice(`@${target.username} is unblocked.`);
    } catch (reason) {
      reportError(reason, "Could not unblock account");
    } finally {
      setSaving(false);
    }
  }

  async function saveAccountChanges() {
    if (!user || !supabase) return;
    const email = profile.email.trim().toLowerCase();
    const emailChanged = email !== (user.email ?? "");
    const username = profile.username.trim().toLowerCase();
    const phone = profile.phone.trim();
    if (!email) {
      setError("Email address cannot be empty.");
      return;
    }
    if (profile.phone.trim().replace(/\D/g, "").length < 7) {
      setError("Enter a valid phone number.");
      return;
    }
    if (!/^[a-z0-9_]{3,30}$/.test(username)) {
      setError("Username must be 3–30 characters: letters, numbers, or underscores.");
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
    setError(null);
    setNotice(null);
    setSaving(true);
    try {
      if (emailChanged || newPassword) {
        const { error: authError } = await supabase.auth.updateUser({
          ...(emailChanged ? { email } : {}),
          ...(newPassword ? { password: newPassword } : {}),
        });
        if (authError) throw authError;
      }
      const { error: usernameError } = await supabase
        .from("public_profiles")
        .update({ username })
        .eq("user_id", user.id);
      if (usernameError) throw usernameError;
      const { error: phoneError } = await supabase
        .from("private_profiles")
        .update({ phone_number: phone })
        .eq("user_id", user.id);
      if (phoneError) throw phoneError;
      setProfile((current) => ({ ...current, username }));
      setPassword("");
      setPasswordConfirmation("");
      setNotice(
        emailChanged
          ? "Account updated. Check your email to confirm the new address."
          : "Your account details have been updated.",
      );
    } catch (reason) {
      reportError(reason, "Could not update your account");
    } finally {
      setSaving(false);
    }
  }

  const [newPassword, setPassword] = useState("");
  const [passwordConfirmation, setPasswordConfirmation] = useState("");

  async function enableBiometricLock() {
    if (Platform.OS === "web") {
      setError("Biometric app lock is only available in the native iOS and Android apps.");
      return;
    }
    setError(null);
    try {
      const [hasHardware, enrolled] = await Promise.all([
        LocalAuthentication.hasHardwareAsync(),
        LocalAuthentication.isEnrolledAsync(),
      ]);
      if (!hasHardware || !enrolled) {
        setError("Set up Face ID, fingerprint, or a device passcode in your device settings first.");
        return;
      }
      updateSettings({ biometricLock: true });
      setNotice("Device authentication is enabled. Unlock once to confirm.");
    } catch (reason) {
      reportError(reason, "Could not enable app lock");
    }
  }

  async function deleteAccount() {
    if (!supabase || deletePhrase !== "DELETE") return;
    setError(null);
    setSaving(true);
    try {
      const { error: deleteError } = await supabase.functions.invoke("delete-account", {
        method: "POST",
      });
      if (deleteError) throw deleteError;
      const { error: signOutError } = await supabase.auth.signOut({ scope: "local" });
      if (signOutError) throw signOutError;
      setConfirmDelete(false);
    } catch (reason) {
      reportError(reason, "Could not delete the account");
    } finally {
      setSaving(false);
    }
  }

  async function addOrSwitchAccount() {
    if (!supabase) return;
    setError(null);
    try {
      const { error: signOutError } = await supabase.auth.signOut();
      if (signOutError) throw signOutError;
    } catch (reason) {
      reportError(reason, "Could not switch accounts");
    }
  }

  function updateLocalSetting<K extends keyof AppSettings>(
    key: K,
    value: AppSettings[K],
  ) {
    updateSettings({ [key]: value });
  }

  if (!user || !supabase) return null;

  return (
    <KeyboardAvoidingView
      style={styles.screen}
      behavior={Platform.OS === "ios" && page !== "home" ? "padding" : undefined}
    >
      {page !== "home" && (
        <View style={[styles.topBar, dark && styles.darkCard]}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Back to profile settings"
            onPress={() => setPage("home")}
            style={styles.backButton}
          >
            <Ionicons name="arrow-back" size={22} color="#5B43C2" />
          </Pressable>
          <Text style={styles.topTitle}>{pageTitles[page]}</Text>
          <View style={styles.topSpacer} />
        </View>
      )}
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        {page === "home" ? (
          <>
            <View style={[styles.identity, dark && styles.darkIdentity]}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="View and edit your profile details"
                onPress={() => setPage("profile")}
                style={styles.avatarButton}
              >
                {photoUrl ? (
                  <Image source={{ uri: photoUrl }} style={styles.avatarImage} />
                ) : (
                  <View style={styles.avatarPlaceholder}>
                    <Text style={styles.avatarInitial}>
                      {(profile.fullName || profile.username || user.email || "Y")
                        .slice(0, 1)
                        .toUpperCase()}
                    </Text>
                  </View>
                )}
                <View style={styles.cameraBadge}>
                  <Ionicons name="camera" size={14} color="#FFFFFF" />
                </View>
              </Pressable>
              <Text style={[styles.identityName, dark && styles.darkPrimaryText]}>
                {profile.fullName ||
                  String(user.user_metadata.full_name ?? "Add your name")}
              </Text>
              <Text style={[styles.identityUsername, dark && styles.darkSecondaryText]}>
                @{profile.username || "username"}
              </Text>
              <Pressable
                accessibilityRole="button"
                onPress={() => setPage("profile")}
                style={styles.editProfileButton}
              >
                <Text style={styles.editProfileText}>View profile details</Text>
                <Ionicons name="chevron-forward" size={16} color="#5B43C2" />
              </Pressable>
            </View>
            {error && <Message kind="error" text={error} />}
            {notice && <Message kind="notice" text={notice} />}
            {loading && <ActivityIndicator color="#6C4CF1" style={styles.loading} />}
            <View style={styles.menu}>
              <SettingsRow icon="person-outline" title="Account settings" subtitle="Username, email, password and account" onPress={() => setPage("account")} />
              <SettingsRow icon="lock-closed-outline" title="Privacy settings" subtitle="Profile photo, Rada, links, groups and blocked accounts" onPress={() => setPage("privacy")} />
              <SettingsRow icon="chatbubble-ellipses-outline" title="Chats" subtitle="Message input, font size and chat options" onPress={() => setPage("chats")} />
              <SettingsRow icon="color-palette-outline" title="Appearance" subtitle="App theme and chat colors" onPress={() => setPage("appearance")} />
              <SettingsRow icon="notifications-outline" title="Notifications" subtitle="Notification preferences" onPress={() => setPage("notifications")} />
              <SettingsRow icon="server-outline" title="Storage and data" subtitle="Media, chat history and backup availability" onPress={() => setPage("storage")} />
              <SettingsRow icon="shield-checkmark-outline" title="Security" subtitle="App lock and account protection" onPress={() => setPage("security")} />
              <SettingsRow icon="help-circle-outline" title="Help and about" subtitle="Support and app information" onPress={() => setPage("help")} last />
            </View>
            <Pressable
              accessibilityRole="button"
              onPress={() => void addOrSwitchAccount()}
              style={styles.signOutButton}
            >
              <Text style={styles.signOutText}>Sign out</Text>
            </Pressable>
          </>
        ) : null}

        {page === "profile" && (
          <>
            {error && <Message kind="error" text={error} />}
            {notice && <Message kind="notice" text={notice} />}
            <Card title="Profile picture">
              <View style={styles.photoActions}>
                {photoUrl ? (
                  <Image source={{ uri: photoUrl }} style={styles.smallAvatar} />
                ) : (
                  <View style={[styles.smallAvatar, styles.avatarPlaceholder]}>
                    <Text style={styles.avatarInitial}>
                      {(profile.fullName || profile.username || "Y").slice(0, 1).toUpperCase()}
                    </Text>
                  </View>
                )}
                <View style={styles.photoButtons}>
                  <ActionButton title={saving ? "Saving…" : "Change picture"} onPress={() => void pickProfilePhoto()} disabled={saving} />
                  {profile.picturePath && (
                    <Pressable disabled={saving} onPress={() => void removeProfilePhoto()}>
                      <Text style={styles.removeText}>Remove picture</Text>
                    </Pressable>
                  )}
                </View>
              </View>
            </Card>
            <Card title="Public profile">
              <Text style={styles.hint}>Visible to people who can view your profile.</Text>
              <Field label="Name" value={profile.fullName} onChangeText={(value) => updateProfile("fullName", value)} maxLength={80} />
              <Field label="Username" value={profile.username} onChangeText={(value) => updateProfile("username", value)} autoCapitalize="none" />
              <Field label="Email (edit in Account settings)" value={profile.email} onChangeText={(value) => updateProfile("email", value)} keyboardType="email-address" editable={false} />
              <Field label="Bio" value={profile.bio} onChangeText={(value) => updateProfile("bio", value)} maxLength={160} />
              <Field label="About" value={profile.about} onChangeText={(value) => updateProfile("about", value)} multiline maxLength={600} />
            </Card>
            <Card title="Private details">
              <Text style={styles.hint}>Only you and saved contacts can view these details.</Text>
              <Field label="Phone number" value={profile.phone} onChangeText={(value) => updateProfile("phone", value)} keyboardType="phone-pad" />
              <Field label="Date of birth (optional)" value={profile.dateOfBirth} onChangeText={(value) => updateProfile("dateOfBirth", value)} placeholder="YYYY-MM-DD" />
              <Field label="Sex (optional)" value={profile.sex} onChangeText={(value) => updateProfile("sex", value)} />
            </Card>
            <ActionButton title={saving ? "Saving…" : "Save profile"} onPress={() => void saveProfile()} disabled={saving || loading} />
          </>
        )}

        {page === "account" && (
          <>
            {error && <Message kind="error" text={error} />}
            {notice && <Message kind="notice" text={notice} />}
            <Card title="Account details">
              <Text style={styles.hint}>Changing your email may require confirming the new address.</Text>
              <Field label="Username" value={profile.username} onChangeText={(value) => updateProfile("username", value)} autoCapitalize="none" />
              <Field label="Email address" value={profile.email} onChangeText={(value) => updateProfile("email", value)} keyboardType="email-address" />
              <Field label="Phone number" value={profile.phone} onChangeText={(value) => updateProfile("phone", value)} keyboardType="phone-pad" />
              <Field label="New password" value={newPassword} onChangeText={setPassword} secureTextEntry placeholder="Leave blank to keep current password" />
              <Field label="Confirm new password" value={passwordConfirmation} onChangeText={setPasswordConfirmation} secureTextEntry />
              <ActionButton title={saving ? "Updating…" : "Save account changes"} onPress={() => void saveAccountChanges()} disabled={saving} />
            </Card>
            <Card title="Accounts">
              <Text style={styles.hint}>Sign out to sign in or create another account. Only one account is active at a time on this device.</Text>
              <ActionButton title="Add or switch account" variant="secondary" onPress={() => void addOrSwitchAccount()} />
            </Card>
            <Card title="Delete account">
              <Text style={styles.warningText}>Permanently deletes your account and profile. This cannot be undone.</Text>
              <ActionButton title="Delete account…" variant="danger" onPress={() => setConfirmDelete(true)} />
            </Card>
          </>
        )}

        {page === "privacy" && (
          <>
            {error && <Message kind="error" text={error} />}
            {notice && <Message kind="notice" text={notice} />}
            <Card title="Profile picture visibility">
              <ChoiceGroup
                value={settings.profilePhotoVisibility}
                options={[
                  { value: "everyone", label: "Everyone" },
                  { value: "contacts", label: "Saved contacts" },
                  { value: "nobody", label: "Only me" },
                ]}
                onChange={(value) => void updatePrivacy("profilePhotoVisibility", value as AppSettings["profilePhotoVisibility"])}
                disabled={saving}
              />
            </Card>
            <Card title="Private Rada audience">
              <Text style={styles.hint}>Stored as your preference. Rada posts are currently local previews, so audience enforcement is not available yet.</Text>
              <ChoiceGroup
                value={settings.radaVisibility}
                options={[
                  { value: "everyone", label: "Everyone" },
                  { value: "contacts", label: "Saved contacts" },
                  { value: "nobody", label: "Only me" },
                ]}
                onChange={(value) => void updatePrivacy("radaVisibility", value as AppSettings["radaVisibility"])}
                disabled={saving}
              />
            </Card>
            <Card title="Requests">
              <SettingSwitch title="Allow links in messages" value={settings.allowLinks} onChange={(value) => void updatePrivacy("allowLinks", value)} disabled={saving} />
              <SettingSwitch title="Allow group invitations" value={settings.allowGroupInvites} onChange={(value) => void updatePrivacy("allowGroupInvites", value)} disabled={saving} last />
              <Text style={styles.hint}>Preferences are saved to your account. Link and group controls take effect when messaging and groups are connected to the backend.</Text>
            </Card>
            <Card title="Saved contacts">
              <Text style={styles.hint}>Saved contacts can see private profile details.</Text>
              <Composer value={contactInput} onChangeText={setContactInput} placeholder="Username to add" buttonTitle="Add" onSubmit={() => void addContact()} disabled={saving} />
              {contacts.length ? contacts.map((contact) => (
                <View key={contact.id} style={styles.personRow}>
                  <Text style={styles.personName}>@{contact.username}</Text>
                  <Pressable
                    disabled={saving}
                    onPress={async () => {
                      if (!user || !supabase) return;
                      setSaving(true);
                      setError(null);
                      try {
                        const { error: removeError } = await supabase.from("saved_contacts").delete().eq("owner_id", user.id).eq("contact_id", contact.id);
                        if (removeError) throw removeError;
                        setContacts((current) => current.filter((item) => item.id !== contact.id));
                      } catch (reason) {
                        reportError(reason, "Could not remove saved contact");
                      } finally {
                        setSaving(false);
                      }
                    }}
                  >
                    <Text style={styles.removeText}>Remove</Text>
                  </Pressable>
                </View>
              )) : <Text style={styles.emptyText}>No saved contacts yet.</Text>}
            </Card>
            <Card title="Blocked accounts">
              <Text style={styles.hint}>Blocking restricts profile and profile-photo access in both directions. Messaging and Rada previews are not server-backed yet.</Text>
              <Composer value={blockInput} onChangeText={setBlockInput} placeholder="Username to block" buttonTitle="Block" onSubmit={() => void blockAccount()} disabled={saving} />
              {blockedUsers.length ? blockedUsers.map((blocked) => (
                <View key={blocked.id} style={styles.personRow}>
                  <Text style={styles.personName}>@{blocked.username}</Text>
                  <Pressable disabled={saving} onPress={() => void unblockAccount(blocked)}>
                    <Text style={styles.linkText}>Unblock</Text>
                  </Pressable>
                </View>
              )) : <Text style={styles.emptyText}>No blocked accounts.</Text>}
            </Card>
          </>
        )}

        {page === "chats" && (
          <>
            <Card title="Messages">
              <SettingSwitch title="Enter key sends messages" value={settings.enterToSend} onChange={(value) => updateLocalSetting("enterToSend", value)} />
              <SettingSwitch title="Save received media to device gallery" value={settings.saveMediaToGallery} onChange={(value) => updateLocalSetting("saveMediaToGallery", value)} last />
              <Text style={styles.hint}>These preferences are saved on this device. The current chat preview does not download media.</Text>
            </Card>
            <Card title="Text size">
              <ChoiceGroup value={settings.chatFontSize} options={[{ value: "small", label: "Small" }, { value: "medium", label: "Medium" }, { value: "large", label: "Large" }]} onChange={(value) => updateLocalSetting("chatFontSize", value as AppSettings["chatFontSize"])} />
            </Card>
            <Card title="Chat history">
              <Text style={styles.hint}>Chats currently use sample messages and unsaved local preview replies. Clear history, backup, and transfer become available when persistent messaging is implemented.</Text>
              <UnavailableRow title="Chat backup" />
              <UnavailableRow title="Chat transfer" />
              <UnavailableRow title="Clear chat history" last />
            </Card>
          </>
        )}

        {page === "appearance" && (
          <>
            <Card title="App theme">
              <ChoiceGroup value={settings.theme} options={[{ value: "light", label: "Light" }, { value: "dark", label: "Dark" }]} onChange={(value) => updateLocalSetting("theme", value as AppSettings["theme"])} />
            </Card>
            <Card title="Sent message color">
              <ColorChoices value={settings.sentBubbleColor} onChange={(value) => updateLocalSetting("sentBubbleColor", value)} />
            </Card>
            <Card title="Received message color">
              <ColorChoices value={settings.receivedBubbleColor} onChange={(value) => updateLocalSetting("receivedBubbleColor", value)} />
            </Card>
            <Text style={styles.hint}>Theme and chat colors are stored on this device. App theme applies to the profile and chat screens.</Text>
          </>
        )}

        {page === "notifications" && (
          <>
            <Card title="Notifications">
              <SettingSwitch title="Enable notifications" value={settings.notificationsEnabled} onChange={(value) => updateLocalSetting("notificationsEnabled", value)} />
              <SettingSwitch title="Message notifications" value={settings.messageNotifications} onChange={(value) => updateLocalSetting("messageNotifications", value)} disabled={!settings.notificationsEnabled} />
              <SettingSwitch title="Group notifications" value={settings.groupNotifications} onChange={(value) => updateLocalSetting("groupNotifications", value)} disabled={!settings.notificationsEnabled} last />
            </Card>
            <Message kind="info" text="Preferences are saved locally. Push delivery is not connected yet." />
          </>
        )}

        {page === "storage" && (
          <>
            <Card title="Media">
              <SettingSwitch title="Save media to gallery" value={settings.saveMediaToGallery} onChange={(value) => updateLocalSetting("saveMediaToGallery", value)} last />
              <Text style={styles.hint}>The current preview does not save or download chat media.</Text>
            </Card>
            <Card title="Chat data">
              <Text style={styles.hint}>Chat messages are bundled examples or temporary preview replies. There is no server chat history, backup, or transfer yet.</Text>
              <UnavailableRow title="Back up chats" />
              <UnavailableRow title="Transfer chats" />
              <UnavailableRow title="Manage chat history" last />
            </Card>
            <Card title="App data">
              <Text style={styles.hint}>Settings are stored on this device. Your profile and account details are stored securely in Supabase.</Text>
            </Card>
          </>
        )}

        {page === "security" && (
          <>
            <Card title="App lock">
              <SettingSwitch
                title="Use Face ID or fingerprint"
                value={settings.biometricLock}
                onChange={(value) => {
                  if (value) void enableBiometricLock();
                  else updateLocalSetting("biometricLock", false);
                }}
                disabled={Platform.OS === "web"}
                last
              />
              <Text style={styles.hint}>Uses your device biometrics, with device passcode fallback. PIN and pattern app locks are not available yet. Native iOS/Android builds are required.</Text>
            </Card>
            <Card title="Account security">
              <Text style={styles.hint}>Never share your password or one-time confirmation codes. Sign out on shared devices.</Text>
              <Pressable onPress={() => setPage("account")} style={styles.navigationLink}>
                <Text style={styles.linkText}>Change password</Text>
                <Ionicons name="chevron-forward" size={16} color="#5B43C2" />
              </Pressable>
            </Card>
          </>
        )}

        {page === "help" && (
          <>
            <Card title="InstaChat">
              <Text style={styles.hint}>Profile, privacy, appearance, and account settings.</Text>
              <Text style={styles.hint}>Chats, Rada, feed, backup, and push notifications remain preview features until their server services are connected.</Text>
            </Card>
            <Card title="Need help?">
              <Text style={styles.hint}>For account access issues, use the Supabase Auth email confirmation and password recovery links configured for your project.</Text>
            </Card>
          </>
        )}
      </ScrollView>

      <Modal
        visible={confirmDelete}
        transparent
        animationType="fade"
        onRequestClose={() => {
          setConfirmDelete(false);
          setDeletePhrase("");
        }}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.deleteCard}>
            <Text style={styles.cardTitle}>Delete your account?</Text>
            <Text style={styles.warningText}>This permanently deletes your account and profile. Type DELETE to confirm.</Text>
            <TextInput
              accessibilityLabel="Type DELETE to confirm account deletion"
              autoCapitalize="characters"
              onChangeText={setDeletePhrase}
              placeholder="DELETE"
              value={deletePhrase}
              style={styles.input}
            />
            {error && <Message kind="error" text={error} />}
            <View style={styles.modalActions}>
              <ActionButton title="Cancel" variant="secondary" onPress={() => { setConfirmDelete(false); setDeletePhrase(""); }} />
              <ActionButton title={saving ? "Deleting…" : "Delete account"} variant="danger" disabled={saving || deletePhrase !== "DELETE"} onPress={() => void deleteAccount()} />
            </View>
          </View>
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={styles.card}>
      <Text style={styles.cardTitle}>{title}</Text>
      {children}
    </View>
  );
}

function Field({
  label,
  value,
  onChangeText,
  ...props
}: {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  placeholder?: string;
  autoCapitalize?: "none" | "sentences" | "words";
  keyboardType?: "default" | "email-address" | "phone-pad";
  editable?: boolean;
  secureTextEntry?: boolean;
  multiline?: boolean;
  maxLength?: number;
}) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        {...props}
        autoCapitalize={props.autoCapitalize ?? "none"}
        autoCorrect={false}
        editable={props.editable}
        onChangeText={onChangeText}
        placeholderTextColor="#A6A1B0"
        value={value}
        style={[styles.input, props.multiline && styles.multiline]}
      />
    </View>
  );
}

function ActionButton({
  title,
  onPress,
  disabled,
  variant = "primary",
}: {
  title: string;
  onPress: () => void;
  disabled?: boolean;
  variant?: "primary" | "secondary" | "danger";
}) {
  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled}
      onPress={onPress}
      style={[
        styles.actionButton,
        variant === "secondary" && styles.secondaryButton,
        variant === "danger" && styles.dangerButton,
        disabled && styles.disabled,
      ]}
    >
      <Text
        style={[
          styles.actionButtonText,
          variant === "secondary" && styles.secondaryButtonText,
        ]}
      >
        {title}
      </Text>
    </Pressable>
  );
}

function SettingsRow({
  icon,
  title,
  subtitle,
  onPress,
  last,
}: {
  icon: React.ComponentProps<typeof Ionicons>["name"];
  title: string;
  subtitle: string;
  onPress: () => void;
  last?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={[styles.settingsRow, last && styles.lastRow]}
    >
      <View style={styles.rowIcon}>
        <Ionicons name={icon} size={20} color="#5B43C2" />
      </View>
      <View style={styles.rowBody}>
        <Text style={styles.rowTitle}>{title}</Text>
        <Text style={styles.rowSubtitle}>{subtitle}</Text>
      </View>
      <Ionicons name="chevron-forward" size={18} color="#9692A0" />
    </Pressable>
  );
}

function SettingSwitch({
  title,
  value,
  onChange,
  disabled,
  last,
}: {
  title: string;
  value: boolean;
  onChange: (value: boolean) => void;
  disabled?: boolean;
  last?: boolean;
}) {
  return (
    <View style={[styles.switchRow, last && styles.lastRow, disabled && styles.dimmed]}>
      <Text style={styles.switchTitle}>{title}</Text>
      <Switch
        accessibilityLabel={title}
        value={value}
        onValueChange={onChange}
        disabled={disabled}
        trackColor={{ false: "#D8D4DF", true: "#9D8AF8" }}
        thumbColor={value ? "#6C4CF1" : "#FFFFFF"}
      />
    </View>
  );
}

function ChoiceGroup({
  value,
  options,
  onChange,
  disabled,
}: {
  value: string;
  options: { value: string; label: string }[];
  onChange: (value: string) => void;
  disabled?: boolean;
}) {
  return (
    <View style={styles.choices}>
      {options.map((option) => (
        <Pressable
          accessibilityRole="radio"
          accessibilityState={{ checked: value === option.value, disabled }}
          disabled={disabled}
          key={option.value}
          onPress={() => onChange(option.value)}
          style={[
            styles.choice,
            value === option.value && styles.selectedChoice,
            disabled && styles.dimmed,
          ]}
        >
          <Text style={[styles.choiceText, value === option.value && styles.selectedChoiceText]}>
            {option.label}
          </Text>
        </Pressable>
      ))}
    </View>
  );
}

function ColorChoices({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <View style={styles.colorChoices}>
      {bubbleColors.map((color) => (
        <Pressable
          accessibilityRole="radio"
          accessibilityLabel={`${color.name} message color`}
          accessibilityState={{ checked: value === color.value }}
          key={color.value}
          onPress={() => onChange(color.value)}
          style={[
            styles.colorChoice,
            { backgroundColor: color.value },
            value === color.value && styles.selectedColor,
          ]}
        />
      ))}
    </View>
  );
}

function Composer({
  value,
  onChangeText,
  placeholder,
  buttonTitle,
  onSubmit,
  disabled,
}: {
  value: string;
  onChangeText: (value: string) => void;
  placeholder: string;
  buttonTitle: string;
  onSubmit: () => void;
  disabled: boolean;
}) {
  return (
    <View style={styles.composer}>
      <TextInput
        accessibilityLabel={placeholder}
        autoCapitalize="none"
        autoCorrect={false}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor="#A6A1B0"
        value={value}
        style={[styles.input, styles.composerInput]}
      />
      <ActionButton title={buttonTitle} onPress={onSubmit} disabled={disabled || !value.trim()} />
    </View>
  );
}

function UnavailableRow({ title, last }: { title: string; last?: boolean }) {
  return (
    <View style={[styles.unavailableRow, last && styles.lastRow]}>
      <Text style={styles.unavailableTitle}>{title}</Text>
      <Text style={styles.unavailableValue}>Unavailable in preview</Text>
    </View>
  );
}

function Message({ kind, text }: { kind: "error" | "notice" | "info"; text: string }) {
  return (
    <Text
      accessibilityRole={kind === "error" ? "alert" : undefined}
      style={[
        styles.message,
        kind === "error" && styles.errorMessage,
        kind === "notice" && styles.noticeMessage,
        kind === "info" && styles.infoMessage,
      ]}
    >
      {text}
    </Text>
  );
}

const styles = StyleSheet.create({
  screen: { backgroundColor: "#FAF9FF", flex: 1 },
  darkScreen: { backgroundColor: "#15121C" },
  darkCard: { backgroundColor: "#211E29", borderColor: "#393442" },
  darkIdentity: { backgroundColor: "#211E29", borderColor: "#393442", borderRadius: 16, borderWidth: 1, marginBottom: 12 },
  darkPrimaryText: { color: "#F4F1F8" },
  darkSecondaryText: { color: "#C2BDCA" },
  content: { alignSelf: "center", maxWidth: 720, padding: 18, paddingBottom: 36, width: "100%" },
  topBar: { alignItems: "center", backgroundColor: "#FFFFFF", borderBottomColor: "#EEEAF5", borderBottomWidth: 1, flexDirection: "row", minHeight: 52, paddingHorizontal: 12 },
  backButton: { alignItems: "center", height: 42, justifyContent: "center", width: 42 },
  topTitle: { color: "#211D2B", flex: 1, fontSize: 16, fontWeight: "800", textAlign: "center" },
  topSpacer: { width: 42 },
  identity: { alignItems: "center", paddingBottom: 20, paddingTop: 16 },
  avatarButton: { height: 112, position: "relative", width: 112 },
  avatarImage: { borderColor: "#FFFFFF", borderRadius: 56, borderWidth: 3, height: 112, width: 112 },
  avatarPlaceholder: { alignItems: "center", backgroundColor: "#E9E3FF", borderRadius: 56, height: 112, justifyContent: "center", width: 112 },
  avatarInitial: { color: "#5B43C2", fontSize: 42, fontWeight: "800" },
  cameraBadge: { alignItems: "center", backgroundColor: "#6C4CF1", borderColor: "#FAF9FF", borderRadius: 17, borderWidth: 3, bottom: 1, height: 34, justifyContent: "center", position: "absolute", right: 1, width: 34 },
  identityName: { color: "#211D2B", fontSize: 21, fontWeight: "800", marginTop: 11 },
  identityUsername: { color: "#777386", fontSize: 14, marginTop: 3 },
  editProfileButton: { alignItems: "center", backgroundColor: "#F0EDFA", borderRadius: 18, flexDirection: "row", gap: 5, marginTop: 12, paddingHorizontal: 12, paddingVertical: 8 },
  editProfileText: { color: "#5B43C2", fontSize: 12, fontWeight: "700" },
  menu: { backgroundColor: "#FFFFFF", borderColor: "#EEEAF5", borderRadius: 16, borderWidth: 1, paddingHorizontal: 14 },
  settingsRow: { alignItems: "center", borderBottomColor: "#EEEAF5", borderBottomWidth: 1, flexDirection: "row", gap: 12, minHeight: 68, paddingVertical: 10 },
  lastRow: { borderBottomWidth: 0 },
  rowIcon: { alignItems: "center", backgroundColor: "#F0EDFA", borderRadius: 11, height: 38, justifyContent: "center", width: 38 },
  rowBody: { flex: 1 },
  rowTitle: { color: "#211D2B", fontSize: 14, fontWeight: "700" },
  rowSubtitle: { color: "#8A8594", fontSize: 11, marginTop: 3 },
  loading: { marginVertical: 8 },
  card: { backgroundColor: "#FFFFFF", borderColor: "#EEEAF5", borderRadius: 15, borderWidth: 1, marginBottom: 13, padding: 15 },
  cardTitle: { color: "#211D2B", fontSize: 15, fontWeight: "800", marginBottom: 10 },
  hint: { color: "#777386", fontSize: 12, lineHeight: 18, marginBottom: 10 },
  field: { marginBottom: 12 },
  label: { color: "#514D5B", fontSize: 12, fontWeight: "700", marginBottom: 6 },
  input: { backgroundColor: "#FAF9FF", borderColor: "#E8E4EF", borderRadius: 10, borderWidth: 1, color: "#211D2B", fontSize: 14, minHeight: 44, paddingHorizontal: 12, paddingVertical: 10 },
  multiline: { minHeight: 82, textAlignVertical: "top" },
  photoActions: { alignItems: "center", flexDirection: "row", gap: 14 },
  smallAvatar: { borderRadius: 32, height: 64, width: 64 },
  photoButtons: { alignItems: "flex-start", flex: 1, gap: 10 },
  actionButton: { alignItems: "center", alignSelf: "stretch", backgroundColor: "#6C4CF1", borderRadius: 10, justifyContent: "center", minHeight: 43, marginTop: 3, paddingHorizontal: 13 },
  actionButtonText: { color: "#FFFFFF", fontSize: 13, fontWeight: "800", textAlign: "center" },
  secondaryButton: { backgroundColor: "#F0EDFA" },
  secondaryButtonText: { color: "#5B43C2" },
  dangerButton: { backgroundColor: "#A51D2D" },
  disabled: { opacity: 0.5 },
  removeText: { color: "#A51D2D", fontSize: 12, fontWeight: "700" },
  warningText: { color: "#9B2836", fontSize: 12, lineHeight: 18, marginBottom: 10 },
  switchRow: { alignItems: "center", borderBottomColor: "#EEEAF5", borderBottomWidth: 1, flexDirection: "row", justifyContent: "space-between", minHeight: 52, paddingVertical: 5 },
  switchTitle: { color: "#302C38", flex: 1, fontSize: 13, paddingRight: 10 },
  dimmed: { opacity: 0.5 },
  choices: { flexDirection: "row", flexWrap: "wrap", gap: 7 },
  choice: { backgroundColor: "#F4F2F8", borderColor: "#E8E4EF", borderRadius: 10, borderWidth: 1, paddingHorizontal: 11, paddingVertical: 9 },
  selectedChoice: { backgroundColor: "#F0EDFA", borderColor: "#6C4CF1" },
  choiceText: { color: "#514D5B", fontSize: 12, fontWeight: "700" },
  selectedChoiceText: { color: "#5B43C2" },
  colorChoices: { flexDirection: "row", gap: 12, paddingVertical: 7 },
  colorChoice: { borderColor: "#FFFFFF", borderRadius: 16, borderWidth: 3, height: 36, width: 36 },
  selectedColor: { borderColor: "#211D2B" },
  composer: { alignItems: "center", flexDirection: "row", gap: 8 },
  composerInput: { flex: 1 },
  personRow: { alignItems: "center", borderBottomColor: "#EEEAF5", borderBottomWidth: 1, flexDirection: "row", justifyContent: "space-between", minHeight: 44 },
  personName: { color: "#302C38", fontSize: 13, fontWeight: "700" },
  linkText: { color: "#5B43C2", fontSize: 12, fontWeight: "700" },
  emptyText: { color: "#9692A0", fontSize: 12, marginTop: 8 },
  unavailableRow: { alignItems: "center", borderBottomColor: "#EEEAF5", borderBottomWidth: 1, flexDirection: "row", justifyContent: "space-between", minHeight: 43 },
  unavailableTitle: { color: "#777386", fontSize: 12 },
  unavailableValue: { color: "#AAA5B2", fontSize: 10 },
  navigationLink: { alignItems: "center", flexDirection: "row", justifyContent: "space-between", minHeight: 36 },
  signOutButton: { alignItems: "center", paddingVertical: 21 },
  signOutText: { color: "#A51D2D", fontSize: 14, fontWeight: "800" },
  message: { borderRadius: 9, fontSize: 12, lineHeight: 18, marginBottom: 11, padding: 10 },
  errorMessage: { backgroundColor: "#FFF0F0", color: "#A51D2D" },
  noticeMessage: { backgroundColor: "#EEF8F1", color: "#24613B" },
  infoMessage: { backgroundColor: "#F0EDFA", color: "#5B43C2" },
  modalBackdrop: { alignItems: "center", backgroundColor: "rgba(20, 17, 29, 0.62)", flex: 1, justifyContent: "center", padding: 20 },
  deleteCard: { backgroundColor: "#FFFFFF", borderRadius: 16, maxWidth: 420, padding: 18, width: "100%" },
  modalActions: { flexDirection: "row", gap: 9, marginTop: 10 },
});
