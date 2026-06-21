"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useReview } from "@/hooks/useReview";
import { useAccount } from "@/hooks/useAccount";
import type { SavedGame } from "@/lib/storage/types";
import { classifyGame, type MoveQuality } from "@/lib/analysis/classify";
import { buildArrows } from "@/lib/analysis/arrows";
import { explainGame } from "@/lib/analysis/explain";
import { computeStats } from "@/lib/analysis/stats";
import { buildInsights } from "@/lib/analysis/insights";
import { buildHighlights } from "@/lib/analysis/highlights";
import { buildCoach } from "@/lib/analysis/coach";
import { buildEvalSeries } from "@/lib/analysis/series";
import { matchOpening } from "@/lib/openings/book";
import { aggregateTrends, type GameSummaryInput } from "@/lib/analysis/aggregate";

import PgnInput from "@/components/PgnInput";
import PerspectiveControl from "@/components/PerspectiveControl";
import GameTabs from "@/components/GameTabs";
import BoardPanel from "@/components/BoardPanel";
import EvalBar from "@/components/EvalBar";
import EvalGraph from "@/components/EvalGraph";
import NavigationControls from "@/components/NavigationControls";
import MoveList from "@/components/MoveList";
import EnginePanel from "@/components/EnginePanel";
import ExplanationPanel from "@/components/ExplanationPanel";
import StatsPanel from "@/components/StatsPanel";
import InsightsPanel from "@/components/InsightsPanel";
import HighlightsPanel from "@/components/HighlightsPanel";
import CoachPanel from "@/components/CoachPanel";
import TrendsPanel from "@/components/TrendsPanel";
import AccountBar from "@/components/AccountBar";
import AuthModal from "@/components/AuthModal";
import LibraryModal from "@/components/LibraryModal";

type BottomTab = "summary" | "stats" | "insights" | "coach" | "trends";

// Moves that count as "key moments" for jump-to navigation.
const KEY_QUALITIES: MoveQuality[] = ["brilliant", "great", "mistake", "blunder"];

export default function Home() {
  const review = useReview();
  const session = useAccount();
  const { activeGame } = review;
  const [tab, setTab] = useState<BottomTab>("summary");

  const [authOpen, setAuthOpen] = useState(false);
  const [libraryOpen, setLibraryOpen] = useState(false);
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved">("idle");
  // Id of the saved game the current session was loaded from (so re-saving
  // updates it instead of creating a duplicate). Cleared when a new PGN loads.
  const [loadedSavedId, setLoadedSavedId] = useState<string | null>(null);

  const activeSide = activeGame ? review.sideForGame(activeGame.game) : "w";

  // ---- Derived analysis for the ACTIVE game ----
  const classifications = useMemo(
    () => (activeGame ? classifyGame(activeGame.game, activeGame.results) : {}),
    [activeGame]
  );
  const explanations = useMemo(
    () =>
      activeGame ? explainGame(activeGame.game, activeGame.results, classifications) : {},
    [activeGame, classifications]
  );
  const stats = useMemo(
    () => (activeGame ? computeStats(activeGame.game, activeGame.results, classifications) : null),
    [activeGame, classifications]
  );
  const openingName = useMemo(() => {
    if (!activeGame) return null;
    const m = matchOpening(activeGame.game.plies.map((p) => p.san));
    return m?.name ?? activeGame.game.headers["Opening"] ?? activeGame.game.headers["ECO"] ?? null;
  }, [activeGame]);
  const insights = useMemo(
    () =>
      activeGame && stats
        ? buildInsights(activeGame.game, stats, explanations, activeSide)
        : null,
    [activeGame, stats, explanations, activeSide]
  );
  const highlights = useMemo(
    () =>
      activeGame
        ? buildHighlights(
            activeGame.game,
            activeGame.results,
            classifications,
            explanations,
            activeSide
          )
        : null,
    [activeGame, classifications, explanations, activeSide]
  );
  const coach = useMemo(
    () =>
      stats && insights && highlights
        ? buildCoach(stats, insights, highlights, activeSide, openingName)
        : null,
    [stats, insights, highlights, activeSide, openingName]
  );
  const evalSeries = useMemo(
    () => (activeGame ? buildEvalSeries(activeGame.game.positions.length, activeGame.results) : []),
    [activeGame]
  );

  // Key-moment plies (sorted), for jump-to-next/prev navigation.
  const keyMoments = useMemo(() => {
    if (!activeGame) return [] as number[];
    return activeGame.game.plies
      .filter((p) => KEY_QUALITIES.includes(classifications[p.index]?.quality as MoveQuality))
      .map((p) => p.index)
      .sort((a, b) => a - b);
  }, [activeGame, classifications]);

  const goToNextKeyMoment = () => {
    const next = keyMoments.find((p) => p > review.ply);
    if (next !== undefined) review.goTo(next);
  };
  const goToPrevKeyMoment = () => {
    const prev = [...keyMoments].reverse().find((p) => p < review.ply);
    if (prev !== undefined) review.goTo(prev);
  };

  // ---- Board arrows (kept stable while content is unchanged) ----
  const rawArrows = useMemo(
    () =>
      activeGame
        ? buildArrows(review.ply, activeGame.game, activeGame.results, classifications)
        : [],
    [activeGame, review.ply, classifications]
  );
  const arrowsRef = useRef(rawArrows);
  const arrowsSig = rawArrows.map((a) => a.join("")).join("|");
  const lastSig = useRef("");
  if (arrowsSig !== lastSig.current) {
    arrowsRef.current = rawArrows;
    lastSig.current = arrowsSig;
  }
  const arrows = arrowsRef.current;

  // ---- Cross-game trends ----
  const trends = useMemo(() => {
    if (review.games.length === 0) return null;
    const inputs: GameSummaryInput[] = review.games.map((entry) => {
      const cls = classifyGame(entry.game, entry.results);
      const exp = explainGame(entry.game, entry.results, cls);
      const st = computeStats(entry.game, entry.results, cls);
      return {
        game: entry.game,
        stats: st,
        explanations: exp,
        classifications: cls,
        side: review.sideForGame(entry.game),
      };
    });
    return aggregateTrends(inputs);
  }, [review.games, review.sideForGame]);

  const result = activeGame?.game.headers["Result"];
  const white = activeGame?.game.headers["White"] ?? "White";
  const black = activeGame?.game.headers["Black"] ?? "Black";
  const currentMoveSan = activeGame?.game.plies[review.ply - 1]?.san;

  // Names follow the board orientation (player at the bottom shown last).
  const whiteAtBottom = review.boardOrientation === "white";
  const topName = whiteAtBottom ? black : white;
  const bottomName = whiteAtBottom ? white : black;

  // ---- Account / library actions ----
  const handleAnalyze = useCallback(
    (pgn: string) => {
      setLoadedSavedId(null);
      setSaveState("idle");
      review.loadPgns(pgn);
    },
    [review]
  );

  const handleLoadSaved = useCallback(
    (g: SavedGame) => {
      setLoadedSavedId(g.id);
      setSaveState("idle");
      review.loadSavedGame({
        pgn: g.pgn,
        side: g.side,
        results: g.results,
        depth: g.depth,
        finished: g.finished,
      });
      setLibraryOpen(false);
    },
    [review]
  );

  const canSave = !!activeGame && !!session.account;
  const handleSave = useCallback(async () => {
    if (!activeGame || !session.account || !stats) return;
    setSaveState("saving");
    const sideStats = activeSide === "w" ? stats.white : stats.black;
    try {
      const saved = await session.saveGame({
        id: loadedSavedId ?? undefined,
        accountId: session.account.id,
        title: activeGame.label,
        pgn: activeGame.pgn,
        headers: activeGame.game.headers,
        side: activeSide,
        depth: review.depth,
        finished: activeGame.finished,
        results: activeGame.results,
        summary: {
          accuracy: sideStats.accuracy,
          estimatedElo: sideStats.estimatedElo,
          result: activeGame.game.headers["Result"] ?? null,
          openingName,
        },
      });
      setLoadedSavedId(saved.id);
      setSaveState("saved");
    } catch {
      setSaveState("idle");
    }
  }, [activeGame, session, stats, activeSide, loadedSavedId, review.depth, openingName]);

  // Revert the "Saved ✓" confirmation back to idle after a moment.
  useEffect(() => {
    if (saveState !== "saved") return;
    const t = setTimeout(() => setSaveState("idle"), 1800);
    return () => clearTimeout(t);
  }, [saveState]);

  return (
    <main className="mx-auto min-h-screen max-w-7xl px-3 py-6 sm:px-4">
      <header className="mb-4">
        <h1 className="text-2xl font-bold tracking-tight">Chess Game Analysis</h1>
        <p className="text-sm text-neutral-400">
          A free game review from a pasted PGN — find your mistakes, strengths, and what to
          study next.
        </p>
      </header>

      <div className="mb-4 flex flex-col gap-3">
        <AccountBar
          account={session.account}
          gamesCount={session.games.length}
          canSave={canSave}
          saveState={saveState}
          onOpenAuth={() => setAuthOpen(true)}
          onSignOut={session.signOut}
          onOpenLibrary={() => setLibraryOpen(true)}
          onSave={handleSave}
        />
        <PerspectiveControl
          perspective={review.perspective}
          setPerspective={review.setPerspective}
          username={review.username}
          setUsername={review.setUsername}
        />
        <GameTabs games={review.games} activeIndex={review.activeIndex} onSelect={review.setActive} />
      </div>

      {/* Workspace: board centered; engine/review on the left; move list on the right. */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[320px_minmax(0,1fr)_300px]">
        {/* Center column (board) — first on mobile, middle on desktop. */}
        <section className="flex flex-col items-center gap-3 lg:col-start-2 lg:row-start-1">
          <div className="grid w-full max-w-[592px] grid-cols-[1.5rem_minmax(0,1fr)] gap-x-2 gap-y-3">
            <div />
            <div className="flex items-center justify-between text-sm text-neutral-300">
              <span className="font-medium">{topName}</span>
              {result && (
                <span className="rounded bg-board-panelLight px-2 py-0.5 text-xs text-neutral-400">
                  {result}
                </span>
              )}
            </div>

            <EvalBar line={activeGame?.results[review.ply]} orientation={review.boardOrientation} />
            <BoardPanel
              fen={review.currentFen}
              orientation={review.boardOrientation}
              arrows={arrows}
            />

            <div />
            <div className="flex items-center justify-between text-sm text-neutral-300">
              <span className="font-medium">{bottomName}</span>
              {activeGame && (
                <span className="text-xs text-neutral-500">
                  Ply {review.ply} / {activeGame.game.positions.length - 1}
                </span>
              )}
            </div>

            <div />
            <NavigationControls
              onStart={review.goToStart}
              onPrevious={review.goToPrevious}
              onNext={review.goToNext}
              onEnd={review.goToEnd}
              onFlip={review.flipBoard}
              onPrevKeyMoment={goToPrevKeyMoment}
              onNextKeyMoment={goToNextKeyMoment}
              canGoBack={review.canGoBack}
              canGoForward={review.canGoForward}
              hasKeyMoments={keyMoments.length > 0}
              disabled={!activeGame}
            />
          </div>

          {activeGame && (
            <div className="w-full max-w-[592px]">
              <EvalGraph
                series={evalSeries}
                plies={activeGame.game.plies}
                classifications={classifications}
                currentPly={review.ply}
                onSelect={review.goTo}
              />
            </div>
          )}
        </section>

        {/* Left column. */}
        <section className="flex flex-col gap-4 lg:col-start-1 lg:row-start-1">
          <PgnInput onAnalyze={handleAnalyze} error={review.error} />
          <EnginePanel
            status={review.status}
            depth={review.depth}
            setDepth={review.setDepth}
            line={activeGame?.results[review.ply]}
            progress={{ done: activeGame?.done ?? 0, total: activeGame?.total ?? 0 }}
            classification={classifications[review.ply]}
          />
          <ExplanationPanel
            explanation={explanations[review.ply]}
            classification={classifications[review.ply]}
            moveSan={currentMoveSan}
            hasGame={!!activeGame}
          />
        </section>

        {/* Right column (move list). */}
        <section className="h-[560px] lg:col-start-3 lg:row-start-1">
          <MoveList
            plies={activeGame?.game.plies ?? []}
            currentPly={review.ply}
            onSelect={review.goTo}
            classifications={classifications}
            explanations={explanations}
          />
        </section>
      </div>

      {/* Lower dashboard. */}
      {activeGame && stats && insights && highlights && (
        <section className="mt-8">
          <div className="mb-4 flex flex-wrap gap-2 border-b border-neutral-800">
            {(
              [
                ["summary", "Match Summary"],
                ["stats", "Statistics"],
                ["insights", "Strengths & Weaknesses"],
                ["coach", "Coach"],
                ["trends", `Trends${review.games.length > 1 ? ` (${review.games.length})` : ""}`],
              ] as [BottomTab, string][]
            ).map(([key, label]) => (
              <button
                key={key}
                onClick={() => setTab(key)}
                className={`-mb-px border-b-2 px-3 py-2 text-sm font-medium transition ${
                  tab === key
                    ? "border-classification-best text-neutral-100"
                    : "border-transparent text-neutral-400 hover:text-neutral-200"
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          {tab === "summary" && (
            <HighlightsPanel highlights={highlights} onJumpToPly={review.goTo} />
          )}
          {tab === "stats" && <StatsPanel stats={stats} whiteName={white} blackName={black} />}
          {tab === "insights" && <InsightsPanel insights={insights} onJumpToPly={review.goTo} />}
          {tab === "coach" && coach && <CoachPanel report={coach} onJumpToPly={review.goTo} />}
          {tab === "trends" && trends && <TrendsPanel trends={trends} />}
        </section>
      )}

      <AuthModal
        open={authOpen}
        onClose={() => setAuthOpen(false)}
        accounts={session.accounts}
        currentAccountId={session.account?.id}
        error={session.error}
        clearError={session.clearError}
        onCreate={session.createAccount}
        onSignIn={session.signIn}
        onDelete={session.deleteAccount}
      />
      <LibraryModal
        open={libraryOpen}
        onClose={() => setLibraryOpen(false)}
        games={session.games}
        onLoad={handleLoadSaved}
        onDelete={session.deleteGame}
      />
    </main>
  );
}
