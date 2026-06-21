"use client";

import { Chessboard } from "react-chessboard";
import type { Arrow } from "react-chessboard/dist/chessboard/types";
import type { BoardArrow } from "@/lib/analysis/arrows";

interface BoardPanelProps {
  fen: string;
  orientation: "white" | "black";
  /** Overlay arrows: green best move, red mistake/blunder (Phase 5). */
  arrows?: BoardArrow[];
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
 * Read-only board for game review. Dragging is disabled — navigation happens
 * through the move list and nav controls. Arrow overlays update automatically
 * as `arrows` changes with navigation.
 */
export default function BoardPanel({
  fen,
  orientation,
  arrows = NO_ARROWS,
}: BoardPanelProps) {
  return (
    <div className="w-full">
      <Chessboard
        position={fen}
        boardOrientation={orientation}
        arePiecesDraggable={false}
        animationDuration={200}
        customArrows={arrows as Arrow[]}
        customBoardStyle={BOARD_STYLE}
        customDarkSquareStyle={DARK_SQUARE}
        customLightSquareStyle={LIGHT_SQUARE}
      />
    </div>
  );
}
