"use client";

import type { ChangeEvent } from "react";

import type { ChallengeItem, ChallengeServerAccessResponse } from "../types";

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
            Point: {selectedChallenge.point}
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
