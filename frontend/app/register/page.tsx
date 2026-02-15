"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function RegisterPage() {
  const apiBaseUrl =
    (process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000").replace(/\/$/, "");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();

    if (password !== confirm) {
      alert("Passwords do not match.");
      return;
    }

    try {
      setLoading(true);
      const res = await fetch(`${apiBaseUrl}/api/auth/signup`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });

      if (res.ok) {
        alert("Sign up successful. Please log in.");
        router.push("/login");
      } else {
        const data = await res.json().catch(() => ({}));
        alert(data?.detail ?? "Sign up failed");
      }
    } catch (error) {
      console.error("register failed:", error);
      alert(`Cannot reach backend. Check API URL (${apiBaseUrl}) and backend server status.`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen relative flex items-center justify-center p-6">
      <div className="scanlines" />
      <div className="absolute inset-0 opacity-15 pointer-events-none bg-[linear-gradient(rgba(255,255,255,0.12)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.12)_1px,transparent_1px)] bg-[size:26px_26px]" />
      <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.14),transparent_55%)]" />

      <div className="relative z-10 w-full max-w-lg">
        <div className="mb-4 flex items-center justify-between text-[10px] tracking-widest uppercase text-zinc-500">
          <span>CASPER_AUTH::REGISTER</span>
          <span>Secure Link: OK</span>
        </div>

        <div className="border-2 border-zinc-600 rounded-2xl bg-black/75 p-6 md:p-8 neon-border screen-flicker overflow-hidden">
          <div className="mb-8">
            <h1 className="text-2xl md:text-3xl text-zinc-100 neon-text font-bold">JOIN CASCTF</h1>
            <p className="mt-2 text-xs md:text-sm text-zinc-400 leading-relaxed">
              Create your player account to access challenges.
            </p>
          </div>

          <form onSubmit={handleRegister} className="space-y-4">
            <div className="space-y-2">
              <label className="text-xs text-zinc-400 tracking-widest uppercase">Player ID</label>
              <input
                type="text"
                placeholder="e.g. g-mode"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full px-4 py-3 bg-black border-2 border-zinc-700 text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-zinc-300 focus:shadow-[0_0_14px_rgba(255,255,255,0.35)] rounded-lg"
                autoComplete="username"
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs text-zinc-400 tracking-widest uppercase">Password</label>
              <input
                type="password"
                placeholder="********"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 bg-black border-2 border-zinc-700 text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-zinc-300 focus:shadow-[0_0_14px_rgba(255,255,255,0.35)] rounded-lg"
                autoComplete="new-password"
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs text-zinc-400 tracking-widest uppercase">Confirm</label>
              <input
                type="password"
                placeholder="********"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                className="w-full px-4 py-3 bg-black border-2 border-zinc-700 text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-zinc-300 focus:shadow-[0_0_14px_rgba(255,255,255,0.35)] rounded-lg"
                autoComplete="new-password"
              />
            </div>

            <button
              type="submit"
              disabled={loading || !username || !password || !confirm}
              className="w-full mt-2 py-4 bg-zinc-100 text-black font-bold uppercase hover:bg-white transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed shadow-[0_0_18px_rgba(255,255,255,0.35)] rounded-lg"
            >
              {loading ? "REGISTERING..." : "REGISTER"}
            </button>

            <div className="pt-3 flex items-center justify-between text-xs text-zinc-500">
              <span className="animate-pulse">TIP: Use a unique ID</span>
              <Link href="/login" className="text-zinc-300 hover:text-white transition-colors">
                Already a player? LOGIN
              </Link>
            </div>
          </form>

          <div className="mt-8 text-[10px] text-zinc-600 tracking-widest uppercase">
            <span className="opacity-70">STATUS:</span>{" "}
            <span className="text-zinc-300">READY</span>
          </div>

          <div className="pointer-events-none absolute -top-24 -right-24 w-64 h-64 rounded-full bg-white/10 blur-2xl" />
          <div className="pointer-events-none absolute -bottom-24 -left-24 w-64 h-64 rounded-full bg-white/10 blur-2xl" />
        </div>

        <div className="mt-6 text-center text-[10px] text-zinc-500 tracking-widest uppercase">
          PRESS ENTER TO REGISTER YOUR PLAYER
        </div>
      </div>
    </main>
  );
}
