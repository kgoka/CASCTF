import Link from "next/link";
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

