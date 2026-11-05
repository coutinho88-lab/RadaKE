# InstaChat

An Expo Router starter for a shared iOS, Android, and web application. The dashboard opens to Chats, with a profile shortcut in the top-right and three sections: Chats, Feed, and Discover. Sample content and interactions are local preview data; they are not saved, sent, or server-authorized.

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

The Supabase client is only created when both environment variables are present. The app requires Supabase configuration and the profile migration for sign-in and signup; without them it shows setup guidance instead of opening the dashboard. Accounts and profiles are stored in Supabase. Radas, public posts, and Rada replies remain local preview data saved in device/browser storage; Radas expire after 24 hours, while their chat replies remain in the inbox. Feed likes, comments, and reposts are currently preview interactions and reset on reload. Discover searches the bundled sample topics and news only.

## Publish to GitHub Pages

The `Deploy Expo web app to GitHub Pages` workflow builds the Expo web app and deploys it to `https://coutinho88-lab.github.io/RadaKE/` whenever a commit is pushed to `main`. The Expo web base URL is configured for this repository path, and the workflow adds a `404.html` fallback so client-side routes can load when opened directly. Repository Pages should use **GitHub Actions** as its deployment source.

Rada is the private-post format shown with a blue avatar ribbon in Chats. The sample UI hides Rada from rows that are not marked as saved contacts, but this client-side preview check is **not access control**. Local viewer/reaction insights only reflect interactions in this browser; they are not shared across users. Before using real private posts, enforce authorization on the server: store the author's saved-contact relationship in Postgres, enable Row Level Security on Rada posts, and allow a viewer to read a post only if they are the author or are in that author's saved contacts. Keep Rada media in a private Storage bucket and issue signed URLs only after authorization. Never rely on a client-supplied contact flag to protect private content.

## Project layout

```text
app/
  _layout.tsx            Root stack and global status bar
  (tabs)/
    _layout.tsx          Chats, Feed, and Discover navigation + profile shortcut
    index.tsx            Chats dashboard (opening section)
    feed.tsx             Public post feed
    discover.tsx           Search, trending topics, and news preview
  profile.tsx            Profile screen opened from the dashboard header
  chat/[id].tsx          Conversation route
components/
  chat/ChatsScreen.tsx   Chat list, blue Rada rings, and private-post viewer
  chat/ChatScreen.tsx    Message timeline and composer
  feed/SocialFeed.tsx    Public posts, likes, comments, and reposts
lib/
  supabase.ts            Supabase client and configuration
  preview-data.ts        Clearly local-only sample content
  preview-store.tsx      Local persistence, Rada expiry, and preview post state
```

## Backend implementation path

1. Enable email/password sign-in in Supabase Authentication and choose whether email confirmation is required.
2. Apply the migrations in `supabase/migrations` in timestamp order. The first creates public and private profiles and saved contacts. The second adds profile photos, privacy preferences, blocking, and access policies.
3. Keep the Supabase URL and anon key in `.env` as described above. The app requires these values and the migration before accounts can be created.
4. Public usernames, email addresses, names, bios, and about text are readable by signed-in users. Phone numbers, dates of birth, and sex are readable only by the profile owner and accounts the owner has saved as contacts. Profile photos are stored in a private bucket with viewer policies. Passwords are handled only by Supabase Auth and are never stored in profile rows.
5. Supabase Auth may require users to confirm their email before their first sign-in. Email changes may also require confirmation, depending on the project’s Authentication settings.
6. Add Postgres tables for `conversations`, `conversation_members`, `messages`, `posts`, `post_likes`, `comments`, `follows`, and `stories`. Enable RLS on every table; allow reads/writes only for authenticated members/followers as appropriate.
7. Subscribe to authorized conversation/message changes through Supabase Realtime. Store read receipts and typing state separately; do not treat client-side ticks or presence as authoritative.
8. Store media in private Supabase Storage buckets with policies and signed URLs. Use an Edge Function plus APNs/FCM credentials for push delivery.
9. For true end-to-end encryption, design and audit a dedicated cryptographic protocol. Supabase transport security and database RLS are not end-to-end encryption.
10. Deploy `supabase/functions/delete-account` to Supabase before enabling account deletion. The function uses the server-only `SUPABASE_SERVICE_ROLE_KEY`; never expose that key to the app.

The profile settings hub stores appearance and chat preferences on the device. Rada, messaging, chat backup/transfer, media-gallery downloads, and push notification delivery are still preview features; their controls are labeled as preferences or unavailable until those services are implemented. Biometric app lock requires a native iOS/Android build and a device with biometrics/passcode configured; PIN and pattern locks are not implemented.

Do not ship push provider secrets or Supabase service-role credentials in the client. Configure production redirect URLs, RLS policies, storage policies, and platform notification credentials before release.
