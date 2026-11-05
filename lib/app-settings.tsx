import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

const STORAGE_KEY = "radake-app-settings-v1";

export type AppSettings = {
  theme: "light" | "dark";
  sentBubbleColor: string;
  receivedBubbleColor: string;
  chatFontSize: "small" | "medium" | "large";
  enterToSend: boolean;
  saveMediaToGallery: boolean;
  notificationsEnabled: boolean;
  messageNotifications: boolean;
  groupNotifications: boolean;
  profilePhotoVisibility: "everyone" | "contacts" | "nobody";
  radaVisibility: "everyone" | "contacts" | "nobody";
  allowLinks: boolean;
  allowGroupInvites: boolean;
  biometricLock: boolean;
};

const defaults: AppSettings = {
  theme: "light",
  sentBubbleColor: "#6C4CF1",
  receivedBubbleColor: "#FFFFFF",
  chatFontSize: "medium",
  enterToSend: false,
  saveMediaToGallery: false,
  notificationsEnabled: true,
  messageNotifications: true,
  groupNotifications: true,
  profilePhotoVisibility: "everyone",
  radaVisibility: "contacts",
  allowLinks: true,
  allowGroupInvites: true,
  biometricLock: false,
};

type SettingsContextValue = {
  settings: AppSettings;
  ready: boolean;
  updateSettings: (patch: Partial<AppSettings>) => void;
};

const SettingsContext = createContext<SettingsContextValue | null>(null);

function isAppSettings(value: unknown): value is Partial<AppSettings> {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

export function AppSettingsProvider({ children }: { children: React.ReactNode }) {
  const [settings, setSettings] = useState<AppSettings>(defaults);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let active = true;
    AsyncStorage.getItem(STORAGE_KEY)
      .then((stored) => {
        if (active && stored) {
          const parsed: unknown = JSON.parse(stored);
          if (!isAppSettings(parsed)) {
            throw new Error("Saved app settings have an unsupported format.");
          }
          setSettings({ ...defaults, ...parsed });
        }
      })
      .catch((error: unknown) => {
        console.error("Could not load saved app settings.", error);
      })
      .finally(() => {
        if (active) setReady(true);
      });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!ready) return;
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(settings)).catch((error: unknown) => {
      console.error("Could not save app settings.", error);
    });
  }, [ready, settings]);

  const updateSettings = useCallback(
    (patch: Partial<AppSettings>) =>
      setSettings((current) => ({ ...current, ...patch })),
    [],
  );
  const value = useMemo(
    () => ({ settings, ready, updateSettings }),
    [settings, ready, updateSettings],
  );

  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>;
}

export function useAppSettings() {
  const context = useContext(SettingsContext);
  if (!context) {
    throw new Error("useAppSettings must be used within AppSettingsProvider.");
  }
  return context;
}

export const bubbleColors = [
  { name: "Violet", value: "#6C4CF1" },
  { name: "Blue", value: "#2583F7" },
  { name: "Teal", value: "#148A83" },
  { name: "Rose", value: "#C04470" },
  { name: "Charcoal", value: "#45414E" },
];
