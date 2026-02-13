import Link from "next/link";

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-24 text-center">
      {/* 타이틀과 설명은 그대로 유지 */}
      <h1 className="text-6xl font-bold mb-4 glitch-effect">CASCTF 2026👻</h1>
      <p className="text-xl mb-16 text-gray-400">Capture The Flag Platform</p>

      {/* 버튼 영역 수정: LOGIN/SIGNUP 삭제 -> INSERT COIN 추가 */}
      <div className="animate-pulse"> {/* 전체가 깜빡거리는 효과 */}
        <Link href="/login">
          <button className="px-10 py-4 border-2 border-yellow-400 text-yellow-400 hover:bg-yellow-400 hover:text-black transition duration-200 rounded font-bold text-2xl tracking-widest shadow-[0_0_15px_rgba(250,204,21,0.5)]">
            INSERT COIN
          </button>
        </Link>
      </div>
      
      {/* 하단 안내 문구 추가 (선택사항) */}
      <div className="mt-6 text-sm text-gray-600">
        PRESS BUTTON TO START
      </div>
    </main>
  );
}