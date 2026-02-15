"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";

import {
  DEFAULT_CTF_NAME,
  getCachedCtfName,
  loadAndCacheCtfName,
  subscribeCtfName,
} from "@/lib/ctf-name";

type AuthUser = {
  username: string;
  role: string;
  score: number;
};

type Category = "OSINT" | "Web" | "Forensics" | "Pwn" | "Reversing" | "Network";
type Difficulty = "NORMAL" | "HARD";

type ChallengeItem = {
  id: number;
  name: string;
  category: Category;
  difficulty: Difficulty;
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
  blood: "first" | "second" | "third" | null;
};

type BloodEffect = {
  title: string;
  subtitle: string;
  titleClassName: string;
  borderClassName: string;
};

type PublicConfigResponse = {
  ctf_name: string;
  duration_start_ts: number | null;
  duration_end_ts: number | null;
  is_active: boolean;
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
  const [ctfName, setCtfName] = useState(DEFAULT_CTF_NAME);
  const [theme, setTheme] = useState<"dark" | "light">("dark");
  const [durationStartTs, setDurationStartTs] = useState<number | null>(null);
  const [durationEndTs, setDurationEndTs] = useState<number | null>(null);
  const [isDurationActive, setIsDurationActive] = useState(false);
  const [remainingSeconds, setRemainingSeconds] = useState(0);
  const [challenges, setChallenges] = useState<ChallengeItem[]>([]);
  const [selectedChallenge, setSelectedChallenge] = useState<ChallengeItem | null>(null);
  const [solvedChallengeIds, setSolvedChallengeIds] = useState<number[]>([]);
  const [wrongChallengeIds, setWrongChallengeIds] = useState<number[]>([]);
  const [flagInput, setFlagInput] = useState("");
  const [flagSubmitting, setFlagSubmitting] = useState(false);
  const [flagResultMessage, setFlagResultMessage] = useState("");
  const [bloodEffect, setBloodEffect] = useState<BloodEffect | null>(null);
  const bloodTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const categoryScrollRefs = useRef<Record<string, HTMLDivElement | null>>({});

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

    const loadSolvedChallenges = async () => {
      try {
        const res = await fetch(`${apiBaseUrl}/api/challenges/solved/me`, {
          method: "GET",
          credentials: "include",
        });
        if (!res.ok) {
          setSolvedChallengeIds([]);
          return;
        }

        const data = (await res.json()) as number[];
        setSolvedChallengeIds(data);
      } catch {
        setSolvedChallengeIds([]);
      }
    };

    void loadMe();
    void loadChallenges();
    void loadSolvedChallenges();
  }, [apiBaseUrl]);

  useEffect(() => {
    setCtfName(getCachedCtfName());
    const unsubscribe = subscribeCtfName(setCtfName);
    void loadAndCacheCtfName(apiBaseUrl, "/api/config/public", "omit").then(setCtfName);
    return unsubscribe;
  }, [apiBaseUrl]);

  useEffect(() => {
    const loadPublicConfig = async () => {
      try {
        const res = await fetch(`${apiBaseUrl}/api/config/public`, {
          method: "GET",
        });
        if (!res.ok) {
          setDurationStartTs(null);
          setDurationEndTs(null);
          return;
        }

        const data = (await res.json()) as PublicConfigResponse;
        setDurationStartTs(data.duration_start_ts ?? null);
        setDurationEndTs(data.duration_end_ts ?? null);
      } catch {
        setDurationStartTs(null);
        setDurationEndTs(null);
      }
    };

    void loadPublicConfig();
    const interval = setInterval(() => {
      void loadPublicConfig();
    }, 30000);

    return () => clearInterval(interval);
  }, [apiBaseUrl]);

  useEffect(() => {
    const tick = () => {
      if (durationStartTs === null || durationEndTs === null) {
        setIsDurationActive(false);
        setRemainingSeconds(0);
        return;
      }

      const nowTs = Math.floor(Date.now() / 1000);
      const active = nowTs >= durationStartTs && nowTs < durationEndTs;
      setIsDurationActive(active);
      setRemainingSeconds(active ? Math.max(0, durationEndTs - nowTs) : 0);
    };

    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [durationStartTs, durationEndTs]);

  useEffect(() => {
    return () => {
      if (bloodTimeoutRef.current) {
        clearTimeout(bloodTimeoutRef.current);
      }
    };
  }, []);

  const isAdmin = authUser?.role === "admin" || authUser?.username === "admin";
  const groupedByCategory = useMemo(() => {
    return CATEGORIES.map((category) => ({
      category,
      items: challenges.filter((item) => item.category === category),
    }));
  }, [challenges]);
  const solvedIdSet = useMemo(() => new Set(solvedChallengeIds), [solvedChallengeIds]);
  const wrongIdSet = useMemo(() => new Set(wrongChallengeIds), [wrongChallengeIds]);
  const wrongStorageKey = authUser?.username
    ? `casctf_wrong_challenges_${authUser.username}`
    : null;

  useEffect(() => {
    if (!wrongStorageKey) {
      setWrongChallengeIds([]);
      return;
    }

    try {
      const raw = localStorage.getItem(wrongStorageKey);
      if (!raw) {
        setWrongChallengeIds([]);
        return;
      }
      const parsed = JSON.parse(raw) as number[];
      setWrongChallengeIds(Array.isArray(parsed) ? parsed : []);
    } catch {
      setWrongChallengeIds([]);
    }
  }, [wrongStorageKey]);

  useEffect(() => {
    if (!wrongStorageKey) {
      return;
    }
    localStorage.setItem(wrongStorageKey, JSON.stringify(wrongChallengeIds));
  }, [wrongChallengeIds, wrongStorageKey]);

  const triggerSolveEffect = (blood: FlagSubmitResponse["blood"]) => {
    let effect: BloodEffect;
    if (blood === "first") {
      effect = {
        title: "First Blood",
        subtitle: "You cracked it first",
        titleClassName: "text-amber-300",
        borderClassName: "border-amber-300/80",
      };
    } else if (blood === "second") {
      effect = {
        title: "Second Blood",
        subtitle: "Second solver unlocked",
        titleClassName: "text-slate-200",
        borderClassName: "border-slate-300/80",
      };
    } else if (blood === "third") {
      effect = {
        title: "Third Blood",
        subtitle: "Top 3 solver",
        titleClassName: "text-orange-300",
        borderClassName: "border-orange-300/80",
      };
    } else {
      effect = {
        title: "Solved",
        subtitle: "Nice solve",
        titleClassName: "text-emerald-300",
        borderClassName: "border-emerald-300/80",
      };
    }

    setBloodEffect(effect);
    if (bloodTimeoutRef.current) {
      clearTimeout(bloodTimeoutRef.current);
    }
    bloodTimeoutRef.current = setTimeout(() => {
      setBloodEffect(null);
      bloodTimeoutRef.current = null;
    }, 2000);
  };

  const scrollCategory = (category: Category, direction: "left" | "right") => {
    const target = categoryScrollRefs.current[category];
    if (!target) {
      return;
    }

    const amount = Math.max(240, Math.round(target.clientWidth * 0.78));
    target.scrollBy({
      left: direction === "right" ? amount : -amount,
      behavior: "smooth",
    });
  };

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

    if (!isDurationActive) {
      setFlagResultMessage("CTF is not currently running.");
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
      if (data.success) {
        setSolvedChallengeIds((prev) =>
          prev.includes(selectedChallenge.id) ? prev : [...prev, selectedChallenge.id]
        );
        setWrongChallengeIds((prev) => prev.filter((id) => id !== selectedChallenge.id));
      } else {
        setWrongChallengeIds((prev) =>
          prev.includes(selectedChallenge.id) ? prev : [...prev, selectedChallenge.id]
        );
      }
      if (data.success && data.message !== "Already solved.") {
        triggerSolveEffect(data.blood);
      }

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

  const formattedRemainingTime = useMemo(() => {
    if (!isDurationActive || remainingSeconds <= 0) {
      return "00:00:00";
    }

    const hours = Math.floor(remainingSeconds / 3600);
    const minutes = Math.floor((remainingSeconds % 3600) / 60);
    const seconds = remainingSeconds % 60;
    return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(
      seconds
    ).padStart(2, "0")}`;
  }, [isDurationActive, remainingSeconds]);

  return (
    <main className="min-h-screen p-6 md:p-10">
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
            <p className="mt-1 text-3xl font-semibold text-zinc-100">{formattedRemainingTime}</p>
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
                <div className="category-scroll-shell relative">
                  {items.length >= 4 && (
                    <button
                      type="button"
                      aria-label={`${category} scroll left`}
                      onClick={() => scrollCategory(category, "left")}
                      className="category-edge-btn category-edge-left"
                    >
                      {"<"}
                    </button>
                  )}
                  <div
                    ref={(node) => {
                      categoryScrollRefs.current[category] = node;
                    }}
                    className="challenge-scrollbar overflow-x-auto pb-2"
                  >
                  <div className="flex min-w-full gap-3">
                  {items.map((item) => {
                    const solved = solvedIdSet.has(item.id);
                    const wrong = !solved && wrongIdSet.has(item.id);
                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => openChallengeModal(item)}
                        className={`group relative w-[280px] shrink-0 overflow-hidden rounded-xl border p-4 text-left transition duration-200 hover:-translate-y-0.5 md:w-[320px] ${
                          solved
                            ? "border-emerald-300/70 bg-emerald-200/15 hover:bg-emerald-200/25"
                            : wrong
                              ? "border-rose-400/75 bg-rose-500/15 hover:bg-rose-500/25"
                            : "border-white/15 bg-white/[0.03] hover:border-white/35 hover:bg-white/[0.08]"
                        }`}
                      >
                        <div className="pointer-events-none absolute inset-0 opacity-0 transition group-hover:opacity-100">
                          <div className="h-full w-full bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.20),transparent_55%)]" />
                        </div>
                        <div className="relative">
                          {solved && (
                            <span className="absolute right-0 top-0 rounded-md border border-emerald-200/70 bg-emerald-200/20 px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-emerald-100">
                              Solved
                            </span>
                          )}
                          {!solved && wrong && (
                            <span className="absolute right-0 top-0 rounded-md border border-rose-300/80 bg-rose-500/20 px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-rose-100">
                              Wrong
                            </span>
                          )}
                          <p className={`text-xs uppercase tracking-[0.14em] ${solved ? "text-emerald-100/75" : wrong ? "text-rose-100/75" : "text-zinc-500"}`}>
                            #{item.difficulty}
                          </p>
                          <h3 className={`mt-2 text-base font-semibold ${solved ? "text-emerald-100" : wrong ? "text-rose-100" : "text-zinc-100"}`}>
                            {item.name}
                          </h3>
                          <p className={`mt-3 text-sm ${solved ? "text-emerald-50/85" : wrong ? "text-rose-100/85" : "text-zinc-400"}`}>
                            {item.message || "No description"}
                          </p>
                          <div className="mt-4 flex items-center justify-between text-xs uppercase tracking-[0.12em]">
                            <span
                              className={`rounded-md border px-2 py-1 ${
                                solved ? "border-emerald-200/60 text-emerald-50" : "border-white/15 text-zinc-300"
                              } ${
                                wrong ? "border-rose-200/60 text-rose-50" : ""
                              }`}
                            >
                              {item.score_type}
                            </span>
                            <span className={solved ? "text-emerald-100" : wrong ? "text-rose-100" : "text-zinc-200"}>{item.point} pt</span>
                          </div>
                        </div>
                      </button>
                    );
                  })}
                  </div>
                  </div>
                  {items.length >= 4 && (
                    <button
                      type="button"
                      aria-label={`${category} scroll right`}
                      onClick={() => scrollCategory(category, "right")}
                      className="category-edge-btn category-edge-right"
                    >
                      {">"}
                    </button>
                  )}
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
                {solvedIdSet.has(selectedChallenge.id) && (
                  <p className="mt-2 inline-flex rounded-md border border-emerald-200/70 bg-emerald-200/20 px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-emerald-100">
                    Solved
                  </p>
                )}
                {!solvedIdSet.has(selectedChallenge.id) && wrongIdSet.has(selectedChallenge.id) && (
                  <p className="mt-2 inline-flex rounded-md border border-rose-300/80 bg-rose-500/20 px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-rose-100">
                    Wrong Attempt
                  </p>
                )}
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
                  disabled={!isDurationActive || flagSubmitting}
                  className="mono-input rounded-lg"
                />
                <button
                  type="button"
                  onClick={handleSubmitFlag}
                  disabled={flagSubmitting || !isDurationActive}
                  className="rounded-lg border border-white/40 bg-white/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.14em] text-zinc-100 transition hover:bg-white hover:text-black disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {!isDurationActive ? "Closed" : flagSubmitting ? "Submitting..." : "Submit"}
                </button>
              </div>
              {flagResultMessage && <p className="mt-2 text-sm text-zinc-300">{flagResultMessage}</p>}
            </div>
          </div>
        </div>
      )}

      {bloodEffect && (
        <div className="blood-overlay pointer-events-none fixed inset-0 z-[70] flex items-center justify-center">
          <div
            className={`blood-banner rounded-2xl border bg-black/80 px-10 py-8 text-center shadow-[0_20px_80px_rgba(0,0,0,0.5)] backdrop-blur-md ${bloodEffect.borderClassName}`}
          >
            <p className="text-[11px] uppercase tracking-[0.4em] text-zinc-400">Challenge Clear</p>
            <h3
              className={`blood-title relative mt-3 text-[clamp(3.2rem,10vw,7.4rem)] font-black uppercase leading-[0.9] tracking-[0.08em] ${bloodEffect.titleClassName}`}
            >
              <span className="blood-title-main">{bloodEffect.title}</span>
              <span aria-hidden className="blood-ghost blood-ghost-a">
                {bloodEffect.title}
              </span>
              <span aria-hidden className="blood-ghost blood-ghost-b">
                {bloodEffect.title}
              </span>
            </h3>
            <p className="blood-subtitle mt-2 text-sm uppercase tracking-[0.2em] text-zinc-300">{bloodEffect.subtitle}</p>
          </div>
        </div>
      )}
      <style jsx global>{`
        .challenge-scrollbar {
          scrollbar-width: none;
          -ms-overflow-style: none;
          scroll-behavior: smooth;
        }

        .challenge-scrollbar::-webkit-scrollbar {
          display: none;
        }

        .category-edge-btn {
          position: absolute;
          top: 50%;
          z-index: 6;
          height: 36px;
          width: 36px;
          transform: translateY(-50%);
          border-radius: 999px;
          border: 1px solid rgba(255, 255, 255, 0.45);
          background: rgba(10, 10, 10, 0.72);
          color: rgba(244, 244, 245, 0.98);
          font-size: 13px;
          font-weight: 800;
          line-height: 1;
          box-shadow: 0 10px 26px rgba(0, 0, 0, 0.45);
          backdrop-filter: blur(6px);
          transition: all 180ms ease;
        }

        .category-edge-btn:hover {
          border-color: rgba(167, 243, 208, 0.9);
          background: rgba(16, 185, 129, 0.28);
          color: #f0fdf4;
          transform: translateY(calc(-50% - 1px));
        }

        .category-edge-left {
          left: -10px;
        }

        .category-edge-right {
          right: -10px;
        }

        .blood-overlay {
          animation: blood-backdrop 2s ease-out both;
          background:
            radial-gradient(circle at center, rgba(255, 255, 255, 0.18) 0%, rgba(0, 0, 0, 0) 48%),
            linear-gradient(0deg, rgba(0, 0, 0, 0.76), rgba(0, 0, 0, 0.62));
        }

        .blood-banner {
          animation: blood-banner-blast 2s cubic-bezier(0.16, 1, 0.3, 1) both;
          position: relative;
          min-width: min(92vw, 980px);
          max-width: 980px;
        }

        .blood-banner::before {
          content: "";
          position: absolute;
          inset: -2px;
          border-radius: 1rem;
          background: linear-gradient(90deg, rgba(255, 255, 255, 0.06), rgba(255, 255, 255, 0.35), rgba(255, 255, 255, 0.06));
          filter: blur(8px);
          opacity: 0.7;
          z-index: -1;
          animation: blood-scanline 1.4s linear infinite;
        }

        .blood-title {
          animation: blood-title-pop 1.9s cubic-bezier(0.16, 1, 0.3, 1) both;
          text-shadow:
            0 0 8px rgba(255, 255, 255, 0.2),
            0 0 26px rgba(255, 255, 255, 0.22),
            0 0 46px rgba(255, 255, 255, 0.14);
          font-family: "Arial Black", "Impact", sans-serif;
        }

        .blood-title-main {
          position: relative;
          z-index: 3;
        }

        .blood-ghost {
          position: absolute;
          inset: 0;
          z-index: 2;
          opacity: 0.72;
          mix-blend-mode: screen;
          pointer-events: none;
        }

        .blood-ghost-a {
          transform: translate(5px, 0);
          color: #f87171;
          animation: blood-glitch-a 0.22s steps(2, end) infinite;
        }

        .blood-ghost-b {
          transform: translate(-5px, 0);
          color: #60a5fa;
          animation: blood-glitch-b 0.2s steps(2, end) infinite;
        }

        .blood-subtitle {
          animation: blood-subtitle-in 0.7s ease-out both;
          animation-delay: 0.2s;
        }

        @keyframes blood-backdrop {
          0% {
            opacity: 0;
          }
          16% {
            opacity: 1;
          }
          80% {
            opacity: 1;
          }
          100% {
            opacity: 0;
          }
        }

        @keyframes blood-banner-blast {
          0% {
            opacity: 0;
            transform: scale(0.62) translateY(48px) skewX(-6deg);
            filter: blur(10px);
          }
          10% {
            opacity: 1;
            transform: scale(1.08) translateY(-8px) skewX(1deg);
            filter: blur(0);
          }
          55% {
            opacity: 1;
            transform: scale(1) translateY(0) skewX(0deg);
          }
          100% {
            opacity: 0;
            transform: scale(1.12) translateY(-48px) skewX(0deg);
            filter: blur(2px);
          }
        }

        @keyframes blood-title-pop {
          0% {
            transform: scale(0.72) translateY(30px);
            letter-spacing: 0.25em;
          }
          20% {
            transform: scale(1.08) translateY(-3px);
            letter-spacing: 0.1em;
          }
          65% {
            transform: scale(1);
            letter-spacing: 0.08em;
          }
          100% {
            transform: scale(1.03) translateY(-20px);
          }
        }

        @keyframes blood-glitch-a {
          0% {
            clip-path: inset(0 0 76% 0);
          }
          40% {
            clip-path: inset(34% 0 42% 0);
          }
          70% {
            clip-path: inset(82% 0 2% 0);
          }
          100% {
            clip-path: inset(10% 0 56% 0);
          }
        }

        @keyframes blood-glitch-b {
          0% {
            clip-path: inset(84% 0 4% 0);
          }
          35% {
            clip-path: inset(2% 0 78% 0);
          }
          68% {
            clip-path: inset(42% 0 34% 0);
          }
          100% {
            clip-path: inset(64% 0 14% 0);
          }
        }

        @keyframes blood-subtitle-in {
          0% {
            opacity: 0;
            transform: translateY(10px);
          }
          100% {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes blood-scanline {
          0% {
            transform: translateX(-34%) scaleX(0.8);
            opacity: 0.2;
          }
          50% {
            transform: translateX(0%) scaleX(1);
            opacity: 0.7;
          }
          100% {
            transform: translateX(34%) scaleX(0.8);
            opacity: 0.2;
          }
        }
      `}</style>
    </main>
  );
}

