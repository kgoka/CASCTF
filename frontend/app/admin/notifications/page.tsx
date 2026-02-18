"use client";

import { FormEvent, useEffect, useState } from "react";

type NoticeType = "Toast" | "Alert";
type PlaySoundOption = "YES" | "NO";

type NotificationItem = {
  id: number;
  title: string;
  content: string;
  notice_type: NoticeType;
  play_sound: boolean;
  created_by: string;
  created_ts: number;
};

const NOTICE_TYPE_OPTIONS: NoticeType[] = ["Toast", "Alert"];
const PLAY_SOUND_OPTIONS: PlaySoundOption[] = ["YES", "NO"];

function formatTs(ts: number): string {
  const date = new Date(ts * 1000);
  if (Number.isNaN(date.getTime())) {
    return "-";
  }
  return date.toLocaleString();
}

export default function AdminNotificationsPage() {
  const apiBaseUrl =
    (process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000").replace(/\/$/, "");

  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [noticeType, setNoticeType] = useState<NoticeType>("Toast");
  const [playSound, setPlaySound] = useState<PlaySoundOption>("NO");

  const [items, setItems] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [clearing, setClearing] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [message, setMessage] = useState("");

  const loadNotifications = async () => {
    try {
      setLoading(true);
      setMessage("");
      const res = await fetch(`${apiBaseUrl}/api/notifications/admin`, {
        method: "GET",
        credentials: "include",
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setMessage(data?.detail ?? "Failed to load notifications.");
        setItems([]);
        return;
      }
      setItems((await res.json()) as NotificationItem[]);
    } catch {
      setMessage("Cannot reach backend server.");
      setItems([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadNotifications();
  }, [apiBaseUrl]);

  const resetForm = () => {
    setTitle("");
    setContent("");
    setNoticeType("Toast");
    setPlaySound("NO");
  };

  const handleCreate = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!title.trim()) {
      alert("Title is required.");
      return;
    }
    if (!content.trim()) {
      alert("Content is required.");
      return;
    }

    try {
      setSaving(true);
      const res = await fetch(`${apiBaseUrl}/api/notifications/admin`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          title: title.trim(),
          content: content.trim(),
          notice_type: noticeType,
          // UI stores YES/NO for clarity, API expects boolean.
          play_sound: playSound === "YES",
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        alert(data?.detail ?? "Failed to create notification.");
        return;
      }

      resetForm();
      await loadNotifications();
    } catch {
      alert("Cannot reach backend server.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: number) => {
    const confirmed = window.confirm("Delete this notification?");
    if (!confirmed) {
      return;
    }

    try {
      setDeletingId(id);
      const res = await fetch(`${apiBaseUrl}/api/notifications/admin/${id}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        alert(data?.detail ?? "Failed to delete notification.");
        return;
      }
      await loadNotifications();
    } catch {
      alert("Cannot reach backend server.");
    } finally {
      setDeletingId(null);
    }
  };

  const handleClear = async () => {
    const confirmed = window.confirm("Delete all notification history?");
    if (!confirmed) {
      return;
    }

    try {
      setClearing(true);
      const res = await fetch(`${apiBaseUrl}/api/notifications/admin/clear`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        alert(data?.detail ?? "Failed to clear notifications.");
        return;
      }
      await loadNotifications();
    } catch {
      alert("Cannot reach backend server.");
    } finally {
      setClearing(false);
    }
  };

  return (
    <div className="space-y-4">
      <section className="frame rounded-xl px-5 py-4">
        <p className="text-[11px] uppercase tracking-[0.2em] text-zinc-500">Current Page</p>
        <h1 className="mt-1 text-3xl font-semibold text-zinc-100">Notifications</h1>
      </section>

      <section className="frame rounded-xl px-5 py-5">
        <form onSubmit={handleCreate} className="grid gap-4 md:grid-cols-2">
          <div className="md:col-span-2">
            <label className="mb-2 block text-xs uppercase tracking-[0.16em] text-zinc-400">Title</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Notification title"
              className="mono-input rounded-lg"
            />
          </div>

          <div className="md:col-span-2">
            <label className="mb-2 block text-xs uppercase tracking-[0.16em] text-zinc-400">Content</label>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Notification content"
              className="mono-input min-h-[140px] resize-y rounded-lg"
            />
          </div>

          <div>
            <label className="mb-2 block text-xs uppercase tracking-[0.16em] text-zinc-400">Notice Type</label>
            <select
              value={noticeType}
              onChange={(e) => setNoticeType(e.target.value as NoticeType)}
              className="mono-input rounded-lg"
            >
              {NOTICE_TYPE_OPTIONS.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-2 block text-xs uppercase tracking-[0.16em] text-zinc-400">Play Sound</label>
            <select
              value={playSound}
              onChange={(e) => setPlaySound(e.target.value as PlaySoundOption)}
              className="mono-input rounded-lg"
            >
              {PLAY_SOUND_OPTIONS.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </div>

          <div className="md:col-span-2 flex items-center justify-end gap-2">
            <button
              type="submit"
              disabled={saving}
              className="rounded-lg border border-white/40 bg-white/10 px-5 py-2 text-xs font-semibold uppercase tracking-[0.14em] text-zinc-100 transition hover:bg-white hover:text-black disabled:cursor-not-allowed disabled:opacity-50"
            >
              {saving ? "Saving..." : "Publish"}
            </button>
          </div>
        </form>
      </section>

      <section className="frame min-h-[360px] rounded-xl px-5 py-5">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-zinc-100">Notification History</h2>
          <button
            type="button"
            onClick={() => void handleClear()}
            disabled={clearing || items.length === 0}
            className="rounded-lg border border-rose-300/60 bg-rose-500/15 px-4 py-2 text-xs font-semibold uppercase tracking-[0.14em] text-rose-100 transition hover:bg-rose-500/30 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {clearing ? "Clearing..." : "Clear All"}
          </button>
        </div>

        {message && <p className="mb-3 text-sm text-red-300">{message}</p>}

        <div className="overflow-x-auto rounded-lg border border-white/10">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-white/[0.03]">
              <tr className="border-b border-white/10 text-[11px] uppercase tracking-[0.15em] text-zinc-400">
                <th className="px-4 py-3">Id</th>
                <th className="px-4 py-3">Type</th>
                <th className="px-4 py-3">Sound</th>
                <th className="px-4 py-3">Title</th>
                <th className="px-4 py-3">Content</th>
                <th className="px-4 py-3">By</th>
                <th className="px-4 py-3">Created</th>
                <th className="px-4 py-3">Action</th>
              </tr>
            </thead>
            <tbody>
              {!loading &&
                items.map((item) => (
                  <tr key={item.id} className="border-b border-white/10 last:border-0">
                    <td className="px-4 py-3 text-zinc-300">{item.id}</td>
                    <td className="px-4 py-3 text-zinc-200">{item.notice_type}</td>
                    <td className="px-4 py-3 text-zinc-300">{item.play_sound ? "On" : "Off"}</td>
                    <td className="px-4 py-3 text-zinc-100">{item.title}</td>
                    <td className="px-4 py-3 text-zinc-300">{item.content}</td>
                    <td className="px-4 py-3 text-zinc-300">{item.created_by}</td>
                    <td className="px-4 py-3 text-zinc-300">{formatTs(item.created_ts)}</td>
                    <td className="px-4 py-3">
                      <button
                        type="button"
                        onClick={() => void handleDelete(item.id)}
                        disabled={deletingId === item.id}
                        className="rounded-md border border-rose-300/60 bg-rose-500/15 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-rose-100 transition hover:bg-rose-500/30 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {deletingId === item.id ? "Deleting..." : "Delete"}
                      </button>
                    </td>
                  </tr>
                ))}

              {loading && (
                <tr>
                  <td colSpan={8} className="px-4 py-10 text-center text-zinc-500">
                    Loading notifications...
                  </td>
                </tr>
              )}

              {!loading && items.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-4 py-10 text-center text-zinc-500">
                    No notifications yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
