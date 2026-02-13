"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

type AuthUser = {
  username: string;
  role: string;
};

export default function MainPage() {
  const apiBaseUrl =
    (process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://127.0.0.1:8000").replace(/\/$/, "");
  const [authUser, setAuthUser] = useState<AuthUser | null>(null);
  const [theme, setTheme] = useState<"dark" | "light">("dark");
  const categories = ["OSINT", "Web", "Forensics", "Pwn", "Reversing", "Network"];

  useEffect(() => {
    const savedTheme = localStorage.getItem("casctf_theme");
    const initialTheme = savedTheme === "light" ? "light" : "dark";
    setTheme(initialTheme);
    document.documentElement.setAttribute("data-theme", initialTheme);

    const loadMe = async () => {
      try {
        const res = await fetch(`${apiBaseUrl}/api/auth/me`, {
          method: "GET",
          credentials: "include",
        });

        if (!res.ok) {
          setAuthUser(null);
          return;
        }

        const data = (await res.json()) as AuthUser;
        setAuthUser(data);
      } catch {
        setAuthUser(null);
      }
    };

    void loadMe();
  }, [apiBaseUrl]);

  const isAdmin = authUser?.role === "admin";

  const toggleTheme = () => {
    setTheme((prev) => {
      const next = prev === "dark" ? "light" : "dark";
      localStorage.setItem("casctf_theme", next);
      document.documentElement.setAttribute("data-theme", next);
      return next;
    });
  };

  return (
    <main className="min-h-screen p-6 md:p-10">
      <header className="frame mx-auto flex w-full max-w-6xl items-center justify-between gap-4 px-5 py-4">
        <div className="flex items-center gap-3">
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
              href="/admin"
              className="rounded-lg border border-white/40 bg-white/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-zinc-100 transition hover:bg-white hover:text-black"
            >
              Manage
            </Link>
          )}
          <button className="mono-btn rounded-lg px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em]">
            {authUser?.username ? `${authUser.username} Profile` : "My Profile"}
          </button>
          <button
            onClick={toggleTheme}
            aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
            title={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
            className="ghost-mascot"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 48 48"
              className="h-8 w-8"
              fill="none"
            >
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

      <section className="mx-auto mt-6 w-full max-w-6xl">
        <div className="mb-4">
          <div className="frame rounded-xl px-5 py-4">
            <p className="text-[11px] uppercase tracking-[0.2em] text-zinc-400">Remaining Time</p>
            <p className="mt-1 text-3xl font-semibold text-zinc-100">00:00:00</p>
          </div>
        </div>

        <div className="mb-3 text-xs uppercase tracking-[0.22em] text-zinc-400">
          Categories
        </div>

        <div className="frame overflow-hidden rounded-xl">
          {categories.map((category, index) => (
            <article
              key={category}
              className={`min-h-[92px] px-6 py-5 transition hover:bg-white/[0.03] ${
                index !== categories.length - 1 ? "border-b border-white/10" : ""
              }`}
            >
              <h2 className="text-xl font-semibold text-zinc-100">{category}</h2>
              <p className="mt-1 text-xs uppercase tracking-[0.14em] text-zinc-500">
                Problem list area
              </p>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}
