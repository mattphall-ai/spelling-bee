interface HiveProps {
  center: string;
  outer: string[];
  onLetter: (letter: string) => void;
}

// Positions (% of the square container) for the six outer cells around the
// center, arranged as a flat-top honeycomb.
const OUTER_POSITIONS = [
  { left: 50, top: 16.9 }, // top
  { left: 74.83, top: 33.45 }, // upper-right
  { left: 74.83, top: 66.55 }, // lower-right
  { left: 50, top: 83.1 }, // bottom
  { left: 25.17, top: 66.55 }, // lower-left
  { left: 25.17, top: 33.45 }, // upper-left
];

function Cell({
  letter,
  center,
  style,
  onClick,
}: {
  letter: string;
  center?: boolean;
  style: React.CSSProperties;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      className={`cell${center ? " cell-center" : ""}`}
      style={style}
      onClick={onClick}
      aria-label={`letter ${letter.toUpperCase()}`}
    >
      <span>{letter.toUpperCase()}</span>
    </button>
  );
}

export function Hive({ center, outer, onLetter }: HiveProps) {
  return (
    <div className="hive" role="group" aria-label="Letter hive">
      <Cell
        letter={center}
        center
        style={{ left: "50%", top: "50%" }}
        onClick={() => onLetter(center)}
      />
      {outer.map((letter, i) => {
        const pos = OUTER_POSITIONS[i % OUTER_POSITIONS.length];
        return (
          <Cell
            key={`${letter}-${i}`}
            letter={letter}
            style={{ left: `${pos.left}%`, top: `${pos.top}%` }}
            onClick={() => onLetter(letter)}
          />
        );
      })}
    </div>
  );
}
