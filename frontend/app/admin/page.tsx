export default function AdminPage() {
  return (
    <main className="min-h-screen flex items-center justify-center p-8">
      <div className="frame w-full max-w-3xl p-8">
        {/* TODO: 관리자 전용 기능(CTF 설정/문제 CRUD/로그 조회) 구현 예정 */}
        <h1 className="text-3xl font-semibold text-zinc-100">Admin Console</h1>
        <p className="mt-3 text-zinc-400">
          어드민페이지만들어야합니다.
          기능 문제 관리: 문제 추가 / 수정 / 삭제 (CRUD)
          로그 감사: 유저 제출 로그(정답/오답) 전체 조회 기능
        </p>
      </div>
    </main>
  );
}
