"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export default function ProfilePage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // 💡 여기도 IP 주소 없이 상대 경로로 수정 완료!
    fetch(`/api/auth/admin/users/${params.id}`, {
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
      .then((data) => {
        setUser(data);
        setLoading(false);
      })
      .catch((err) => {
        alert(`상세 정보 로딩 실패!\n${err.message}`);
        router.push("/admin/users"); 
      });
  }, [params.id, router]);

  const handleDelete = async () => {
    if (!confirm("정말 이 유저를 삭제하시겠습니까? (이 작업은 되돌릴 수 없습니다)")) return;

    try {
      // 💡 삭제 요청도 상대 경로로!
      const res = await fetch(`/api/auth/admin/users/${params.id}`, {
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