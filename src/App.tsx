import { useCallback, useEffect, useMemo, useState } from "react";
import "./App.css";
import type { GameState, Puzzle } from "./types";
import { Hive } from "./components/Hive";
import { NewPuzzleDialog } from "./components/NewPuzzleDialog";
import {
  RANKS,
  generatePuzzle,
  getRank,
  rankThresholds,
  scoreWord,
} from "./game/puzzle";

const STORAGE_KEY = "spelling-bee.state.v1";

function loadOrCreate(): GameState {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as GameState;
      if (parsed?.puzzle?.letters?.length === 7 && Array.isArray(parsed.found)) {
        return parsed;
      }
    }
  } catch {
    // fall through to a fresh puzzle
  }
  return { puzzle: generatePuzzle(), found: [] };
}

type Toast = { text: string; tone: "good" | "bad"; id: number };

const PRAISE = ["Nice!", "Good!", "Awesome!", "Great!", "Excellent!", "Sweet!"];

export default function App() {
  const [state, setState] = useState<GameState>(loadOrCreate);
  const [outer, setOuter] = useState<string[]>(state.puzzle.outer);
  const [typed, setTyped] = useState("");
  const [toast, setToast] = useState<Toast | null>(null);
  const [showNew, setShowNew] = useState(false);
  const [revealed, setRevealed] = useState(false);

  const { puzzle, found } = state;

  // Reset transient UI when the puzzle changes (adjust-state-during-render
  // pattern: https://react.dev/learn/you-might-not-need-an-effect).
  const [puzzleId, setPuzzleId] = useState(puzzle.createdAt);
  if (puzzleId !== puzzle.createdAt) {
    setPuzzleId(puzzle.createdAt);
    setOuter(puzzle.outer);
    setTyped("");
    setRevealed(false);
  }

  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      // ignore storage failures (private mode, quota)
    }
  }, [state]);

  const flash = useCallback((text: string, tone: "good" | "bad") => {
    setToast({ text, tone, id: Date.now() + Math.random() });
  }, []);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 1400);
    return () => clearTimeout(t);
  }, [toast]);

  const score = useMemo(
    () =>
      found.reduce(
        (sum, w) => sum + scoreWord(w, puzzle.pangrams.includes(w)),
        0,
      ),
    [found, puzzle.pangrams],
  );

  const rank = getRank(
    score,
    puzzle.maxScore,
    found.length === puzzle.answers.length,
  );
  const thresholds = useMemo(
    () => rankThresholds(puzzle.maxScore),
    [puzzle.maxScore],
  );

  const addLetter = useCallback(
    (letter: string) => {
      if (!puzzle.letters.includes(letter)) return;
      setTyped((t) => (t.length >= 19 ? t : t + letter));
    },
    [puzzle.letters],
  );

  const backspace = useCallback(() => setTyped((t) => t.slice(0, -1)), []);

  const shuffle = useCallback(() => {
    setOuter((prev) => {
      const a = [...prev];
      for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [a[i], a[j]] = [a[j], a[i]];
      }
      return a;
    });
  }, []);

  const submit = useCallback(() => {
    const word = typed.toLowerCase();
    setTyped("");
    if (word.length === 0) return;
    if (word.length < 4) return flash("Too short", "bad");
    if (!word.includes(puzzle.center))
      return flash("Missing center letter", "bad");
    for (const ch of word) {
      if (!puzzle.letters.includes(ch)) return flash("Bad letters", "bad");
    }
    if (found.includes(word)) return flash("Already found", "bad");
    if (!puzzle.answers.includes(word)) return flash("Not in word list", "bad");

    const isPangram = puzzle.pangrams.includes(word);
    const pts = scoreWord(word, isPangram);
    flash(
      isPangram
        ? `Pangram! +${pts}`
        : `${PRAISE[Math.floor(Math.random() * PRAISE.length)]} +${pts}`,
      "good",
    );
    setState((s) => ({ ...s, found: [...s.found, word] }));
  }, [typed, puzzle, found, flash]);

  // Physical keyboard support.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (showNew) return;
      if (e.key === "Enter") {
        e.preventDefault();
        submit();
      } else if (e.key === "Backspace") {
        e.preventDefault();
        backspace();
      } else if (/^[a-zA-Z]$/.test(e.key)) {
        addLetter(e.key.toLowerCase());
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [submit, backspace, addLetter, showNew]);

  const sortedFound = useMemo(() => [...found].sort(), [found]);

  return (
    <div className="app">
      <header className="topbar">
        <h1>Spelling Bee</h1>
        <button className="btn-ghost" onClick={() => setShowNew(true)}>
          New Puzzle
        </button>
      </header>

      <div className="layout">
        <section className="play">
          <RankBar rank={rank} score={score} thresholds={thresholds} />

          <div className="typed-row">
            <div className="typed" aria-live="polite">
              {typed.length === 0 ? (
                <span className="placeholder">Type or tap letters</span>
              ) : (
                typed.split("").map((ch, i) => (
                  <span
                    key={i}
                    className={
                      ch === puzzle.center
                        ? "ch center"
                        : puzzle.letters.includes(ch)
                          ? "ch"
                          : "ch invalid"
                    }
                  >
                    {ch.toUpperCase()}
                  </span>
                ))
              )}
            </div>

            {toast && <div className={`toast ${toast.tone}`}>{toast.text}</div>}
          </div>

          <Hive center={puzzle.center} outer={outer} onLetter={addLetter} />

          <div className="controls">
            <button className="btn" onClick={backspace}>
              Delete
            </button>
            <button
              className="btn icon"
              onClick={shuffle}
              aria-label="Shuffle letters"
            >
              ⟳
            </button>
            <button className="btn" onClick={submit}>
              Enter
            </button>
          </div>
        </section>

        <FoundPanel
          found={sortedFound}
          puzzle={puzzle}
          revealed={revealed}
          onReveal={() => setRevealed(true)}
        />
      </div>

      {showNew && (
        <NewPuzzleDialog
          onClose={() => setShowNew(false)}
          onCreate={(p) => {
            setState({ puzzle: p, found: [] });
            setShowNew(false);
          }}
        />
      )}
    </div>
  );
}

function RankBar({
  rank,
  score,
  thresholds,
}: {
  rank: ReturnType<typeof getRank>;
  score: number;
  thresholds: number[];
}) {
  return (
    <div className="rankbar">
      <div className="rank-name">
        {rank.isQueenBee ? "👑 Queen Bee" : rank.name}
      </div>
      <div className="rank-track">
        <div
          className="rank-fill"
          style={{
            width: `${((rank.index + rank.toNext) / (RANKS.length - 1)) * 100}%`,
          }}
        />
        {RANKS.map((r, i) => (
          <div
            key={r.name}
            className={`rank-dot${i <= rank.index ? " on" : ""}${i === rank.index ? " current" : ""}`}
            style={{ left: `${(i / (RANKS.length - 1)) * 100}%` }}
            title={`${r.name} — ${thresholds[i]} pts`}
          >
            {i === rank.index ? <span className="rank-score">{score}</span> : null}
          </div>
        ))}
      </div>
    </div>
  );
}

function FoundPanel({
  found,
  puzzle,
  revealed,
  onReveal,
}: {
  found: string[];
  puzzle: Puzzle;
  revealed: boolean;
  onReveal: () => void;
}) {
  const remaining = puzzle.answers.filter((w) => !found.includes(w));
  return (
    <section className="found">
      <div className="found-head">
        <span>
          Found <strong>{found.length}</strong> of {puzzle.answers.length} words
        </span>
        <span className="pangram-count">
          {puzzle.pangrams.filter((p) => found.includes(p)).length}/
          {puzzle.pangrams.length} pangrams
        </span>
      </div>

      <ul className="word-grid">
        {found.map((w) => (
          <li key={w} className={puzzle.pangrams.includes(w) ? "pangram" : ""}>
            {w}
          </li>
        ))}
      </ul>

      <div className="found-foot">
        {revealed ? (
          <>
            <div className="reveal-label">Missing words ({remaining.length}):</div>
            <ul className="word-grid muted">
              {remaining.map((w) => (
                <li
                  key={w}
                  className={puzzle.pangrams.includes(w) ? "pangram" : ""}
                >
                  {w}
                </li>
              ))}
            </ul>
          </>
        ) : (
          <button className="btn-ghost small" onClick={onReveal}>
            Reveal answers
          </button>
        )}
      </div>
    </section>
  );
}
