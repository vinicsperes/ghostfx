const MIC_T = navigator.language.toLowerCase().startsWith("pt")
  ? {
      badge: "MICROFONE",
      title: "MICROFONE BLOQUEADO",
      body: "O GHOST FX processa a sua guitarra pelo microfone em tempo real. Sem acesso, não há sinal pra processar.",
      hintTitle: "Como liberar",
      hint: "Clique no ícone de cadeado/microfone na barra de endereço, marque o microfone como permitido e tente de novo.",
      retry: "TENTAR DE NOVO",
      keyboard: "Seguir só com o teclado",
    }
  : {
      badge: "MICROPHONE",
      title: "MICROPHONE BLOCKED",
      body: "GHOST FX processes your guitar through the microphone in real time. Without access, there's no signal to process.",
      hintTitle: "How to allow it",
      hint: "Click the lock/microphone icon in the address bar, set the microphone to allowed, then try again.",
      retry: "TRY AGAIN",
      keyboard: "Continue with keyboard only",
    };

export function MicBlockedModal({
  accent,
  onRetry,
  onKeyboard,
  onDismiss,
}: {
  accent: string;
  onRetry: () => void;
  onKeyboard: () => void;
  onDismiss: () => void;
}) {
  return (
    <div
      className="fixed z-[120] pointer-events-none flex justify-center"
      style={{ left: 0, right: 0, bottom: 76, padding: "0 16px" }}
    >
      <div
        className="pointer-events-auto relative flex flex-col mic-card-in"
        style={{
          maxWidth: 380,
          width: "100%",
          background: "rgba(7,6,14,0.97)",
          backdropFilter: "blur(6px)",
          border: `1px solid ${accent}30`,
          borderRadius: 11,
          overflow: "hidden",
          boxShadow: `0 0 0 1px ${accent}10, 0 18px 50px rgba(0,0,0,0.7), 0 0 50px ${accent}0a`,
        }}
      >
        <div
          style={{
            height: 2,
            background: `linear-gradient(90deg, transparent 5%, ${accent}cc 40%, ${accent}cc 60%, transparent 95%)`,
          }}
        />

        <button
          onClick={onDismiss}
          className="absolute top-2.5 right-3.5 font-[var(--font-mono)] transition-colors hover:text-white"
          style={{
            fontSize: 15,
            color: "rgba(255,255,255,0.25)",
            background: "none",
            border: "none",
            cursor: "pointer",
            zIndex: 1,
          }}
        >
          ✕
        </button>

        <div className="flex items-start gap-3" style={{ padding: "18px 20px 12px" }}>
          <div
            style={{
              width: 38,
              height: 38,
              borderRadius: 9,
              flexShrink: 0,
              border: `1px solid ${accent}40`,
              background: `${accent}10`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <svg width="19" height="19" viewBox="0 0 24 24" fill="none">
              <rect x="9" y="2" width="6" height="11" rx="3" stroke={accent} strokeWidth="1.8" />
              <path
                d="M5 11a7 7 0 0 0 14 0M12 18v3"
                stroke={accent}
                strokeWidth="1.8"
                strokeLinecap="round"
              />
              <path d="M4 3l16 18" stroke={accent} strokeWidth="1.8" strokeLinecap="round" />
            </svg>
          </div>
          <div style={{ paddingTop: 1 }}>
            <p
              className="font-[var(--font-pixel)]"
              style={{ fontSize: 7, color: accent, letterSpacing: "0.3em", marginBottom: 6 }}
            >
              {MIC_T.badge}
            </p>
            <p
              className="font-[var(--font-display)]"
              style={{ fontSize: 18, color: "#fff", lineHeight: 1.05, letterSpacing: "0.01em" }}
            >
              {MIC_T.title}
            </p>
          </div>
        </div>

        <div style={{ padding: "0 20px 4px" }}>
          <p
            className="font-[var(--font-mono)]"
            style={{ fontSize: 10.5, color: "rgba(168,168,188,0.6)", lineHeight: 1.55 }}
          >
            {MIC_T.body}
          </p>
          <div
            style={{
              marginTop: 12,
              padding: "10px 12px",
              borderRadius: 7,
              background: "rgba(255,255,255,0.025)",
              border: "1px solid rgba(255,255,255,0.06)",
            }}
          >
            <p
              className="font-[var(--font-mono)]"
              style={{
                fontSize: 8.5,
                color: accent,
                letterSpacing: "0.16em",
                textTransform: "uppercase",
                marginBottom: 5,
              }}
            >
              {MIC_T.hintTitle}
            </p>
            <p
              className="font-[var(--font-mono)]"
              style={{ fontSize: 9.5, color: "rgba(168,168,188,0.5)", lineHeight: 1.55 }}
            >
              {MIC_T.hint}
            </p>
          </div>
        </div>

        <div style={{ padding: "14px 20px 18px", display: "flex", alignItems: "center", gap: 10 }}>
          <button
            onClick={onRetry}
            className="font-[var(--font-pixel)] transition-all active:scale-[0.98]"
            style={{
              fontSize: 8,
              letterSpacing: "0.18em",
              padding: "12px 18px",
              paddingTop: 14,
              borderRadius: 6,
              border: `1px solid ${accent}50`,
              background: `${accent}12`,
              color: accent,
              cursor: "pointer",
              flex: 1,
              boxShadow: `0 0 22px ${accent}12, inset 0 1px 0 ${accent}18`,
            }}
          >
            {MIC_T.retry}
          </button>
          <button
            onClick={onKeyboard}
            className="font-[var(--font-mono)] transition-colors hover:text-white"
            style={{
              fontSize: 9.5,
              letterSpacing: "0.05em",
              color: "rgba(168,168,188,0.5)",
              background: "none",
              border: "none",
              cursor: "pointer",
              whiteSpace: "nowrap",
            }}
          >
            {MIC_T.keyboard}
          </button>
        </div>
      </div>
    </div>
  );
}
