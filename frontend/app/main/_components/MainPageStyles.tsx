"use client";

export function MainPageStyles() {
  return (
    <style jsx global>{`
      .modal-scrollbar {
        scrollbar-width: none;
        -ms-overflow-style: none;
      }

      .modal-scrollbar::-webkit-scrollbar {
        display: none;
      }

      body.main-scroll-hidden {
        scrollbar-width: none;
        -ms-overflow-style: none;
      }

      body.main-scroll-hidden::-webkit-scrollbar {
        display: none;
      }

      html.main-scroll-hidden {
        scrollbar-width: none;
        -ms-overflow-style: none;
      }

      html.main-scroll-hidden::-webkit-scrollbar {
        display: none;
      }

      .challenge-card {
        border-color: rgba(255, 255, 255, 0.2);
        background: rgba(255, 255, 255, 0.04);
        box-shadow: inset 0 0 0 1px rgba(0, 0, 0, 0.22);
      }

      .challenge-card:hover {
        border-color: rgba(255, 255, 255, 0.38);
        background: rgba(255, 255, 255, 0.09);
      }

      .challenge-card-default .challenge-difficulty {
        color: rgba(212, 212, 216, 0.78);
      }

      .challenge-card-default .challenge-title {
        color: rgba(250, 250, 250, 0.98);
      }

      .challenge-card-default .challenge-desc {
        color: rgba(212, 212, 216, 0.92);
      }

      .challenge-card-default .challenge-pill {
        border-color: rgba(255, 255, 255, 0.3);
        color: rgba(228, 228, 231, 0.95);
      }

      .challenge-card-default .challenge-point {
        color: rgba(250, 250, 250, 0.95);
      }

      .challenge-card-solved {
        border-color: rgba(74, 222, 128, 0.6);
        background: rgba(34, 197, 94, 0.2);
      }

      .challenge-card-solved:hover {
        border-color: rgba(74, 222, 128, 0.75);
        background: rgba(34, 197, 94, 0.3);
      }

      .challenge-card-solved .challenge-chip {
        border-color: rgba(187, 247, 208, 0.75);
        background: rgba(22, 101, 52, 0.35);
        color: rgba(240, 253, 244, 0.98);
      }

      .challenge-card-solved .challenge-difficulty {
        color: rgba(187, 247, 208, 0.92);
      }

      .challenge-card-solved .challenge-title {
        color: rgba(240, 253, 244, 0.98);
      }

      .challenge-card-solved .challenge-desc {
        color: rgba(220, 252, 231, 0.97);
      }

      .challenge-card-solved .challenge-pill {
        border-color: rgba(187, 247, 208, 0.72);
        color: rgba(240, 253, 244, 0.96);
      }

      .challenge-card-solved .challenge-point {
        color: rgba(240, 253, 244, 0.98);
      }

      .challenge-card-wrong {
        border-color: rgba(251, 113, 133, 0.68);
        background: rgba(244, 63, 94, 0.2);
      }

      .challenge-card-wrong:hover {
        border-color: rgba(251, 113, 133, 0.82);
        background: rgba(244, 63, 94, 0.32);
      }

      .challenge-card-wrong .challenge-chip {
        border-color: rgba(254, 205, 211, 0.85);
        background: rgba(159, 18, 57, 0.36);
        color: rgba(255, 241, 242, 0.98);
      }

      .challenge-card-wrong .challenge-difficulty {
        color: rgba(254, 205, 211, 0.94);
      }

      .challenge-card-wrong .challenge-title {
        color: rgba(255, 241, 242, 0.98);
      }

      .challenge-card-wrong .challenge-desc {
        color: rgba(255, 228, 230, 0.97);
      }

      .challenge-card-wrong .challenge-pill {
        border-color: rgba(254, 205, 211, 0.75);
        color: rgba(255, 241, 242, 0.95);
      }

      .challenge-card-wrong .challenge-point {
        color: rgba(255, 241, 242, 0.98);
      }

      :root[data-theme="light"] .challenge-card {
        border-color: rgba(0, 0, 0, 0.24);
        background: rgba(255, 255, 255, 0.94);
        box-shadow: inset 0 0 0 1px rgba(0, 0, 0, 0.08);
      }

      :root[data-theme="light"] .challenge-card:hover {
        border-color: rgba(0, 0, 0, 0.38);
        background: rgba(255, 255, 255, 1);
      }

      :root[data-theme="light"] .challenge-card-default .challenge-difficulty {
        color: rgba(55, 65, 81, 0.86);
      }

      :root[data-theme="light"] .challenge-card-default .challenge-title {
        color: rgba(17, 24, 39, 0.98);
      }

      :root[data-theme="light"] .challenge-card-default .challenge-desc {
        color: rgba(55, 65, 81, 0.95);
      }

      :root[data-theme="light"] .challenge-card-default .challenge-pill {
        border-color: rgba(0, 0, 0, 0.26);
        color: rgba(31, 41, 55, 0.96);
      }

      :root[data-theme="light"] .challenge-card-default .challenge-point {
        color: rgba(17, 24, 39, 0.98);
      }

      :root[data-theme="light"] .challenge-card-solved {
        border-color: rgba(21, 128, 61, 0.52);
        background: rgba(134, 239, 172, 0.38);
      }

      :root[data-theme="light"] .challenge-card-solved:hover {
        border-color: rgba(22, 163, 74, 0.65);
        background: rgba(134, 239, 172, 0.5);
      }

      :root[data-theme="light"] .challenge-card-solved .challenge-chip {
        border-color: rgba(22, 163, 74, 0.6);
        background: rgba(240, 253, 244, 0.9);
        color: rgba(20, 83, 45, 0.98);
      }

      :root[data-theme="light"] .challenge-card-solved .challenge-difficulty {
        color: rgba(20, 83, 45, 0.82);
      }

      :root[data-theme="light"] .challenge-card-solved .challenge-title {
        color: rgba(20, 83, 45, 0.98);
      }

      :root[data-theme="light"] .challenge-card-solved .challenge-desc {
        color: rgba(22, 101, 52, 0.9);
      }

      :root[data-theme="light"] .challenge-card-solved .challenge-pill {
        border-color: rgba(22, 163, 74, 0.55);
        color: rgba(20, 83, 45, 0.95);
      }

      :root[data-theme="light"] .challenge-card-solved .challenge-point {
        color: rgba(20, 83, 45, 0.98);
      }

      :root[data-theme="light"] .challenge-card-wrong {
        border-color: rgba(190, 24, 93, 0.5);
        background: rgba(254, 205, 211, 0.48);
      }

      :root[data-theme="light"] .challenge-card-wrong:hover {
        border-color: rgba(190, 24, 93, 0.66);
        background: rgba(254, 205, 211, 0.62);
      }

      :root[data-theme="light"] .challenge-card-wrong .challenge-chip {
        border-color: rgba(225, 29, 72, 0.55);
        background: rgba(255, 241, 242, 0.9);
        color: rgba(136, 19, 55, 0.98);
      }

      :root[data-theme="light"] .challenge-card-wrong .challenge-difficulty {
        color: rgba(136, 19, 55, 0.82);
      }

      :root[data-theme="light"] .challenge-card-wrong .challenge-title {
        color: rgba(136, 19, 55, 0.98);
      }

      :root[data-theme="light"] .challenge-card-wrong .challenge-desc {
        color: rgba(159, 18, 57, 0.9);
      }

      :root[data-theme="light"] .challenge-card-wrong .challenge-pill {
        border-color: rgba(225, 29, 72, 0.5);
        color: rgba(136, 19, 55, 0.95);
      }

      :root[data-theme="light"] .challenge-card-wrong .challenge-point {
        color: rgba(136, 19, 55, 0.98);
      }

      .challenge-scrollbar {
        scrollbar-width: none;
        -ms-overflow-style: none;
        scroll-behavior: smooth;
      }

      .challenge-scrollbar::-webkit-scrollbar {
        display: none;
      }

      .category-edge-btn {
        position: absolute;
        top: 50%;
        z-index: 6;
        height: 36px;
        width: 36px;
        transform: translateY(-50%);
        border-radius: 999px;
        border: 1px solid rgba(255, 255, 255, 0.45);
        background: rgba(10, 10, 10, 0.72);
        color: rgba(244, 244, 245, 0.98);
        font-size: 13px;
        font-weight: 800;
        line-height: 1;
        box-shadow: 0 10px 26px rgba(0, 0, 0, 0.45);
        backdrop-filter: blur(6px);
        transition: all 180ms ease;
      }

      .category-edge-btn:hover {
        border-color: rgba(167, 243, 208, 0.9);
        background: rgba(16, 185, 129, 0.28);
        color: #f0fdf4;
        transform: translateY(calc(-50% - 1px));
      }

      .category-edge-left {
        left: -10px;
      }

      .category-edge-right {
        right: -10px;
      }

      .blood-overlay {
        animation: blood-backdrop 2s ease-out both;
        background:
          radial-gradient(circle at center, rgba(255, 255, 255, 0.18) 0%, rgba(0, 0, 0, 0) 48%),
          linear-gradient(0deg, rgba(0, 0, 0, 0.76), rgba(0, 0, 0, 0.62));
      }

      .blood-banner {
        animation: blood-banner-blast 2s cubic-bezier(0.16, 1, 0.3, 1) both;
        position: relative;
        min-width: min(92vw, 980px);
        max-width: 980px;
      }

      .blood-banner::before {
        content: "";
        position: absolute;
        inset: -2px;
        border-radius: 1rem;
        background: linear-gradient(
          90deg,
          rgba(255, 255, 255, 0.06),
          rgba(255, 255, 255, 0.35),
          rgba(255, 255, 255, 0.06)
        );
        filter: blur(8px);
        opacity: 0.7;
        z-index: -1;
        animation: blood-scanline 1.4s linear infinite;
      }

      .blood-title {
        animation: blood-title-pop 1.9s cubic-bezier(0.16, 1, 0.3, 1) both;
        text-shadow:
          0 0 8px rgba(255, 255, 255, 0.2),
          0 0 26px rgba(255, 255, 255, 0.22),
          0 0 46px rgba(255, 255, 255, 0.14);
        font-family: "Arial Black", "Impact", sans-serif;
      }

      .blood-title-main {
        position: relative;
        z-index: 3;
      }

      .blood-ghost {
        position: absolute;
        inset: 0;
        z-index: 2;
        opacity: 0.72;
        mix-blend-mode: screen;
        pointer-events: none;
      }

      .blood-ghost-a {
        transform: translate(5px, 0);
        color: #f87171;
        animation: blood-glitch-a 0.22s steps(2, end) infinite;
      }

      .blood-ghost-b {
        transform: translate(-5px, 0);
        color: #60a5fa;
        animation: blood-glitch-b 0.2s steps(2, end) infinite;
      }

      .blood-subtitle {
        animation: blood-subtitle-in 0.7s ease-out both;
        animation-delay: 0.2s;
      }

      @keyframes blood-backdrop {
        0% {
          opacity: 0;
        }
        16% {
          opacity: 1;
        }
        80% {
          opacity: 1;
        }
        100% {
          opacity: 0;
        }
      }

      @keyframes blood-banner-blast {
        0% {
          opacity: 0;
          transform: scale(0.62) translateY(48px) skewX(-6deg);
          filter: blur(10px);
        }
        10% {
          opacity: 1;
          transform: scale(1.08) translateY(-8px) skewX(1deg);
          filter: blur(0);
        }
        55% {
          opacity: 1;
          transform: scale(1) translateY(0) skewX(0deg);
        }
        100% {
          opacity: 0;
          transform: scale(1.12) translateY(-48px) skewX(0deg);
          filter: blur(2px);
        }
      }

      @keyframes blood-title-pop {
        0% {
          transform: scale(0.72) translateY(30px);
          letter-spacing: 0.25em;
        }
        20% {
          transform: scale(1.08) translateY(-3px);
          letter-spacing: 0.1em;
        }
        65% {
          transform: scale(1);
          letter-spacing: 0.08em;
        }
        100% {
          transform: scale(1.03) translateY(-20px);
        }
      }

      @keyframes blood-glitch-a {
        0% {
          clip-path: inset(0 0 76% 0);
        }
        40% {
          clip-path: inset(34% 0 42% 0);
        }
        70% {
          clip-path: inset(82% 0 2% 0);
        }
        100% {
          clip-path: inset(10% 0 56% 0);
        }
      }

      @keyframes blood-glitch-b {
        0% {
          clip-path: inset(84% 0 4% 0);
        }
        35% {
          clip-path: inset(2% 0 78% 0);
        }
        68% {
          clip-path: inset(42% 0 34% 0);
        }
        100% {
          clip-path: inset(64% 0 14% 0);
        }
      }

      @keyframes blood-subtitle-in {
        0% {
          opacity: 0;
          transform: translateY(10px);
        }
        100% {
          opacity: 1;
          transform: translateY(0);
        }
      }

      @keyframes blood-scanline {
        0% {
          transform: translateX(-34%) scaleX(0.8);
          opacity: 0.2;
        }
        50% {
          transform: translateX(0%) scaleX(1);
          opacity: 0.7;
        }
        100% {
          transform: translateX(34%) scaleX(0.8);
          opacity: 0.2;
        }
      }
    `}</style>
  );
}
