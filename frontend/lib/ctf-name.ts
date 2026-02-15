export const DEFAULT_CTF_NAME = "CASCTF";
const CTF_NAME_STORAGE_KEY = "casctf_ctf_name";
const CTF_NAME_EVENT = "casctf:ctf-name-updated";

export function normalizeCtfName(value: string | null | undefined): string {
  const trimmed = (value ?? "").trim().replace(/\s+/g, " ");
  return trimmed || DEFAULT_CTF_NAME;
}

export function getCachedCtfName(): string {
  if (typeof window === "undefined") {
    return DEFAULT_CTF_NAME;
  }
  return normalizeCtfName(window.localStorage.getItem(CTF_NAME_STORAGE_KEY));
}

export function setCachedCtfName(value: string): string {
  const normalized = normalizeCtfName(value);
  if (typeof window !== "undefined") {
    window.localStorage.setItem(CTF_NAME_STORAGE_KEY, normalized);
    window.dispatchEvent(new CustomEvent<string>(CTF_NAME_EVENT, { detail: normalized }));
  }
  return normalized;
}

export function subscribeCtfName(handler: (name: string) => void): () => void {
  if (typeof window === "undefined") {
    return () => {};
  }

  const listener = (event: Event) => {
    const customEvent = event as CustomEvent<string>;
    handler(normalizeCtfName(customEvent.detail));
  };
  window.addEventListener(CTF_NAME_EVENT, listener);

  return () => window.removeEventListener(CTF_NAME_EVENT, listener);
}

export async function loadAndCacheCtfName(
  apiBaseUrl: string,
  endpoint: "/api/config/public" | "/api/config/admin",
  credentials: RequestCredentials
): Promise<string> {
  try {
    const res = await fetch(`${apiBaseUrl}${endpoint}`, {
      method: "GET",
      credentials,
    });
    if (!res.ok) {
      return getCachedCtfName();
    }

    const data = (await res.json()) as { ctf_name?: string };
    return setCachedCtfName(data?.ctf_name ?? DEFAULT_CTF_NAME);
  } catch {
    return getCachedCtfName();
  }
}

export function formatCtfNameLines(name: string, maxLines = 3): string[] {
  const normalized = normalizeCtfName(name);

  const rawLines = normalized
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
  if (rawLines.length > 1) {
    return rawLines.slice(0, maxLines);
  }

  const words = normalized.split(" ").filter(Boolean);
  if (words.length <= maxLines) {
    return words;
  }

  const lines: string[] = [];
  const maxPerLine = Math.ceil(words.length / maxLines);
  for (let i = 0; i < words.length; i += maxPerLine) {
    lines.push(words.slice(i, i + maxPerLine).join(" "));
  }

  if (lines.length <= maxLines) {
    return lines;
  }

  const fixed = lines.slice(0, maxLines - 1);
  fixed.push(lines.slice(maxLines - 1).join(" "));
  return fixed;
}
