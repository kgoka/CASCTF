"use client";

import { useState } from "react";
import Link from "next/link";

export default function Home() {
  const [showLogin, setShowLogin] = useState(false);

  const handleLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    console.log("로그인 시도");
    // 여기에 fetch 로직 넣으면 됨
  };

  return (
    <main className="min-h-screen flex flex-col items-center justify-center relative p-4 font-pixel">

      <div className="scanlines"></div>

      <div className="relative z-10 w-full max-w-4xl border-8 border-gray-800 rounded-3xl p-2 bg-gray-900 shadow-2xl">
        <div className="relative border-4 border-green-900 rounded-2xl bg-black p-10 flex flex-col items-center justify-center min-h-[500px] neon-border screen-flicker overflow-hidden">

          {/* 상단 텍스트 */}
          <div className="text-green-600 text-xs mb-8 tracking-widest w-full flex justify-between uppercase">
            <span>System: CASPER_OS_v2.0</span>
            <span>Mem: 64KB OK</span>
          </div>

          {/* 메인 타이틀 */}
          <div className="text-center space-y-4 mb-16 relative">
            <h1 className="text-6xl md:text-8xl font-bold text-green-500 neon-text leading-tight">
              2026<br/>
              CASPER<br/>
              CTF
            </h1>
          </div>

          {/* 버튼 */}
          <div className="flex flex-col md:flex-row gap-6 w-full max-w-md z-20">
            
            {/* LOGIN 버튼 */}
            <button
              onClick={() => setShowLogin(true)}
              className="w-full py-4 bg-green-600 text-black hover:bg-green-400 hover:scale-105 transition-all duration-200 uppercase font-bold text-xl shadow-[0_0_15px_rgba(0,255,65,0.7)]"
            >
              LOGIN
            </button>

            <Link href="/signup" className="w-full">
              <button className="w-full py-4 border-2 border-green-600 text-green-500 hover:bg-green-900/50 hover:text-green-300 transition-all duration-200 uppercase font-bold text-xl">
                NEW PLAYER
              </button>
            </Link>

          </div>

          <div className="absolute bottom-4 text-center text-green-800 text-xs animate-pulse">
            PRESS START BUTTON TO HACK THE WORLD
          </div>

        </div>
      </div>

      {/* ================= LOGIN MODAL ================= */}
      {showLogin && (
        <div
          className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50"
          onClick={() => setShowLogin(false)}
        >
          <div
            className="bg-black border-4 border-green-600 p-8 rounded-xl w-full max-w-md neon-border"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-3xl text-green-500 font-bold mb-6 text-center">
              PLAYER LOGIN
            </h2>

            <form onSubmit={handleLoginSubmit} className="space-y-4">
              <input
                type="text"
                placeholder="USERNAME"
                className="w-full p-3 bg-black border-2 border-green-700 text-green-400 focus:outline-none focus:border-green-400"
              />
              <input
                type="password"
                placeholder="PASSWORD"
                className="w-full p-3 bg-black border-2 border-green-700 text-green-400 focus:outline-none focus:border-green-400"
              />

              <button
                type="submit"
                className="w-full py-3 bg-green-600 text-black font-bold hover:bg-green-400 transition-all"
              >
                ENTER
              </button>
            </form>

            <button
              onClick={() => setShowLogin(false)}
              className="mt-4 w-full text-green-700 hover:text-green-400 text-sm"
            >
              CANCEL
            </button>
          </div>
        </div>
      )}

    </main>
  );
}
