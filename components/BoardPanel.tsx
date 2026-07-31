"use client";

import { Chessboard } from "react-chessboard";
import type { Arrow } from "react-chessboard/dist/chessboard/types";
import type { BoardArrow } from "@/lib/analysis/arrows";

interface BoardPanelProps {
  fen: string;
  orientation: "white" | "black";
  /** Overlay arrows: green best move, red mistake/blunder. */
  arrows?: BoardArrow[];
  /** When true the user can drag pieces to explore variations. */
  draggable?: boolean;
  /**
   * Called when a piece is dropped. Return true to accept the move (the parent
   * must update `fen`), false to snap it back.
   */
  onPieceDrop?: (from: string, to: string, piece: string) => boolean;
}

// Stable style object identities — recreating these inline each render makes
// react-chessboard re-sync props on every parent update.
const BOARD_STYLE = {
  borderRadius: "6px",
  boxShadow: "0 4px 16px rgba(0,0,0,0.4)",
} as const;
const DARK_SQUARE = { backgroundColor: "#769656" } as const;
const LIGHT_SQUARE = { backgroundColor: "#eeeed2" } as const;
const NO_ARROWS: BoardArrow[] = [];

/**
 * Review board. Read-only by default (navigation via the move list / controls);
 * when `draggable` is set, the user can drag pieces to branch into a "what-if"
 * variation. Arrow overlays update automatically as `arrows` changes.
 */
export default function BoardPanel({
  fen,
  orientation,
  arrows = NO_ARROWS,
  draggable = false,
  onPieceDrop,
}: BoardPanelProps) {
  return (
    <div className="w-full">
      <Chessboard
        position={fen}
        boardOrientation={orientation}
        arePiecesDraggable={draggable}
        onPieceDrop={(from, to, piece) =>
          onPieceDrop ? onPieceDrop(from, to, piece) : false
        }
        animationDuration={200}
        customArrows={arrows as Arrow[]}
        customBoardStyle={BOARD_STYLE}
        customDarkSquareStyle={DARK_SQUARE}
        customLightSquareStyle={LIGHT_SQUARE}
      />
    </div>
  );
}
