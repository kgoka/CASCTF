"use client";

import type { Category, ChallengeItem } from "../types";

type GroupedChallenges = {
  category: Category;
  items: ChallengeItem[];
};

type ChallengeCategoriesSectionProps = {
  groupedByCategory: GroupedChallenges[];
  solvedIdSet: Set<number>;
  wrongIdSet: Set<number>;
  onOpenChallengeModal: (item: ChallengeItem) => void;
  remainingTimeLabel: string;
};

export function ChallengeCategoriesSection({
  groupedByCategory,
  solvedIdSet,
  wrongIdSet,
  onOpenChallengeModal,
  remainingTimeLabel,
}: ChallengeCategoriesSectionProps) {
  return (
    <section className="mx-auto mt-6 w-full max-w-6xl">
      <div className="mb-4">
        <div className="frame rounded-xl px-5 py-4">
          <p className="text-[11px] uppercase tracking-[0.2em] text-zinc-400">Remaining Time</p>
          <p className="mt-1 text-3xl font-semibold text-zinc-100">{remainingTimeLabel}</p>
        </div>
      </div>

      <div className="mb-3 text-xs uppercase tracking-[0.22em] text-zinc-400">Categories</div>

      <div className="frame overflow-hidden rounded-xl">
        {groupedByCategory.map(({ category, items }, index) => {
          return (
            <article
              key={category}
              className={`px-6 py-5 ${
                index !== groupedByCategory.length - 1 ? "border-b border-white/10" : ""
              }`}
            >
              <div className="mb-4 flex items-end justify-between">
                <h2 className="text-xl font-semibold text-zinc-100">{category}</h2>
                <span className="text-xs uppercase tracking-[0.14em] text-zinc-500">
                  {items.length} Challenges
                </span>
              </div>

              {items.length > 0 ? (
                // CSS Grid를 적용하여 한 화면에 여러 줄로 펼쳐지도록 수정
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 w-full">
                  {items.map((item) => {
                    const solved = solvedIdSet.has(item.id);
                    const wrong = !solved && wrongIdSet.has(item.id);
                    const statusClassName = solved
                      ? "challenge-card-solved"
                      : wrong
                        ? "challenge-card-wrong"
                        : "challenge-card-default";

                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => onOpenChallengeModal(item)}
                        // 카드가 그리드 셀의 전체 너비를 차지하도록 w-full 적용
                        className={`challenge-card w-full group relative overflow-hidden rounded-xl border p-4 text-left transition duration-200 hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400/70 ${statusClassName}`}
                      >
                        <div className="pointer-events-none absolute inset-0 opacity-0 transition group-hover:opacity-100">
                          <div className="h-full w-full bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.20),transparent_55%)]" />
                        </div>
                        <div className="relative">
                          {solved && (
                            <span className="challenge-chip absolute right-0 top-0 rounded-md border px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.16em]">
                              Solved
                            </span>
                          )}
                          {!solved && wrong && (
                            <span className="challenge-chip absolute right-0 top-0 rounded-md border px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.16em]">
                              Wrong
                            </span>
                          )}
                          <p className="challenge-difficulty text-xs uppercase tracking-[0.14em]">
                            #{item.difficulty}
                          </p>
                          <h3 className="challenge-title mt-2 text-base font-semibold">{item.name}</h3>
                          <p className="challenge-desc mt-3 overflow-hidden text-ellipsis whitespace-nowrap text-sm">
                            {item.message || "No description"}
                          </p>
                          <div className="mt-4 flex items-center justify-between text-xs uppercase tracking-[0.12em]">
                            <span className="challenge-pill rounded-md border px-2 py-1">
                              {item.score_type}
                            </span>
                            <span className="challenge-point">{item.point} pt</span>
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              ) : (
                <p className="text-xs text-zinc-500">No challenge yet.</p>
              )}
            </article>
          );
        })}
      </div>
    </section>
  );
}