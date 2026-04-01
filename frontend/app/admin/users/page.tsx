"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

// 백엔드에서 받아올 데이터의 형태
interface User {
  id: number;
  username: string;
  role: string;
  score: number;
}

export default function AdminUsersPage() {
  const router = useRouter();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // 컴포넌트 마운트 시 유저 목록 불러오기
  const fetchUsers = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch("/api/auth/admin/users", {
        method: "GET",
        credentials: "include",
      });

      if (!res.ok) {
        const errorText = await res.text();
        throw new Error(`[에러 코드: ${res.status}] ${errorText}`);
      }

      const data = await res.json();
      setUsers(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchUsers();
  }, []);

  // 👑 [신규 추가] 특정 유저 권한 변경 함수 (어드민 토글)
  const handleRoleChange = async (userId: number, currentRole: string, e: React.MouseEvent) => {
    e.stopPropagation(); // 행 클릭 시 프로필 페이지로 넘어가는 것을 방지

    const newRole = currentRole === "admin" ? "player" : "admin";
    const actionText = newRole === "admin" ? "관리자(Admin)로 승급" : "일반 참가자(Player)로 강등";

    if (!window.confirm(`정말로 이 유저를 ${actionText} 하시겠습니까?`)) {
      return;
    }

    try {
      const res = await fetch(`/api/auth/admin/users/${userId}/role`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role: newRole }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        alert(`권한 변경 실패: ${data?.detail ?? "알 수 없는 오류"}`);
        return;
      }

      alert(`성공적으로 ${actionText} 되었습니다.`);
      fetchUsers(); // 데이터 갱신
    } catch (err) {
      alert("서버와 통신할 수 없습니다.");
    }
  };

  // 🚨 시즌 초기화 함수
  const handleResetSeason = async () => {
    const confirmWord = window.prompt(
      "🚨 [경고] 정말로 모든 참가자 데이터와 풀이 기록을 삭제하시겠습니까?\n\n이 작업은 절대 되돌릴 수 없습니다.\n관리자 계정(Admin)은 유지되며 일반 참가자들만 삭제됩니다.\n\n계속하시려면 아래에 'RESET' 이라고 정확히 입력해 주세요."
    );

    if (confirmWord !== "RESET") {
      alert("초기화 작업이 취소되었습니다.");
      return;
    }

    try {
      const res = await fetch("/api/auth/admin/reset-season", {
        method: "DELETE",
        credentials: "include",
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        alert(`초기화 실패: ${data?.detail ?? "알 수 없는 오류"}`);
        return;
      }

      alert("🎉 성공적으로 새 시즌 준비가 완료되었습니다. 모든 참가자 데이터가 초기화되었습니다.");
      // 목록 다시 불러오기 (화면 갱신)
      fetchUsers(); 
    } catch (e) {
      alert("서버와 통신할 수 없습니다.");
    }
  };

  return (
    <div className="space-y-4 pb-20">
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
                {/* 👇 우측 끝에 권한 관리 열 추가 */}
                <th className="px-4 py-3 font-medium text-right">관리</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <tr 
                  key={user.id} 
                  onClick={() => router.push(`/profile/${user.username}`)} // id 대신 username으로 라우팅 
                  className="border-b border-zinc-800/50 hover:bg-zinc-800/30 transition-colors cursor-pointer"
                >
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
                  <td className="px-4 py-3 text-right">
                    {/* 👇 승급/강등 토글 버튼 */}
                    <button
                      onClick={(e) => handleRoleChange(user.id, user.role, e)}
                      className={`rounded px-3 py-1.5 text-xs font-semibold uppercase tracking-wider transition ${
                        user.role === 'admin'
                          ? 'border border-rose-500/50 text-rose-400 hover:bg-rose-500/20'
                          : 'border border-blue-500/50 text-blue-400 hover:bg-blue-500/20'
                      }`}
                    >
                      {user.role === 'admin' ? "강등하기" : "어드민 임명"}
                    </button>
                  </td>
                </tr>
              ))}
              
              {users.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-12 text-center text-zinc-500">
                    가입된 유저가 없습니다.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </section>

      {/* 🚨 Danger Zone 섹션 */}
      <section className="frame mt-12 rounded-xl border border-rose-500/30 bg-rose-500/5 px-6 py-6 shadow-[0_0_15px_rgba(244,63,94,0.1)]">
        <h2 className="text-xl font-bold text-rose-400 uppercase tracking-widest">Danger Zone</h2>
        <p className="mt-2 text-sm text-zinc-400">
          새로운 CTF 대회를 시작하기 위해 일반 참가자 정보 및 모든 문제 풀이 기록(Solves)을 완전히 삭제합니다.<br />
          등록된 챌린지 문제들과 관리자(Admin) 계정 정보는 유지됩니다.
        </p>
        <button
          onClick={handleResetSeason}
          className="mt-5 rounded-lg border border-rose-500 bg-rose-600/20 px-6 py-3 text-sm font-bold uppercase tracking-wider text-rose-300 transition hover:bg-rose-600 hover:text-white"
        >
          시즌 초기화 (참가자 DB 삭제)
        </button>
      </section>
    </div>
  );
}