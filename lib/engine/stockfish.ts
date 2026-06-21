import type { AnalysisRequest, EngineLine } from "./types";

const ENGINE_URL = "/stockfish/stockfish-nnue-16-single.js";

/**
 * Thin, Promise-based wrapper around the Stockfish WASM worker.
 *
 * The `-single.js` build IS an emscripten worker script, so we point a Web
 * Worker straight at it — analysis never touches the main thread. We speak UCI
 * over postMessage and parse the text lines it sends back.
 *
 * Usage:
 *   const engine = new StockfishEngine();
 *   await engine.init();
 *   const line = await engine.evaluate({ fen, depth: 15 });
 *   engine.terminate();
 *
 * One evaluation runs at a time (the queue that drives this lives in
 * useEngineAnalysis). Calls are serialized internally so overlapping evaluate()
 * calls can't corrupt each other's UCI streams.
 */
export class StockfishEngine {
  private worker: Worker | null = null;
  private ready = false;
  /** Serializes evaluate() calls onto a single UCI conversation. */
  private chain: Promise<unknown> = Promise.resolve();

  /** Boot the worker and complete the UCI handshake. Idempotent-ish. */
  async init(): Promise<void> {
    if (this.worker) return;
    this.worker = new Worker(ENGINE_URL);

    await this.handshake();
    // Ask for the top two lines so we can tell an "only good move" (Great) from
    // a position with several equally fine choices.
    this.worker.postMessage("setoption name MultiPV value 2");
    this.ready = true;
  }

  /** Send `uci` / `isready` and wait for the engine to report ready. */
  private handshake(): Promise<void> {
    return new Promise((resolve, reject) => {
      const worker = this.worker!;
      const onMessage = (e: MessageEvent) => {
        const line = typeof e.data === "string" ? e.data : e.data?.data ?? "";
        if (line === "uciok") {
          worker.postMessage("isready");
        } else if (line === "readyok") {
          worker.removeEventListener("message", onMessage);
          resolve();
        }
      };
      const onError = (e: ErrorEvent) => {
        worker.removeEventListener("message", onMessage);
        reject(new Error(`Stockfish failed to load: ${e.message}`));
      };
      worker.addEventListener("message", onMessage);
      worker.addEventListener("error", onError, { once: true });
      worker.postMessage("uci");
    });
  }

  /**
   * Evaluate a single position to the requested depth. Resolves with the
   * deepest line the engine produced before `bestmove`. Scores are normalized
   * to White's point of view.
   */
  evaluate(request: AnalysisRequest): Promise<EngineLine> {
    // Queue behind any in-flight evaluation so UCI streams don't interleave.
    const run = this.chain.then(() => this.evaluateNow(request));
    // Keep the chain alive even if this evaluation rejects.
    this.chain = run.catch(() => undefined);
    return run;
  }

  private evaluateNow(request: AnalysisRequest): Promise<EngineLine> {
    if (!this.worker || !this.ready) {
      return Promise.reject(new Error("Engine not initialized."));
    }
    const worker = this.worker;
    const whiteToMove = sideToMove(request.fen) === "w";

    return new Promise<EngineLine>((resolve, reject) => {
      // Latest line seen for each MultiPV slot (1 = best, 2 = second best).
      const byPv = new Map<number, EngineLine>();

      const onMessage = (e: MessageEvent) => {
        const line = typeof e.data === "string" ? e.data : e.data?.data ?? "";

        if (line.startsWith("info ") && line.includes(" pv ")) {
          const parsed = parseInfoLine(line, whiteToMove);
          if (parsed) byPv.set(parsed.multipv, parsed.line);
        } else if (line.startsWith("bestmove")) {
          worker.removeEventListener("message", onMessage);
          const best = line.split(/\s+/)[1];
          const primary =
            byPv.get(1) ??
            ({ depth: 0, scoreCp: null, mate: null, bestMove: null, pv: [] } as EngineLine);
          const second = byPv.get(2);
          resolve({
            ...primary,
            bestMove: best && best !== "(none)" ? best : primary.bestMove,
            secondCp: second?.scoreCp ?? null,
            secondMate: second?.mate ?? null,
            secondMove: second?.bestMove ?? null,
          });
        }
      };

      const onError = (e: ErrorEvent) => {
        worker.removeEventListener("message", onMessage);
        reject(new Error(`Engine error: ${e.message}`));
      };

      worker.addEventListener("message", onMessage);
      worker.addEventListener("error", onError, { once: true });

      worker.postMessage("ucinewgame");
      worker.postMessage(`position fen ${request.fen}`);
      worker.postMessage(`go depth ${request.depth}`);
    });
  }

  /** Stop any current search (used when cancelling a queued analysis). */
  stop(): void {
    this.worker?.postMessage("stop");
  }

  terminate(): void {
    this.worker?.terminate();
    this.worker = null;
    this.ready = false;
    this.chain = Promise.resolve();
  }
}

/** Extract the side-to-move field ("w" | "b") from a FEN. */
function sideToMove(fen: string): "w" | "b" {
  return fen.split(" ")[1] === "b" ? "b" : "w";
}

/**
 * Parse a UCI `info ... pv ...` line into an EngineLine plus its MultiPV slot,
 * normalizing the score from side-to-move POV to White POV.
 */
function parseInfoLine(
  line: string,
  whiteToMove: boolean
): { multipv: number; line: EngineLine } | null {
  const tokens = line.split(/\s+/);

  const depthIdx = tokens.indexOf("depth");
  const scoreIdx = tokens.indexOf("score");
  const pvIdx = tokens.indexOf("pv");
  const mpvIdx = tokens.indexOf("multipv");
  if (scoreIdx === -1 || pvIdx === -1) return null;

  const depth = depthIdx !== -1 ? Number(tokens[depthIdx + 1]) : 0;
  const multipv = mpvIdx !== -1 ? Number(tokens[mpvIdx + 1]) : 1;

  // Score is reported relative to the side to move; flip for Black so the
  // result is always White-relative.
  const sign = whiteToMove ? 1 : -1;
  const scoreType = tokens[scoreIdx + 1]; // "cp" | "mate"
  const scoreVal = Number(tokens[scoreIdx + 2]);

  let scoreCp: number | null = null;
  let mate: number | null = null;
  if (scoreType === "cp") {
    scoreCp = sign * scoreVal;
  } else if (scoreType === "mate") {
    mate = sign * scoreVal;
  }

  const pv = tokens.slice(pvIdx + 1).filter(Boolean);

  return { multipv, line: { depth, scoreCp, mate, bestMove: pv[0] ?? null, pv } };
}
