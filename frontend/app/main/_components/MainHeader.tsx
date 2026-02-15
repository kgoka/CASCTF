"use client";

import Link from "next/link";

import type { AuthUser } from "../types";

type MainHeaderProps = {
  ctfName: string;
  isAdmin: boolean;
  authUser: AuthUser | null;
  theme: "dark" | "light";
  onToggleTheme: () => void;
};

export function MainHeader({ ctfName, isAdmin, authUser, theme, onToggleTheme }: MainHeaderProps) {
  return (
    <header className="frame mx-auto flex w-full max-w-6xl items-center justify-between gap-4 px-5 py-4">
      <div className="flex items-center gap-3">
        <Link
          href="/main"
          className="text-base font-semibold uppercase tracking-[0.18em] text-zinc-200 transition hover:text-white"
        >
          {ctfName}
        </Link>
        <Link
          href="/scoreboard"
          className="mono-btn rounded-lg px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em]"
        >
          Scoreboard
        </Link>
      </div>

      <div className="flex items-center gap-2">
        <button className="mono-btn rounded-lg px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em]">
          Notification
        </button>
        {isAdmin && (
          <Link
            href="/admin/config"
            className="rounded-lg border border-white/40 bg-white/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-zinc-100 transition hover:bg-white hover:text-black"
          >
            Manage
          </Link>
        )}
        <button className="mono-btn rounded-lg px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em]">
          {authUser?.username ? `${authUser.username} (${authUser.score} pt)` : "My Profile"}
        </button>
        <button
          onClick={onToggleTheme}
          aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
          title={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
          className="ghost-mascot"
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" className="h-8 w-8" fill="none">
            <path
              d="M24 6c-8.8 0-16 6.8-16 15.2V38l6-3 4 3 6-3 6 3 4-3 6 3V21.2C40 12.8 32.8 6 24 6Z"
              fill="white"
              fillOpacity="0.92"
            />
            <circle cx="18.5" cy="20.5" r="2.2" fill="#111" />
            <circle cx="29.5" cy="20.5" r="2.2" fill="#111" />
            <path d="M19 28c1.4 1.3 3.1 2 5 2s3.6-.7 5-2" stroke="#111" strokeWidth="2" strokeLinecap="round" />
          </svg>
        </button>
      </div>
    </header>
  );
}
