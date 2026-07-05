const GREEN = "#20f040";

const pt = {
  badge: "ANTES DE COMEÇAR",
  title: "USE FONES DE OUVIDO",
  lead: "Este pedal processa seu microfone ao vivo. Sem fones, o som da caixa realimenta o mic e vira ruído. Com fones você toca no volume certo desde o primeiro acorde.",
  cta: "ESTOU DE FONE →",
};

const en = {
  badge: "BEFORE YOU START",
  title: "USE HEADPHONES",
  lead: "This pedal processes your mic live. Without headphones the speaker feeds back into the mic and turns to noise. On headphones it plays at the right level from the first chord.",
  cta: "I'M ON HEADPHONES →",
};

const T = navigator.language.toLowerCase().startsWith("pt") ? pt : en;

export default function WarningModal({ onDismiss }: { onDismiss: () => void }) {
  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center"
      style={{
        background: "rgba(2,4,3,0.55)",
        backdropFilter: "blur(8px)",
        WebkitBackdropFilter: "blur(8px)",
      }}
    >
      <div className="absolute inset-0 scanline opacity-[0.06] pointer-events-none" />

      <div
        className="relative flex flex-col items-center text-center mx-4"
        style={{
          maxWidth: 350,
          width: "100%",
          background: "linear-gradient(180deg, #08110b 0%, #050806 100%)",
          border: `1px solid ${GREEN}1f`,
          borderRadius: 16,
          overflow: "hidden",
          padding: "34px 28px 24px",
          boxShadow: `0 0 0 1px rgba(0,0,0,0.6), 0 44px 110px rgba(0,0,0,0.9), 0 0 90px ${GREEN}0d`,
        }}
      >
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            height: 2,
            background: `linear-gradient(90deg, transparent 8%, ${GREEN}bb 50%, transparent 92%)`,
          }}
        />

        <div
          style={{
            width: 62,
            height: 62,
            borderRadius: 18,
            marginBottom: 18,
            border: `1px solid ${GREEN}33`,
            background: `${GREEN}0f`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            boxShadow: `0 0 34px ${GREEN}14, inset 0 1px 0 rgba(255,255,255,0.05)`,
          }}
        >
          <IconHeadphones color={GREEN} />
        </div>

        <p
          className="font-[var(--font-pixel)]"
          style={{ fontSize: 8, color: GREEN, letterSpacing: "0.34em", marginBottom: 10 }}
        >
          {T.badge}
        </p>
        <p
          className="font-[var(--font-display)]"
          style={{ fontSize: 21, color: "#fff", lineHeight: 1.08, letterSpacing: "0.01em" }}
        >
          {T.title}
        </p>

        <p
          className="font-[var(--font-mono)]"
          style={{
            fontSize: 11,
            color: "rgba(178,190,182,0.62)",
            lineHeight: 1.6,
            marginTop: 12,
            maxWidth: 290,
          }}
        >
          {T.lead}
        </p>

        <button
          onClick={onDismiss}
          className="font-[var(--font-pixel)] active:scale-[0.98]"
          style={{
            marginTop: 24,
            fontSize: 9,
            letterSpacing: "0.2em",
            padding: "16px 24px 14px",
            borderRadius: 9,
            border: `1px solid ${GREEN}55`,
            background: `${GREEN}14`,
            color: GREEN,
            cursor: "pointer",
            width: "100%",
            boxShadow: `0 0 30px ${GREEN}18, inset 0 1px 0 ${GREEN}1c`,
          }}
        >
          {T.cta}
        </button>

        <p
          className="font-[var(--font-mono)]"
          style={{
            fontSize: 8,
            color: "rgba(168,180,172,0.22)",
            letterSpacing: "0.12em",
            marginTop: 16,
          }}
        >
          GHOST FX MK.I
        </p>
      </div>
    </div>
  );
}

function IconHeadphones({ color }: { color: string }) {
  return (
    <svg width="30" height="30" viewBox="0 0 24 24" fill="none" style={{ color }}>
      <path
        d="M3 18v-6a9 9 0 0 1 18 0v6"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
      <path
        d="M21 19a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3v5zM3 19a2 2 0 0 0 2 2h1a2 2 0 0 0 2-2v-3a2 2 0 0 0-2-2H3v5z"
        stroke="currentColor"
        strokeWidth="1.8"
      />
    </svg>
  );
}
