"use client";

import { useEffect, useState } from "react";

interface ScoreHistory {
  ts: number;
  score: number;
}

interface UserScoreboard {
  rank: number;
  username: string;
  score: number;
  solved_count: number;
  history: ScoreHistory[];
}

// 상위 10명을 구분하기 위한 사이버펑크 네온 색상표
const CHART_COLORS = [
  "#ef4444", "#f97316", "#eab308", "#84cc16", "#22c55e",
  "#06b6d4", "#3b82f6", "#8b5cf6", "#d946ef", "#f43f5e"
];

export default function AdminScoreboardPage() {
  const [users, setUsers] = useState<UserScoreboard[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // 💡 새로운 스코어보드 API를 호출합니다.
    fetch("/api/scoreboard", {
      method: "GET",
      credentials: "include",
    })
      .then(async (res) => {
        if (!res.ok) throw new Error("데이터를 불러오지 못했습니다.");
        return res.json();
      })
      .then((data: UserScoreboard[]) => {
        setUsers(data);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message);
        setLoading(false);
      });
  }, []);

  // 차트 비율 계산용 글로벌 최소/최대값 구하기
  const top10 = users.slice(0, 10);
  const highestScore = users.length > 0 && users[0].score > 0 ? users[0].score : 1;
  
  let allTs = users.flatMap(u => u.history.map(h => h.ts));
  let minTs = allTs.length > 0 ? Math.min(...allTs) : Date.now() / 1000 - 3600;
  let maxTs = allTs.length > 0 ? Math.max(...allTs) : Date.now() / 1000;
  if (minTs === maxTs) { minTs -= 3600; maxTs += 3600; } // 데이터가 하나일 때 예외 처리

  if (loading) return <div className="p-10 text-zinc-400">Loading Scoreboard...</div>;
  if (error) return <div className="p-10 text-red-400">Error: {error}</div>;

  return (
    <div className="space-y-6">
      <section className="frame rounded-xl px-5 py-4">
        <p className="text-[11px] uppercase tracking-[0.2em] text-zinc-500">Live Timeline</p>
        <h1 className="mt-1 text-3xl font-semibold text-zinc-100">Scoreboard</h1>
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* 상단 꺾은선 차트 (가로로 길게 배치) */}
        <section className="frame rounded-xl p-6 lg:col-span-2 flex flex-col min-h-[400px]">
          <h2 className="text-sm uppercase tracking-[0.15em] text-zinc-400 mb-6 border-b border-zinc-800 pb-3">
            Top 10 Timeline Progression
          </h2>

          <div className="relative flex-grow w-full h-full mt-2 mb-4">
            {/* 배경 보조선 */}
            <div className="absolute inset-0 flex flex-col justify-between pointer-events-none opacity-20">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="border-t border-dashed border-zinc-500 w-full"></div>
              ))}
            </div>

            {/* SVG 타임라인 그래프 (계단식) */}
            <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="absolute inset-0 w-full h-full overflow-visible">
              {top10.map((user, i) => {
                if (user.history.length === 0) return null;
                const color = CHART_COLORS[i % CHART_COLORS.length];

                // 시작점(0점)부터 현재 점수까지 잇는 계단형 선분(step chart) 생성
                const points = [
                  `0,100`, // 시작점 (대회 시작 시간, 0점)
                  ...user.history.map(h => {
                    const x = ((h.ts - minTs) / (maxTs - minTs)) * 100;
                    const y = 100 - (h.score / highestScore) * 100;
                    return `${x},${y}`;
                  }),
                  `100,${100 - (user.score / highestScore) * 100}` // 현재 시간까지 선 연장
                ].join(" ");

                return (
                  <g key={`line-${user.rank}`}>
                    <polyline
                      points={points}
                      fill="none"
                      stroke={color}
                      strokeWidth="2.5"
                      opacity="0.85"
                      vectorEffect="non-scaling-stroke"
                      className="transition-all hover:stroke-[4px] hover:opacity-100 cursor-pointer"
                    />
                    <title>{user.username}: {user.score} pts</title>
                  </g>
                );
              })}
            </svg>
          </div>
        </section>

        {/* 오른쪽 랭킹 테이블 */}
        <section className="frame rounded-xl p-6 overflow-y-auto max-h-[500px]">
          <h2 className="text-sm uppercase tracking-[0.15em] text-zinc-400 mb-6 border-b border-zinc-800 pb-3">
            Rankings
          </h2>
          <table className="w-full text-left text-sm text-zinc-300">
            <tbody>
              {users.map((user, i) => {
                const isTop10 = i < 10;
                const color = isTop10 ? CHART_COLORS[i % CHART_COLORS.length] : "transparent";
                
                return (
                  <tr key={user.rank} className="border-b border-zinc-800/50 hover:bg-zinc-800/30">
                    <td className="py-3 px-2 font-mono text-zinc-500 w-10">
                      #{user.rank}
                    </td>
                    <td className="py-3 px-2 flex items-center gap-2">
                      {/* Top 10의 경우 그래프 선 색상과 일치하는 컬러 닷 표시 */}
                      {isTop10 && <span className="w-2 h-2 rounded-full" style={{ backgroundColor: color }} />}
                      <span className={isTop10 ? "text-zinc-100 font-bold" : ""}>{user.username}</span>
                    </td>
                    <td className="py-3 px-2 text-right font-mono text-emerald-400">
                      {user.score}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </section>

      </div>
    </div>
  );
}