import type { Metadata, Viewport } from "next";
import Link from "next/link";
import IOSInstallPrompt from "@/components/IOSInstallPrompt";
import ServiceWorkerRegistration from "@/components/ServiceWorkerRegistration";
import { SettingsProvider } from "@/components/SettingsContext";
import DarkModeToggle from "@/components/DarkModeToggle";
import "./globals.css";

export const metadata: Metadata = {
  title: "SplitMate — Expense Splitter",
  description: "Track and split shared expenses between two roommates.",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "SplitMate",
    startupImage: [
      {
        url: "/splash/apple-splash-2796-1290.png",
        media: "(device-width: 430px) and (device-height: 932px) and (-webkit-device-pixel-ratio: 3)",
      },
      {
        url: "/splash/apple-splash-2556-1179.png",
        media: "(device-width: 393px) and (device-height: 852px) and (-webkit-device-pixel-ratio: 3)",
      },
      {
        url: "/splash/apple-splash-2532-1170.png",
        media: "(device-width: 390px) and (device-height: 844px) and (-webkit-device-pixel-ratio: 3)",
      },
      {
        url: "/splash/apple-splash-2778-1284.png",
        media: "(device-width: 428px) and (device-height: 926px) and (-webkit-device-pixel-ratio: 3)",
      },
      {
        url: "/splash/apple-splash-2436-1125.png",
        media: "(device-width: 375px) and (device-height: 812px) and (-webkit-device-pixel-ratio: 3)",
      },
      {
        url: "/splash/apple-splash-1792-828.png",
        media: "(device-width: 414px) and (device-height: 896px) and (-webkit-device-pixel-ratio: 2)",
      },
      {
        url: "/splash/apple-splash-1334-750.png",
        media: "(device-width: 375px) and (device-height: 667px) and (-webkit-device-pixel-ratio: 2)",
      },
    ],
  },
  icons: {
    icon: [
      { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [
      { url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" },
    ],
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: "#4f46e5",
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="antialiased bg-gray-50 dark:bg-gray-900 min-h-screen">
        <SettingsProvider>
          {/* Top bar */}
          <header className="bg-white dark:bg-gray-800 border-b border-gray-100 dark:border-gray-700 sticky top-0 z-10">
            <div className="max-w-3xl mx-auto px-4 h-12 flex items-center gap-2">
              <span className="text-lg">💸</span>
              <span className="font-bold text-gray-800 dark:text-gray-100 flex-1">SplitMate</span>
              <DarkModeToggle />
            </div>
          </header>

          <main className="max-w-3xl mx-auto px-3 py-4 space-y-4 pb-24">
            {children}
          </main>

          <BottomNav />
          <IOSInstallPrompt />
          <ServiceWorkerRegistration />
        </SettingsProvider>
      </body>
    </html>
  );
}

function BottomNav() {
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-20 bg-white dark:bg-gray-800 border-t border-gray-100 dark:border-gray-700 flex" style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}>
      <Link
        href="/"
        className="flex-1 flex flex-col items-center justify-center py-2 gap-0.5 text-gray-500 dark:text-gray-400 hover:text-indigo-600 active:text-indigo-600 transition-colors min-h-14"
      >
        <span className="text-xl">🏠</span>
        <span className="text-[10px] font-medium">Home</span>
      </Link>
      <Link
        href="/analytics"
        className="flex-1 flex flex-col items-center justify-center py-2 gap-0.5 text-gray-500 dark:text-gray-400 hover:text-indigo-600 active:text-indigo-600 transition-colors min-h-14"
      >
        <span className="text-xl">📊</span>
        <span className="text-[10px] font-medium">Analytics</span>
      </Link>
      <Link
        href="/profile"
        className="flex-1 flex flex-col items-center justify-center py-2 gap-0.5 text-gray-500 dark:text-gray-400 hover:text-indigo-600 active:text-indigo-600 transition-colors min-h-14"
      >
        <span className="text-xl">👤</span>
        <span className="text-[10px] font-medium">Profile</span>
      </Link>
    </nav>
  );
}
