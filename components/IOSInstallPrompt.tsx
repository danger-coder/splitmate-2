"use client";

import { useState, useEffect } from "react";

export default function IOSInstallPrompt() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    const isIOS =
      /iphone|ipad|ipod/i.test(navigator.userAgent) ||
      // iPad on iPadOS 13+ reports as MacIntel but has touch
      (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);

    const isInStandaloneMode =
      ("standalone" in navigator && (navigator as { standalone?: boolean }).standalone === true) ||
      window.matchMedia("(display-mode: standalone)").matches;

    const wasDismissed =
      localStorage.getItem("splitmate-ios-prompt-dismissed") === "true";

    if (isIOS && !isInStandaloneMode && !wasDismissed) {
      // Slight delay so it doesn't pop immediately on page load
      const t = setTimeout(() => setShow(true), 2000);
      return () => clearTimeout(t);
    }
  }, []);

  function dismiss() {
    setShow(false);
    localStorage.setItem("splitmate-ios-prompt-dismissed", "true");
  }

  if (!show) return null;

  return (
    <div
      role="dialog"
      aria-label="Install SplitMate"
      className="fixed inset-x-3 z-50 animate-in slide-in-from-bottom-4 duration-300"
      style={{ bottom: "calc(env(safe-area-inset-bottom, 0px) + 80px)" }}
    >
      <div className="relative bg-white rounded-2xl shadow-2xl border border-gray-100 p-4">
        {/* Close button */}
        <button
          onClick={dismiss}
          aria-label="Close"
          className="absolute top-3 right-3 w-6 h-6 flex items-center justify-center rounded-full bg-gray-100 text-gray-500 hover:bg-gray-200 transition-colors text-xs font-bold"
        >
          ✕
        </button>

        <div className="flex items-start gap-3 pr-6">
          {/* App icon */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/apple-touch-icon.png"
            alt="SplitMate icon"
            width={48}
            height={48}
            className="rounded-xl shrink-0 border border-gray-200"
          />

          <div>
            <p className="font-semibold text-gray-800 text-sm leading-tight">
              Install SplitMate
            </p>
            <p className="text-gray-500 text-xs mt-1 leading-snug">
              Add to your Home Screen for the best experience — it works like a
              native app!
            </p>
          </div>
        </div>

        {/* Instructions */}
        <div className="mt-3 bg-indigo-50 rounded-xl p-3 space-y-2">
          <Step number={1}>
            Tap the{" "}
            <span className="font-semibold text-gray-800">Share</span> button{" "}
            <ShareIcon /> in Safari&apos;s toolbar
          </Step>
          <Step number={2}>
            Scroll down and tap{" "}
            <span className="font-semibold text-gray-800">
              &ldquo;Add to Home Screen&rdquo;
            </span>{" "}
            <HomeScreenIcon />
          </Step>
          <Step number={3}>
            Tap <span className="font-semibold text-gray-800">Add</span> in the
            top-right corner
          </Step>
        </div>

        {/* Dismiss link */}
        <button
          onClick={dismiss}
          className="mt-3 w-full text-center text-xs text-gray-400 hover:text-gray-600 transition-colors"
        >
          Maybe later
        </button>

        {/* Downward arrow pointing to the bottom bar */}
        <div
          className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-4 h-4 bg-white border-r border-b border-gray-100 rotate-45"
          aria-hidden="true"
        />
      </div>
    </div>
  );
}

function Step({
  number,
  children,
}: {
  number: number;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-start gap-2">
      <span className="shrink-0 w-5 h-5 rounded-full bg-indigo-600 text-white text-[10px] font-bold flex items-center justify-center mt-0.5">
        {number}
      </span>
      <p className="text-xs text-gray-600 leading-snug">{children}</p>
    </div>
  );
}

function ShareIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className="inline-block w-4 h-4 text-indigo-600 align-middle mx-0.5"
      aria-hidden="true"
    >
      <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" />
      <polyline points="16 6 12 2 8 6" />
      <line x1="12" y1="2" x2="12" y2="15" />
    </svg>
  );
}

function HomeScreenIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className="inline-block w-4 h-4 text-indigo-600 align-middle mx-0.5"
      aria-hidden="true"
    >
      <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
      <line x1="12" y1="8" x2="12" y2="16" />
      <line x1="8" y1="12" x2="16" y2="12" />
    </svg>
  );
}
