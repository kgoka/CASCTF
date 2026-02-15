"use client";

import type { BloodEffect } from "../types";

type BloodEffectOverlayProps = {
  bloodEffect: BloodEffect | null;
};

export function BloodEffectOverlay({ bloodEffect }: BloodEffectOverlayProps) {
  if (!bloodEffect) {
    return null;
  }

  return (
    <div className="blood-overlay pointer-events-none fixed inset-0 z-[70] flex items-center justify-center">
      <div
        className={`blood-banner rounded-2xl border bg-black/80 px-10 py-8 text-center shadow-[0_20px_80px_rgba(0,0,0,0.5)] backdrop-blur-md ${bloodEffect.borderClassName}`}
      >
        <p className="text-[11px] uppercase tracking-[0.4em] text-zinc-400">Challenge Clear</p>
        <h3
          className={`blood-title relative mt-3 text-[clamp(3.2rem,10vw,7.4rem)] font-black uppercase leading-[0.9] tracking-[0.08em] ${bloodEffect.titleClassName}`}
        >
          <span className="blood-title-main">{bloodEffect.title}</span>
          <span aria-hidden className="blood-ghost blood-ghost-a">
            {bloodEffect.title}
          </span>
          <span aria-hidden className="blood-ghost blood-ghost-b">
            {bloodEffect.title}
          </span>
        </h3>
        <p className="blood-subtitle mt-2 text-sm uppercase tracking-[0.2em] text-zinc-300">
          {bloodEffect.subtitle}
        </p>
      </div>
    </div>
  );
}
