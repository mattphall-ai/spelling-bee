import { useEffect } from "react";
import type { Puzzle } from "../types";
import { generatePuzzle } from "../game/puzzle";

interface Props {
  onClose: () => void;
  onCreate: (puzzle: Puzzle) => void;
}

export function NewPuzzleDialog({ onClose, onCreate }: Props) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        className="modal"
        role="dialog"
        aria-modal="true"
        aria-label="New puzzle"
        onClick={(e) => e.stopPropagation()}
      >
        <h2>Start a new puzzle?</h2>
        <p className="hint">Your progress on this puzzle will be lost.</p>
        <div className="modal-actions">
          <button className="btn-ghost" onClick={onClose}>
            Cancel
          </button>
          <button
            className="btn primary"
            onClick={() => onCreate(generatePuzzle())}
          >
            New Puzzle
          </button>
        </div>
      </div>
    </div>
  );
}
