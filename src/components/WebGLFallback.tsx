import GhostMark from "../GhostMark";

export function WebGLFallback({
  isActive,
  onTap,
  accent,
}: {
  isActive: boolean;
  onTap: () => void;
  accent: string;
}) {
  return (
    <div className="absolute inset-0 z-[2] flex items-center justify-center lg:pl-[360px]">
      <div
        className="flex flex-col items-center text-center mx-6"
        style={{
          maxWidth: 380,
          padding: "36px 30px",
          background: "rgba(5,5,10,0.92)",
          border: "1px solid rgba(255,255,255,0.08)",
          borderRadius: 14,
        }}
      >
        <GhostMark
          variant="solid"
          size={64}
          color="rgba(231,228,220,0.8)"
          ledColor={isActive ? "#f53e3e" : accent}
          glow={isActive}
        />
        <p
          className="font-[var(--font-mono)] uppercase tracking-[0.3em]"
          style={{ fontSize: 10, color: "rgba(168,168,188,0.6)", marginTop: 18 }}
        >
          3D unavailable
        </p>
        <p
          className="font-[var(--font-mono)]"
          style={{
            fontSize: 11,
            color: "rgba(224,224,236,0.75)",
            lineHeight: 1.6,
            marginTop: 10,
          }}
        >
          Your browser or GPU doesn't support WebGL, so the pedal can't be rendered, but the signal
          chain still works. Use the sliders and the button below.
        </p>
        <button
          onClick={onTap}
          className="font-[var(--font-pixel)] transition-all active:scale-[0.98]"
          style={{
            marginTop: 22,
            fontSize: 9,
            letterSpacing: "0.2em",
            padding: "14px 26px",
            borderRadius: 7,
            width: "100%",
            border: `1px solid ${isActive ? "#f53e3e60" : accent + "50"}`,
            background: isActive ? "#f53e3e14" : `${accent}12`,
            color: isActive ? "#f53e3e" : accent,
            cursor: "pointer",
          }}
        >
          {isActive ? "BYPASS PEDAL" : "ACTIVATE PEDAL →"}
        </button>
      </div>
    </div>
  );
}
