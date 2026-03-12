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

interface TooltipData {
  username: string;
  score: number;
  time: string;
  x: number;
  y: number;
  color: string;
}

// 상위 10명을 구분하기 위한 사이버펑크 네온 색상표
const CHART_COLORS = [
  "#ef4444", "#f97316", "#eab308", "#84cc16", "#22c55e",
  "#06b6d4", "#3b82f6", "#8b5cf6", "#d946ef", "#f43f5e"
];

// 타임스탬프를 보기 좋은 시간 형식으로 변환 (예: 13:45:00)
const formatTime = (ts: number) => {
  const date = new Date(ts * 1000);
  return `${date.getHours().toString().padStart(2, "0")}:${date.getMinutes().toString().padStart(2, "0")}:${date.getSeconds().toString().padStart(2, "0")}`;
};

export default function AdminScoreboardPage() {
  const [users, setUsers] = useState<UserScoreboard[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  
  // 마우스 오버 시 띄울 툴팁 상태 관리
  const [tooltip, setTooltip] = useState<TooltipData | null>(null);

  useEffect(() => {
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
  const highestScore = users.length > 0 && users[0].score > 0 ? users[0].score : 100; // 최소 100점 기준으로 차트 그림
  
  let allTs = users.flatMap(u => u.history.map(h => h.ts));
  let minTs = allTs.length > 0 ? Math.min(...allTs) : Date.now() / 1000 - 3600;
  let maxTs = allTs.length > 0 ? Math.max(...allTs) : Date.now() / 1000;
  
  // 데이터가 없거나 1개일 때 차트가 깨지지 않도록 여유 시간 부여
  if (minTs === maxTs) { 
    minTs -= 1800; // 30분 전
    maxTs += 1800; // 30분 후
  } else {
    // 양옆으로 5% 정도 여백을 줌
    const padding = (maxTs - minTs) * 0.05;
    minTs -= padding;
    maxTs += padding;
  }

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
        <section className="frame rounded-xl p-6 lg:col-span-2 flex flex-col min-h-[450px]">
          <h2 className="text-sm uppercase tracking-[0.15em] text-zinc-400 mb-6 border-b border-zinc-800 pb-3">
            Top 10 Timeline Progression
          </h2>

          {/* 차트 영역 (패딩을 주어 눈금선 글씨가 보일 공간 확보) */}
          <div className="relative flex-grow w-full h-full mt-2 mb-8 ml-6 mr-4" onMouseLeave={() => setTooltip(null)}>
            
            {/* Y축 눈금선 (점수 행) */}
            <div className="absolute inset-0 flex flex-col justify-between pointer-events-none opacity-30">
              {[1, 0.75, 0.5, 0.25, 0].map((ratio, i) => (
                <div key={`y-grid-${i}`} className="relative border-t border-dashed border-zinc-500 w-full h-0">
                  <span className="absolute -left-8 -top-2.5 text-[10px] text-zinc-400 font-mono">
                    {Math.round(highestScore * ratio)}
                  </span>
                </div>
              ))}
            </div>

            {/* X축 눈금선 (시간 열) */}
            <div className="absolute inset-0 flex justify-between pointer-events-none opacity-30">
              {[0, 0.25, 0.5, 0.75, 1].map((ratio, i) => {
                const ts = minTs + (maxTs - minTs) * ratio;
                return (
                  <div key={`x-grid-${i}`} className="relative border-l border-dashed border-zinc-500 h-full w-0">
                    <span className="absolute -bottom-6 -left-4 text-[10px] text-zinc-400 font-mono whitespace-nowrap">
                      {formatTime(ts)}
                    </span>
                  </div>
                );
              })}
            </div>

            {/* SVG 타임라인 그래프 */}
            <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="absolute inset-0 w-full h-full overflow-visible">
              {/* 1. 선 그리기 */}
              {top10.map((user, i) => {
                if (user.history.length === 0) return null;
                const color = CHART_COLORS[i % CHART_COLORS.length];

                // 계단식 꺾은선 데이터 만들기 (직선으로 잇지 않고, 시간이 지나면 수직으로 꺾임)
                let points = `0,100`; // 시작점
                user.history.forEach((h) => {
                  const x = ((h.ts - minTs) / (maxTs - minTs)) * 100;
                  const y = 100 - (h.score / highestScore) * 100;
                  points += ` ${x},100 ${x},${y}`; // 꺾이는 부분 처리
                });
                
                // 현재 점수로 맨 끝까지 수평선 연장
                const lastY = 100 - (user.score / highestScore) * 100;
                points += ` 100,${lastY}`;

                return (
                  <polyline
                    key={`line-${user.rank}`}
                    points={points}
                    fill="none"
                    stroke={color}
                    strokeWidth="2"
                    opacity="0.6"
                    vectorEffect="non-scaling-stroke"
                    className="transition-all hover:opacity-100"
                  />
                );
              })}

              {/* 2. 인터랙티브 데이터 포인트(동그라미) 그리기 */}
              {top10.map((user, i) => {
                const color = CHART_COLORS[i % CHART_COLORS.length];
                
                return user.history.map((h, j) => {
                  const x = ((h.ts - minTs) / (maxTs - minTs)) * 100;
                  const y = 100 - (h.score / highestScore) * 100;
                  
                  return (
                    <circle
                      key={`point-${user.rank}-${j}`}
                      cx={`${x}%`}
                      cy={`${y}%`}
                      r="4" /* 동그라미 크기 */
                      fill="#18181b" /* 내부 배경색 */
                      stroke={color}
                      strokeWidth="3"
                      className="cursor-pointer transition-all hover:r-6 hover:fill-white"
                      vectorEffect="non-scaling-stroke"
                      onMouseEnter={() => setTooltip({
                        username: user.username,
                        score: h.score,
                        time: formatTime(h.ts),
                        x, y, color
                      })}
                    />
                  );
                });
              })}
            </svg>

            {/* 3. HTML 말풍선 툴팁 (마우스를 올렸을 때만 표시됨) */}
            {tooltip && (
              <div 
                className="absolute z-50 pointer-events-none flex flex-col items-center"
                style={{ 
                  left: `${tooltip.x}%`, 
                  top: `${tooltip.y}%`, 
                  transform: 'translate(-50%, -120%)' // 동그라미 바로 위에 뜨도록 위치 조정
                }}
              >
                <div 
                  className="bg-zinc-900 border px-3 py-2 rounded shadow-2xl backdrop-blur-md"
                  style={{ borderColor: tooltip.color }}
                >
                  <p className="text-[10px] text-zinc-400 mb-1">{tooltip.time}</p>
                  <p className="text-sm font-bold" style={{ color: tooltip.color }}>
                    {tooltip.username} <span className="text-zinc-200">({tooltip.score}pt)</span>
                  </p>
                </div>
                {/* 툴팁 아래 뾰족한 꼬리표 */}
                <div 
                  className="w-2 h-2 rotate-45 border-r border-b bg-zinc-900 -mt-1.5"
                  style={{ borderColor: tooltip.color }}
                />
              </div>
            )}
            
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