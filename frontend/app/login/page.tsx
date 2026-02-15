"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function LoginPage() {
  const apiBaseUrl =
    (process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000").replace(/\/$/, "");
  const [showLogin, setShowLogin] = useState(false);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      setLoading(true);
      const res = await fetch(`${apiBaseUrl}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
        credentials: "include",
      });

      if (res.ok) {
        const data = await res.json().catch(() => ({}));
        localStorage.setItem(
          "casctf_auth_ui",
          JSON.stringify({
            username: data?.username ?? username,
            role: data?.role ?? ((data?.username ?? username) === "admin" ? "admin" : "player"),
            score: typeof data?.score === "number" ? data.score : 0,
          })
        );
        setShowLogin(false);
        router.push("/main");
        return;
      }

      const data = await res.json().catch(() => ({}));
      alert(data?.detail ?? "Login failed");
    } catch (error) {
      console.error("login failed:", error);
      alert(`Cannot reach backend. Check API URL (${apiBaseUrl}) and backend server status.`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen flex flex-col items-center justify-center relative p-4 font-pixel">
      <div className="scanlines" />

      <div className="relative z-10 w-full max-w-4xl border-8 border-zinc-800 rounded-3xl p-2 bg-zinc-900 shadow-2xl">
        <div className="relative border-2 border-zinc-600 rounded-2xl bg-black p-10 flex flex-col items-center justify-center min-h-[500px] neon-border screen-flicker overflow-hidden">
          <div className="text-zinc-400 text-xs mb-8 tracking-widest w-full flex justify-between uppercase">
            <span>System: CASPER_OS_v2.0</span>
            <span>Mem: 64KB OK</span>
          </div>

          <div className="text-center space-y-4 mb-16 relative">
            <h1 className="text-6xl md:text-8xl font-bold text-zinc-100 neon-text leading-tight">
              2026
              <br />
              CASPER
              <br />
              <span className="inline-flex items-center gap-3">
                CTF
                <span aria-hidden="true" className="translate-y-[0.02em]">
                  👻
                </span>
              </span>
            </h1>
          </div>

          <div className="flex flex-col md:flex-row gap-6 w-full max-w-md z-20">
            <button
              onClick={() => setShowLogin(true)}
              className="w-full py-4 bg-zinc-100 text-black hover:bg-white hover:scale-105 transition-all duration-200 uppercase font-bold text-xl shadow-[0_0_15px_rgba(255,255,255,0.45)]"
            >
              LOGIN
            </button>

            <Link href="/register" className="w-full">
              <button className="w-full py-4 border-2 border-zinc-400 text-zinc-200 hover:bg-zinc-800 hover:text-white transition-all duration-200 uppercase font-bold text-xl">
                NEW PLAYER
              </button>
            </Link>
          </div>

          <div className="absolute bottom-4 text-center text-zinc-500 text-xs animate-pulse">
            PRESS START BUTTON TO HACK THE WORLD
          </div>
        </div>
      </div>

      {showLogin && (
        <div
          className="fixed inset-0 bg-black/85 backdrop-blur-sm flex items-center justify-center z-50"
          onClick={() => setShowLogin(false)}
        >
          <div
            className="bg-black border-2 border-zinc-500 p-8 rounded-xl w-full max-w-md neon-border"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-3xl text-zinc-100 font-bold mb-6 text-center neon-text">PLAYER LOGIN</h2>

            <form onSubmit={handleLoginSubmit} className="space-y-4">
              <input
                type="text"
                placeholder="USERNAME"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full p-3 bg-black border-2 border-zinc-700 text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus:border-zinc-300"
                autoComplete="username"
              />
              <input
                type="password"
                placeholder="PASSWORD"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full p-3 bg-black border-2 border-zinc-700 text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus:border-zinc-300"
                autoComplete="current-password"
              />

              <button
                type="submit"
                disabled={loading || !username || !password}
                className="w-full py-3 bg-zinc-100 text-black font-bold hover:bg-white transition-all disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {loading ? "LOGGING IN..." : "ENTER"}
              </button>
            </form>

            <button
              onClick={() => setShowLogin(false)}
              className="mt-4 w-full text-zinc-500 hover:text-zinc-200 text-sm"
            >
              CANCEL
            </button>
          </div>
        </div>
      )}
    </main>
  );
}
