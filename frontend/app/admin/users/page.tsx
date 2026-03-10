"use client";

import { useEffect, useState } from "react";

// 백엔드에서 받아올 데이터의 형태
interface User {
  id: number;
  username: string;
  role: string;
  score: number;
}

export default function AdminUsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // 백엔드 API 포트(예: 8000)를 실제 환경에 맞게 확인해주세요.
    fetch("http://192.168.0.3:3000/api/auth/admin/users", {
      method: "GET",
      credentials: "include", // 쿠키(인증 토큰) 전송 필수
    })
      .then(async (res) => {
        if (!res.ok) {
          if (res.status === 403) throw new Error("관리자 권한이 없습니다.");
          if (res.status === 401) throw new Error("로그인이 필요합니다.");
          throw new Error("데이터를 불러오는데 실패했습니다.");
        }
        return res.json();
      })
      .then((data) => {
        setUsers(data);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message);
        setLoading(false);
      });
  }, []);

  return (
    <div className="space-y-4">
      {/* 상단 헤더 섹션 */}
      <section className="frame rounded-xl px-5 py-4">
        <p className="text-[11px] uppercase tracking-[0.2em] text-zinc-500">Current Page</p>
        <h1 className="mt-1 text-3xl font-semibold text-zinc-100">Users</h1>
      </section>

      {/* 데이터 출력 섹션 */}
      <section className="frame min-h-[420px] rounded-xl p-5 overflow-x-auto">
        {loading ? (
          <div className="flex h-full min-h-[300px] items-center justify-center text-zinc-400">
            데이터를 불러오는 중...
          </div>
        ) : error ? (
          <div className="flex h-full min-h-[300px] items-center justify-center text-red-400">
            {error}
          </div>
        ) : (
          <table className="w-full text-left text-sm text-zinc-300 border-collapse">
            <thead className="text-xs uppercase bg-zinc-800/50 text-zinc-400 border-b border-zinc-700">
              <tr>
                <th className="px-4 py-3 font-medium">ID</th>
                <th className="px-4 py-3 font-medium">Username</th>
                <th className="px-4 py-3 font-medium">Role</th>
                <th className="px-4 py-3 font-medium">Score</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <tr key={user.id} className="border-b border-zinc-800/50 hover:bg-zinc-800/30 transition-colors">
                  <td className="px-4 py-3">{user.id}</td>
                  <td className="px-4 py-3 font-medium text-zinc-100">{user.username}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-1 rounded-full text-[10px] uppercase tracking-wider ${
                      user.role === 'admin' 
                        ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30' 
                        : 'bg-zinc-700/50 text-zinc-300 border border-zinc-600/50'
                    }`}>
                      {user.role}
                    </span>
                  </td>
                  <td className="px-4 py-3 font-semibold text-emerald-400">{user.score}</td>
                </tr>
              ))}
              
              {users.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-4 py-12 text-center text-zinc-500">
                    가입된 유저가 없습니다.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </section>
    </div>
  );
}