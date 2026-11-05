import { Ionicons } from "@expo/vector-icons";
import { useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { isSupabaseConfigured, supabase } from "@/lib/supabase";

type AuthMode = "sign-in" | "sign-up";

export default function AuthScreen({
  authError,
}: {
  authError: string | null;
}) {
  const [mode, setMode] = useState<AuthMode>("sign-in");
  const [fullName, setFullName] = useState("");
  const [username, setUsername] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirmation, setPasswordConfirmation] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  function changeMode(nextMode: AuthMode) {
    setMode(nextMode);
    setError(null);
    setNotice(null);
  }

  async function submit() {
    setError(null);
    setNotice(null);
    if (!supabase) {
      setError("Authentication is unavailable until Supabase is configured.");
      return;
    }

    const normalizedEmail = email.trim().toLowerCase();
    if (!normalizedEmail) {
      setError("Enter your email address.");
      return;
    }
    if (password.length < 8) {
      setError("Use a password with at least 8 characters.");
      return;
    }

    if (mode === "sign-up") {
      const normalizedUsername = username.trim().toLowerCase();
      if (!fullName.trim()) {
        setError("Enter your name.");
        return;
      }
      if (!/^[a-z0-9_]{3,30}$/.test(normalizedUsername)) {
        setError("Username must be 3–30 characters: letters, numbers, or underscores.");
        return;
      }
      if (phone.trim().replace(/\D/g, "").length < 7) {
        setError("Enter a valid phone number.");
        return;
      }
      if (password !== passwordConfirmation) {
        setError("The passwords do not match.");
        return;
      }
    }

    setBusy(true);
    try {
      if (mode === "sign-up") {
        const { data, error: signUpError } = await supabase.auth.signUp({
          email: normalizedEmail,
          password,
          options: {
            data: {
              full_name: fullName.trim(),
              username: username.trim().toLowerCase(),
              phone_number: phone.trim(),
            },
          },
        });
        if (signUpError) throw signUpError;
        if (!data.session) {
          setNotice("Account created. Check your email to confirm your address, then sign in.");
        }
      } else {
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email: normalizedEmail,
          password,
        });
        if (signInError) throw signInError;
      }
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : "We could not complete your request. Please try again.",
      );
    } finally {
      setBusy(false);
    }
  }

  const signingUp = mode === "sign-up";

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      style={styles.screen}
    >
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.logo}>
          <Ionicons name="chatbubbles" size={30} color="#FFFFFF" />
        </View>
        <Text style={styles.title}>{signingUp ? "Create your account" : "Welcome back"}</Text>
        <Text style={styles.subtitle}>
          {signingUp
            ? "Join the conversation and set up your profile."
            : "Sign in to continue to InstaChat."}
        </Text>

        {!isSupabaseConfigured && (
          <Text accessibilityRole="alert" style={styles.setupNotice}>
            Set EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY to enable accounts.
          </Text>
        )}
        {authError && (
          <Text accessibilityRole="alert" style={styles.error}>
            {authError}
          </Text>
        )}

        {signingUp && (
          <>
            <Field
              label="Full name"
              value={fullName}
              onChangeText={setFullName}
              autoCapitalize="words"
              placeholder="Your name"
              textContentType="name"
            />
            <Field
              label="Username"
              value={username}
              onChangeText={setUsername}
              autoCapitalize="none"
              placeholder="your_username"
              textContentType="username"
            />
            <Field
              label="Phone number"
              value={phone}
              onChangeText={setPhone}
              keyboardType="phone-pad"
              placeholder="+1 555 123 4567"
              textContentType="telephoneNumber"
            />
          </>
        )}
        <Field
          label="Email"
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
          placeholder="you@example.com"
          textContentType="emailAddress"
        />
        <Field
          label="Password"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          placeholder="At least 8 characters"
          textContentType={signingUp ? "newPassword" : "password"}
        />
        {signingUp && (
          <Field
            label="Confirm password"
            value={passwordConfirmation}
            onChangeText={setPasswordConfirmation}
            secureTextEntry
            placeholder="Enter your password again"
            textContentType="newPassword"
          />
        )}

        {error && (
          <Text accessibilityRole="alert" style={styles.error}>
            {error}
          </Text>
        )}
        {notice && <Text style={styles.notice}>{notice}</Text>}

        <Pressable
          accessibilityRole="button"
          disabled={busy || !isSupabaseConfigured}
          onPress={() => void submit()}
          style={[
            styles.primaryButton,
            (busy || !isSupabaseConfigured) && styles.disabled,
          ]}
        >
          <Text style={styles.primaryText}>
            {busy ? "Please wait…" : signingUp ? "Create account" : "Sign in"}
          </Text>
        </Pressable>

        <View style={styles.switchRow}>
          <Text style={styles.switchText}>
            {signingUp ? "Already have an account?" : "New to InstaChat?"}
          </Text>
          <Pressable
            accessibilityRole="button"
            onPress={() => changeMode(signingUp ? "sign-in" : "sign-up")}
          >
            <Text style={styles.switchAction}>
              {signingUp ? "Sign in" : "Create account"}
            </Text>
          </Pressable>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

type FieldProps = {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  placeholder: string;
  autoCapitalize?: "none" | "sentences" | "words" | "characters";
  keyboardType?: "default" | "email-address" | "phone-pad";
  secureTextEntry?: boolean;
  textContentType?: "name" | "username" | "telephoneNumber" | "emailAddress" | "newPassword" | "password";
};

function Field({ label, ...inputProps }: FieldProps) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        {...inputProps}
        autoCorrect={false}
        placeholderTextColor="#A6A1B0"
        style={styles.input}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { backgroundColor: "#FAF9FF", flex: 1 },
  content: {
    alignSelf: "center",
    justifyContent: "center",
    maxWidth: 460,
    minHeight: "100%",
    padding: 28,
    width: "100%",
  },
  logo: {
    alignItems: "center",
    alignSelf: "center",
    backgroundColor: "#6C4CF1",
    borderRadius: 24,
    height: 56,
    justifyContent: "center",
    width: 56,
  },
  title: { color: "#211D2B", fontSize: 26, fontWeight: "800", marginTop: 20, textAlign: "center" },
  subtitle: { color: "#777386", fontSize: 14, marginBottom: 24, marginTop: 7, textAlign: "center" },
  field: { marginBottom: 14 },
  label: { color: "#514D5B", fontSize: 12, fontWeight: "700", marginBottom: 6 },
  input: {
    backgroundColor: "#FFFFFF",
    borderColor: "#E8E4EF",
    borderRadius: 12,
    borderWidth: 1,
    color: "#211D2B",
    fontSize: 15,
    minHeight: 48,
    paddingHorizontal: 13,
  },
  setupNotice: {
    backgroundColor: "#FFF7E5",
    borderRadius: 10,
    color: "#795A15",
    fontSize: 12,
    lineHeight: 18,
    marginBottom: 16,
    padding: 11,
  },
  error: {
    backgroundColor: "#FFF0F0",
    borderRadius: 9,
    color: "#A51D2D",
    fontSize: 13,
    lineHeight: 19,
    marginBottom: 12,
    padding: 10,
  },
  notice: {
    backgroundColor: "#EEF8F1",
    borderRadius: 9,
    color: "#24613B",
    fontSize: 13,
    lineHeight: 19,
    marginBottom: 12,
    padding: 10,
  },
  primaryButton: {
    alignItems: "center",
    backgroundColor: "#6C4CF1",
    borderRadius: 12,
    justifyContent: "center",
    minHeight: 50,
    marginTop: 5,
  },
  primaryText: { color: "#FFFFFF", fontSize: 15, fontWeight: "800" },
  disabled: { opacity: 0.5 },
  switchRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: 5,
    justifyContent: "center",
    marginTop: 19,
  },
  switchText: { color: "#777386", fontSize: 13 },
  switchAction: { color: "#5B43C2", fontSize: 13, fontWeight: "800" },
});
