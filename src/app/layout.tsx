import type { Metadata, Viewport } from "next";
import { Geist_Mono, Inter } from "next/font/google";

import { QueryProvider } from "@/components/providers/query-provider";
import {
  APP_COLOR_SCHEME,
  APP_DESCRIPTION,
  APP_NAME,
  APP_THEME_COLOR,
  APPLE_SPLASH_SCREENS,
} from "@/shared/pwa/constants";

import "./globals.css";

const inter = Inter({
  variable: "--font-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  applicationName: APP_NAME,
  title: {
    default: APP_NAME,
    template: `%s · ${APP_NAME}`,
  },
  description: APP_DESCRIPTION,
  keywords: ["fitness", "health", "strength", "workout journal", "PWA"],
  formatDetection: { telephone: false },
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: APP_NAME,
  },
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "48x48" },
      {
        url: "/icons/icon512_rounded.png",
        sizes: "512x512",
        type: "image/png",
      },
    ],
    apple: [
      {
        url: "/icons/icon512_rounded.png",
        sizes: "512x512",
        type: "image/png",
      },
    ],
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: APP_THEME_COLOR,
  colorScheme: APP_COLOR_SCHEME,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${inter.variable} ${geistMono.variable} h-full antialiased`}
    >
      <head>
        {APPLE_SPLASH_SCREENS.map((splashScreen) => (
          <link
            key={`${splashScreen.href}-${splashScreen.media}`}
            rel="apple-touch-startup-image"
            media={splashScreen.media}
            href={splashScreen.href}
          />
        ))}
      </head>
      <body className="flex min-h-full flex-col bg-background text-foreground">
        <QueryProvider>{children}</QueryProvider>
      </body>
    </html>
  );
}
