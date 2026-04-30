import type { Metadata, Viewport } from "next";
import Link from "next/link";
import "./globals.css";

export const metadata: Metadata = {
  title: "SplitMate — Expense Splitter",
  description: "Track and split shared expenses between two roommates.",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "SplitMate",
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
      <body className="antialiased bg-gray-50 min-h-screen">
        {/* Top bar — slim on mobile */}
        <header className="bg-white border-b border-gray-100 sticky top-0 z-10">
          <div className="max-w-3xl mx-auto px-4 h-12 flex items-center gap-2">
            <span className="text-lg">💸</span>
            <span className="font-bold text-gray-800">SplitMate</span>
          </div>
        </header>

        {/* pb-20 leaves room for the bottom nav bar */}
        <main className="max-w-3xl mx-auto px-3 py-4 space-y-4 pb-24">
          {children}
        </main>

        {/* Bottom navigation — the primary nav on mobile */}
        <BottomNav />
      </body>
    </html>
  );
}

function BottomNav() {
  // We use a client component for active-state highlighting
  // but since layout is server, we embed the nav as plain links.
  // Active highlighting is handled via CSS :focus-visible / link colours.
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-20 bg-white border-t border-gray-100 flex" style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}>
      <Link
        href="/"
        className="flex-1 flex flex-col items-center justify-center py-2 gap-0.5 text-gray-500 hover:text-indigo-600 active:text-indigo-600 transition-colors min-h-14"
      >
        <span className="text-xl">🏠</span>
        <span className="text-[10px] font-medium">Home</span>
      </Link>
      <Link
        href="/analytics"
        className="flex-1 flex flex-col items-center justify-center py-2 gap-0.5 text-gray-500 hover:text-indigo-600 active:text-indigo-600 transition-colors min-h-14"
      >
        <span className="text-xl">📊</span>
        <span className="text-[10px] font-medium">Analytics</span>
      </Link>
      <Link
        href="/profile"
        className="flex-1 flex flex-col items-center justify-center py-2 gap-0.5 text-gray-500 hover:text-indigo-600 active:text-indigo-600 transition-colors min-h-14"
      >
        <span className="text-xl">👤</span>
        <span className="text-[10px] font-medium">Profile</span>
      </Link>
    </nav>
  );
}
