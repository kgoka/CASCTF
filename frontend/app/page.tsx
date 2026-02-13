import Link from "next/link";

export default function Home() {
  return (
    <main className="relative min-h-screen overflow-hidden px-6 py-10 md:px-12">
      <div className="pointer-events-none absolute inset-0 grid-bg opacity-25" />

      <section className="relative z-10 mx-auto flex min-h-[85vh] w-full max-w-6xl items-center">
        <div className="frame w-full p-8 md:p-14">
          <div className="mb-12 flex items-start justify-between gap-8 border-b border-white/10 pb-8">
            <div>
              <p className="text-xs uppercase tracking-[0.3em] text-zinc-400">CASCTF Protocol</p>
              <h1 className="hero-title mt-3 text-5xl font-semibold leading-[0.95] md:text-7xl">
                CASCTF
                <br />
                2026
              </h1>
            </div>
            <div className="hidden text-right text-xs uppercase tracking-[0.22em] text-zinc-500 md:block">
              <p>Capture The Flag</p>
              <p className="mt-1">Monochrome Build</p>
            </div>
          </div>

          <div className="grid gap-8 md:grid-cols-[1.4fr_1fr] md:items-end">
            <p className="max-w-2xl text-sm leading-7 text-zinc-300 md:text-base">
              Competitive security playground with challenge pipelines, team progression,
              and score orchestration. Enter the lobby and initialize your player profile.
            </p>

            <div className="flex flex-col gap-3">
              <Link href="/login" className="w-full">
                <button className="mono-btn w-full px-8 py-5 text-left">
                  <p className="text-xs uppercase tracking-[0.2em] text-zinc-400">Primary Action</p>
                  <p className="mt-1 text-xl font-semibold uppercase tracking-[0.08em]">Enter Lobby</p>
                  <p className="mt-2 text-xs text-zinc-500">Login to continue to CASCTF main page</p>
                </button>
              </Link>

              <Link href="/signup" className="w-full">
                <button className="w-full border border-white/25 bg-white/5 px-8 py-4 text-left transition hover:border-white/60 hover:bg-white/10">
                  <p className="text-sm font-medium uppercase tracking-[0.14em] text-zinc-200">Create New Account</p>
                </button>
              </Link>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
