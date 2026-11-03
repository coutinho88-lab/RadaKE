import { ScrollViewStyleReset } from "expo-router/html";
import type { ReactNode } from "react";

export default function Root({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta
          name="description"
          content="InstaChat brings conversations and photo sharing together."
        />
        <meta name="theme-color" content="#FAF9FF" />
        <title>InstaChat — Share the moment</title>
        <ScrollViewStyleReset />
        <style>{`
          html, body { height: 100%; margin: 0; }
          body { background: #FAF9FF; }
        `}</style>
      </head>
      <body>{children}</body>
    </html>
  );
}
