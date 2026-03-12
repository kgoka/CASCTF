"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";

// 백엔드에서 받아올 데이터 타입 정의
interface SolvedChallenge {
  challenge_id: number;
  challenge_name: string;
  category: string;
  point: number;
  solved_at_ts: number;
}

interface UserProfile {
  id: number;
  username: string;
  role: string;
  score: number;
  solves: SolvedChallenge[];
}

// 타임스탬프를 예쁜 날짜/시간 형식으로 변환하는 함수
const formatDateTime = (ts: number) => {
  const date = new Date(ts * 1000);
  const yyyy = date.getFullYear();
  const MM = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");
  const hh = String(date.getHours()).padStart(2, "0");
  const mm = String(date.getMinutes()).padStart(2, "0");
  return `${yyyy}-${MM}-${dd} ${hh}:${mm}`;
};

export default function ProfilePage() {
  const router = useRouter();
  const params = useParams();
  const username = params?.username;

  const apiBaseUrl = (process.env.NEXT_PUBLIC_API_BASE_URL ?? "").replace(/\/$/, "");

  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (username) return;

    fetch(`${apiBaseUrl}/api/auth/profile/${username}`, {
      method: "GET",
      credentials: "include",
    })
      .then(async (res) => {
        if (!res.ok) {
          const errorText = await res.text();
          throw new Error(`[에러 코드: ${res.status}] ${errorText}`);
        }
        return res.json();
      })
      .then((data: UserProfile) => {
        setUser(data);
        setLoading(false);
      })
      .catch((err) => {
        alert(`프로필을 불러올 수 없습니다.\n${err.message}`);
        router.push("/main");
      });
  }, [id, router, apiBaseUrl]);

  if (loading) return <div className="p-10 text-zinc-400 flex justify-center items-center min-h-[50vh]">Loading Profile...</div>;
  if (!user) return null;

  return (
    <div className="max-w-4xl mx-auto py-12 px-6 space-y-6">
      
      {/* 뒤로 가기(닫기) 버튼 */}
      <button
        onClick={() => router.back()} // 이전 페이지로 돌아가는 마법의 함수!
        className="group flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-zinc-500 transition-colors hover:text-emerald-400"
      >
        <svg 
          xmlns="http://www.w3.org/2000/svg" 
          className="h-4 w-4 transition-transform group-hover:-translate-x-1" 
          fill="none" 
          viewBox="0 0 24 24" 
          stroke="currentColor" 
          strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
        </svg>
        Go Back
      </button>

      {/* 1. 상단 프로필 요약 카드 */}
      <section className="frame rounded-xl p-8 relative overflow-hidden">
        {/* 장식용 배경 효과 */}
        <div className="absolute -top-10 -right-10 w-40 h-40 bg-zinc-800/50 rounded-full blur-3xl pointer-events-none" />
        
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 relative z-10">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-zinc-500 mb-2">Hacker Profile</p>
            <div className="flex items-center gap-4">
              <h1 className="text-4xl md:text-5xl font-bold text-zinc-100">{user.username}</h1>
              <span className={`px-3 py-1 text-xs uppercase tracking-wider rounded-full border ${
                user.role === 'admin' 
                  ? 'bg-blue-500/20 text-blue-300 border-blue-500/30' 
                  : 'bg-zinc-800 text-zinc-300 border-zinc-700'
              }`}>
                {user.role}
              </span>
            </div>
            <p className="text-sm text-zinc-400 mt-4 font-mono">User ID: #{user.id}</p>
          </div>

          <div className="bg-zinc-900/80 border border-zinc-800 rounded-lg p-6 min-w-[200px] text-center">
            <p className="text-xs uppercase tracking-[0.15em] text-zinc-500 mb-1">Total Score</p>
            <p className="text-4xl font-black text-emerald-400 font-mono">
              {user.score} <span className="text-lg text-emerald-600">pt</span>
            </p>
          </div>
        </div>
      </section>

      {/* 2. 문제 풀이 기록 (Solve History) */}
      <section className="frame rounded-xl p-8">
        <div className="flex justify-between items-end border-b border-zinc-800 pb-4 mb-6">
          <h2 className="text-lg font-semibold text-zinc-200 uppercase tracking-widest">
            Solve History
          </h2>
          <span className="text-sm text-zinc-500 font-mono">
            Total {user.solves.length} Solved
          </span>
        </div>

        {user.solves.length === 0 ? (
          <div className="py-12 text-center text-zinc-500 bg-zinc-900/30 rounded-lg border border-zinc-800/50">
            아직 푼 문제가 없습니다. 첫 블러드를 노려보세요! 🩸
          </div>
        ) : (
          <div className="space-y-3">
            {user.solves.map((solve) => (
              <div 
                key={solve.challenge_id} 
                className="flex flex-col sm:flex-row sm:items-center justify-between p-4 bg-zinc-900/50 hover:bg-zinc-800/50 border border-zinc-800/80 rounded-lg transition-colors gap-4"
              >
                {/* 왼쪽: 카테고리 & 문제 이름 */}
                <div className="flex items-center gap-4">
                  <span className="text-xs font-semibold px-2.5 py-1 bg-zinc-800 text-zinc-300 rounded uppercase tracking-wider w-24 text-center">
                    {solve.category}
                  </span>
                  <span className="text-zinc-100 font-medium text-lg">
                    {solve.challenge_name}
                  </span>
                </div>

                {/* 오른쪽: 점수 & 시간 */}
                <div className="flex items-center justify-between sm:justify-end gap-6 min-w-[200px]">
                  <span className="font-mono font-bold text-emerald-400">
                    +{solve.point} pt
                  </span>
                  <span className="text-xs text-zinc-500 font-mono">
                    {formatDateTime(solve.solved_at_ts)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

    </div>
  );
}