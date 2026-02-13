"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function Signup() {
  const apiBaseUrl =
    (process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://127.0.0.1:8000").replace(/\/$/, "");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleSignup = async (e: React.FormEvent) => {
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
      console.error("signup failed:", error);
      alert(
        `Cannot reach backend. Check API URL (${apiBaseUrl}) and backend server status.`
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen relative flex items-center justify-center p-6">
      <div className="scanlines" />
      <div className="absolute inset-0 opacity-15 pointer-events-none bg-[linear-gradient(rgba(0,255,65,0.12)_1px,transparent_1px),linear-gradient(90deg,rgba(0,255,65,0.12)_1px,transparent_1px)] bg-[size:26px_26px]" />
      <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(circle_at_center,rgba(0,255,65,0.18),transparent_55%)]" />

      <div className="relative z-10 w-full max-w-lg">
        <div className="mb-4 flex items-center justify-between text-[10px] tracking-widest uppercase text-green-700">
          <span>CASPER_AUTH::SIGNUP</span>
          <span>Secure Link: OK</span>
        </div>

        <div className="border-4 border-green-900 rounded-2xl bg-black/70 p-6 md:p-8 neon-border screen-flicker overflow-hidden">
          <div className="mb-8">
            <h1 className="text-2xl md:text-3xl text-green-400 neon-text font-bold">
              JOIN CASCTF
            </h1>
            <p className="mt-2 text-xs md:text-sm text-green-700 leading-relaxed">
              Create your player account to access challenges.
            </p>
          </div>

          <form onSubmit={handleSignup} className="space-y-4">
            <div className="space-y-2">
              <label className="text-xs text-green-700 tracking-widest uppercase">
                Player ID
              </label>
              <input
                type="text"
                placeholder="e.g. g-mode"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full px-4 py-3 bg-black border-2 border-green-900 text-green-300 placeholder:text-green-900/80 focus:outline-none focus:border-green-400 focus:shadow-[0_0_14px_rgba(0,255,65,0.55)] rounded-lg"
                autoComplete="username"
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs text-green-700 tracking-widest uppercase">
                Password
              </label>
              <input
                type="password"
                placeholder="********"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 bg-black border-2 border-green-900 text-green-300 placeholder:text-green-900/80 focus:outline-none focus:border-green-400 focus:shadow-[0_0_14px_rgba(0,255,65,0.55)] rounded-lg"
                autoComplete="new-password"
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs text-green-700 tracking-widest uppercase">
                Confirm
              </label>
              <input
                type="password"
                placeholder="********"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                className="w-full px-4 py-3 bg-black border-2 border-green-900 text-green-300 placeholder:text-green-900/80 focus:outline-none focus:border-green-400 focus:shadow-[0_0_14px_rgba(0,255,65,0.55)] rounded-lg"
                autoComplete="new-password"
              />
            </div>

            <button
              type="submit"
              disabled={loading || !username || !password || !confirm}
              className="w-full mt-2 py-4 bg-green-600 text-black font-bold uppercase hover:bg-green-400 transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed shadow-[0_0_18px_rgba(0,255,65,0.55)] rounded-lg"
            >
              {loading ? "REGISTERING..." : "REGISTER"}
            </button>

            <div className="pt-3 flex items-center justify-between text-xs text-green-800">
              <span className="animate-pulse">TIP: Use a unique ID</span>
              <Link
                href="/login"
                className="text-green-600 hover:text-green-300 transition-colors"
              >
                Already a player? LOGIN
              </Link>
            </div>
          </form>

          <div className="mt-8 text-[10px] text-green-900 tracking-widest uppercase">
            <span className="opacity-70">STATUS:</span>{" "}
            <span className="text-green-700">READY</span>
          </div>

          <div className="pointer-events-none absolute -top-24 -right-24 w-64 h-64 rounded-full bg-green-500/10 blur-2xl" />
          <div className="pointer-events-none absolute -bottom-24 -left-24 w-64 h-64 rounded-full bg-green-500/10 blur-2xl" />
        </div>

        <div className="mt-6 text-center text-[10px] text-green-800 tracking-widest uppercase">
          PRESS ENTER TO REGISTER YOUR PLAYER
        </div>
      </div>
    </main>
  );
}
