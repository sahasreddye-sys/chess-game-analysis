/**
 * A compact, curated opening book.
 *
 * Each entry is a named line written as a sequence of SAN half-moves exactly as
 * chess.js produces them ("e4", "Nf3", "O-O", "exd5", ...). It is deliberately
 * small — enough to recognise the popular openings, name them, and flag the
 * early moves as "book" (theory) rather than mis-classifying them on raw
 * centipawn loss. It is NOT a full ECO database.
 */

export interface OpeningLine {
  /** Human name shown to the user. */
  name: string;
  /** ECO code, where known. */
  eco?: string;
  /** The line as SAN half-moves. */
  moves: string[];
}

// Helper to keep the table terse: "e4 e5 Nf3" -> ["e4","e5","Nf3"].
const L = (name: string, eco: string, moves: string): OpeningLine => ({
  name,
  eco,
  moves: moves.trim().split(/\s+/),
});

export const OPENING_BOOK: OpeningLine[] = [
  // --- 1.e4 e5 ---
  L("Ruy López", "C60", "e4 e5 Nf3 Nc6 Bb5"),
  L("Ruy López, Morphy Defence", "C70", "e4 e5 Nf3 Nc6 Bb5 a6 Ba4"),
  L("Ruy López, Closed", "C84", "e4 e5 Nf3 Nc6 Bb5 a6 Ba4 Nf6 O-O Be7 Re1 b5 Bb3 d6 c3 O-O"),
  L("Italian Game", "C50", "e4 e5 Nf3 Nc6 Bc4"),
  L("Italian, Giuoco Piano", "C53", "e4 e5 Nf3 Nc6 Bc4 Bc5 c3"),
  L("Two Knights Defence", "C55", "e4 e5 Nf3 Nc6 Bc4 Nf6"),
  L("Scotch Game", "C45", "e4 e5 Nf3 Nc6 d4 exd4 Nxd4"),
  L("Petrov / Russian Defence", "C42", "e4 e5 Nf3 Nf6"),
  L("Philidor Defence", "C41", "e4 e5 Nf3 d6"),
  L("King's Gambit", "C30", "e4 e5 f4"),
  L("Vienna Game", "C25", "e4 e5 Nc3"),
  L("Bishop's Opening", "C23", "e4 e5 Bc4"),
  L("Centre Game", "C21", "e4 e5 d4 exd4"),

  // --- 1.e4 c5 (Sicilian) ---
  L("Sicilian Defence", "B20", "e4 c5"),
  L("Sicilian, Open", "B40", "e4 c5 Nf3 e6"),
  L("Sicilian, Najdorf", "B90", "e4 c5 Nf3 d6 d4 cxd4 Nxd4 Nf6 Nc3 a6"),
  L("Sicilian, Dragon", "B70", "e4 c5 Nf3 d6 d4 cxd4 Nxd4 Nf6 Nc3 g6"),
  L("Sicilian, Classical", "B58", "e4 c5 Nf3 d6 d4 cxd4 Nxd4 Nf6 Nc3 Nc6"),
  L("Sicilian, Scheveningen", "B80", "e4 c5 Nf3 d6 d4 cxd4 Nxd4 Nf6 Nc3 e6"),
  L("Sicilian, Taimanov", "B46", "e4 c5 Nf3 e6 d4 cxd4 Nxd4 Nc6"),
  L("Sicilian, Sveshnikov", "B33", "e4 c5 Nf3 Nc6 d4 cxd4 Nxd4 Nf6 Nc3 e5"),
  L("Sicilian, Alapin", "B22", "e4 c5 c3"),
  L("Sicilian, Closed", "B23", "e4 c5 Nc3"),
  L("Sicilian, Rossolimo", "B51", "e4 c5 Nf3 Nc6 Bb5"),

  // --- 1.e4 other ---
  L("French Defence", "C00", "e4 e6"),
  L("French, Advance", "C02", "e4 e6 d4 d5 e5"),
  L("French, Tarrasch", "C03", "e4 e6 d4 d5 Nd2"),
  L("French, Winawer", "C15", "e4 e6 d4 d5 Nc3 Bb4"),
  L("French, Classical", "C11", "e4 e6 d4 d5 Nc3 Nf6"),
  L("Caro-Kann Defence", "B10", "e4 c6"),
  L("Caro-Kann, Advance", "B12", "e4 c6 d4 d5 e5"),
  L("Caro-Kann, Classical", "B18", "e4 c6 d4 d5 Nc3 dxe4 Nxe4 Bf5"),
  L("Caro-Kann, Exchange", "B13", "e4 c6 d4 d5 exd5 cxd5"),
  L("Pirc Defence", "B07", "e4 d6 d4 Nf6 Nc3 g6"),
  L("Modern Defence", "B06", "e4 g6"),
  L("Scandinavian Defence", "B01", "e4 d5"),
  L("Scandinavian, Main Line", "B01", "e4 d5 exd5 Qxd5 Nc3 Qa5"),
  L("Alekhine Defence", "B02", "e4 Nf6"),

  // --- 1.d4 d5 ---
  L("Queen's Gambit", "D06", "d4 d5 c4"),
  L("Queen's Gambit Declined", "D30", "d4 d5 c4 e6"),
  L("QGD, Orthodox", "D60", "d4 d5 c4 e6 Nc3 Nf6 Bg5 Be7"),
  L("Queen's Gambit Accepted", "D20", "d4 d5 c4 dxc4"),
  L("Slav Defence", "D10", "d4 d5 c4 c6"),
  L("Semi-Slav Defence", "D43", "d4 d5 c4 c6 Nf3 Nf6 Nc3 e6"),
  L("London System", "D02", "d4 d5 Nf3 Nf6 Bf4"),
  L("Colle System", "D04", "d4 d5 Nf3 Nf6 e3"),

  // --- 1.d4 Nf6 (Indian) ---
  L("Indian Defence", "A45", "d4 Nf6"),
  L("Nimzo-Indian Defence", "E20", "d4 Nf6 c4 e6 Nc3 Bb4"),
  L("Queen's Indian Defence", "E12", "d4 Nf6 c4 e6 Nf3 b6"),
  L("Bogo-Indian Defence", "E11", "d4 Nf6 c4 e6 Nf3 Bb4+"),
  L("King's Indian Defence", "E60", "d4 Nf6 c4 g6 Nc3 Bg7"),
  L("Grünfeld Defence", "D80", "d4 Nf6 c4 g6 Nc3 d5"),
  L("Benoni Defence", "A60", "d4 Nf6 c4 c5 d5 e6"),
  L("Benko Gambit", "A57", "d4 Nf6 c4 c5 d5 b5"),
  L("Catalan Opening", "E00", "d4 Nf6 c4 e6 g3"),
  L("Dutch Defence", "A80", "d4 f5"),

  // --- Flank / others ---
  L("English Opening", "A10", "c4"),
  L("English, Symmetrical", "A30", "c4 c5"),
  L("English, Reversed Sicilian", "A20", "c4 e5"),
  L("Réti Opening", "A09", "Nf3 d5 c4"),
  L("King's Indian Attack", "A07", "Nf3 d5 g3"),
  L("Bird's Opening", "A02", "f4"),
  L("Nimzo-Larsen Attack", "A01", "b3"),
  L("Grob Opening", "A00", "g4"),
];

export interface OpeningMatch {
  /** Name of the most specific opening matched. */
  name: string;
  eco?: string;
  /** Number of leading half-moves that are still "in book". */
  bookPlies: number;
}

/**
 * Match a game's SAN move list against the book. Returns the most specific
 * named line that the moves followed and how many opening half-moves are
 * theory. A ply at 1-based index `i` is a book move when `i <= bookPlies`.
 */
export function matchOpening(sans: string[]): OpeningMatch | null {
  let best: OpeningMatch | null = null;

  for (const line of OPENING_BOOK) {
    // How many leading moves of the game equal this line?
    let k = 0;
    const max = Math.min(sans.length, line.moves.length);
    while (k < max && stripSan(sans[k]) === stripSan(line.moves[k])) k++;

    // Only count it if the game followed the WHOLE recognisable line, or the
    // line is fully a prefix of the game (i.e. they didn't diverge early).
    if (k === 0) continue;
    const followedFully = k === line.moves.length || k === sans.length;
    if (!followedFully) continue;

    const candidate: OpeningMatch = {
      name: line.name,
      eco: line.eco,
      bookPlies: k,
    };
    // Prefer the deeper (more specific) match.
    if (
      !best ||
      candidate.bookPlies > best.bookPlies ||
      (candidate.bookPlies === best.bookPlies &&
        line.moves.length > (best.bookPlies ?? 0))
    ) {
      best = candidate;
    }
  }

  return best;
}

/** Strip check/mate/annotation glyphs so "Bb5+" matches book "Bb5". */
function stripSan(san: string): string {
  return san.replace(/[+#!?]/g, "");
}
