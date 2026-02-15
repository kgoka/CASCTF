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
  type PublicConfigResponse,
} from "./types";
import { buildBloodEffect, formatSecondsToHms, normalizeAuthUser } from "./utils";

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
  const bloodTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const categoryScrollRefs = useRef<Record<string, HTMLDivElement | null>>({});

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
      setServerMessage(data.reused ? "기존 인스턴스를 재사용합니다." : "새 인스턴스를 생성했습니다.");
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

      <BloodEffectOverlay bloodEffect={bloodEffect} />
      <MainPageStyles />
    </main>
  );
}
