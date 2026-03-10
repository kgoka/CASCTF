// app/profile/[id]/page.tsx
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export default function ProfilePage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // 백엔드 주소 (현재 성공하신 3000 포트 또는 8000 포트 사용)
  const API_URL = "http://192.168.0.3:3000/api/auth"; 

  useEffect(() => {
    // 유저 상세 정보 불러오기
    fetch(`${API_URL}/admin/users/${params.id}`, {
      credentials: "include",
    })
      .then((res) => {
        if (!res.ok) throw new Error("권한이 없거나 유저를 찾을 수 없습니다.");
        return res.json();
      })
      .then((data) => {
        setUser(data);
        setLoading(false);
      })
      .catch((err) => {
        alert(err.message);
        router.push("/admin/users"); // 에러 나면 목록으로 돌려보냄
      });
  }, [params.id, router]);

  const handleDelete = async () => {
    if (!confirm("정말 이 유저를 삭제하시겠습니까? (이 작업은 되돌릴 수 없습니다)")) return;

    try {
      const res = await fetch(`${API_URL}/admin/users/${params.id}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (res.ok) {
        alert("유저가 삭제되었습니다.");
        router.push("/admin/users");
      } else {
        alert("삭제에 실패했습니다.");
      }
    } catch (err) {
      console.error(err);
    }
  };

  if (loading) return <div className="p-8 text-zinc-400">Loading Profile...</div>;
  if (!user) return null;

  return (
    <div className="max-w-3xl mx-auto py-12 px-6">
      <section className="frame rounded-xl p-8">
        <div className="border-b border-zinc-800 pb-6 mb-6 flex justify-between items-center">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-zinc-500">Player Profile</p>
            <h1 className="text-4xl font-semibold text-zinc-100 mt-2">{user.username}</h1>
          </div>
          <span className="px-3 py-1 bg-zinc-800 text-zinc-300 rounded-full text-xs uppercase tracking-wider border border-zinc-700">
            {user.role}
          </span>
        </div>

        <div className="grid grid-cols-2 gap-6 mb-10">
          <div className="bg-zinc-900/50 p-5 rounded-lg border border-zinc-800">
            <p className="text-xs text-zinc-500 mb-1">User ID</p>
            <p className="text-lg text-zinc-200 font-mono">#{user.id}</p>
          </div>
          <div className="bg-zinc-900/50 p-5 rounded-lg border border-zinc-800">
            <p className="text-xs text-zinc-500 mb-1">Total Score</p>
            <p className="text-lg text-emerald-400 font-bold">{user.score} pts</p>
          </div>
        </div>

        {/* 관리자 전용 액션 구역 */}
        <div className="pt-6 border-t border-red-900/30">
          <p className="text-xs text-red-500 uppercase tracking-widest mb-4">Danger Zone (Admin Only)</p>
          <div className="flex gap-4">
            <button 
              className="px-6 py-2 bg-zinc-800 text-zinc-300 rounded hover:bg-zinc-700 transition text-sm"
              onClick={() => alert("정보 수정 모달을 띄우는 기능은 다음 단계에서 구현합니다!")}
            >
              Edit Profile
            </button>
            <button 
              className="px-6 py-2 bg-red-900/40 text-red-400 border border-red-900 hover:bg-red-900/80 transition rounded text-sm"
              onClick={handleDelete}
            >
              Delete User
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}