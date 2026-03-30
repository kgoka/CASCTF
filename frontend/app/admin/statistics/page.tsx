"use client";

import { useEffect, useState } from "react";

interface SubmissionLog {
  id: number;
  username: string;
  challenge_name: string;
  provided_flag: string;
  is_correct: boolean;
  created_at: string;
}

export default function AdminStatisticsPage() {
  const [logs, setLogs] = useState<SubmissionLog[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchLogs = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch("/api/auth/admin/submissions", {
        method: "GET",
        credentials: "include",
      });

      if (!res.ok) {
        const errorText = await res.text();
        throw new Error(`[에러: ${res.status}] ${errorText}`);
      }

      const data = await res.json();
      setLogs(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
    const interval = setInterval(fetchLogs, 10000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="space-y-4 pb-20">
      <section className="frame flex items-center justify-between rounded-xl px-5 py-4">
        <div>
          <p className="text-[11px] uppercase tracking-[0.2em] text-zinc-500">Live Monitor</p>
          <h1 className="mt-1 text-3xl font-semibold text-zinc-100">Solve Feed</h1>
        </div>
        <button 
          onClick={fetchLogs}
          className="rounded-lg border border-zinc-600 bg-zinc-800 px-4 py-2 text-xs font-bold text-zinc-300 transition hover:bg-zinc-700 hover:text-white"
        >
          새로고침 🔄
        </button>
      </section>

      <section className="frame min-h-[420px] overflow-x-auto rounded-xl p-5">
        {loading && logs.length === 0 ? (
          <div className="flex h-full min-h-[300px] items-center justify-center text-zinc-400">
            실시간 제출 로그를 불러오는 중...
          </div>
        ) : error ? (
          <div className="flex h-full min-h-[300px] items-center justify-center text-red-400">
            {error}
          </div>
        ) : (
          <table className="w-full border-collapse text-left text-sm text-zinc-300">
            <thead className="border-b border-zinc-700 bg-zinc-800/50 text-xs uppercase text-zinc-400">
              <tr>
                <th className="px-4 py-3 font-medium">Time</th>
                <th className="px-4 py-3 font-medium">User</th>
                <th className="px-4 py-3 font-medium">Challenge</th>
                <th className="px-4 py-3 font-medium">Submitted Flag</th>
                <th className="px-4 py-3 font-medium">Result</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((log) => {
                const date = new Date(log.created_at);
                const timeString = date.toLocaleString('ko-KR', { 
                  month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit' 
                });

                return (
                  <tr key={log.id} className="border-b border-zinc-800/50 transition-colors hover:bg-zinc-800/30">
                    <td className="px-4 py-3 text-xs text-zinc-500">{timeString}</td>
                    <td className="px-4 py-3 font-medium text-blue-300">{log.username}</td>
                    <td className="px-4 py-3 font-medium text-zinc-200">{log.challenge_name}</td>
                    <td className="px-4 py-3">
                      <code className="rounded bg-black/30 px-2 py-1 font-mono text-xs text-rose-300">
                        {log.provided_flag}
                      </code>
                    </td>
                    <td className="px-4 py-3">
                      {log.is_correct ? (
                        <span className="rounded border border-emerald-500/30 bg-emerald-500/20 px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-emerald-400">
                          Correct
                        </span>
                      ) : (
                        <span className="rounded border border-rose-500/20 bg-rose-500/10 px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-rose-400">
                          Incorrect
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
              {logs.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-12 text-center text-zinc-500">아직 제출된 기록이 없습니다.</td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </section>
    </div>
  );
}