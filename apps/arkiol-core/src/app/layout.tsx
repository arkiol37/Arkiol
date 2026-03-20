// src/app/layout.tsx
import type { Metadata } from "next";
import { SessionProvider } from "./providers";
import "./globals.css";

export const metadata: Metadata = {
  title:       "Arkiol — Where Creativity Meets AI",
  description: "Enterprise AI-powered design asset generation. Generate logos, social posts, flyers, and more in seconds.",
  robots:      "index, follow",
  icons:       { icon: "/favicon.svg" },
  openGraph: {
    title:       "Arkiol — Where Creativity Meets AI",
    description: "Enterprise AI-powered design asset generation.",
    type:        "website",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta name="theme-color" content="#0a0a12" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Syne:wght@400;500;600;700;800&family=DM+Sans:ital,opsz,wght@0,9..40,300;0,9..40,400;0,9..40,500;0,9..40,600;0,9..40,700;1,9..40,400&family=DM+Mono:wght@300;400;500&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        <SessionProvider>{children}</SessionProvider>
      </body>
    </html>
  );
}
