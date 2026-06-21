import type { MoveQuality } from "./classify";

/** Which glyph the ClassificationIcon should draw for a quality. */
export type IconKind =
  | "brilliant" // !!
  | "great" // !
  | "check" // ✓ (best / excellent / good)
  | "book" // book
  | "forced" // →
  | "inaccuracy" // ?!
  | "mistake" // ?
  | "blunder"; // ??

export interface QualityMeta {
  label: string;
  /** Symbol kind used by <ClassificationIcon>. */
  icon: IconKind;
  /** Tailwind text-color class for the move SAN. */
  textClass: string;
  /** Tailwind background-color class for the badge chip. */
  bgClass: string;
  /** Raw hex (used for board arrows and inline SVG fills). */
  hex: string;
  /** One-line reason this label is given — shown in tooltips / legend. */
  blurb: string;
}

/**
 * Display metadata per quality. Colours come from the `classification` palette
 * defined in tailwind.config.ts.
 */
export const QUALITY_META: Record<MoveQuality, QualityMeta> = {
  brilliant: {
    label: "Brilliant",
    icon: "brilliant",
    textClass: "text-classification-brilliant",
    bgClass: "bg-classification-brilliant",
    hex: "#26c2a3",
    blurb: "A strong, sound sacrifice — you gave up material and stayed on top.",
  },
  great: {
    label: "Great",
    icon: "great",
    textClass: "text-classification-great",
    bgClass: "bg-classification-great",
    hex: "#749bbf",
    blurb: "The only good move in a critical position — well found.",
  },
  best: {
    label: "Best",
    icon: "check",
    textClass: "text-classification-best",
    bgClass: "bg-classification-best",
    hex: "#81b64c",
    blurb: "The engine's top choice.",
  },
  excellent: {
    label: "Excellent",
    icon: "check",
    textClass: "text-classification-excellent",
    bgClass: "bg-classification-excellent",
    hex: "#95b776",
    blurb: "Nearly the best move — barely loses anything.",
  },
  good: {
    label: "Good",
    icon: "check",
    textClass: "text-classification-good",
    bgClass: "bg-classification-good",
    hex: "#9eb87a",
    blurb: "A reasonable move that keeps the position healthy.",
  },
  book: {
    label: "Book",
    icon: "book",
    textClass: "text-classification-book",
    bgClass: "bg-classification-book",
    hex: "#a88865",
    blurb: "Established opening theory.",
  },
  forced: {
    label: "Forced",
    icon: "forced",
    textClass: "text-classification-forced",
    bgClass: "bg-classification-forced",
    hex: "#9aa7b5",
    blurb: "The only legal move — nothing else was possible.",
  },
  inaccuracy: {
    label: "Inaccuracy",
    icon: "inaccuracy",
    textClass: "text-classification-inaccuracy",
    bgClass: "bg-classification-inaccuracy",
    hex: "#f7c631",
    blurb: "A slightly imprecise move — a better one was available.",
  },
  mistake: {
    label: "Mistake",
    icon: "mistake",
    textClass: "text-classification-mistake",
    bgClass: "bg-classification-mistake",
    hex: "#e58f2a",
    blurb: "This lets a meaningful amount of advantage slip.",
  },
  blunder: {
    label: "Blunder",
    icon: "blunder",
    textClass: "text-classification-blunder",
    bgClass: "bg-classification-blunder",
    hex: "#ca3431",
    blurb: "A serious error that badly damages the position.",
  },
};

/** Stable display order, best → worst, for legends and summaries. */
export const QUALITY_ORDER: MoveQuality[] = [
  "brilliant",
  "great",
  "best",
  "excellent",
  "good",
  "book",
  "forced",
  "inaccuracy",
  "mistake",
  "blunder",
];
