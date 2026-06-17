import { useState } from "react";

const RED = "#f53e3e";
const GREEN = "#20f040";

const pt = {
  badge:    "ATENÇÃO",
  title:    "RISCO DE FEEDBACK",
  lead:     "Este pedal processa seu microfone em tempo real. Sem fones, o som realimenta e vira ruído agudo.",
  tip:      "Use fones e comece com o volume baixo.",
  checkbox: "Entendi e vou usar fones",
  ctaReady: "ATIVAR PEDAL →",
  ctaPending: "CONFIRME ACIMA",
};

const en = {
  badge:    "WARNING",
  title:    "FEEDBACK RISK",
  lead:     "This pedal processes your mic in real time. Without headphones the sound loops back into harsh noise.",
  tip:      "Use headphones and start at low volume.",
  checkbox: "I understand — I'll use headphones",
  ctaReady: "ACTIVATE PEDAL →",
  ctaPending: "CONFIRM ABOVE",
};

const T = navigator.language.toLowerCase().startsWith("pt") ? pt : en;

export default function WarningModal({ onDismiss }: { onDismiss: () => void }) {
  const [confirmed, setConfirmed] = useState(false);

  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center"
      style={{ background: "rgba(2,2,6,0.58)", backdropFilter: "blur(7px)", WebkitBackdropFilter: "blur(7px)" }}
    >
      <div className="absolute inset-0 scanline opacity-[0.07] pointer-events-none" />

      <div
        className="relative flex flex-col items-center text-center mx-4"
        style={{
          maxWidth: 360,
          width: "100%",
          background: "#07060e",
          border: "1px solid rgba(245,62,62,0.22)",
          borderRadius: 14,
          overflow: "hidden",
          padding: "32px 28px 24px",
          boxShadow: "0 0 0 1px rgba(245,62,62,0.08), 0 40px 100px rgba(0,0,0,0.92), 0 0 80px rgba(245,62,62,0.05)",
        }}
      >
        <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 3, background: `linear-gradient(90deg, transparent 5%, ${RED}cc 40%, ${RED}cc 60%, transparent 95%)` }} />

        {/* hero icon */}
        <div
          style={{
            width: 64, height: 64, borderRadius: 16, marginBottom: 18,
            border: `1px solid ${RED}30`,
            background: `${RED}0d`,
            display: "flex", alignItems: "center", justifyContent: "center",
            position: "relative",
            boxShadow: `0 0 30px ${RED}12, inset 0 1px 0 rgba(255,255,255,0.04)`,
          }}
        >
          <IconHeadphones />
          {/* small warning badge */}
          <span
            style={{
              position: "absolute", top: -6, right: -6,
              width: 20, height: 20, borderRadius: "50%",
              background: "#07060e", border: `1px solid ${RED}55`,
              display: "flex", alignItems: "center", justifyContent: "center",
            }}
          >
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none">
              <path d="M12 8v5" stroke={RED} strokeWidth="2.6" strokeLinecap="round" />
              <circle cx="12" cy="17" r="1.2" fill={RED} />
              <path d="M10.5 3.5L2 19a1.7 1.7 0 0 0 1.5 2.5h17A1.7 1.7 0 0 0 22 19L13.5 3.5a1.73 1.73 0 0 0-3 0z" stroke={RED} strokeWidth="2" strokeLinejoin="round" />
            </svg>
          </span>
        </div>

        <p className="font-[var(--font-pixel)]" style={{ fontSize: 8, color: RED, letterSpacing: "0.35em", marginBottom: 9 }}>
          {T.badge}
        </p>
        <p className="font-[var(--font-display)]" style={{ fontSize: 22, color: "#fff", lineHeight: 1.05, letterSpacing: "0.01em" }}>
          {T.title}
        </p>

        <p className="font-[var(--font-mono)]" style={{ fontSize: 11, color: "rgba(168,168,188,0.6)", lineHeight: 1.6, marginTop: 12, maxWidth: 280 }}>
          {T.lead}
        </p>
        <p className="font-[var(--font-mono)]" style={{ fontSize: 11, color: "rgba(224,224,236,0.85)", lineHeight: 1.5, marginTop: 8, fontWeight: 700 }}>
          {T.tip}
        </p>

        {/* checkbox */}
        <label className="flex items-center gap-2.5 cursor-pointer select-none" style={{ marginTop: 24 }}>
          <span
            onClick={() => setConfirmed(v => !v)}
            style={{
              width: 18, height: 18, borderRadius: 4, flexShrink: 0,
              border: `1.5px solid ${confirmed ? GREEN : "rgba(255,255,255,0.2)"}`,
              background: confirmed ? `${GREEN}18` : "transparent",
              display: "flex", alignItems: "center", justifyContent: "center",
              transition: "all 200ms ease",
              boxShadow: confirmed ? `0 0 10px ${GREEN}40` : "none",
            }}
          >
            {confirmed && (
              <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
                <path d="M1 4l3 3 5-6" stroke={GREEN} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            )}
          </span>
          <span
            className="font-[var(--font-mono)]"
            style={{ fontSize: 10, color: confirmed ? "rgba(224,224,236,0.8)" : "rgba(168,168,188,0.45)", transition: "color 200ms" }}
          >
            {T.checkbox}
          </span>
        </label>

        {/* button */}
        <button
          onClick={confirmed ? onDismiss : undefined}
          disabled={!confirmed}
          className="font-[var(--font-pixel)] transition-all active:scale-[0.98]"
          style={{
            marginTop: 16,
            fontSize: 9,
            letterSpacing: "0.2em",
            padding: "15px 24px",
            paddingTop: 17,
            borderRadius: 7,
            border: `1px solid ${confirmed ? GREEN + "50" : "rgba(255,255,255,0.08)"}`,
            background: confirmed ? `${GREEN}12` : "rgba(255,255,255,0.03)",
            color: confirmed ? GREEN : "rgba(255,255,255,0.22)",
            cursor: confirmed ? "pointer" : "not-allowed",
            width: "100%",
            boxShadow: confirmed ? `0 0 28px ${GREEN}14, inset 0 1px 0 ${GREEN}18` : "none",
            transition: "all 250ms ease",
          }}
        >
          {confirmed ? T.ctaReady : T.ctaPending}
        </button>

        <p className="font-[var(--font-mono)]" style={{ fontSize: 8, color: "rgba(168,168,188,0.22)", letterSpacing: "0.12em", marginTop: 16 }}>
          GHOST FX MK.I
        </p>
      </div>
    </div>
  );
}

function IconHeadphones() {
  return (
    <svg width="30" height="30" viewBox="0 0 24 24" fill="none" style={{ color: "#e0e0ec" }}>
      <path d="M3 18v-6a9 9 0 0 1 18 0v6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <path d="M21 19a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3v5zM3 19a2 2 0 0 0 2 2h1a2 2 0 0 0 2-2v-3a2 2 0 0 0-2-2H3v5z" stroke="currentColor" strokeWidth="1.8" />
    </svg>
  );
}
