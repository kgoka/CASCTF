"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

type NotificationItem = {
  id: number;
  title: string;
  content: string;
  created_by: string;
  created_ts: number;
};

function formatTs(ts: number): string {
  const date = new Date(ts * 1000);
  if (Number.isNaN(date.getTime())) {
    return "-";
  }
  return date.toLocaleString();
}

export default function NotificationPage() {
  const apiBaseUrl =
    (process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000").replace(/\/$/, "");

  const [items, setItems] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  useEffect(() => {
    let cancelled = false;

    // Keep notification history page updated periodically.
    const loadNotifications = async () => {
      try {
        if (!cancelled) {
          setLoading(true);
          setMessage("");
        }
        const res = await fetch(`${apiBaseUrl}/api/notifications?limit=200`, {
          method: "GET",
          credentials: "include",
        });

        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          if (!cancelled) {
            setItems([]);
            setMessage(data?.detail ?? "Failed to load notifications.");
          }
          return;
        }

        const data = (await res.json()) as NotificationItem[];
        if (!cancelled) {
          setItems(data);
        }
      } catch {
        if (!cancelled) {
          setItems([]);
          setMessage("Cannot reach backend server.");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    void loadNotifications();
    const interval = setInterval(() => {
      void loadNotifications();
    }, 5000);

    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [apiBaseUrl]);

  return (
    <main className="min-h-screen p-6 md:p-10">
      <section className="frame mx-auto w-full max-w-6xl rounded-xl px-5 py-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-[11px] uppercase tracking-[0.2em] text-zinc-500">Current Page</p>
            <h1 className="mt-1 text-3xl font-semibold text-zinc-100">Notifications</h1>
          </div>
          <Link
            href="/main"
            className="mono-btn rounded-lg px-4 py-2 text-xs font-semibold uppercase tracking-[0.16em]"
          >
            Back To Main
          </Link>
        </div>
      </section>

      <section className="frame mx-auto mt-5 w-full max-w-6xl rounded-xl px-5 py-5">
        {message && <p className="mb-3 text-sm text-red-300">{message}</p>}

        <div className="space-y-3">
          {!loading &&
            items.map((item) => (
              <article key={item.id} className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
                <h3 className="text-base font-semibold text-zinc-100">{item.title}</h3>
                <p className="mt-2 whitespace-pre-wrap text-sm text-zinc-300">{item.content}</p>
                <p className="mt-3 text-xs text-zinc-500">
                  {formatTs(item.created_ts)} by {item.created_by}
                </p>
              </article>
            ))}

          {loading && (
            <p className="rounded-xl border border-white/10 bg-white/[0.03] px-4 py-10 text-center text-sm text-zinc-500">
              Loading notifications...
            </p>
          )}

          {!loading && items.length === 0 && (
            <p className="rounded-xl border border-white/10 bg-white/[0.03] px-4 py-10 text-center text-sm text-zinc-500">
              No notifications yet.
            </p>
          )}
        </div>
      </section>
    </main>
  );
}
