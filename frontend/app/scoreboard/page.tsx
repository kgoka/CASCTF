"use client";

import { useEffect, useState } from "react";
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

// CTFd 느낌의 쨍하고 구분 잘 되는 차트 색상표
const CHART_COLORS = [
  "#ff4b4b", "#ff8f00", "#ffc107", "#8bc34a", "#00e676",
  "#00b0ff", "#2979ff", "#651fff", "#e040fb", "#f50057"
];

// 타임스탬프를 시간 형식으로 변환
const formatTime = (ts: number) => {
  const date = new Date(ts * 1000);
  return `${date.getHours().toString().padStart(2, "0")}:${date.getMinutes().toString().padStart(2, "0")}`;
};

export default function AdminScoreboardPage() {
  const [users, setUsers] = useState<UserScoreboard[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [isMounted, setIsMounted] = useState(false); // Recharts 에러 방지용

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

  if (!isMounted || loading) return <div className="p-10 text-zinc-400">Loading CTFd Scoreboard...</div>;
  if (error) return <div className="p-10 text-red-400">Error: {error}</div>;

  const top10 = users.slice(0, 10);
  
  // 대회 첫 문제 풀이 시간을 구해서 그래프의 시작점으로 잡습니다.
  const allTs = top10.flatMap(u => u.history.map(h => h.ts));
  const firstBloodTs = allTs.length > 0 ? Math.min(...allTs) : Math.floor(Date.now() / 1000) - 3600;
  const startTs = firstBloodTs - 600; // 첫 풀이 10분 전을 0점 시작 시간으로
  const currentTs = Math.floor(Date.now() / 1000); // 현재 시간

  // Recharts가 읽기 편하도록 유저별 이력을 가공합니다.
  const processedTop10 = top10.map((user) => {
    return {
      ...user,
      // 0점에서 시작 -> 풀이 기록들 -> 현재 시간까지 뻗어나가도록 점 추가
      fullHistory: [
        { ts: startTs, score: 0 },
        ...user.history,
        { ts: currentTs, score: user.score }
      ]
    };
  });

  // 커스텀 툴팁 (마우스 올렸을 때 뜨는 정보창)
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      // 가장 가까운 시간 기준
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
    <div className="space-y-6">
      <section className="frame rounded-xl px-5 py-4">
        <p className="text-[11px] uppercase tracking-[0.2em] text-zinc-500">Live Rankings</p>
        <h1 className="mt-1 text-3xl font-semibold text-zinc-100">Scoreboard</h1>
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* 상단 꺾은선 차트 (CTFd 스타일) */}
        <section className="frame rounded-xl p-6 lg:col-span-2 flex flex-col min-h-[450px]">
          <h2 className="text-sm uppercase tracking-[0.15em] text-zinc-400 mb-6 border-b border-zinc-800 pb-3">
            Top 10 Trends
          </h2>

          <div className="w-full h-full min-h-[350px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                {/* 배경 그리드 선 */}
                <CartesianGrid strokeDasharray="3 3" stroke="#3f3f46" vertical={false} />
                
                {/* X축 (시간) */}
                <XAxis 
                  dataKey="ts" 
                  type="number" 
                  domain={[startTs, currentTs]} 
                  tickFormatter={formatTime} 
                  stroke="#71717a"
                  tick={{ fontSize: 11, fill: '#a1a1aa' }}
                  allowDuplicatedCategory={false}
                />
                
                {/* Y축 (점수) */}
                <YAxis 
                  dataKey="score" 
                  stroke="#71717a" 
                  tick={{ fontSize: 11, fill: '#a1a1aa' }}
                />
                
                {/* 툴팁 */}
                <Tooltip content={<CustomTooltip />} />
                
                {/* 범례 (이름 클릭하면 껐다 켰다 할 수 있음) */}
                <Legend wrapperStyle={{ paddingTop: '20px', fontSize: '12px' }} />

                {/* 유저별 선 그리기 */}
                {processedTop10.map((user, i) => (
                  <Line
                    key={user.rank}
                    data={user.fullHistory}
                    type="linear" // CTFd처럼 직선으로 꺾임 ("step" 대신 "linear")
                    dataKey="score"
                    name={user.username}
                    stroke={CHART_COLORS[i % CHART_COLORS.length]}
                    strokeWidth={2.5}
                    dot={{ r: 3, strokeWidth: 1, fill: '#18181b' }} // 점 표시
                    activeDot={{ r: 6, strokeWidth: 0 }} // 마우스 올렸을 때 점 커짐
                  />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </div>
        </section>

        {/* 오른쪽 랭킹 테이블 */}
        <section className="frame rounded-xl p-6 overflow-y-auto max-h-[500px] lg:max-h-[450px]">
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