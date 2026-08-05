export function FaderIcon() {
  return (
    <svg width="24" height="20" viewBox="0 0 24 20" fill="none">
      {[4, 12, 20].map((x, i) => (
        <g key={x}>
          <line
            x1={x}
            y1="2"
            x2={x}
            y2="18"
            stroke="currentColor"
            strokeWidth="1.3"
            opacity="0.4"
          />
          <rect x={x - 3.5} y={[11, 5, 8][i]} width="7" height="3.4" rx="1" fill="currentColor" />
        </g>
      ))}
    </svg>
  );
}

export function ForkIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
      <path
        d="M8 3v7a4 4 0 0 0 4 4v7m4-18v7a4 4 0 0 1-4 4"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function KeysIcon() {
  return (
    <svg width="24" height="18" viewBox="0 0 22 16" fill="none">
      <rect
        x="0.7"
        y="0.7"
        width="20.6"
        height="14.6"
        rx="1.5"
        stroke="currentColor"
        strokeWidth="1.3"
      />
      <line x1="4.5" y1="0.7" x2="4.5" y2="15.3" stroke="currentColor" strokeWidth="1" />
      <line x1="8.8" y1="0.7" x2="8.8" y2="15.3" stroke="currentColor" strokeWidth="1" />
      <line x1="13.2" y1="0.7" x2="13.2" y2="15.3" stroke="currentColor" strokeWidth="1" />
      <line x1="17.5" y1="0.7" x2="17.5" y2="15.3" stroke="currentColor" strokeWidth="1" />
      <rect x="2.7" y="0.7" width="3.6" height="9.2" rx="0.8" fill="currentColor" />
      <rect x="11.4" y="0.7" width="3.6" height="9.2" rx="0.8" fill="currentColor" />
      <rect x="15.7" y="0.7" width="3.6" height="9.2" rx="0.8" fill="currentColor" />
    </svg>
  );
}

export function TempoIcon({ running }: { running: boolean }) {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
      <path d="M9 3h6l4 18H5L9 3Z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
      <line
        x1="12"
        y1="19"
        x2={running ? 16 : 8}
        y2="7"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        style={{ transition: "all 200ms" }}
      />
    </svg>
  );
}
