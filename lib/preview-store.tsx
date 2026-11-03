import AsyncStorage from "@react-native-async-storage/async-storage";
import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { previewChats } from "@/lib/preview-data";

const STORAGE_KEY = "radake-preview-v1";
const RADA_LIFETIME_MS = 24 * 60 * 60 * 1000;

export type RadaReply = {
  id: string;
  authorName: string;
  text: string;
  createdAt: string;
};

export type RadaPost = {
  id: string;
  authorId: string;
  authorName: string;
  image: string;
  caption: string;
  createdAt: string;
  expiresAt: string;
  viewers: { id: string; name: string; viewedAt: string }[];
  reactions: { id: string; name: string }[];
  comments: RadaReply[];
};

export type UserPublicPost = {
  id: string;
  author: string;
  location: string;
  image?: string;
  likes: number;
  comments: number;
  reposts: number;
  caption: string;
  createdAt: string;
};

type PreviewState = {
  radas: RadaPost[];
  publicPosts: UserPublicPost[];
  privateMessages: Record<string, string[]>;
};

type PreviewStore = PreviewState & {
  ready: boolean;
  storageError: string | null;
  publishRada: (image: string, caption: string) => void;
  publishPublicPost: (image: string | undefined, caption: string) => void;
  recordRadaView: (radaId: string) => void;
  toggleRadaLike: (radaId: string) => void;
  commentRada: (radaId: string, text: string) => void;
};

const initialRadas: RadaPost[] = previewChats.flatMap((chat) => {
  if (!chat.savedContact || !chat.radaPost) return [];
  const createdAt = new Date(Date.now() - 12 * 60 * 1000).toISOString();
  return [{
    id: `preview-${chat.id}`,
    authorId: chat.id,
    authorName: chat.name,
    image: chat.radaPost.image,
    caption: chat.radaPost.caption,
    createdAt,
    expiresAt: new Date(Date.now() + RADA_LIFETIME_MS - 12 * 60 * 1000).toISOString(),
    viewers: [],
    reactions: [],
    comments: [],
  }];
});

const initialState: PreviewState = {
  radas: initialRadas,
  publicPosts: [],
  privateMessages: {},
};

const PreviewStoreContext = createContext<PreviewStore | null>(null);

export function PreviewStoreProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<PreviewState>(initialState);
  const [ready, setReady] = useState(false);
  const [storageError, setStorageError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    AsyncStorage.getItem(STORAGE_KEY)
      .then((stored) => {
        if (!active) return;
        if (stored) {
          const parsed: unknown = JSON.parse(stored);
          if (
            !parsed ||
            typeof parsed !== "object" ||
            !("version" in parsed) ||
            parsed.version !== 1 ||
            !("state" in parsed) ||
            !parsed.state ||
            typeof parsed.state !== "object"
          ) {
            throw new Error("Saved preview data has an unsupported format.");
          }
          const saved = parsed.state as PreviewState;
          if (
            !Array.isArray(saved.radas) ||
            !Array.isArray(saved.publicPosts) ||
            !saved.privateMessages ||
            typeof saved.privateMessages !== "object"
          ) {
            throw new Error("Saved preview data is incomplete.");
          }
          const now = Date.now();
          setState({
            ...saved,
            radas: saved.radas.filter(
              (rada) => Date.parse(rada.expiresAt) > now,
            ),
          });
        }
        setReady(true);
      })
      .catch((error: unknown) => {
        if (!active) return;
        setStorageError(
          error instanceof Error
            ? `Local preview storage could not be loaded: ${error.message}`
            : "Local preview storage could not be loaded.",
        );
        setReady(true);
      });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!ready) return;
    AsyncStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ version: 1, state }),
    )
      .then(() => setStorageError(null))
      .catch((error: unknown) => {
        setStorageError(
          error instanceof Error
            ? `Local preview changes could not be saved: ${error.message}`
            : "Local preview changes could not be saved.",
        );
      });
  }, [ready, state]);

  useEffect(() => {
    const ownRadas = state.radas.filter((rada) => rada.authorId === "you");
    const nextExpiry = ownRadas.reduce(
      (next, rada) => Math.min(next, Date.parse(rada.expiresAt)),
      Number.POSITIVE_INFINITY,
    );
    if (!Number.isFinite(nextExpiry)) return;
    const timeout = setTimeout(
      () => {
        setState((current) => ({
          ...current,
          radas: current.radas.filter(
            (rada) => Date.parse(rada.expiresAt) > Date.now(),
          ),
        }));
      },
      Math.max(0, nextExpiry - Date.now()),
    );
    return () => clearTimeout(timeout);
  }, [state.radas]);

  const value = useMemo<PreviewStore>(
    () => ({
      ...state,
      ready,
      storageError,
      publishRada: (image, caption) => {
        const now = Date.now();
        const createdAt = new Date(now).toISOString();
        const rada: RadaPost = {
          id: `rada-${now}`,
          authorId: "you",
          authorName: "Your Rada",
          image,
          caption,
          createdAt,
          expiresAt: new Date(now + RADA_LIFETIME_MS).toISOString(),
          viewers: [],
          reactions: [],
          comments: [],
        };
        setState((current) => ({
          ...current,
          radas: [...current.radas, rada],
        }));
      },
      publishPublicPost: (image, caption) => {
        const post: UserPublicPost = {
          id: `post-${Date.now()}`,
          author: "you",
          location: "Your profile",
          image,
          caption,
          likes: 0,
          comments: 0,
          reposts: 0,
          createdAt: new Date().toISOString(),
        };
        setState((current) => ({
          ...current,
          publicPosts: [post, ...current.publicPosts],
        }));
      },
      recordRadaView: (radaId) => {
        setState((current) => ({
          ...current,
          radas: current.radas.map((rada) => {
            if (
              rada.id !== radaId ||
              rada.authorId === "you" ||
              rada.viewers.some((viewer) => viewer.id === "you")
            ) {
              return rada;
            }
            return {
              ...rada,
              viewers: [
                ...rada.viewers,
                { id: "you", name: "You", viewedAt: new Date().toISOString() },
              ],
            };
          }),
        }));
      },
      toggleRadaLike: (radaId) => {
        setState((current) => ({
          ...current,
          radas: current.radas.map((rada) => {
            if (rada.id !== radaId) return rada;
            const liked = rada.reactions.some((reaction) => reaction.id === "you");
            return {
              ...rada,
              reactions: liked
                ? rada.reactions.filter((reaction) => reaction.id !== "you")
                : [...rada.reactions, { id: "you", name: "You" }],
            };
          }),
        }));
      },
      commentRada: (radaId, text) => {
        const message = text.trim();
        if (!message) return;
        setState((current) => {
          const rada = current.radas.find((item) => item.id === radaId);
          if (!rada || rada.authorId === "you") return current;
          const reply: RadaReply = {
            id: `reply-${Date.now()}`,
            authorName: "You",
            text: message,
            createdAt: new Date().toISOString(),
          };
          return {
            ...current,
            radas: current.radas.map((item) =>
              item.id === radaId
                ? { ...item, comments: [...item.comments, reply] }
                : item,
            ),
            privateMessages: {
              ...current.privateMessages,
              [rada.authorId]: [
                ...(current.privateMessages[rada.authorId] ?? []),
                `Rada reply: ${message}`,
              ],
            },
          };
        });
      },
    }),
    [ready, state, storageError],
  );

  return (
    <PreviewStoreContext.Provider value={value}>
      {children}
    </PreviewStoreContext.Provider>
  );
}

export function usePreviewStore() {
  const store = useContext(PreviewStoreContext);
  if (!store) {
    throw new Error("usePreviewStore must be used within PreviewStoreProvider.");
  }
  return store;
}
