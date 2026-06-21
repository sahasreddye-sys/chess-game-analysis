"use client";

import { useEffect } from "react";

interface NavigationControlsProps {
  onStart: () => void;
  onPrevious: () => void;
  onNext: () => void;
  onEnd: () => void;
  onFlip: () => void;
  onPrevKeyMoment: () => void;
  onNextKeyMoment: () => void;
  canGoBack: boolean;
  canGoForward: boolean;
  hasKeyMoments: boolean;
  disabled: boolean;
}

/* Inline SVG icons keep the controls crisp and emoji-free. */
const Icon = ({ d, label }: { d: string; label: string }) => (
  <svg viewBox="0 0 24 24" width="18" height="18" aria-label={label} role="img" fill="currentColor">
    <path d={d} />
  </svg>
);
const I = {
  start: "M6 6h2v12H6zm3.5 6l8.5 6V6z",
  prev: "M15.5 18l-8.5-6 8.5-6z",
  next: "M8.5 6l8.5 6-8.5 6z",
  end: "M16 6h2v12h-2zM6 6l8.5 6L6 18z",
  flip: "M12 6V3L8 7l4 4V8a5 5 0 0 1 5 5h2a7 7 0 0 0-7-7zm0 12v3l4-4-4-4v3a5 5 0 0 1-5-5H5a7 7 0 0 0 7 7z",
  keyPrev: "M18 6v12l-7-6zM7 6h2v12H7z",
  keyNext: "M6 6v12l7-6zM15 6h2v12h-2z",
};

/**
 * Start / Prev / Next / End controls plus board flip and key-moment jumps.
 * Arrow keys step moves; "f" flips the board.
 */
export default function NavigationControls({
  onStart,
  onPrevious,
  onNext,
  onEnd,
  onFlip,
  onPrevKeyMoment,
  onNextKeyMoment,
  canGoBack,
  canGoForward,
  hasKeyMoments,
  disabled,
}: NavigationControlsProps) {
  useEffect(() => {
    if (disabled) return;
    const handler = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === "TEXTAREA" || tag === "INPUT") return;

      switch (e.key) {
        case "ArrowLeft":
          e.preventDefault();
          onPrevious();
          break;
        case "ArrowRight":
          e.preventDefault();
          onNext();
          break;
        case "ArrowUp":
          e.preventDefault();
          onStart();
          break;
        case "ArrowDown":
          e.preventDefault();
          onEnd();
          break;
        case "f":
        case "F":
          e.preventDefault();
          onFlip();
          break;
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [disabled, onStart, onPrevious, onNext, onEnd, onFlip]);

  const btn =
    "grid place-items-center rounded-md bg-board-panelLight px-3 py-2 text-neutral-200 transition enabled:hover:bg-neutral-600 disabled:cursor-not-allowed disabled:opacity-40";

  return (
    <div className="flex w-full flex-wrap items-center gap-2">
      <div className="flex flex-1 gap-1.5">
        <button className={btn} onClick={onStart} disabled={disabled || !canGoBack} aria-label="Start">
          <Icon d={I.start} label="Start" />
        </button>
        <button className={btn} onClick={onPrevious} disabled={disabled || !canGoBack} aria-label="Previous move">
          <Icon d={I.prev} label="Previous" />
        </button>
        <button className={btn} onClick={onNext} disabled={disabled || !canGoForward} aria-label="Next move">
          <Icon d={I.next} label="Next" />
        </button>
        <button className={btn} onClick={onEnd} disabled={disabled || !canGoForward} aria-label="End">
          <Icon d={I.end} label="End" />
        </button>
      </div>

      <div className="flex gap-1.5">
        <button
          className={btn}
          onClick={onPrevKeyMoment}
          disabled={disabled || !hasKeyMoments}
          aria-label="Previous key moment"
          title="Previous key moment"
        >
          <Icon d={I.keyPrev} label="Previous key moment" />
        </button>
        <button
          className={btn}
          onClick={onNextKeyMoment}
          disabled={disabled || !hasKeyMoments}
          aria-label="Next key moment"
          title="Next key moment"
        >
          <Icon d={I.keyNext} label="Next key moment" />
        </button>
        <button
          className={btn}
          onClick={onFlip}
          disabled={disabled}
          aria-label="Flip board"
          title="Flip board (f)"
        >
          <Icon d={I.flip} label="Flip board" />
        </button>
      </div>
    </div>
  );
}
