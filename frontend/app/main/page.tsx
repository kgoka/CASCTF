"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

type AuthUser = {
  username: string;
  role: string;
  score: number;
};

type Category = "OSINT" | "Web" | "Forensics" | "Pwn" | "Reversing" | "Network";

type ChallengeItem = {
  id: number;
  name: string;
  category: Category;
  message: string;
  point: number;
  score_type: "basic" | "dynamic";
  state: "Visible" | "Hidden";
  attachment_file_id: number | null;
  attachment_file_name?: string | null;
};

type FlagSubmitResponse = {
  success: boolean;
  message: string;
  awarded_point: number;
  total_score: number;
};

const CATEGORIES: Category[] = ["OSINT", "Web", "Forensics", "Pwn", "Reversing", "Network"];

function normalizeAuthUser(input: Partial<AuthUser> | null): AuthUser | null {
  if (!input?.username) {
    return null;
  }

  return {
    username: input.username,
    role: input.role ?? "player",
    score: typeof input.score === "number" ? input.score : 0,
  };
}

export default function MainPage() {
  const apiBaseUrl =
    (process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000").replace(/\/$/, "");
  const [authUser, setAuthUser] = useState<AuthUser | null>(null);
  const [theme, setTheme] = useState<"dark" | "light">("dark");
  const [challenges, setChallenges] = useState<ChallengeItem[]>([]);
  const [selectedChallenge, setSelectedChallenge] = useState<ChallengeItem | null>(null);
  const [flagInput, setFlagInput] = useState("");
  const [flagSubmitting, setFlagSubmitting] = useState(false);
  const [flagResultMessage, setFlagResultMessage] = useState("");

  useEffect(() => {
    // 테마 로드: localStorage 저장값 우선, 없으면 dark
    const savedTheme = localStorage.getItem("casctf_theme");
    const initialTheme = savedTheme === "light" ? "light" : "dark";
    setTheme(initialTheme);
    document.documentElement.setAttribute("data-theme", initialTheme);

    // 첫 렌더에서 버튼 깜빡임 방지를 위해 UI 캐시 사용자 정보 우선 반영
    const cachedAuth = localStorage.getItem("casctf_auth_ui");
    if (cachedAuth) {
      try {
        const normalized = normalizeAuthUser(JSON.parse(cachedAuth) as Partial<AuthUser>);
        setAuthUser(normalized);
      } catch {
        localStorage.removeItem("casctf_auth_ui");
      }
    }

    // 서버 세션(JWT 쿠키) 기준으로 현재 로그인 사용자 조회
    const loadMe = async () => {
      try {
        const res = await fetch(`${apiBaseUrl}/api/auth/me`, {
          method: "GET",
          credentials: "include",
        });

        if (!res.ok) {
          setAuthUser(null);
          localStorage.removeItem("casctf_auth_ui");
          return;
        }

        const data = normalizeAuthUser((await res.json()) as Partial<AuthUser>);
        setAuthUser(data);
        if (data) {
          localStorage.setItem("casctf_auth_ui", JSON.stringify(data));
        }
      } catch {
        // 네트워크 오류 시에는 캐시된 UI 정보 유지
      }
    };

    // 메인에 노출할 공개 챌린지 목록 로드
    const loadChallenges = async () => {
      try {
        const res = await fetch(`${apiBaseUrl}/api/challenges`, {
          method: "GET",
        });
        if (!res.ok) {
          setChallenges([]);
          return;
        }

        const data = (await res.json()) as ChallengeItem[];
        setChallenges(data);
      } catch {
        setChallenges([]);
      }
    };

    void loadMe();
    void loadChallenges();
  }, [apiBaseUrl]);

  const isAdmin = authUser?.role === "admin" || authUser?.username === "admin";
  const groupedByCategory = useMemo(() => {
    return CATEGORIES.map((category) => ({
      category,
      items: challenges.filter((item) => item.category === category),
    }));
  }, [challenges]);

  const toggleTheme = () => {
    // 테마 토글 + 로컬 저장 + 즉시 반영
    setTheme((prev) => {
      const next = prev === "dark" ? "light" : "dark";
      localStorage.setItem("casctf_theme", next);
      document.documentElement.setAttribute("data-theme", next);
      return next;
    });
  };

  const openChallengeModal = (item: ChallengeItem) => {
    setSelectedChallenge(item);
    setFlagInput("");
    setFlagResultMessage("");
  };

  const closeChallengeModal = () => {
    setSelectedChallenge(null);
    setFlagInput("");
    setFlagResultMessage("");
  };

  const handleSubmitFlag = async () => {
    if (!selectedChallenge) {
      return;
    }

    if (!flagInput.trim()) {
      alert("Flag를 입력해 주세요.");
      return;
    }

    try {
      setFlagSubmitting(true);
      const res = await fetch(`${apiBaseUrl}/api/challenges/${selectedChallenge.id}/submit-flag`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ flag: flagInput.trim() }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setFlagResultMessage(data?.detail ?? "Flag submit failed.");
        return;
      }

      const data = (await res.json()) as FlagSubmitResponse;
      setFlagResultMessage(
        `${data.message} ${data.awarded_point > 0 ? `+${data.awarded_point}점 획득.` : ""}`.trim()
      );

      setAuthUser((prev) => {
        if (!prev) {
          return prev;
        }

        const next = { ...prev, score: data.total_score };
        localStorage.setItem("casctf_auth_ui", JSON.stringify(next));
        return next;
      });
    } catch {
      setFlagResultMessage("Cannot reach backend server.");
    } finally {
      setFlagSubmitting(false);
    }
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
          {/* 관리자 계정일 때만 노출되는 관리 버튼 */}
          {isAdmin && (
            <Link
              href="/admin/statistics"
              className="rounded-lg border border-white/40 bg-white/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-zinc-100 transition hover:bg-white hover:text-black"
            >
              Manage
            </Link>
          )}
          <button className="mono-btn rounded-lg px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em]">
            {authUser?.username ? `${authUser.username} (${authUser.score} pt)` : "My Profile"}
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

        <div className="mb-3 text-xs uppercase tracking-[0.22em] text-zinc-400">Categories</div>

        <div className="frame overflow-hidden rounded-xl">
          {groupedByCategory.map(({ category, items }, index) => (
            <article
              key={category}
              className={`px-6 py-5 ${
                index !== groupedByCategory.length - 1 ? "border-b border-white/10" : ""
              }`}
            >
              <div className="mb-4 flex items-end justify-between">
                <h2 className="text-xl font-semibold text-zinc-100">{category}</h2>
                <span className="text-xs uppercase tracking-[0.14em] text-zinc-500">
                  {items.length} Challenges
                </span>
              </div>

              {items.length > 0 ? (
                <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                  {items.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => openChallengeModal(item)}
                      className="group relative overflow-hidden rounded-xl border border-white/15 bg-white/[0.03] p-4 text-left transition duration-200 hover:-translate-y-0.5 hover:border-white/35 hover:bg-white/[0.08]"
                    >
                      <div className="pointer-events-none absolute inset-0 opacity-0 transition group-hover:opacity-100">
                        <div className="h-full w-full bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.20),transparent_55%)]" />
                      </div>
                      <div className="relative">
                        <p className="text-xs uppercase tracking-[0.14em] text-zinc-500">#{item.id}</p>
                        <h3 className="mt-2 text-base font-semibold text-zinc-100">{item.name}</h3>
                        <p className="mt-3 text-sm text-zinc-400">{item.message || "No description"}</p>
                        <div className="mt-4 flex items-center justify-between text-xs uppercase tracking-[0.12em]">
                          <span className="rounded-md border border-white/15 px-2 py-1 text-zinc-300">
                            {item.score_type}
                          </span>
                          <span className="text-zinc-200">{item.point} pt</span>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-zinc-500">No challenge yet.</p>
              )}
            </article>
          ))}
        </div>
      </section>

      {selectedChallenge && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
          onClick={closeChallengeModal}
        >
          <div
            className="frame w-full max-w-2xl rounded-2xl border border-white/20 p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs uppercase tracking-[0.16em] text-zinc-500">
                  {selectedChallenge.category} / #{selectedChallenge.id}
                </p>
                <h2 className="mt-1 text-2xl font-semibold text-zinc-100">{selectedChallenge.name}</h2>
              </div>
              <button
                type="button"
                onClick={closeChallengeModal}
                className="mono-btn rounded-md px-3 py-1.5 text-xs uppercase tracking-[0.12em]"
              >
                Close
              </button>
            </div>

            <div className="mt-5 rounded-xl border border-white/10 bg-white/[0.03] p-4">
              <p className="whitespace-pre-wrap text-sm leading-relaxed text-zinc-300">
                {selectedChallenge.message || "No challenge description provided yet."}
              </p>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-3 text-xs uppercase tracking-[0.14em] text-zinc-400 md:grid-cols-3">
              <div className="rounded-lg border border-white/10 bg-white/[0.02] px-3 py-2">
                Score Type: {selectedChallenge.score_type}
              </div>
              <div className="rounded-lg border border-white/10 bg-white/[0.02] px-3 py-2">
                Point: {selectedChallenge.point}
              </div>
              <div className="rounded-lg border border-white/10 bg-white/[0.02] px-3 py-2">
                State: {selectedChallenge.state}
              </div>
            </div>

            <div className="mt-5 rounded-xl border border-white/10 bg-white/[0.03] p-4">
              <p className="text-xs uppercase tracking-[0.14em] text-zinc-400">Challenge File</p>
              {selectedChallenge.attachment_file_id ? (
                <a
                  href={`${apiBaseUrl}/api/challenges/${selectedChallenge.id}/file`}
                  className="mt-2 inline-flex rounded-lg border border-white/30 px-3 py-2 text-xs font-semibold uppercase tracking-[0.14em] text-zinc-100 hover:bg-white/10"
                >
                  Download {selectedChallenge.attachment_file_name ?? "Attachment"}
                </a>
              ) : (
                <p className="mt-2 text-sm text-zinc-500">No uploaded file for this challenge.</p>
              )}
            </div>

            <div className="mt-5 rounded-xl border border-white/10 bg-white/[0.03] p-4">
              <p className="text-xs uppercase tracking-[0.14em] text-zinc-400">Submit Flag</p>
              <div className="mt-3 flex flex-col gap-2 sm:flex-row">
                <input
                  type="text"
                  value={flagInput}
                  onChange={(e) => setFlagInput(e.target.value)}
                  placeholder="FLAG{...}"
                  className="mono-input rounded-lg"
                />
                <button
                  type="button"
                  onClick={handleSubmitFlag}
                  disabled={flagSubmitting}
                  className="rounded-lg border border-white/40 bg-white/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.14em] text-zinc-100 transition hover:bg-white hover:text-black disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {flagSubmitting ? "Submitting..." : "Submit"}
                </button>
              </div>
              {flagResultMessage && <p className="mt-2 text-sm text-zinc-300">{flagResultMessage}</p>}
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

