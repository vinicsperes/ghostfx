const FEEDBACK_T = navigator.language.toLowerCase().startsWith("pt")
  ? {
      badge: "ÁUDIO",
      title: "MICROFONIA DETECTADA",
      body: "O microfone começou a captar o som da saída (microfonia). Cortei o áudio na hora pra proteger seus ouvidos e as caixas.",
      hintTitle: "Como resolver",
      hint: "Use fones de ouvido (recomendado), ou abaixe o volume e afaste o microfone das caixas. Depois toque em Retomar.",
      resume: "RETOMAR",
    }
  : {
      badge: "AUDIO",
      title: "FEEDBACK DETECTED",
      body: "Your microphone started picking up the output (feedback). We cut the audio immediately to protect your ears and your speakers.",
      hintTitle: "How to fix it",
      hint: "Use headphones (recommended), or lower the volume and move the mic away from the speakers. Then tap Resume.",
      resume: "RESUME",
    };

export function FeedbackModal({ onResume }: { onResume: () => void }) {
  const accent = "#ff5a5a";
  return (
    <div className="fixed inset-0 z-[130] flex items-center justify-center" style={{ padding: 16, background: "rgba(3,2,6,0.62)", backdropFilter: "blur(3px)" }}>
      <div
        className="relative flex flex-col mic-card-in"
        style={{
          maxWidth: 400, width: "100%", background: "rgba(12,6,8,0.98)",
          border: `1px solid ${accent}45`, borderRadius: 12, overflow: "hidden",
          boxShadow: `0 0 0 1px ${accent}12, 0 22px 60px rgba(0,0,0,0.75), 0 0 60px ${accent}14`,
        }}
      >
        <div style={{ height: 2, background: `linear-gradient(90deg, transparent 5%, ${accent}cc 40%, ${accent}cc 60%, transparent 95%)` }} />
        <div className="flex items-start gap-3" style={{ padding: "20px 22px 12px" }}>
          <div style={{ width: 40, height: 40, borderRadius: 10, flexShrink: 0, border: `1px solid ${accent}45`, background: `${accent}12`, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
              <path d="M3 9v6h4l5 4V5L7 9H3z" stroke={accent} strokeWidth="1.7" strokeLinejoin="round" />
              <path d="M16 8.5a4 4 0 0 1 0 7M19.5 6a8 8 0 0 1 0 12" stroke={accent} strokeWidth="1.7" strokeLinecap="round" />
              <path d="M3 3l18 18" stroke={accent} strokeWidth="1.9" strokeLinecap="round" />
            </svg>
          </div>
          <div style={{ paddingTop: 1 }}>
            <p className="font-[var(--font-pixel)]" style={{ fontSize: 7, color: accent, letterSpacing: "0.3em", marginBottom: 6 }}>{FEEDBACK_T.badge}</p>
            <p className="font-[var(--font-display)]" style={{ fontSize: 19, color: "#fff", lineHeight: 1.05 }}>{FEEDBACK_T.title}</p>
          </div>
        </div>
        <div style={{ padding: "0 22px 4px" }}>
          <p className="font-[var(--font-mono)]" style={{ fontSize: 10.5, color: "rgba(188,178,182,0.62)", lineHeight: 1.55 }}>{FEEDBACK_T.body}</p>
          <div style={{ marginTop: 12, padding: "10px 12px", borderRadius: 7, background: "rgba(255,255,255,0.025)", border: "1px solid rgba(255,255,255,0.06)" }}>
            <p className="font-[var(--font-mono)]" style={{ fontSize: 8.5, color: accent, letterSpacing: "0.16em", textTransform: "uppercase", marginBottom: 5 }}>{FEEDBACK_T.hintTitle}</p>
            <p className="font-[var(--font-mono)]" style={{ fontSize: 9.5, color: "rgba(188,178,182,0.5)", lineHeight: 1.55 }}>{FEEDBACK_T.hint}</p>
          </div>
        </div>
        <div style={{ padding: "14px 22px 20px" }}>
          <button
            onClick={onResume}
            className="font-[var(--font-pixel)] transition-all active:scale-[0.98]"
            style={{
              width: "100%", fontSize: 8.5, letterSpacing: "0.18em", padding: "14px 18px", paddingTop: 16, borderRadius: 6,
              border: `1px solid ${accent}55`, background: `${accent}14`, color: accent, cursor: "pointer",
              boxShadow: `0 0 22px ${accent}14, inset 0 1px 0 ${accent}1a`,
            }}
          >{FEEDBACK_T.resume}</button>
        </div>
      </div>
    </div>
  );
}
