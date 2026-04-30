"use client";

import { useEffect, useCallback } from "react";

export type ToastType = "success" | "error" | "info";

interface Props {
  message: string;
  type?: ToastType;
  onClose: () => void;
}

export default function Toast({ message, type = "success", onClose }: Props) {
  const close = useCallback(() => onClose(), [onClose]);

  useEffect(() => {
    const t = setTimeout(close, 3500);
    return () => clearTimeout(t);
  }, [close]);

  const bg =
    type === "success" ? "bg-green-500" :
    type === "error"   ? "bg-red-500"   : "bg-indigo-500";

  const icon =
    type === "success" ? "✅" :
    type === "error"   ? "❌" : "ℹ️";

  return (
    <div
      className={`fixed top-14 left-3 right-3 z-50 max-w-md mx-auto
        ${bg} text-white rounded-2xl px-4 py-3
        shadow-xl flex items-center gap-3`}
    >
      <span className="shrink-0">{icon}</span>
      <p className="text-sm font-medium flex-1">{message}</p>
      <button
        onClick={onClose}
        className="shrink-0 text-white/70 hover:text-white text-xl leading-none w-6 h-6 flex items-center justify-center"
      >
        ×
      </button>
    </div>
  );
}
