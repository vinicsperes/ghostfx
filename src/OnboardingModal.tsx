import GhostMark from "./GhostMark";

const GREEN = "#20f040";

const pt = {
  badge: "BEM-VINDO AO GHOSTFX",
  title: "UM PEDAL DE GUITARRA NO SEU NAVEGADOR",
  steps: [
    {
      label: "CONECTE A INTERFACE",
      body: "Ligue sua interface de áudio no computador. Sem interface? O microfone também serve pra experimentar.",
    },
    {
      label: "PLUGUE A GUITARRA",
      body: "Guitarra na entrada da interface. O sinal entra limpo e o pedal processa tudo ao vivo.",
    },
    {
      label: "USE FONES COM FIO",
      body: "Sem fones, a caixa realimenta o microfone e vira ruído. Com fones você toca no volume certo.",
    },
    {
      label: "PISE E TOQUE",
      body: "Aperte o footswitch, escolha um preset e toque. Zero install, tudo roda aqui mesmo.",
    },
  ],
  mobileTitle: "NO CELULAR?",
  mobileBody:
    "Explore os presets, gire os knobs e ouça tudo normalmente. Mas o GHOSTFX nasceu pra guitarra, e a experiência completa mora no desktop.",
  cta: "ESTOU DE FONE · COMEÇAR →",
};

const en = {
  badge: "WELCOME TO GHOSTFX",
  title: "A GUITAR PEDAL IN YOUR BROWSER",
  steps: [
    {
      label: "CONNECT YOUR INTERFACE",
      body: "Plug your audio interface into the computer. No interface? The mic works for a quick test drive.",
    },
    {
      label: "PLUG IN YOUR GUITAR",
      body: "Guitar into the interface input. The signal comes in clean and the pedal processes it live.",
    },
    {
      label: "WEAR WIRED HEADPHONES",
      body: "Without headphones the speaker feeds back into the mic and turns to noise. Headphones keep it clean.",
    },
    {
      label: "STOMP AND PLAY",
      body: "Hit the footswitch, pick a preset and play. Zero install, everything runs right here.",
    },
  ],
  mobileTitle: "ON YOUR PHONE?",
  mobileBody:
    "Browse the presets, tweak the knobs, hear it all. But GHOSTFX was born for guitar, and the full experience lives on desktop.",
  cta: "HEADPHONES ON · START →",
};

const T = navigator.language.toLowerCase().startsWith("pt") ? pt : en;

const ICONS = [IconInterface, IconJack, IconHeadphones, IconFootswitch];

export default function OnboardingModal({ onDismiss }: { onDismiss: () => void }) {
  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center"
      style={{
        background: "rgba(2,4,3,0.6)",
        backdropFilter: "blur(9px)",
        WebkitBackdropFilter: "blur(9px)",
      }}
    >
      <div className="absolute inset-0 scanline opacity-[0.06] pointer-events-none" />

      <div
        className="onboard-card relative flex flex-col mx-4"
        style={{
          maxWidth: 420,
          width: "100%",
          maxHeight: "92dvh",
          overflowY: "auto",
          background: "linear-gradient(180deg, #08110b 0%, #050806 100%)",
          border: `1px solid ${GREEN}1f`,
          borderRadius: 18,
          padding: "30px 30px 24px",
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

        <div className="flex items-center gap-3" style={{ marginBottom: 6 }}>
          <div
            style={{
              width: 46,
              height: 46,
              borderRadius: 13,
              flexShrink: 0,
              border: `1px solid ${GREEN}33`,
              background: `${GREEN}0f`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              boxShadow: `0 0 28px ${GREEN}14, inset 0 1px 0 rgba(255,255,255,0.05)`,
            }}
          >
            <GhostMark variant="solid" size={26} color="#e7e4dc" ledColor={GREEN} />
          </div>
          <div className="flex flex-col" style={{ gap: 5 }}>
            <p
              className="font-[var(--font-pixel)]"
              style={{ fontSize: 7.5, color: GREEN, letterSpacing: "0.32em" }}
            >
              {T.badge}
            </p>
            <p
              className="font-[var(--font-display)]"
              style={{ fontSize: 16.5, color: "#fff", lineHeight: 1.12, letterSpacing: "0.01em" }}
            >
              {T.title}
            </p>
          </div>
        </div>

        <div className="relative flex flex-col" style={{ marginTop: 18, gap: 14 }}>
          <div
            className="absolute overflow-hidden pointer-events-none"
            style={{ left: 17, top: 8, bottom: 8, width: 2 }}
          >
            <div
              style={{
                position: "absolute",
                inset: 0,
                background: `linear-gradient(180deg, ${GREEN}05, ${GREEN}2e 20%, ${GREEN}2e 80%, ${GREEN}05)`,
              }}
            />
            <div
              style={{
                position: "absolute",
                left: 0,
                width: "100%",
                height: 34,
                borderRadius: 2,
                background: `linear-gradient(180deg, transparent, ${GREEN}, transparent)`,
                animation: "onboard-signal 2.6s linear infinite",
              }}
            />
          </div>

          {T.steps.map((step, i) => {
            const Icon = ICONS[i];
            return (
              <div
                key={step.label}
                className="onboard-step relative flex items-start gap-3.5"
                style={{ animationDelay: `${180 + i * 110}ms` }}
              >
                <div
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: 10,
                    flexShrink: 0,
                    border: `1px solid ${GREEN}2e`,
                    background: "#060d08",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    boxShadow: `0 0 16px ${GREEN}10`,
                    position: "relative",
                    zIndex: 1,
                  }}
                >
                  <Icon color={GREEN} />
                </div>
                <div className="flex flex-col" style={{ gap: 4, paddingTop: 2 }}>
                  <div className="flex items-baseline gap-2">
                    <span
                      className="font-[var(--font-pixel)]"
                      style={{ fontSize: 7, color: `${GREEN}88`, letterSpacing: "0.1em" }}
                    >
                      {String(i + 1).padStart(2, "0")}
                    </span>
                    <span
                      className="font-[var(--font-pixel)]"
                      style={{ fontSize: 8.5, color: "#e9ece9", letterSpacing: "0.18em" }}
                    >
                      {step.label}
                    </span>
                  </div>
                  <p
                    className="font-[var(--font-mono)]"
                    style={{ fontSize: 10.5, color: "rgba(178,190,182,0.6)", lineHeight: 1.55 }}
                  >
                    {step.body}
                  </p>
                </div>
              </div>
            );
          })}
        </div>

        <div
          className="onboard-step"
          style={{
            animationDelay: "640ms",
            marginTop: 18,
            padding: "12px 14px",
            borderRadius: 11,
            border: "1px dashed rgba(178,190,182,0.22)",
            background: "rgba(255,255,255,0.02)",
          }}
        >
          <div className="flex items-center" style={{ gap: 8, marginBottom: 7 }}>
            <IconPhone color="rgba(178,190,182,0.7)" />
            <p
              className="font-[var(--font-pixel)]"
              style={{
                fontSize: 7,
                color: "rgba(178,190,182,0.55)",
                letterSpacing: "0.24em",
              }}
            >
              {T.mobileTitle}
            </p>
          </div>
          <p
            className="font-[var(--font-mono)]"
            style={{ fontSize: 10, color: "rgba(178,190,182,0.5)", lineHeight: 1.55 }}
          >
            {T.mobileBody}
          </p>
        </div>

        <button
          onClick={onDismiss}
          className="onboard-step font-[var(--font-pixel)] active:scale-[0.98]"
          style={{
            animationDelay: "760ms",
            marginTop: 18,
            fontSize: 9,
            letterSpacing: "0.2em",
            padding: "16px 24px 14px",
            borderRadius: 10,
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
          className="font-[var(--font-mono)] text-center"
          style={{
            fontSize: 8,
            color: "rgba(168,180,172,0.22)",
            letterSpacing: "0.12em",
            marginTop: 14,
          }}
        >
          GHOST FX MK.I · OPEN SOURCE
        </p>
      </div>
    </div>
  );
}

function IconInterface({ color }: { color: string }) {
  return (
    <svg width="19" height="19" viewBox="0 0 24 24" fill="none" style={{ color }}>
      <rect x="2.5" y="7" width="19" height="10" rx="2" stroke="currentColor" strokeWidth="1.7" />
      <circle cx="8" cy="12" r="2.1" stroke="currentColor" strokeWidth="1.6" />
      <circle cx="15.5" cy="12" r="1.1" fill="currentColor" />
      <path d="M18.5 10.9v2.2" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

function IconJack({ color }: { color: string }) {
  return (
    <svg width="19" height="19" viewBox="0 0 24 24" fill="none" style={{ color }}>
      <path
        d="M13.5 10.5 20 4M13 15l-4.2 4.2a2.4 2.4 0 0 1-3.4 0l-.6-.6a2.4 2.4 0 0 1 0-3.4L9 11"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
      />
      <path
        d="m8.5 10.5 5 5 2.8-2.8a1.8 1.8 0 0 0 0-2.6l-2.4-2.4a1.8 1.8 0 0 0-2.6 0L8.5 10.5z"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function IconHeadphones({ color }: { color: string }) {
  return (
    <svg width="19" height="19" viewBox="0 0 24 24" fill="none" style={{ color }}>
      <path
        d="M4 18v-6a8 8 0 0 1 16 0v6"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
      />
      <path
        d="M20 19a1.8 1.8 0 0 1-1.8 1.8H17.5a1.8 1.8 0 0 1-1.8-1.8v-2.6a1.8 1.8 0 0 1 1.8-1.8H20V19zM4 19a1.8 1.8 0 0 0 1.8 1.8h.7a1.8 1.8 0 0 0 1.8-1.8v-2.6a1.8 1.8 0 0 0-1.8-1.8H4V19z"
        stroke="currentColor"
        strokeWidth="1.7"
      />
    </svg>
  );
}

function IconPhone({ color }: { color: string }) {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" style={{ color, flexShrink: 0 }}>
      <rect
        x="6.5"
        y="2.5"
        width="11"
        height="19"
        rx="2.5"
        stroke="currentColor"
        strokeWidth="1.7"
      />
      <path d="M10.5 5.5h3" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      <circle cx="12" cy="17.8" r="1.1" fill="currentColor" />
    </svg>
  );
}

function IconFootswitch({ color }: { color: string }) {
  return (
    <svg width="19" height="19" viewBox="0 0 24 24" fill="none" style={{ color }}>
      <circle cx="12" cy="12" r="8.5" stroke="currentColor" strokeWidth="1.7" />
      <circle cx="12" cy="12" r="3.4" stroke="currentColor" strokeWidth="1.6" />
      <circle cx="12" cy="12" r="1.1" fill="currentColor" />
    </svg>
  );
}
