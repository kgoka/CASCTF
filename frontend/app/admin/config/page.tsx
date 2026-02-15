"use client";

import { FormEvent, useEffect, useState } from "react";

import { DEFAULT_CTF_NAME, getCachedCtfName, setCachedCtfName } from "@/lib/ctf-name";

type ConfigCategory = "general" | "duration";

type AdminConfigResponse = {
  ctf_name: string;
  duration_start_ts: number | null;
  duration_end_ts: number | null;
  is_active: boolean;
};

function toDatetimeLocalValue(ts: number | null): string {
  if (ts === null) {
    return "";
  }
  const date = new Date(ts * 1000);
  if (Number.isNaN(date.getTime())) {
    return "";
  }
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");
  const hh = String(date.getHours()).padStart(2, "0");
  const mi = String(date.getMinutes()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}T${hh}:${mi}`;
}

function toUnixSeconds(localValue: string): number | null {
  if (!localValue) {
    return null;
  }
  const time = new Date(localValue).getTime();
  if (Number.isNaN(time)) {
    return null;
  }
  return Math.floor(time / 1000);
}

export default function AdminConfigPage() {
  const apiBaseUrl =
    (process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000").replace(/\/$/, "");

  const [category, setCategory] = useState<ConfigCategory>("general");
  const [ctfName, setCtfName] = useState(DEFAULT_CTF_NAME);
  const [durationStartLocal, setDurationStartLocal] = useState("");
  const [durationEndLocal, setDurationEndLocal] = useState("");

  const [loading, setLoading] = useState(true);
  const [savingGeneral, setSavingGeneral] = useState(false);
  const [savingDuration, setSavingDuration] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    const loadConfig = async () => {
      setLoading(true);
      setMessage("");

      const cached = getCachedCtfName();
      setCtfName(cached);

      try {
        const res = await fetch(`${apiBaseUrl}/api/config/admin`, {
          method: "GET",
          credentials: "include",
        });

        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          setMessage(data?.detail ?? "Failed to load config.");
          setLoading(false);
          return;
        }

        const data = (await res.json()) as AdminConfigResponse;
        const name = setCachedCtfName(data.ctf_name ?? DEFAULT_CTF_NAME);
        setCtfName(name);
        setDurationStartLocal(toDatetimeLocalValue(data.duration_start_ts));
        setDurationEndLocal(toDatetimeLocalValue(data.duration_end_ts));
      } catch {
        setMessage("Cannot reach backend server.");
      } finally {
        setLoading(false);
      }
    };

    void loadConfig();
  }, [apiBaseUrl]);

  const handleSaveGeneral = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const normalized = ctfName.trim().replace(/\s+/g, " ");
    if (!normalized) {
      setMessage("CTF name cannot be empty.");
      return;
    }

    try {
      setSavingGeneral(true);
      setMessage("");
      const res = await fetch(`${apiBaseUrl}/api/config/admin/general`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ ctf_name: normalized }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setMessage(data?.detail ?? "Failed to save General settings.");
        return;
      }

      const data = (await res.json()) as AdminConfigResponse;
      const name = setCachedCtfName(data.ctf_name ?? normalized);
      setCtfName(name);
      setMessage("General settings saved.");
    } catch {
      setMessage("Cannot reach backend server.");
    } finally {
      setSavingGeneral(false);
    }
  };

  const handleSaveDuration = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    const startTs = toUnixSeconds(durationStartLocal);
    const endTs = toUnixSeconds(durationEndLocal);

    if ((startTs === null) !== (endTs === null)) {
      setMessage("시작/종료 시간을 모두 입력하거나 모두 비워 주세요.");
      return;
    }
    if (startTs !== null && endTs !== null && startTs >= endTs) {
      setMessage("종료 시간은 시작 시간보다 뒤여야 합니다.");
      return;
    }

    try {
      setSavingDuration(true);
      setMessage("");
      const res = await fetch(`${apiBaseUrl}/api/config/admin/duration`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          duration_start_ts: startTs,
          duration_end_ts: endTs,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setMessage(data?.detail ?? "Failed to save Duration settings.");
        return;
      }

      const data = (await res.json()) as AdminConfigResponse;
      setDurationStartLocal(toDatetimeLocalValue(data.duration_start_ts));
      setDurationEndLocal(toDatetimeLocalValue(data.duration_end_ts));
      setMessage("Duration settings saved.");
    } catch {
      setMessage("Cannot reach backend server.");
    } finally {
      setSavingDuration(false);
    }
  };

  return (
    <div className="space-y-4">
      <section className="frame rounded-xl px-5 py-4">
        <p className="text-[11px] uppercase tracking-[0.2em] text-zinc-500">Current Page</p>
        <h1 className="mt-1 text-3xl font-semibold text-zinc-100">Config</h1>
      </section>

      <section className="frame min-h-[520px] rounded-xl px-5 py-5">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3 border-b border-white/10 pb-4">
          <div>
            <p className="text-[11px] uppercase tracking-[0.2em] text-zinc-500">Section</p>
            <p className="mt-1 text-sm uppercase tracking-[0.16em] text-zinc-200">
              {category === "general" ? "General" : "Duration"}
            </p>
          </div>
          <p className="text-xs text-zinc-500">
            {category === "general"
              ? "General title is shown in admin/main header."
              : "Duration controls challenge active period and main timer."}
          </p>
        </div>

        <div className="grid gap-4 lg:grid-cols-[220px_1fr]">
          <aside className="rounded-xl border border-white/10 px-4 py-4">
            <p className="text-[11px] uppercase tracking-[0.2em] text-zinc-500">Category</p>
            <div className="mt-3 space-y-2">
              <button
                type="button"
                onClick={() => setCategory("general")}
                className={`w-full rounded-lg border px-3 py-2 text-left text-sm transition ${
                  category === "general"
                    ? "border-white/60 bg-white/15 text-zinc-100"
                    : "border-white/15 bg-white/[0.03] text-zinc-400"
                }`}
              >
                General
              </button>
              <button
                type="button"
                onClick={() => setCategory("duration")}
                className={`w-full rounded-lg border px-3 py-2 text-left text-sm transition ${
                  category === "duration"
                    ? "border-white/60 bg-white/15 text-zinc-100"
                    : "border-white/15 bg-white/[0.03] text-zinc-400"
                }`}
              >
                Duration
              </button>
            </div>
          </aside>

          <section className="rounded-xl border border-white/10 px-4 py-4">
            {category === "general" ? (
              <form onSubmit={handleSaveGeneral} className="max-w-2xl space-y-4">
                <div>
                  <label
                    htmlFor="ctf-name"
                    className="mb-2 block text-xs uppercase tracking-[0.16em] text-zinc-400"
                  >
                    CTF NAME
                  </label>
                  <input
                    id="ctf-name"
                    type="text"
                    value={ctfName}
                    onChange={(e) => setCtfName(e.target.value)}
                    placeholder="CASCTF 2026"
                    disabled={loading || savingGeneral}
                    maxLength={80}
                    className="mono-input rounded-lg"
                  />
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="submit"
                    disabled={loading || savingGeneral}
                    className="rounded-lg border border-white/40 bg-white/10 px-5 py-2 text-xs font-semibold uppercase tracking-[0.14em] text-zinc-100 transition hover:bg-white hover:text-black disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {savingGeneral ? "Saving..." : "Save"}
                  </button>
                </div>
              </form>
            ) : (
              <form onSubmit={handleSaveDuration} className="max-w-2xl space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <label
                      htmlFor="duration-start"
                      className="mb-2 block text-xs uppercase tracking-[0.16em] text-zinc-400"
                    >
                      Start (년-월-일 시:분)
                    </label>
                    <input
                      id="duration-start"
                      type="datetime-local"
                      value={durationStartLocal}
                      onChange={(e) => setDurationStartLocal(e.target.value)}
                      disabled={loading || savingDuration}
                      className="mono-input rounded-lg"
                    />
                  </div>
                  <div>
                    <label
                      htmlFor="duration-end"
                      className="mb-2 block text-xs uppercase tracking-[0.16em] text-zinc-400"
                    >
                      End (년-월-일 시:분)
                    </label>
                    <input
                      id="duration-end"
                      type="datetime-local"
                      value={durationEndLocal}
                      onChange={(e) => setDurationEndLocal(e.target.value)}
                      disabled={loading || savingDuration}
                      className="mono-input rounded-lg"
                    />
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="submit"
                    disabled={loading || savingDuration}
                    className="rounded-lg border border-white/40 bg-white/10 px-5 py-2 text-xs font-semibold uppercase tracking-[0.14em] text-zinc-100 transition hover:bg-white hover:text-black disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {savingDuration ? "Saving..." : "Save"}
                  </button>
                </div>
              </form>
            )}

            {message && <p className="mt-3 text-sm text-zinc-300">{message}</p>}
          </section>
        </div>
      </section>
    </div>
  );
}
