"use client";

import { useEffect, useState, type ChangeEvent } from "react";

// 👇 추가된 부분: ChallengeSolveItem 타입 임포트
import type { ChallengeItem, ChallengeServerAccessResponse, ChallengeSolveItem } from "../types";

type ChallengeModalProps = {
  selectedChallenge: ChallengeItem | null;
  solvedIdSet: Set<number>;
  wrongIdSet: Set<number>;
  apiBaseUrl: string;
  isDurationActive: boolean;
  flagInput: string;
  flagSubmitting: boolean;
  flagResultMessage: string;
  serverAccess: ChallengeServerAccessResponse | null;
  serverRequesting: boolean;
  serverMessage: string;
  serverRemainingTime: string;
  onClose: () => void;
  onFlagInputChange: (value: string) => void;
  onSubmitFlag: () => void;
  onRequestChallengeServer: () => void;
};

export function ChallengeModal({
  selectedChallenge,
  solvedIdSet,
  wrongIdSet,
  apiBaseUrl,
  isDurationActive,
  flagInput,
  flagSubmitting,
  flagResultMessage,
  serverAccess,
  serverRequesting,
  serverMessage,
  serverRemainingTime,
  onClose,
  onFlagInputChange,
  onSubmitFlag,
  onRequestChallengeServer,
}: ChallengeModalProps) {
  // 👇 추가된 부분: 솔브 목록 상태(State) 관리
  const [solves, setSolves] = useState<ChallengeSolveItem[]>([]);
  const [isLoadingSolves, setIsLoadingSolves] = useState(false);

  // 👇 추가된 부분: 모달이 열릴 때 API를 호출하여 정답자 목록을 가져오는 Hook
  useEffect(() => {
    if (!selectedChallenge) return;

    const fetchSolves = async () => {
      setIsLoadingSolves(true);
      try {
        const response = await fetch(`${apiBaseUrl}/api/challenges/${selectedChallenge.id}/solves`);
        if (response.ok) {
          const data = await response.json();
          setSolves(data);
        }
      } catch (error) {
        console.error("Failed to fetch solves:", error);
      } finally {
        setIsLoadingSolves(false);
      }
    };

    fetchSolves();
  }, [selectedChallenge, apiBaseUrl]);

  if (!selectedChallenge) {
    return null;
  }

  const handleFlagInputChange = (event: ChangeEvent<HTMLInputElement>) => {
    onFlagInputChange(event.target.value);
  };

  return (
    <div
      className="modal-scrollbar fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/70 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="modal-scrollbar frame my-auto max-h-[calc(100vh-2rem)] w-full max-w-2xl overflow-y-auto rounded-2xl border border-white/20 p-6"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-[0.16em] text-zinc-500">
              {selectedChallenge.category} / #{selectedChallenge.id}
            </p>
            <h2 className="mt-1 text-2xl font-semibold text-zinc-100">{selectedChallenge.name}</h2>
            {solvedIdSet.has(selectedChallenge.id) && (
              <p className="mt-2 inline-flex rounded-md border border-emerald-200/70 bg-emerald-200/20 px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-emerald-100">
                Solved
              </p>
            )}
            {!solvedIdSet.has(selectedChallenge.id) && wrongIdSet.has(selectedChallenge.id) && (
              <p className="mt-2 inline-flex rounded-md border border-rose-300/80 bg-rose-500/20 px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-rose-100">
                Wrong Attempt
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="mono-btn rounded-md px-3 py-1.5 text-xs uppercase tracking-[0.12em]"
          >
            Close
          </button>
        </div>

        <div className="mt-5 rounded-xl border border-white/10 bg-white/[0.03] p-4">
          <p className="whitespace-pre-wrap text-sm leading-relaxed text-zinc-300">
            {selectedChallenge.message || "No challenge description provided yet."}
          </p>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-3 text-xs uppercase tracking-[0.14em] text-zinc-400 md:grid-cols-3">
          <div className="rounded-lg border border-white/10 bg-white/[0.02] px-3 py-2">
            Score Type: {selectedChallenge.score_type}
          </div>
          <div className="rounded-lg border border-white/10 bg-white/[0.02] px-3 py-2">
            POINT: {selectedChallenge.dynamic_score ?? selectedChallenge.point}
          </div>
          <div className="rounded-lg border border-white/10 bg-white/[0.02] px-3 py-2">
            State: {selectedChallenge.state}
          </div>
        </div>

        <div className="mt-5 rounded-xl border border-white/10 bg-white/[0.03] p-4">
          <p className="text-xs uppercase tracking-[0.14em] text-zinc-400">Challenge File</p>
          {selectedChallenge.attachment_file_id ? (
            <a
              href={`${apiBaseUrl}/api/challenges/${selectedChallenge.id}/file`}
              className="mt-2 inline-flex rounded-lg border border-white/30 px-3 py-2 text-xs font-semibold uppercase tracking-[0.14em] text-zinc-100 hover:bg-white/10"
            >
              {selectedChallenge.attachment_file_name ?? "Attachment"}
            </a>
          ) : (
            <p className="mt-2 text-sm text-zinc-500">No uploaded file for this challenge.</p>
          )}
        </div>

        {selectedChallenge.docker_enabled && (
          <div className="mt-5 rounded-xl border border-emerald-300/30 bg-emerald-500/5 p-4">
            <p className="text-xs uppercase tracking-[0.14em] text-emerald-200">Challenge Server</p>
            <p className="mt-2 text-sm text-zinc-300">
              아래 버튼을 클릭해 서버에 접속해주세요. 부팅에 시간이 걸릴수 있습니다.
            </p>
            <button
              type="button"
              onClick={onRequestChallengeServer}
              disabled={serverRequesting || !isDurationActive}
              className="mt-3 rounded-lg border border-emerald-300/50 bg-emerald-400/15 px-4 py-2 text-xs font-semibold uppercase tracking-[0.14em] text-emerald-100 transition hover:bg-emerald-400/30 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {!isDurationActive ? "종료됨" : serverRequesting ? "생성 중..." : "서버 생성하기"}
            </button>

            {serverAccess && (
              <div className="mt-3 rounded-lg border border-white/10 bg-black/30 p-3 text-sm text-zinc-200">
                <p>
                  접속 주소 :{" "}
                  <a
                    href={serverAccess.url}
                    target="_blank"
                    rel="noreferrer"
                    className="underline decoration-dotted underline-offset-4"
                  >
                    {serverAccess.url}
                  </a>
                </p>
                <p className="mt-1">(시스템 문제일시 nc {serverAccess.host} {serverAccess.port})</p>
                <p className="mt-1">남은 시간 : {serverRemainingTime}</p>
              </div>
            )}
            {serverMessage && <p className="mt-2 text-sm text-zinc-300">{serverMessage}</p>}
          </div>
        )}

        {/* 👇 추가된 부분: 정답자(Solves) 목록 표시 UI */}
        <div className="mt-5 rounded-xl border border-white/10 bg-white/[0.03] p-4">
          <p className="text-xs uppercase tracking-[0.14em] text-zinc-400 mb-3">
            Solves ({solves.length})
          </p>
          <div className="max-h-36 overflow-y-auto modal-scrollbar pr-2">
            {isLoadingSolves ? (
              <p className="text-sm text-zinc-500">Loading solves...</p>
            ) : solves.length === 0 ? (
              <p className="text-sm text-zinc-500">No solves yet. Be the first!</p>
            ) : (
              <ul className="flex flex-col gap-2">
                {solves.map((solve, index) => {
                  // UNIX 타임스탬프를 보기 편한 날짜 문자열로 변환
                  const dateStr = new Date(solve.solved_at_ts * 1000).toLocaleString("ko-KR", {
                    month: "2-digit",
                    day: "2-digit",
                    hour: "2-digit",
                    minute: "2-digit",
                  });

                  // First Blood (1등) 부터 3등까지 색상 차등 적용
                  let rankStyle = "text-zinc-500";
                  if (index === 0) rankStyle = "text-rose-500 font-bold drop-shadow-[0_0_5px_rgba(244,63,94,0.3)]";
                  else if (index === 1) rankStyle = "text-orange-400 font-semibold";
                  else if (index === 2) rankStyle = "text-yellow-400 font-semibold";

                  return (
                    <li key={index} className="flex items-center justify-between border-b border-white/5 pb-2 last:border-0 last:pb-0">
                      <div className="flex items-center gap-3">
                        <span className={`w-5 text-left text-sm ${rankStyle}`}>#{index + 1}</span>
                        <span className="text-sm text-zinc-200">{solve.username}</span>
                      </div>
                      <span className="text-xs text-zinc-500">{dateStr}</span>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>
        {/* 👆 추가된 부분 끝 */}

        <div className="mt-5 rounded-xl border border-white/10 bg-white/[0.03] p-4">
          <p className="text-xs uppercase tracking-[0.14em] text-zinc-400">Submit Flag</p>
          <div className="mt-3 flex flex-col gap-2 sm:flex-row">
            <input
              type="text"
              value={flagInput}
              onChange={handleFlagInputChange}
              placeholder="CASPER{...}"
              disabled={!isDurationActive || flagSubmitting}
              className="mono-input rounded-lg"
            />
            <button
              type="button"
              onClick={onSubmitFlag}
              disabled={flagSubmitting || !isDurationActive}
              className="rounded-lg border border-white/40 bg-white/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.14em] text-zinc-100 transition hover:bg-white hover:text-black disabled:cursor-not-allowed disabled:opacity-50"
            >
              {!isDurationActive ? "Closed" : flagSubmitting ? "Submitting..." : "Submit"}
            </button>
          </div>
          {flagResultMessage && <p className="mt-2 text-sm text-zinc-300">{flagResultMessage}</p>}
        </div>
      </div>
    </div>
  );
}