import { useState } from "react";

const RED = "#f53e3e";
const GREEN = "#20f040";

const pt = {
  badge:    "ATENÇÃO",
  title:    "RISCO DE FEEDBACK",
  subtitle: "Leia antes de conectar o pedal ao seu sistema de áudio.",
  steps: [
    {
      title: "Feedback de áudio",
      body:  "Este pedal processa o microfone em tempo real. Sem fones de ouvido, o som pode realimentar e criar ruído agudo intenso.",
    },
    {
      title: "Comece com volume baixo",
      body:  "Reduza o volume do sistema antes de ativar. Aumente gradualmente após confirmar que não há feedback.",
    },
    {
      title: "Use fones de ouvido",
      body:  "A saída esquerda é o sinal seco (dry). A saída direita é o sinal processado com efeitos (FX).",
    },
  ],
  checkbox:      "Entendi os riscos e usarei fones de ouvido",
  ctaReady:      "ATIVAR PEDAL →",
  ctaPending:    "CONFIRME O ITEM ACIMA",
};

const en = {
  badge:    "WARNING",
  title:    "FEEDBACK RISK",
  subtitle: "Read before connecting the pedal to your audio system.",
  steps: [
    {
      title: "Audio feedback",
      body:  "This pedal processes your microphone in real time. Without headphones, the sound can loop back and create intense high-pitched noise.",
    },
    {
      title: "Start with low volume",
      body:  "Lower your system volume before activating. Increase gradually after confirming there is no feedback.",
    },
    {
      title: "Use headphones",
      body:  "Left output is the dry signal. Right output is the processed signal with effects (FX).",
    },
  ],
  checkbox:      "I understand the risks and will use headphones",
  ctaReady:      "ACTIVATE PEDAL →",
  ctaPending:    "CONFIRM THE ITEM ABOVE",
};

const T = navigator.language.toLowerCase().startsWith("pt") ? pt : en;

export default function WarningModal({ onDismiss }: { onDismiss: () => void }) {
  const [confirmed, setConfirmed] = useState(false);

  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center"
      style={{ background: "rgba(2,2,6,0.98)", backdropFilter: "blur(12px)" }}
    >
      <div className="absolute inset-0 scanline opacity-[0.07] pointer-events-none" />

      <div
        className="relative flex flex-col mx-4"
        style={{
          maxWidth: 480,
          width: "100%",
          background: "#07060e",
          border: "1px solid rgba(245,62,62,0.22)",
          borderRadius: 12,
          overflow: "hidden",
          boxShadow: "0 0 0 1px rgba(245,62,62,0.08), 0 40px 100px rgba(0,0,0,0.92), 0 0 80px rgba(245,62,62,0.05)",
        }}
      >

        <div style={{ height: 3, background: `linear-gradient(90deg, transparent 5%, ${RED}cc 40%, ${RED}cc 60%, transparent 95%)` }} />

        <div style={{ padding: "28px 32px 24px", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
          <div className="flex items-start gap-4">
            <div
              style={{
                width: 48, height: 48, borderRadius: 10, flexShrink: 0,
                border: `1px solid ${RED}40`,
                background: `${RED}10`,
                display: "flex", alignItems: "center", justifyContent: "center",
              }}
            >
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                <path d="M12 8v5" stroke={RED} strokeWidth="2.2" strokeLinecap="round" />
                <circle cx="12" cy="17" r="1.1" fill={RED} />
                <path d="M10.5 3.5L2 19a1.7 1.7 0 0 0 1.5 2.5h17A1.7 1.7 0 0 0 22 19L13.5 3.5a1.73 1.73 0 0 0-3 0z" stroke={RED} strokeWidth="1.8" strokeLinejoin="round" />
              </svg>
            </div>

            <div>
              <p
                className="font-[var(--font-pixel)]"
                style={{ fontSize: 8, color: RED, letterSpacing: "0.35em", marginBottom: 7 }}
              >
                {T.badge}
              </p>
              <p
                className="font-[var(--font-display)]"
                style={{ fontSize: 26, color: "#fff", lineHeight: 1, letterSpacing: "0.01em" }}
              >
                {T.title}
              </p>
              <p
                className="font-[var(--font-mono)]"
                style={{ fontSize: 11, color: "rgba(168,168,188,0.55)", marginTop: 8, lineHeight: 1.5 }}
              >
                {T.subtitle}
              </p>
            </div>
          </div>
        </div>

        <div style={{ padding: "20px 32px", display: "flex", flexDirection: "column", gap: 0 }}>
          {T.steps.map((step, i) => (
            <>
              {i > 0 && <div key={`div-${i}`} style={{ height: 1, background: "rgba(255,255,255,0.05)", margin: "0 0 0 40px" }} />}
              <Step
                key={i}
                n={String(i + 1).padStart(2, "0")}
                title={step.title}
                body={step.body}
                icon={[<IconSpeaker />, <IconVolume />, <IconHeadphones />][i]}
              />
            </>
          ))}
        </div>

        <div
          style={{
            padding: "16px 32px 28px",
            borderTop: "1px solid rgba(255,255,255,0.06)",
            display: "flex", flexDirection: "column", gap: 14,
          }}
        >

          <label
            className="flex items-center gap-3 cursor-pointer select-none"
            style={{ pointerEvents: "auto" }}
          >
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
              style={{ fontSize: 10, color: confirmed ? "rgba(224,224,236,0.8)" : "rgba(168,168,188,0.45)", transition: "color 200ms", lineHeight: 1.45 }}
            >
              {T.checkbox}
            </span>
          </label>

          <button
            onClick={confirmed ? onDismiss : undefined}
            disabled={!confirmed}
            className="font-[var(--font-pixel)] transition-all active:scale-[0.98]"
            style={{
              fontSize: 9,
              letterSpacing: "0.2em",
              padding: "15px 24px",
              paddingTop: 17,
              borderRadius: 6,
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

          <p
            className="font-[var(--font-mono)] text-center"
            style={{ fontSize: 8, color: "rgba(168,168,188,0.22)", letterSpacing: "0.08em" }}
          >
            L=DRY · R=FX · GHOST FX MK.I
          </p>
        </div>
      </div>
    </div>
  );
}

function Step({ n, title, body, icon }: { n: string; title: string; body: string; icon: React.ReactNode }) {
  return (
    <div className="flex gap-4 items-start" style={{ padding: "16px 0" }}>
      <div style={{ flexShrink: 0, width: 36, display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
        <div style={{ color: "rgba(168,168,188,0.28)", width: 22, height: 22, display: "flex", alignItems: "center", justifyContent: "center" }}>
          {icon}
        </div>
        <span
          className="font-[var(--font-mono)]"
          style={{ fontSize: 8, color: "rgba(168,168,188,0.2)", letterSpacing: "0.05em" }}
        >
          {n}
        </span>
      </div>
      <div style={{ flex: 1, paddingTop: 1 }}>
        <p
          className="font-[var(--font-mono)]"
          style={{ fontSize: 12, color: "#e0e0ec", fontWeight: 700, letterSpacing: "0.02em", marginBottom: 5 }}
        >
          {title}
        </p>
        <p
          className="font-[var(--font-mono)] leading-relaxed"
          style={{ fontSize: 10, color: "rgba(168,168,188,0.55)", lineHeight: 1.65 }}
        >
          {body}
        </p>
      </div>
    </div>
  );
}

function IconSpeaker() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
      <path d="M11 5L6 9H2v6h4l5 4V5z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
      <path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

function IconVolume() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
      <rect x="3" y="10" width="4" height="4" rx="1" stroke="currentColor" strokeWidth="1.8" />
      <rect x="10" y="6" width="4" height="12" rx="1" stroke="currentColor" strokeWidth="1.8" />
      <rect x="17" y="3" width="4" height="18" rx="1" stroke="currentColor" strokeWidth="1.8" />
    </svg>
  );
}

function IconHeadphones() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
      <path d="M3 18v-6a9 9 0 0 1 18 0v6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <path d="M21 19a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3v5zM3 19a2 2 0 0 0 2 2h1a2 2 0 0 0 2-2v-3a2 2 0 0 0-2-2H3v5z" stroke="currentColor" strokeWidth="1.8" />
    </svg>
  );
}
