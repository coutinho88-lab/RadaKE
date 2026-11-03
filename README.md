# InstaChat

An Expo Router starter for a shared iOS, Android, and web application. The starter includes a tab shell, a sample social feed, a conversation list, and a real-time-ready chat screen. Sample feed and chat items are local preview data; they are not saved or sent.

## Stack

- Expo + React Native + Expo Router for iOS, Android, and web
- Supabase Auth, Postgres/Realtime, and Storage as the backend
- React Native `StyleSheet` for consistent cross-platform styling

## Get started

1. Install Node.js LTS and create a Supabase project.
2. Copy `.env.example` to `.env` and set `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_ANON_KEY`. These are public client values; never put a `service_role` key in the app.
3. Install packages and run the app:

   ```sh
   npm install
   npx expo install --fix
   npm run start
   ```

4. Open the Expo QR code on a device, or press `i`, `a`, or `w` in the Expo terminal for iOS simulator, Android emulator, or web. The web build uses the same Expo Router screens and includes web page metadata in `app/+html.tsx`.
5. To type-check, run `npm run typecheck`.

The Supabase client is only created when both environment variables are present. Until then, the UI runs in preview mode. Add Supabase Auth screens and database access before treating any preview content as production data.

## Project layout

```text
app/
  _layout.tsx            Root stack and global status bar
  (tabs)/
    _layout.tsx          Feed, Chats, Discover, and Profile navigation
    index.tsx            Social feed and stories
    chats.tsx            Conversation list
    discover.tsx         Reels/discover placeholder
    profile.tsx          Profile placeholder
  chat/[id].tsx          Conversation route
components/
  chat/ChatScreen.tsx    Message timeline and composer
  feed/SocialFeed.tsx    Stories and post cards
lib/
  supabase.ts            Supabase client and configuration
  preview-data.ts        Clearly local-only sample content
```

## Backend implementation path

1. Enable Supabase email/password or phone OTP in Authentication. Use Supabase Auth sessions, and create a `profiles` row keyed by `auth.users.id` for avatar, bio, and status.
2. Add Postgres tables for `conversations`, `conversation_members`, `messages`, `posts`, `post_likes`, `comments`, `follows`, and `stories`. Enable RLS on every table; allow reads/writes only for authenticated members/followers as appropriate.
3. Subscribe to authorized conversation/message changes through Supabase Realtime. Store read receipts and typing state separately; do not treat client-side ticks or presence as authoritative.
4. Store media in private Supabase Storage buckets with policies and signed URLs. Use an Edge Function plus APNs/FCM credentials for push delivery.
5. For true end-to-end encryption, design and audit a dedicated cryptographic protocol. Supabase transport security and database RLS are not end-to-end encryption.

Do not ship push provider secrets or Supabase service-role credentials in the client. Configure production redirect URLs, RLS policies, storage policies, and platform notification credentials before release.
