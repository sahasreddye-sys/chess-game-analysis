import type { MoveQuality } from "@/lib/analysis/classify";
import { QUALITY_META } from "@/lib/analysis/quality";

interface ClassificationIconProps {
  quality: MoveQuality;
  /** Pixel size of the badge. */
  size?: number;
  className?: string;
  title?: string;
}

const TEXT_SYMBOL: Partial<Record<MoveQuality, string>> = {
  brilliant: "!!",
  great: "!",
  inaccuracy: "?!",
  mistake: "?",
  blunder: "??",
};

/**
 * A small circular badge for a move classification — colored disc with a crisp
 * SVG glyph. Pure SVG (no emoji / icon fonts) so it renders identically
 * everywhere and scales cleanly.
 */
export default function ClassificationIcon({
  quality,
  size = 16,
  className,
  title,
}: ClassificationIconProps) {
  const meta = QUALITY_META[quality];
  const text = TEXT_SYMBOL[quality];
  const double = text === "!!" || text === "??" || text === "?!";

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      className={className}
      role="img"
      aria-label={title ?? meta.label}
    >
      {title ? <title>{title}</title> : null}
      <circle cx="12" cy="12" r="12" fill={meta.hex} />
      {meta.icon === "check" && (
        <path
          d="M6.5 12.5l3.2 3.2 7.8-8"
          fill="none"
          stroke="#ffffff"
          strokeWidth="2.6"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      )}
      {meta.icon === "forced" && (
        <path
          d="M5 12h11m-4-4l4 4-4 4"
          fill="none"
          stroke="#ffffff"
          strokeWidth="2.4"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      )}
      {meta.icon === "book" && (
        <path
          d="M5 6.5c2.4-1.1 4.6-1.1 7 0v11c-2.4-1.1-4.6-1.1-7 0v-11zm14 0c-2.4-1.1-4.6-1.1-7 0v11c2.4-1.1 4.6-1.1 7 0v-11z"
          fill="#ffffff"
          opacity="0.95"
        />
      )}
      {text && (
        <text
          x="12"
          y="12"
          textAnchor="middle"
          dominantBaseline="central"
          fontWeight="800"
          fontFamily="ui-sans-serif, system-ui, sans-serif"
          fontSize={double ? 11 : 15}
          fill="#ffffff"
        >
          {text}
        </text>
      )}
    </svg>
  );
}
