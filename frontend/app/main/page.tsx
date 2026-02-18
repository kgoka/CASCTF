"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import {
  DEFAULT_CTF_NAME,
  getCachedCtfName,
  loadAndCacheCtfName,
  subscribeCtfName,
} from "@/lib/ctf-name";

import { BloodEffectOverlay } from "./_components/BloodEffectOverlay";
import { ChallengeCategoriesSection } from "./_components/ChallengeCategoriesSection";
import { ChallengeModal } from "./_components/ChallengeModal";
import { MainHeader } from "./_components/MainHeader";
import { MainPageStyles } from "./_components/MainPageStyles";
import {
  CATEGORIES,
  type AuthUser,
  type BloodEffect,
  type ChallengeItem,
  type ChallengeServerAccessResponse,
  type FlagSubmitResponse,
  type NotificationItem,
  type PublicConfigResponse,
} from "./types";
import { buildBloodEffect, formatSecondsToHms, normalizeAuthUser } from "./utils";

function formatNotificationTime(ts: number): string {
  const date = new Date(ts * 1000);
  if (Number.isNaN(date.getTime())) {
    return "-";
  }
  return date.toLocaleString();
}

function playNotificationSound(): void {
  if (typeof window === "undefined") {
    return;
  }

  const AudioCtx =
    window.AudioContext || (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AudioCtx) {
    return;
  }

  try {
    const context = new AudioCtx();
    const osc = context.createOscillator();
    const gain = context.createGain();

    osc.type = "triangle";
    osc.frequency.value = 880;
    gain.gain.value = 0.0001;

    osc.connect(gain);
    gain.connect(context.destination);

    const now = context.currentTime;
    gain.gain.exponentialRampToValueAtTime(0.07, now + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.22);
    osc.start(now);
    osc.stop(now + 0.24);
    osc.onended = () => void context.close();
  } catch {
    // ignore sound playback errors
  }
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
  const [serverAccess, setServerAccess] = useState<ChallengeServerAccessResponse | null>(null);
  const [serverRequesting, setServerRequesting] = useState(false);
  const [serverMessage, setServerMessage] = useState("");
  const [nowTs, setNowTs] = useState(Math.floor(Date.now() / 1000));
  const [bloodEffect, setBloodEffect] = useState<BloodEffect | null>(null);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [toastNotifications, setToastNotifications] = useState<NotificationItem[]>([]);
  const [alertQueue, setAlertQueue] = useState<NotificationItem[]>([]);
  const [activeAlert, setActiveAlert] = useState<NotificationItem | null>(null);
  const bloodTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const toastTimeoutRefs = useRef<ReturnType<typeof setTimeout>[]>([]);
  const notificationSeenMaxRef = useRef<number>(0);
  const notificationSeenInitializedRef = useRef(false);
  const notificationLastFetchedIdRef = useRef<number>(0);
  const notificationPollInFlightRef = useRef(false);
  const categoryScrollRefs = useRef<Record<string, HTMLDivElement | null>>({});
  // Per-user "last seen notification id"; only newer notifications trigger popup.
  const notificationSeenKey = authUser?.username
    ? `casctf_notification_seen_${authUser.username}`
    : "casctf_notification_seen_guest";

  useEffect(() => {
    const savedTheme = localStorage.getItem("casctf_theme");
    const initialTheme = savedTheme === "light" ? "light" : "dark";
    setTheme(initialTheme);
    document.documentElement.setAttribute("data-theme", initialTheme);

    const cachedAuth = localStorage.getItem("casctf_auth_ui");
    if (cachedAuth) {
      try {
        const normalized = normalizeAuthUser(JSON.parse(cachedAuth) as Partial<AuthUser>);
        setAuthUser(normalized);
      } catch {
        localStorage.removeItem("casctf_auth_ui");
      }
    }

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
        // keep cached auth info on network error
      }
    };

    const loadChallenges = async () => {
      try {
        const res = await fetch(`${apiBaseUrl}/api/challenges`, { method: "GET" });
        if (!res.ok) {
          setChallenges([]);
          return;
        }
        setChallenges((await res.json()) as ChallengeItem[]);
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
        setSolvedChallengeIds((await res.json()) as number[]);
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
        const res = await fetch(`${apiBaseUrl}/api/config/public`, { method: "GET" });
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
      const currentTs = Math.floor(Date.now() / 1000);
      const active = currentTs >= durationStartTs && currentTs < durationEndTs;
      setIsDurationActive(active);
      setRemainingSeconds(active ? Math.max(0, durationEndTs - currentTs) : 0);
    };

    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [durationStartTs, durationEndTs]);

  useEffect(() => {
    const interval = setInterval(() => {
      setNowTs(Math.floor(Date.now() / 1000));
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    return () => {
      if (bloodTimeoutRef.current) {
        clearTimeout(bloodTimeoutRef.current);
      }
      for (const timeoutId of toastTimeoutRefs.current) {
        clearTimeout(timeoutId);
      }
      toastTimeoutRefs.current = [];
    };
  }, []);

  useEffect(() => {
    if (!selectedChallenge) {
      return;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [selectedChallenge]);

  useEffect(() => {
    document.documentElement.classList.add("main-scroll-hidden");
    document.body.classList.add("main-scroll-hidden");
    return () => {
      document.documentElement.classList.remove("main-scroll-hidden");
      document.body.classList.remove("main-scroll-hidden");
    };
  }, []);

  useEffect(() => {
    notificationSeenInitializedRef.current = false;
    notificationSeenMaxRef.current = 0;
    notificationLastFetchedIdRef.current = 0;
    notificationPollInFlightRef.current = false;
  }, [notificationSeenKey]);

  const isAdmin = authUser?.role === "admin" || authUser?.username === "admin";
  const groupedByCategory = useMemo(
    () =>
      CATEGORIES.map((category) => ({
        category,
        items: challenges.filter((item) => item.category === category),
      })),
    [challenges]
  );
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

  useEffect(() => {
    if (activeAlert || alertQueue.length === 0) {
      return;
    }
    setActiveAlert(alertQueue[0]);
    setAlertQueue((prev) => prev.slice(1));
  }, [activeAlert, alertQueue]);

  useEffect(() => {
    let cancelled = false;
    const getMaxNotificationId = (items: NotificationItem[]) =>
      items.reduce((maxId, item) => Math.max(maxId, item.id), 0);
    const sortByIdAsc = (items: NotificationItem[]) => [...items].sort((left, right) => left.id - right.id);
    const sortByIdDesc = (items: NotificationItem[]) => [...items].sort((left, right) => right.id - left.id);
    const mergeNotifications = (prev: NotificationItem[], incoming: NotificationItem[]) => {
      const combined = sortByIdDesc([...incoming, ...prev]);
      const seen = new Set<number>();
      const unique: NotificationItem[] = [];
      for (const item of combined) {
        if (seen.has(item.id)) {
          continue;
        }
        seen.add(item.id);
        unique.push(item);
        if (unique.length >= 120) {
          break;
        }
      }
      return unique;
    };

    // Toast is shown immediately and auto-dismissed.
    const openToast = (item: NotificationItem) => {
      setToastNotifications((prev) => [item, ...prev].slice(0, 5));
      const timeoutId = setTimeout(() => {
        setToastNotifications((prev) => prev.filter((candidate) => candidate.id !== item.id));
      }, 4500);
      toastTimeoutRefs.current.push(timeoutId);
    };

    const processIncoming = (itemsAscending: NotificationItem[]) => {
      if (itemsAscending.length === 0) {
        return;
      }

      const seenId = notificationSeenMaxRef.current;
      const unseen = itemsAscending.filter((item) => item.id > seenId);
      if (unseen.length === 0) {
        return;
      }

      for (const item of unseen) {
        if (item.play_sound) {
          playNotificationSound();
        }
        if (item.notice_type === "Toast") {
          openToast(item);
        } else {
          setAlertQueue((prev) => [...prev, item]);
        }
      }

      notificationSeenMaxRef.current = Math.max(
        seenId,
        unseen[unseen.length - 1].id
      );
      localStorage.setItem(notificationSeenKey, String(notificationSeenMaxRef.current));
    };

    const loadNotifications = async () => {
      if (notificationPollInFlightRef.current) {
        return;
      }

      notificationPollInFlightRef.current = true;
      try {
        const afterId = notificationLastFetchedIdRef.current;
        const query =
          afterId > 0 ? `after_id=${afterId}&limit=120` : "limit=120";
        const res = await fetch(`${apiBaseUrl}/api/notifications?${query}`, {
          method: "GET",
          credentials: "include",
        });
        if (!res.ok) {
          return;
        }

        const data = (await res.json()) as NotificationItem[];
        if (cancelled) {
          return;
        }

        // First fetch returns latest-first snapshot.
        if (afterId === 0) {
          const snapshot = sortByIdDesc(data);
          setNotifications(snapshot.slice(0, 120));
          const latestId = getMaxNotificationId(snapshot);
          notificationLastFetchedIdRef.current = latestId;

          // On first load, mark current latest as seen to avoid replaying old alerts.
          if (!notificationSeenInitializedRef.current) {
            const raw = localStorage.getItem(notificationSeenKey);
            const parsed = raw ? Number(raw) : Number.NaN;
            const initialSeen = Number.isFinite(parsed) ? Math.max(0, parsed) : latestId;
            notificationSeenMaxRef.current = initialSeen;
            notificationSeenInitializedRef.current = true;
            localStorage.setItem(notificationSeenKey, String(initialSeen));
            return;
          }

          processIncoming(sortByIdAsc(snapshot));
          return;
        }

        if (data.length === 0) {
          return;
        }

        // Incremental fetch can arrive in any order; keep max id and dedupe by id.
        const fetchedMaxId = getMaxNotificationId(data);
        notificationLastFetchedIdRef.current = Math.max(afterId, fetchedMaxId);
        setNotifications((prev) => mergeNotifications(prev, data));

        if (!notificationSeenInitializedRef.current) {
          const raw = localStorage.getItem(notificationSeenKey);
          const parsed = raw ? Number(raw) : Number.NaN;
          const initialSeen = Number.isFinite(parsed) ? Math.max(0, parsed) : fetchedMaxId;
          notificationSeenMaxRef.current = initialSeen;
          notificationSeenInitializedRef.current = true;
          localStorage.setItem(notificationSeenKey, String(initialSeen));
          return;
        }

        processIncoming(sortByIdAsc(data));
      } catch {
        if (!cancelled) {
          // ignore periodic polling errors
        }
      } finally {
        notificationPollInFlightRef.current = false;
      }
    };

    void loadNotifications();
    const interval = setInterval(() => {
      void loadNotifications();
    }, 5000);

    return () => {
      cancelled = true;
      notificationPollInFlightRef.current = false;
      clearInterval(interval);
    };
  }, [apiBaseUrl, notificationSeenKey]);

  const triggerSolveEffect = (blood: FlagSubmitResponse["blood"]) => {
    setBloodEffect(buildBloodEffect(blood));
    if (bloodTimeoutRef.current) {
      clearTimeout(bloodTimeoutRef.current);
    }
    bloodTimeoutRef.current = setTimeout(() => {
      setBloodEffect(null);
      bloodTimeoutRef.current = null;
    }, 2000);
  };

  const scrollCategory = (
    category: (typeof groupedByCategory)[number]["category"],
    direction: "left" | "right"
  ) => {
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
    setTheme((previousTheme) => {
      const nextTheme = previousTheme === "dark" ? "light" : "dark";
      localStorage.setItem("casctf_theme", nextTheme);
      document.documentElement.setAttribute("data-theme", nextTheme);
      return nextTheme;
    });
  };

  const closeActiveAlert = () => {
    setActiveAlert(null);
  };

  const openChallengeModal = (item: ChallengeItem) => {
    setSelectedChallenge(item);
    setFlagInput("");
    setFlagResultMessage("");
    setServerAccess(null);
    setServerMessage("");
  };

  const closeChallengeModal = () => {
    setSelectedChallenge(null);
    setFlagInput("");
    setFlagResultMessage("");
    setServerAccess(null);
    setServerMessage("");
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
      alert("Flag瑜??낅젰??二쇱꽭??");
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
        `${data.message} ${data.awarded_point > 0 ? `+${data.awarded_point}???띾뱷.` : ""}`.trim()
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

  const handleRequestChallengeServer = async () => {
    if (!selectedChallenge) {
      return;
    }
    if (!isDurationActive) {
      setServerMessage("CTF is not currently running.");
      return;
    }

    try {
      setServerRequesting(true);
      setServerMessage("");

      const res = await fetch(`${apiBaseUrl}/api/challenges/${selectedChallenge.id}/server/access`, {
        method: "POST",
        credentials: "include",
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setServerAccess(null);
        setServerMessage(data?.detail ?? "Server allocation failed.");
        return;
      }

      const data = (await res.json()) as ChallengeServerAccessResponse;
      setServerAccess(data);
      setServerMessage(data.reused ? "湲곗〈 ?몄뒪?댁뒪瑜??ъ궗?⑺빀?덈떎." : "???몄뒪?댁뒪瑜??앹꽦?덉뒿?덈떎.");
    } catch {
      setServerAccess(null);
      setServerMessage("Cannot reach backend server.");
    } finally {
      setServerRequesting(false);
    }
  };

  const serverRemainingTime = useMemo(() => {
    if (!serverAccess) {
      return "00:00:00";
    }
    return formatSecondsToHms(serverAccess.expires_at_ts - nowTs);
  }, [serverAccess, nowTs]);

  const formattedRemainingTime = useMemo(() => {
    if (!isDurationActive || remainingSeconds <= 0) {
      return "00:00:00";
    }
    return formatSecondsToHms(remainingSeconds);
  }, [isDurationActive, remainingSeconds]);

  return (
    <main className="min-h-screen p-6 md:p-10">
      <MainHeader
        ctfName={ctfName}
        isAdmin={isAdmin}
        authUser={authUser}
        theme={theme}
        notificationCount={notifications.length}
        onToggleTheme={toggleTheme}
      />

      <ChallengeCategoriesSection
        groupedByCategory={groupedByCategory}
        solvedIdSet={solvedIdSet}
        wrongIdSet={wrongIdSet}
        categoryScrollRefs={categoryScrollRefs}
        onScrollCategory={scrollCategory}
        onOpenChallengeModal={openChallengeModal}
        remainingTimeLabel={formattedRemainingTime}
      />

      <ChallengeModal
        selectedChallenge={selectedChallenge}
        solvedIdSet={solvedIdSet}
        wrongIdSet={wrongIdSet}
        apiBaseUrl={apiBaseUrl}
        isDurationActive={isDurationActive}
        flagInput={flagInput}
        flagSubmitting={flagSubmitting}
        flagResultMessage={flagResultMessage}
        serverAccess={serverAccess}
        serverRequesting={serverRequesting}
        serverMessage={serverMessage}
        serverRemainingTime={serverRemainingTime}
        onClose={closeChallengeModal}
        onFlagInputChange={setFlagInput}
        onSubmitFlag={handleSubmitFlag}
        onRequestChallengeServer={handleRequestChallengeServer}
      />

      {activeAlert && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
          <div className="w-full max-w-xl rounded-2xl border border-amber-300/70 bg-zinc-900/95 p-6 shadow-[0_22px_80px_rgba(0,0,0,0.52)]">
            <h3 className="text-2xl font-black uppercase tracking-[0.06em] text-zinc-100">
              {activeAlert.title}
            </h3>
            <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-zinc-300">{activeAlert.content}</p>
            <p className="mt-4 text-xs text-zinc-500">
              {formatNotificationTime(activeAlert.created_ts)} by {activeAlert.created_by}
            </p>
            <div className="mt-5 flex justify-end">
              <button
                type="button"
                onClick={closeActiveAlert}
                className="rounded-lg border border-white/40 bg-white/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.14em] text-zinc-100 transition hover:bg-white hover:text-black"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {toastNotifications.length > 0 && (
        <div className="pointer-events-none fixed bottom-6 right-6 z-[65] flex w-[min(92vw,420px)] flex-col gap-3">
          {toastNotifications.map((item) => (
            <article
              key={item.id}
              className="pointer-events-auto rounded-xl border border-emerald-300/55 bg-zinc-900/92 px-4 py-3 shadow-[0_12px_34px_rgba(0,0,0,0.42)] backdrop-blur-sm"
            >
              <div className="flex items-center justify-end gap-2">
                <p className="text-[10px] text-zinc-500">{formatNotificationTime(item.created_ts)}</p>
              </div>
              <h3 className="mt-1 text-sm font-semibold text-zinc-100">{item.title}</h3>
              <p className="mt-1 text-xs leading-relaxed text-zinc-300">{item.content}</p>
            </article>
          ))}
        </div>
      )}

      <BloodEffectOverlay bloodEffect={bloodEffect} />
      <MainPageStyles />
    </main>
  );
}


