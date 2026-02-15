import type { AuthUser, BloodEffect, FlagSubmitResponse } from "./types";

export function normalizeAuthUser(input: Partial<AuthUser> | null): AuthUser | null {
  if (!input?.username) {
    return null;
  }

  return {
    username: input.username,
    role: input.role ?? "player",
    score: typeof input.score === "number" ? input.score : 0,
  };
}

export function formatSecondsToHms(seconds: number): string {
  const safe = Math.max(0, seconds);
  const hours = Math.floor(safe / 3600);
  const minutes = Math.floor((safe % 3600) / 60);
  const remainSeconds = safe % 60;
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(
    remainSeconds
  ).padStart(2, "0")}`;
}

export function buildBloodEffect(blood: FlagSubmitResponse["blood"]): BloodEffect {
  if (blood === "first") {
    return {
      title: "First Blood",
      subtitle: "You cracked it first",
      titleClassName: "text-amber-300",
      borderClassName: "border-amber-300/80",
    };
  }

  if (blood === "second") {
    return {
      title: "Second Blood",
      subtitle: "Second solver unlocked",
      titleClassName: "text-slate-200",
      borderClassName: "border-slate-300/80",
    };
  }

  if (blood === "third") {
    return {
      title: "Third Blood",
      subtitle: "Top 3 solver",
      titleClassName: "text-orange-300",
      borderClassName: "border-orange-300/80",
    };
  }

  return {
    title: "Solved",
    subtitle: "Nice solve",
    titleClassName: "text-emerald-300",
    borderClassName: "border-emerald-300/80",
  };
}
