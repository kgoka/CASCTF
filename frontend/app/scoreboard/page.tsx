"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

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

const CHART_COLORS = [
  "#ff4b4b", "#ff8f00", "#ffc107", "#8bc34a", "#00e676",
  "#00b0ff", "#2979ff", "#651fff", "#e040fb", "#f50057"
];

const formatTime = (ts: number) => {
  const date = new Date(ts * 1000);
  return `${date.getHours().toString().padStart(2, "0")}:${date.getMinutes().toString().padStart(2, "0")}`;
};

export default function ScoreboardPage() {
  const [users, setUsers] = useState<UserScoreboard[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
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

  if (!isMounted || loading) return <div className="p-10 text-zinc-400 text-center">Loading Scoreboard...</div>;
  if (error) return <div className="p-10 text-red-400 text-center">Error: {error}</div>;

  const top10 = users.slice(0, 10);
  const allTs = top10.flatMap(u => u.history.map(h => h.ts));
  const firstBloodTs = allTs.length > 0 ? Math.min(...allTs) : Math.floor(Date.now() / 1000) - 3600;
  const startTs = firstBloodTs - 600;
  const currentTs = Math.floor(Date.now() / 1000);

  const processedTop10 = top10.map((user) => ({
    ...user,
    fullHistory: [
      { ts: startTs, score: 0 },
      ...user.history,
      { ts: currentTs, score: user.score }
    ]
  }));

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const time = formatTime(payload[0].payload.ts);
      return (
        <div className="bg-zinc-900/90 border border-zinc-700 p-3 rounded shadow-lg backdrop-blur-sm">
          <p className="text-zinc-400 text-xs mb-2 border-b border-zinc-700 pb-1">{time}</p>
          {payload.map((entry: any, index: number) => (
            <div key={index} className="flex items-center justify-between gap-4 py-0.5 text-sm">
              <span style={{ color: entry.color }} className="font-bold">{entry.name}</span>
              <span className="text-zinc-100 font-mono">{entry.value} pt</span>
            </div>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <main className="min-h-screen p-6 md:p-10">
      {/* 1. 상단 헤더 섹션 (Notification 페이지와 동일한 스타일) */}
      <section className="frame mx-auto w-full max-w-6xl rounded-xl px-5 py-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-[11px] uppercase tracking-[0.2em] text-zinc-500">Live Rankings</p>
            <h1 className="mt-1 text-3xl font-semibold text-zinc-100">Scoreboard</h1>
          </div>
          <Link
            href="/main"
            className="mono-btn rounded-lg px-4 py-2 text-xs font-semibold uppercase tracking-[0.16em]"
          >
            Back To Main
          </Link>
        </div>
      </section>

      {/* 2. 메인 콘텐츠 컨테이너 (중앙 정렬 max-w-6xl) */}
      <div className="mx-auto mt-5 w-full max-w-6xl space-y-5">
        
        {/* 그래프 섹션 */}
        <section className="frame rounded-xl p-6 flex flex-col min-h-[450px]">
          <h2 className="text-sm uppercase tracking-[0.15em] text-zinc-400 mb-6 border-b border-zinc-800 pb-3">
            Top 10 Trends
          </h2>
          <div className="w-full h-[350px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#3f3f46" vertical={false} />
                <XAxis 
                  dataKey="ts" 
                  type="number" 
                  domain={[startTs, currentTs]} 
                  tickFormatter={formatTime} 
                  stroke="#71717a"
                  tick={{ fontSize: 11, fill: '#a1a1aa' }}
                  allowDuplicatedCategory={false}
                />
                <YAxis stroke="#71717a" tick={{ fontSize: 11, fill: '#a1a1aa' }} />
                <Tooltip content={<CustomTooltip />} />
                <Legend wrapperStyle={{ paddingTop: '20px', fontSize: '12px' }} />
                {processedTop10.map((user, i) => (
                  <Line
                    key={user.rank}
                    data={user.fullHistory}
                    type="linear"
                    dataKey="score"
                    name={user.username}
                    stroke={CHART_COLORS[i % CHART_COLORS.length]}
                    strokeWidth={2.5}
                    dot={{ r: 3, strokeWidth: 1, fill: '#18181b' }}
                    activeDot={{ r: 6, strokeWidth: 0 }}
                  />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </div>
        </section>

        {/* 랭킹 테이블 섹션 */}
        <section className="frame rounded-xl p-6">
          <h2 className="text-sm uppercase tracking-[0.15em] text-zinc-400 mb-6 border-b border-zinc-800 pb-3">
            Full Rankings
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-zinc-300">
              <thead>
                <tr className="text-zinc-500 text-[10px] uppercase tracking-widest border-b border-zinc-800">
                  <th className="py-3 px-2">Rank</th>
                  <th className="py-3 px-2">Hacker</th>
                  <th className="py-3 px-2 text-right">Solved</th>
                  <th className="py-3 px-2 text-right">Score</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user, i) => {
                  const isTop10 = i < 10;
                  const color = isTop10 ? CHART_COLORS[i % CHART_COLORS.length] : "transparent";
                  return (
                    <tr key={user.rank} className="border-b border-zinc-800/50 hover:bg-zinc-800/30 transition-colors">
                      <td className="py-4 px-2 font-mono text-zinc-500 w-16">
                        #{user.rank}
                      </td>
                      <td className="py-4 px-2 flex items-center gap-3">
                        {isTop10 && <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: color }} />}
                        <Link href={`/profile/${user.username}`} className={`hover:text-emerald-400 transition-colors ${isTop10 ? "text-zinc-100 font-bold" : ""}`}>
                          {user.username}
                        </Link>
                      </td>
                      <td className="py-4 px-2 text-right font-mono text-zinc-400">
                        {user.solved_count}
                      </td>
                      <td className="py-4 px-2 text-right font-mono text-emerald-400 font-bold">
                        {user.score}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </main>
  );
}