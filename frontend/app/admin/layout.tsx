 "use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import type { ReactNode } from "react";

const NAV_ITEMS = [
  { href: "/admin/statistics", label: "Statistics" },
  { href: "/admin/notifications", label: "Notifications" },
  { href: "/admin/users", label: "Users" },
  { href: "/admin/scoreboard", label: "Scoreboard" },
  { href: "/admin/challenge", label: "Challenge" },
  { href: "/admin/config", label: "Config" },
];

export default function AdminLayout({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const apiBaseUrl =
    (process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000").replace(/\/$/, "");
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const checkAdmin = async () => {
      try {
        const res = await fetch(`${apiBaseUrl}/api/auth/me`, {
          method: "GET",
          credentials: "include",
        });

        if (!res.ok) {
          router.replace("/login");
          return;
        }

        const data = (await res.json()) as { username?: string; role?: string };
        const isAdmin = data?.role === "admin" || data?.username === "admin";
        if (!isAdmin) {
          router.replace("/main");
          return;
        }

        setReady(true);
      } catch {
        router.replace("/login");
      }
    };

    void checkAdmin();
  }, [apiBaseUrl, pathname, router]);

  if (!ready) {
    return (
      <main className="min-h-screen p-6 md:p-10">
        <section className="frame mx-auto w-full max-w-6xl rounded-xl px-5 py-4 text-sm text-zinc-400">
          Loading admin...
        </section>
      </main>
    );
  }

  return (
    <main className="min-h-screen p-6 md:p-10">
      <header className="frame mx-auto flex w-full max-w-6xl flex-wrap items-center gap-2 px-4 py-3">
        {NAV_ITEMS.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="mono-btn rounded-lg px-3 py-2 text-xs font-semibold uppercase tracking-[0.16em]"
          >
            {item.label}
          </Link>
        ))}
      </header>

      <section className="mx-auto mt-5 w-full max-w-6xl">{children}</section>
    </main>
  );
}

