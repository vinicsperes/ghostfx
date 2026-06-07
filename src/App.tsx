import { useCallback, useEffect, useRef, useState } from "react";
import { useEffects } from "./hooks/useEffects";
import { useTuner } from "./hooks/useTuner";
import { useSynth, NOTE_KEYS } from "./hooks/useSynth";
import Pedal3D from "./Pedal3D";
import LoadingScreen from "./LoadingScreen";
import WarningModal from "./WarningModal";

const PRESETS = [
  { name: "CLEAN",   drive: 0.06, echo: 0.12, tone: 0.70, reverb: 0.30, master: 0.80 },
  { name: "CRUNCH",  drive: 0.42, echo: 0.18, tone: 0.52, reverb: 0.16, master: 0.78 },
  { name: "HEAVY",   drive: 0.85, echo: 0.08, tone: 0.40, reverb: 0.10, master: 0.82 },
  { name: "FRUS",    drive: 0.04, echo: 0.30, tone: 0.85, reverb: 0.72, master: 0.82 },
  { name: "GHOST",   drive: 0.55, echo: 0.48, tone: 0.50, reverb: 0.58, master: 0.76 },
] as const;

function readUrlParams() {
  const p = new URLSearchParams(window.location.search);
  return {
    drive:  parseFloat(p.get("d") ?? "0.50"),
    echo:   parseFloat(p.get("e") ?? "0.45"),
    tone:   parseFloat(p.get("t") ?? "0.50"),
    reverb: parseFloat(p.get("r") ?? "0.60"),
    master: parseFloat(p.get("m") ?? "0.75"),
  };
}

function hexToRgb(h: string): [number, number, number] {
  return [parseInt(h.slice(1,3),16), parseInt(h.slice(3,5),16), parseInt(h.slice(5,7),16)];
}
function lerpHex(a: string, b: string, t: number): string {
  const [r1,g1,b1] = hexToRgb(a), [r2,g2,b2] = hexToRgb(b);
  return '#'+[r1+(r2-r1)*t,g1+(g2-g1)*t,b1+(b2-b1)*t].map(v=>Math.round(v).toString(16).padStart(2,'0')).join('');
}

const PALETTE = {
  bg: "#030308",
  pedal: "#1a1a1c",
  ink: "#e0e0ec",
  accent: "#20f040",
  cream: "#a8a8bc",
  metal: "#505060",
};

export default function App() {
  const [warningDone, setWarningDone] = useState(false);
  const [micDismissed, setMicDismissed] = useState(false);
  const [panelOpen, setPanelOpen] = useState(false);
  const [keyboardMode, setKeyboardMode] = useState(false);
  const [stompCount, setStompCount] = useState(0);
  const [presetIdx, setPresetIdx] = useState<number | null>(4);
  const presetIdxRef = useRef<number | null>(4);
  useEffect(() => { presetIdxRef.current = presetIdx; }, [presetIdx]);
  const [audioLevel, setAudioLevel] = useState(0);
  const init = readUrlParams();
  const [drive, setDrive] = useState(init.drive);
  const [echo, setEcho] = useState(init.echo);
  const [tone, setTone] = useState(init.tone);
  const [reverb, setReverb] = useState(init.reverb);
  const [masterVolume, setMasterVolume] = useState(init.master);

  useEffect(() => {
    const p = new URLSearchParams();
    p.set("d", drive.toFixed(2));
    p.set("e", echo.toFixed(2));
    p.set("t", tone.toFixed(2));
    p.set("r", reverb.toFixed(2));
    p.set("m", masterVolume.toFixed(2));
    window.history.replaceState({}, "", `?${p}`);
  }, [drive, echo, tone, reverb, masterVolume]);

  const applyPreset = useCallback((preset: typeof PRESETS[number]) => {
    setDrive(preset.drive);
    setEcho(preset.echo);
    setTone(preset.tone);
    setReverb(preset.reverb);
    setMasterVolume(preset.master);
  }, []);

  const handlePresetSelect = useCallback((idx: number) => {
    const i = ((idx % PRESETS.length) + PRESETS.length) % PRESETS.length;
    if (i === presetIdxRef.current) return;
    setPresetIdx(i);
    applyPreset(PRESETS[i]);
  }, [applyPreset]);

  const fx = useEffects({ drive, echo, tone, reverb, masterVolume });
  useEffect(() => { if (!fx.micBlocked) setMicDismissed(false); }, [fx.micBlocked]);
  const tuner = useTuner();
  const synth = useSynth({ drive, echo, tone, reverb, masterVolume });

  useEffect(() => {
    if (!keyboardMode) return;
    const onDown = (e: KeyboardEvent) => {
      if (e.repeat || e.ctrlKey || e.metaKey || e.altKey) return;
      if ((e.target as HTMLElement).tagName === "INPUT") return;
      const entry = NOTE_KEYS[e.key.toLowerCase()];
      if (entry) synth.playNote(e.key.toLowerCase(), entry.freq);
    };
    const onUp = (e: KeyboardEvent) => {
      const entry = NOTE_KEYS[e.key.toLowerCase()];
      if (entry) synth.stopNote(e.key.toLowerCase());
    };
    window.addEventListener("keydown", onDown);
    window.addEventListener("keyup", onUp);
    return () => {
      window.removeEventListener("keydown", onDown);
      window.removeEventListener("keyup", onUp);
    };
  }, [keyboardMode, synth.playNote, synth.stopNote]);

  const getLevelRef = useRef(fx.getLevel);
  const getWaveformRef = useRef(fx.getWaveform);
  useEffect(() => { getLevelRef.current = fx.getLevel; getWaveformRef.current = fx.getWaveform; }, [fx.getLevel, fx.getWaveform]);
  useEffect(() => {
    let id: number;
    const poll = () => { setAudioLevel(getLevelRef.current()); id = requestAnimationFrame(poll); };
    id = requestAnimationFrame(poll);
    return () => cancelAnimationFrame(id);
  }, []);

  const handleTap = useCallback(() => {
    fx.toggle();
    setStompCount(c => c + 1);
  }, [fx]);

  const isActive = fx.state === "active";
  const themeTarget = presetIdx !== null ? PRESET_META[presetIdx].color : "#20f040";
  const liveColorRef = useRef<string>(themeTarget);
  const colorAnimRaf = useRef(0);
  const [themeColor, setThemeColor] = useState<string>(themeTarget);
  const ledColor = isActive ? "#f53e3e" : themeColor;

  useEffect(() => {
    cancelAnimationFrame(colorAnimRaf.current);
    const from = liveColorRef.current;
    const to = themeTarget;
    let t0: number | null = null;
    const DURATION = 450;
    const tick = (now: number) => {
      if (t0 === null) t0 = now;
      const p = Math.min(1, (now - t0) / DURATION);
      const e = p < 0.5 ? 2*p*p : -1+(4-2*p)*p;
      const c = lerpHex(from, to, e);
      liveColorRef.current = c;
      setThemeColor(c);
      if (p < 1) colorAnimRaf.current = requestAnimationFrame(tick);
    };
    colorAnimRaf.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(colorAnimRaf.current);
  }, [themeTarget]);

  const handleKnobChange = useCallback(
    (knob: "drive" | "echo" | "tone" | "reverb" | "master", value: number) => {
      if (knob === "drive") setDrive(value);
      else if (knob === "echo") setEcho(value);
      else if (knob === "tone") setTone(value);
      else if (knob === "reverb") setReverb(value);
      else setMasterVolume(value);
    },
    [],
  );

  return (
    <div className="h-screen w-full overflow-hidden relative" style={{ background: PALETTE.bg }}>
      <LoadingScreen />
      {!warningDone && <WarningModal onDismiss={() => setWarningDone(true)} />}

      <PresetBg presetIdx={presetIdx} />

      {drive > 0.45 && (
        <div
          className="absolute inset-0 pointer-events-none z-[5]"
          style={{
            boxShadow: `inset 0 0 140px rgba(245,62,62,${(Math.max(0, drive - 0.45) / 0.55) * (isActive ? 0.35 : 0.12)})`,
            transition: "box-shadow 300ms ease",
          }}
        />
      )}

      {panelOpen && (
        <div className="lg:hidden fixed inset-0 z-[20] bg-black/60" onClick={() => setPanelOpen(false)} />
      )}

      {!panelOpen && (
        <div
          className="lg:hidden fixed z-[30] flex items-center gap-2 pointer-events-auto"
          style={{ top: "max(16px, env(safe-area-inset-top, 16px))", left: 16 }}
        >
          <button
            className="flex items-center justify-center transition-all active:scale-90"
            style={{ width: 40, height: 40, borderRadius: 8, background: "rgba(3,3,8,0.92)", border: `1px solid ${themeColor}30`, color: themeColor }}
            onClick={() => setPanelOpen(true)}
          >
            <svg width="18" height="14" viewBox="0 0 18 14" fill="none">
              <rect width="18" height="2" rx="1" fill="currentColor"/>
              <rect y="6" width="18" height="2" rx="1" fill="currentColor"/>
              <rect y="12" width="18" height="2" rx="1" fill="currentColor"/>
            </svg>
          </button>

          <div
            className="flex items-center gap-1.5"
            style={{
              padding: "6px 10px",
              borderRadius: 6,
              background: "rgba(3,3,8,0.92)",
              border: `1px solid ${themeColor}30`,
            }}
          >
            <div
              className="rounded-full shrink-0"
              style={{ width: 6, height: 6, background: themeColor, boxShadow: `0 0 6px ${themeColor}` }}
            />
            <span
              className="font-[var(--font-pixel)]"
              style={{ fontSize: 8, color: themeColor, letterSpacing: "0.15em" }}
            >
              {presetIdx !== null ? PRESETS[presetIdx].name : "GHOST FX"}
            </span>
          </div>
        </div>
      )}

      <BottomBar
        presets={PRESETS}
        activePresetIdx={presetIdx}
        onPresetSelect={handlePresetSelect}
        accent={themeColor}
        getWaveform={getWaveformRef}
      />

      <div className="absolute inset-0 w-full h-full z-[2]">
        <Pedal3D
          ledColor={ledColor}
          isPlaying={isActive}
          onTap={handleTap}
          knobDrive={drive}
          knobEcho={echo}
          knobTone={tone}
          knobReverb={reverb}
          knobMaster={masterVolume}
          onKnobChange={handleKnobChange}
          palette={{ ...PALETTE, accent: themeColor, pedal: presetIdx !== null ? PRESET_META[presetIdx].chassis : PALETTE.pedal }}
          presetIdx={presetIdx}
          stompCount={stompCount}
        />
      </div>

      <aside
        className={`hud-scroll fixed left-0 top-0 h-full z-[25] select-none flex flex-col transition-transform duration-300 ease-out lg:translate-x-0 ${panelOpen ? "translate-x-0" : "-translate-x-full"}`}
        style={{
          width: "clamp(260px, 85vw, 380px)",
          background: "linear-gradient(100deg, rgba(3,3,8,0.99) 70%, rgba(3,3,8,0) 100%)",
          padding: "clamp(20px,2.5vw,36px) clamp(16px,2vw,28px)",
          gap: "clamp(18px,2.5vh,36px)",
          pointerEvents: keyboardMode || panelOpen ? "auto" : "none",
          overflowY: keyboardMode || panelOpen ? "auto" : "visible",
        }}
      >

        <button
          className="lg:hidden absolute top-4 right-4 pointer-events-auto font-[var(--font-mono)] text-lg transition-colors hover:text-white"
          style={{ color: "rgba(255,255,255,0.3)", background: "none", border: "none", cursor: "pointer" }}
          onClick={() => setPanelOpen(false)}
        >✕</button>

        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-2.5">
            <img
              src="/ghost.svg"
              alt=""
              style={{ width: 28, height: 28, filter: "invert(1) brightness(2)", opacity: 1 }}
            />
            <span
              className="font-[var(--font-display)] tracking-wide"
              style={{ fontSize: 20, color: "#ffffff", lineHeight: 1 }}
            >
              GHOST FX
            </span>
          </div>
          <div className="flex items-center gap-2">
            <div
              className="w-1.5 h-1.5 rounded-full shrink-0"
              style={{ background: themeColor, boxShadow: `0 0 6px ${themeColor}` }}
            />
            <span
              className="font-[var(--font-mono)] uppercase tracking-[0.22em]"
              style={{ fontSize: 10, color: themeColor }}
            >
              Signal Processor MK.I
            </span>
          </div>
        </div>

        <div style={{ height: 1, background: `linear-gradient(to right, ${themeColor}40, transparent)` }} />

        <div className="flex flex-col" style={{ gap: 0 }}>
          <span
            className="font-[var(--font-display)] uppercase"
            style={{
              fontSize: "clamp(28px, 3.2vw, 52px)",
              color: "#ffffff",
              letterSpacing: "-0.01em",
              lineHeight: 1,
              whiteSpace: "nowrap",
            }}
          >
            ONE PEDAL.
          </span>
          <span
            style={{
              fontSize: "clamp(30px, 3.5vw, 56px)",
              color: themeColor,
              fontFamily: '"Rock 3D", system-ui',
              fontWeight: 400,
              letterSpacing: "0.04em",
              lineHeight: 1.15,
              whiteSpace: "nowrap",
              textShadow: `0 0 24px ${themeColor}66, 0 0 48px ${themeColor}22`,
            }}
          >
            {presetIdx !== null ? PRESET_META[presetIdx].word : "HAUNTED"}
          </span>
          <span
            className="font-[var(--font-serif)] italic"
            style={{
              fontSize: "clamp(32px, 3.8vw, 60px)",
              color: "#ffffff",
              opacity: 0.82,
              letterSpacing: "-0.02em",
              lineHeight: 1.05,
            }}
          >
            tones.
          </span>
          <p
            className="font-[var(--font-mono)] leading-relaxed"
            style={{ fontSize: 11, color: "#aaaac4", marginTop: 14 }}
          >
            Browser-based guitar FX — drive, echo,<br />
            tone &amp; reverb. Zero install.
          </p>
        </div>

        {keyboardMode && (
          <div className="flex flex-col" style={{ gap: 7 }}>
            <div className="flex items-center gap-2">
              <div style={{ width: 8, height: 1, background: themeColor }} />
              <span className="font-[var(--font-mono)] uppercase tracking-[0.35em]" style={{ fontSize: 9, color: themeColor }}>
                Teclado
              </span>
              <div style={{ flex: 1, height: 1, background: `${themeColor}30` }} />
            </div>
            <KeyboardDisplay activeKeys={synth.activeKeys} accent={themeColor} />
          </div>
        )}

        <div className="flex flex-col" style={{ gap: 10 }}>

          <div className="flex items-center gap-2">
            <div style={{ width: 8, height: 1, background: themeColor }} />
            <span
              className="font-[var(--font-mono)] uppercase tracking-[0.35em]"
              style={{ fontSize: 9, color: themeColor }}
            >
              Signal
            </span>
            <div style={{ flex: 1, height: 1, background: `${themeColor}30` }} />
          </div>

          <VUMeter label="DRIVE"  value={drive}        accent={themeColor} />
          <VUMeter label="ECHO"   value={echo}         accent={themeColor} />
          <VUMeter label="TONE"   value={tone}         accent={themeColor} />
          <VUMeter label="REVERB" value={reverb}       accent={themeColor} />
          <VUMeter label="VOLUME" value={masterVolume} accent={themeColor} highlight liveLevel={isActive ? audioLevel : undefined} />
        </div>

        <div className="flex flex-col pointer-events-auto" style={{ gap: 8 }}>
          <div className="flex items-center gap-2">
            <div style={{ width: 8, height: 1, background: themeColor }} />
            <span className="font-[var(--font-mono)] uppercase tracking-[0.35em]" style={{ fontSize: 9, color: themeColor }}>Tools</span>
            <div style={{ flex: 1, height: 1, background: `${themeColor}30` }} />
          </div>
          <button
            onClick={() => setKeyboardMode(v => !v)}
            className="flex items-center justify-center gap-3 transition-all active:scale-95"
            style={{
              width: "100%", height: 48, borderRadius: 7, cursor: "pointer",
              border: `1px solid ${keyboardMode ? themeColor + "60" : "rgba(255,255,255,0.08)"}`,
              background: keyboardMode ? `${themeColor}10` : "rgba(255,255,255,0.02)",
              color: keyboardMode ? themeColor : "rgba(255,255,255,0.35)",
              transition: "all 180ms ease",
              boxShadow: keyboardMode ? `0 0 14px ${themeColor}20` : "none",
            }}
            onMouseEnter={e => { if (!keyboardMode) { e.currentTarget.style.borderColor = `${themeColor}40`; e.currentTarget.style.color = `${themeColor}cc`; e.currentTarget.style.background = `${themeColor}08`; } }}
            onMouseLeave={e => { if (!keyboardMode) { e.currentTarget.style.borderColor = "rgba(255,255,255,0.08)"; e.currentTarget.style.color = "rgba(255,255,255,0.35)"; e.currentTarget.style.background = "rgba(255,255,255,0.02)"; } }}
          >
            <svg width="24" height="18" viewBox="0 0 22 16" fill="none">
              <rect x="0.7" y="0.7" width="20.6" height="14.6" rx="1.5" stroke="currentColor" strokeWidth="1.3"/>
              <line x1="4.5" y1="0.7" x2="4.5" y2="15.3" stroke="currentColor" strokeWidth="1"/>
              <line x1="8.8" y1="0.7" x2="8.8" y2="15.3" stroke="currentColor" strokeWidth="1"/>
              <line x1="13.2" y1="0.7" x2="13.2" y2="15.3" stroke="currentColor" strokeWidth="1"/>
              <line x1="17.5" y1="0.7" x2="17.5" y2="15.3" stroke="currentColor" strokeWidth="1"/>
              <rect x="2.7" y="0.7" width="3.6" height="9.2" rx="0.8" fill="currentColor"/>
              <rect x="11.4" y="0.7" width="3.6" height="9.2" rx="0.8" fill="currentColor"/>
              <rect x="15.7" y="0.7" width="3.6" height="9.2" rx="0.8" fill="currentColor"/>
            </svg>
            <span className="font-[var(--font-mono)]" style={{ fontSize: 10, letterSpacing: "0.12em" }}>KEYBOARD SYNTH</span>
          </button>
        </div>

        <div className="flex flex-col pointer-events-auto" style={{ gap: 8 }}>
          <div className="flex items-center gap-2">
            <div style={{ width: 8, height: 1, background: themeColor }} />
            <span className="font-[var(--font-mono)] uppercase tracking-[0.35em]" style={{ fontSize: 9, color: themeColor }}>Tuner</span>
            <div style={{ flex: 1, height: 1, background: `${themeColor}30` }} />
          </div>

          {tuner.active ? (
            <div
              className="flex items-center justify-between"
              style={{ padding: "10px 14px", borderRadius: 7, background: "rgba(0,0,0,0.3)", border: `1px solid ${themeColor}20` }}
            >
              <span className="font-[var(--font-display)]" style={{
                fontSize: 28, lineHeight: 1,
                color: Math.abs(tuner.cents) < 10 ? themeColor : "#f7c94e",
                transition: "color 200ms",
                textShadow: Math.abs(tuner.cents) < 10 ? `0 0 16px ${themeColor}88` : "0 0 16px rgba(247,201,78,0.5)",
              }}>
                {tuner.note}
              </span>
              <div className="flex flex-col items-end gap-2">
                <div style={{ display: "flex", alignItems: "flex-end", gap: 2 }}>
                  {Array.from({ length: 9 }).map((_, i) => {
                    const pos = i - 4;
                    const threshold = pos * 12.5;
                    const lit = (tuner.cents > 0 && threshold > 0 && threshold <= tuner.cents) || (tuner.cents < 0 && threshold < 0 && threshold >= tuner.cents);
                    const isCenter = i === 4;
                    const inTune = isCenter && Math.abs(tuner.cents) < 10;
                    return (
                      <div key={i} style={{
                        width: isCenter ? 3 : 2,
                        height: isCenter ? 14 : 8 - Math.abs(pos) * 0.5,
                        borderRadius: 1,
                        background: inTune ? themeColor : lit ? "rgba(247,201,78,0.7)" : "rgba(255,255,255,0.07)",
                        transition: "background 80ms",
                        boxShadow: inTune ? `0 0 6px ${themeColor}` : "none",
                      }} />
                    );
                  })}
                </div>
                <button
                  onClick={tuner.toggle}
                  className="font-[var(--font-mono)] transition-all hover:opacity-60"
                  style={{ fontSize: 7, color: "rgba(255,255,255,0.3)", background: "none", border: "none", cursor: "pointer", letterSpacing: "0.1em" }}
                >
                  CLOSE
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={tuner.toggle}
              className="flex items-center justify-center gap-2 transition-all active:scale-95"
              style={{
                width: "100%", height: 40, borderRadius: 7, cursor: "pointer",
                border: "1px solid rgba(255,255,255,0.08)", background: "rgba(255,255,255,0.02)",
                color: "rgba(255,255,255,0.35)", transition: "all 180ms ease",
              }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.2)"; e.currentTarget.style.color = "rgba(255,255,255,0.7)"; e.currentTarget.style.background = "rgba(255,255,255,0.05)"; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.08)"; e.currentTarget.style.color = "rgba(255,255,255,0.35)"; e.currentTarget.style.background = "rgba(255,255,255,0.02)"; }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                <path d="M9 18V5l12-2v13" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                <circle cx="6" cy="18" r="3" stroke="currentColor" strokeWidth="1.8"/>
                <circle cx="18" cy="16" r="3" stroke="currentColor" strokeWidth="1.8"/>
              </svg>
              <span className="font-[var(--font-mono)]" style={{ fontSize: 9, letterSpacing: "0.12em" }}>TUNER</span>
            </button>
          )}
        </div>

        <div style={{ flex: 1 }} />

        <div className="flex items-center" style={{ gap: 8 }}>
          <div
            className={isActive ? "animate-pulse" : ""}
            style={{ width: 7, height: 7, borderRadius: "50%", background: ledColor, boxShadow: `0 0 8px ${ledColor}`, flexShrink: 0 }}
          />
          <span className="font-[var(--font-mono)]" style={{ fontSize: 9, color: "rgba(188,188,210,0.62)", letterSpacing: "0.08em" }}>
            {isActive ? "ACTIVE · L=DRY R=FX" : fx.ready ? "READY · STOMP TO ARM" : "IDLE"}
          </span>
        </div>
      </aside>

      {fx.error && (
        <div className="absolute inset-x-0 bottom-24 flex justify-center z-20 pointer-events-none">
          <div className="px-4 py-2 rounded font-[var(--font-mono)]" style={{ fontSize: 10, background: "#1a0000", color: "#ff6b6b", opacity: 0.9 }}>
            {fx.error}
          </div>
        </div>
      )}

      {fx.micBlocked && !micDismissed && (
        <MicBlockedModal
          accent={themeColor}
          onRetry={() => fx.toggle()}
          onKeyboard={() => { setMicDismissed(true); setKeyboardMode(true); setPanelOpen(true); }}
          onDismiss={() => setMicDismissed(true)}
        />
      )}

      <a
        href="https://github.com/vinicsperes"
        target="_blank"
        rel="noopener noreferrer"
        className="fixed bottom-3 right-4 z-[50] pointer-events-auto font-[var(--font-mono)] transition-opacity hover:opacity-80"
        style={{ fontSize: 9, color: "rgba(255,255,255,0.18)", letterSpacing: "0.05em", textDecoration: "none" }}
      >
        made with ♥ vinicsperes
      </a>
    </div>
  );
}

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

function MicBlockedModal({
  accent, onRetry, onKeyboard, onDismiss,
}: {
  accent: string;
  onRetry: () => void;
  onKeyboard: () => void;
  onDismiss: () => void;
}) {
  return (
    <div className="fixed z-[120] pointer-events-none flex justify-center" style={{ left: 0, right: 0, bottom: 76, padding: "0 16px" }}>
      <div
        className="pointer-events-auto relative flex flex-col mic-card-in"
        style={{
          maxWidth: 380, width: "100%", background: "rgba(7,6,14,0.97)", backdropFilter: "blur(6px)",
          border: `1px solid ${accent}30`, borderRadius: 11, overflow: "hidden",
          boxShadow: `0 0 0 1px ${accent}10, 0 18px 50px rgba(0,0,0,0.7), 0 0 50px ${accent}0a`,
        }}
      >
        <div style={{ height: 2, background: `linear-gradient(90deg, transparent 5%, ${accent}cc 40%, ${accent}cc 60%, transparent 95%)` }} />

        <button
          onClick={onDismiss}
          className="absolute top-2.5 right-3.5 font-[var(--font-mono)] transition-colors hover:text-white"
          style={{ fontSize: 15, color: "rgba(255,255,255,0.25)", background: "none", border: "none", cursor: "pointer", zIndex: 1 }}
        >✕</button>

        <div className="flex items-start gap-3" style={{ padding: "18px 20px 12px" }}>
          <div style={{ width: 38, height: 38, borderRadius: 9, flexShrink: 0, border: `1px solid ${accent}40`, background: `${accent}10`, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <svg width="19" height="19" viewBox="0 0 24 24" fill="none">
              <rect x="9" y="2" width="6" height="11" rx="3" stroke={accent} strokeWidth="1.8" />
              <path d="M5 11a7 7 0 0 0 14 0M12 18v3" stroke={accent} strokeWidth="1.8" strokeLinecap="round" />
              <path d="M4 3l16 18" stroke={accent} strokeWidth="1.8" strokeLinecap="round" />
            </svg>
          </div>
          <div style={{ paddingTop: 1 }}>
            <p className="font-[var(--font-pixel)]" style={{ fontSize: 7, color: accent, letterSpacing: "0.3em", marginBottom: 6 }}>{MIC_T.badge}</p>
            <p className="font-[var(--font-display)]" style={{ fontSize: 18, color: "#fff", lineHeight: 1.05, letterSpacing: "0.01em" }}>{MIC_T.title}</p>
          </div>
        </div>

        <div style={{ padding: "0 20px 4px" }}>
          <p className="font-[var(--font-mono)]" style={{ fontSize: 10.5, color: "rgba(168,168,188,0.6)", lineHeight: 1.55 }}>{MIC_T.body}</p>
          <div style={{ marginTop: 12, padding: "10px 12px", borderRadius: 7, background: "rgba(255,255,255,0.025)", border: "1px solid rgba(255,255,255,0.06)" }}>
            <p className="font-[var(--font-mono)]" style={{ fontSize: 8.5, color: accent, letterSpacing: "0.16em", textTransform: "uppercase", marginBottom: 5 }}>{MIC_T.hintTitle}</p>
            <p className="font-[var(--font-mono)]" style={{ fontSize: 9.5, color: "rgba(168,168,188,0.5)", lineHeight: 1.55 }}>{MIC_T.hint}</p>
          </div>
        </div>

        <div style={{ padding: "14px 20px 18px", display: "flex", alignItems: "center", gap: 10 }}>
          <button
            onClick={onRetry}
            className="font-[var(--font-pixel)] transition-all active:scale-[0.98]"
            style={{
              fontSize: 8, letterSpacing: "0.18em", padding: "12px 18px", paddingTop: 14, borderRadius: 6,
              border: `1px solid ${accent}50`, background: `${accent}12`, color: accent, cursor: "pointer",
              flex: 1, boxShadow: `0 0 22px ${accent}12, inset 0 1px 0 ${accent}18`,
            }}
          >{MIC_T.retry}</button>
          <button
            onClick={onKeyboard}
            className="font-[var(--font-mono)] transition-colors hover:text-white"
            style={{ fontSize: 9.5, letterSpacing: "0.05em", color: "rgba(168,168,188,0.5)", background: "none", border: "none", cursor: "pointer", whiteSpace: "nowrap" }}
          >{MIC_T.keyboard}</button>
        </div>
      </div>
    </div>
  );
}

const PRESET_META = [
  { color: "#48cae4", word: "CRYSTAL", chassis: "#020610" },
  { color: "#f77f00", word: "GRIMY",   chassis: "#0c0602" },
  { color: "#e02828", word: "HOLLOW",  chassis: "#0a0202" },
  { color: "#c8a832", word: "FALCON",  chassis: "#080700" },
  { color: "#20f040", word: "HAUNTED", chassis: "#0a0a10" },
] as const;

function BottomBar({
  presets, activePresetIdx, onPresetSelect, accent, getWaveform,
}: {
  presets: typeof PRESETS;
  activePresetIdx: number | null;
  onPresetSelect: (i: number) => void;
  accent: string;
  getWaveform: { current: (() => Float32Array) | null };
}) {
  const activeMeta = activePresetIdx !== null ? PRESET_META[activePresetIdx] : null;
  const presetColor = activeMeta?.color ?? accent;
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number>(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const c = canvas.getContext("2d");
    if (!c) return;
    const draw = () => {
      const W = canvas.width, H = canvas.height;
      c.clearRect(0, 0, W, H);
      c.beginPath(); c.moveTo(0, H / 2); c.lineTo(W, H / 2);
      c.strokeStyle = "rgba(255,255,255,0.05)"; c.lineWidth = 1; c.stroke();
      const wf = getWaveform.current?.();
      if (wf && wf.length > 0) {
        c.beginPath();
        const step = W / wf.length;
        for (let i = 0; i < wf.length; i++) {
          const x = i * step, y = (0.5 - wf[i] * 0.42) * H;
          if (i === 0) c.moveTo(x, y); else c.lineTo(x, y);
        }
        c.strokeStyle = presetColor; c.lineWidth = 1.5;
        c.shadowColor = presetColor; c.shadowBlur = 4; c.stroke(); c.shadowBlur = 0;
      }
      rafRef.current = requestAnimationFrame(draw);
    };
    rafRef.current = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(rafRef.current);
  }, [getWaveform, presetColor]);

  return (
    <div
      className="fixed z-[40] pointer-events-auto"
      style={{
        bottom: 12,
        left: "50%",
        transform: "translateX(-50%)",
        width: "min(520px, calc(100vw - 24px))",
        borderRadius: 8,
        background: "rgba(3,3,8,0.97)",
        border: `1px solid rgba(255,255,255,0.09)`,
        boxShadow: `0 0 0 1px ${presetColor}08, 0 8px 40px rgba(0,0,0,0.7)`,
        transition: "box-shadow 400ms",
        overflow: "hidden",
      }}
    >

      <div style={{ display: "flex", alignItems: "stretch", height: 44 }}>

        <div style={{ display: "flex", alignItems: "center", padding: "0 6px", flexShrink: 0, borderRight: "1px solid rgba(255,255,255,0.06)" }}>
          <div style={{ display: "flex", gap: 2 }}>
            {presets.map((p, i) => {
              const meta = PRESET_META[i];
              const isActive = activePresetIdx === i;
              return (
                <button
                  key={i}
                  onClick={() => onPresetSelect(i)}
                  style={{
                    padding: "0 14px", height: 36, position: "relative",
                    border: `1px solid ${isActive ? meta.color + "30" : "rgba(255,255,255,0.05)"}`,
                    borderRadius: 4,
                    background: isActive
                      ? `linear-gradient(160deg, ${meta.color}18 0%, ${meta.color}08 100%)`
                      : "rgba(8,8,12,0.7)",
                    boxShadow: isActive ? `inset 0 0 18px ${meta.color}14, 0 0 10px ${meta.color}18` : "none",
                    cursor: "pointer",
                    transition: "background 550ms ease, border-color 550ms ease, box-shadow 550ms ease",
                  }}
                  onMouseEnter={e => {
                    if (isActive) return;
                    const b = e.currentTarget;
                    b.style.background = `linear-gradient(160deg, ${meta.color}14 0%, ${meta.color}06 100%)`;
                    b.style.borderColor = `${meta.color}22`;
                    b.style.boxShadow = `inset 0 0 18px ${meta.color}10`;
                    const lbl = b.querySelector('[data-lbl]') as HTMLElement;
                    if (lbl) lbl.style.color = `${meta.color}cc`;
                  }}
                  onMouseLeave={e => {
                    if (isActive) return;
                    const b = e.currentTarget;
                    b.style.background = "rgba(8,8,12,0.7)";
                    b.style.borderColor = "rgba(255,255,255,0.05)";
                    b.style.boxShadow = "none";
                    const lbl = b.querySelector('[data-lbl]') as HTMLElement;
                    if (lbl) lbl.style.color = "rgba(168,168,188,0.35)";
                  }}
                >

                  <span style={{
                    position: "absolute", bottom: -1, left: "20%", right: "20%", height: 2,
                    background: isActive ? meta.color : "transparent",
                    boxShadow: isActive ? `0 0 8px ${meta.color}` : "none",
                    borderRadius: 1,
                    pointerEvents: "none",
                  }} />
                  <span
                    data-lbl=""
                    style={{
                      fontSize: 11,
                      fontFamily: "'Bungee', sans-serif",
                      letterSpacing: "0.12em",
                      fontWeight: 400,
                      color: isActive ? meta.color : "rgba(168,168,188,0.35)",
                      textShadow: isActive ? `0 0 10px ${meta.color}99` : "none",
                      transition: "color 550ms ease, text-shadow 550ms ease",
                    }}
                  >{p.name}</span>
                </button>
              );
            })}
          </div>
        </div>

        <div style={{ flex: 1, position: "relative", overflow: "hidden" }}>
          <span style={{ position: "absolute", top: "50%", transform: "translateY(-50%)", left: 10, fontSize: 7, fontFamily: "monospace", color: "rgba(168,168,188,0.12)", letterSpacing: "0.22em", pointerEvents: "none" }}>SIGNAL</span>
          <canvas ref={canvasRef} width={600} height={44} style={{ width: "100%", height: "100%", display: "block" }} />
        </div>

      </div>
    </div>
  );
}

const WHITE_LAYOUT = [
  { key: "a", note: "C" },
  { key: "s", note: "D" },
  { key: "d", note: "E" },
  { key: "f", note: "F" },
  { key: "g", note: "G" },
  { key: "h", note: "A" },
  { key: "j", note: "B" },
  { key: "k", note: "C'" },
  { key: "l", note: "D'" },
] as const;

const BLACK_LAYOUT = [
  { key: "w", after: 0 },
  { key: "e", after: 1 },
  { key: "t", after: 3 },
  { key: "y", after: 4 },
  { key: "u", after: 5 },
  { key: "o", after: 7 },
  { key: "p", after: 8 },
] as const;

function KeyboardDisplay({ activeKeys, accent }: { activeKeys: Set<string>; accent: string }) {
  const KW = 22, KH = 54, BW = 13, BH = 33;
  const total = WHITE_LAYOUT.length * KW;

  return (
    <div style={{ borderRadius: 5, overflow: "hidden", background: "rgba(0,0,0,0.3)", border: "1px solid rgba(255,255,255,0.05)", padding: "8px 6px 12px" }}>
      <svg width="100%" viewBox={`0 0 ${total} ${KH + 16}`} style={{ overflow: "visible", display: "block" }}>
        {WHITE_LAYOUT.map(({ key, note }, i) => {
          const on = activeKeys.has(key);
          return (
            <g key={key}>
              <rect x={i * KW + 0.5} y={0.5} width={KW - 1} height={KH} rx={2}
                fill={on ? accent : "rgba(228,228,240,0.92)"}
                stroke={on ? accent : "rgba(0,0,0,0.25)"} strokeWidth={0.5}
              />
              <text x={i * KW + KW / 2} y={KH - 7} textAnchor="middle"
                fontSize={7} fontFamily="monospace" fontWeight="bold"
                fill={on ? "#080808" : "rgba(80,80,100,0.9)"}
              >{key.toUpperCase()}</text>
              <text x={i * KW + KW / 2} y={KH + 12} textAnchor="middle"
                fontSize={7} fontFamily="monospace"
                fill={on ? accent : "rgba(168,168,188,0.35)"}
              >{note}</text>
            </g>
          );
        })}
        {BLACK_LAYOUT.map(({ key, after }) => {
          const on = activeKeys.has(key);
          const x = (after + 1) * KW - BW / 2;
          return (
            <g key={key}>
              <rect x={x} y={0.5} width={BW} height={BH} rx={2}
                fill={on ? accent : "#080810"}
                stroke={on ? accent : "rgba(255,255,255,0.1)"} strokeWidth={0.5}
              />
              <text x={x + BW / 2} y={BH - 5} textAnchor="middle"
                fontSize={6} fontFamily="monospace"
                fill={on ? "#080808" : "rgba(255,255,255,0.45)"}
              >{key.toUpperCase()}</text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}

function VUMeter({
  label,
  value,
  accent,
  highlight = false,
  liveLevel,
}: {
  label: string;
  value: number;
  accent: string;
  highlight?: boolean;
  liveLevel?: number;
}) {
  const displayValue = liveLevel !== undefined ? liveLevel : value;
  const pct = Math.round(value * 100);
  const segments = 16;
  const filled = Math.round(displayValue * segments);

  return (
    <div className="flex items-center" style={{ gap: 8 }}>

      <span
        className="font-[var(--font-mono)] uppercase text-right shrink-0"
        style={{
          fontSize: 10,
          width: 44,
          color: highlight ? "#ffffff" : "#8888a0",
          letterSpacing: "0.06em",
          fontWeight: highlight ? 700 : 400,
        }}
      >
        {label}
      </span>

      <div className="flex items-center shrink-0" style={{ gap: 2 }}>
        {Array.from({ length: segments }).map((_, i) => {
          const active = i < filled;
          const hot = i >= 13;
          return (
            <div
              key={i}
              style={{
                width: 9,
                height: highlight ? 10 : 8,
                borderRadius: 2,
                background: active
                  ? hot ? accent : accent
                  : "rgba(255,255,255,0.06)",
                opacity: active ? (hot ? 1 : 0.85) : 1,
                boxShadow: active && hot ? `0 0 6px ${accent}` : active ? `0 0 3px ${accent}60` : "none",
                transition: "background 60ms, box-shadow 60ms",
              }}
            />
          );
        })}
      </div>

      <span
        className="font-[var(--font-mono)] shrink-0"
        style={{
          fontSize: highlight ? 13 : 11,
          color: highlight ? accent : `${accent}cc`,
          width: 30,
          textAlign: "right",
          fontWeight: highlight ? 700 : 400,
          letterSpacing: "0.02em",
        }}
      >
        {pct}
      </span>
    </div>
  );
}

const BG_VS = `attribute vec2 a_pos; void main(){gl_Position=vec4(a_pos,0.,1.);}`;

const CLEAN_FS = `
precision mediump float;
uniform float u_t; uniform vec2 u_res; uniform float u_blend;
float tri(float x){return abs(fract(x)-.5)*2.;}
void main(){
  vec2 uv=gl_FragCoord.xy/u_res;
  float cx=uv.x-.5, cy=.5-uv.y;
  float ca=cos(u_t*.032), sa=sin(u_t*.032);
  float rx=cx*ca-cy*sa, ry=cx*sa+cy*ca;
  float u=(rx+ry)*7., v=(rx-ry)*7.;
  float val=tri(u)*tri(v)*4.+tri(u*.5+u_t*.13)*tri(v*.5-u_t*.10)*2.;
  float c=abs(cos(val*2.6));
  float thresh=mix(1.0,0.80,u_blend);
  vec4 col;
  if(c>thresh){float b=pow((c-.80)/.20,.52);col=vec4(b*15./255.,b*130./255.,b*210./255.,b*.88);}
  else{float d=tri(val*.3)*.25;col=vec4(d*2./255.,d*8./255.,d*22./255.,1.);}
  gl_FragColor=col;
}`;

const CRUNCH_FS = `
precision mediump float;
uniform float u_t; uniform vec2 u_res; uniform float u_blend;
float tri(float x){return abs(fract(x)-.5)*2.;}
void main(){
  vec2 uv=gl_FragCoord.xy/u_res;
  float nx=uv.x,ny=1.-uv.y,cx=nx-.5,cy=ny-.5;
  float v=tri(nx*7.+u_t*.38)*tri(ny*5.-u_t*.28)*3.5
         +tri((cx+cy)*11.+u_t*.44)*1.8
         +tri((cx-cy)*8.-u_t*.32)*1.4
         +tri(nx*3.5-ny*4.+u_t*.20)*.9;
  float c=abs(cos(v*2.9));
  float thresh=mix(1.0,0.68,u_blend);
  vec4 col;
  if(c>thresh){
    float b=pow((c-.68)/.32,.48);
    float w=tri(v*.5+u_t*.07)*.5+.5;
    col=vec4(b*(178.+w*62.)/255.,b*(58.+w*22.)/255.,b*7./255.,b*.90);
  } else{float d=tri(v*.3)*.5+.3;col=vec4(d*11./255.,d*4./255.,0.,1.);}
  gl_FragColor=col;
}`;

const HEAVY_FS = `
precision mediump float;
uniform float u_t; uniform vec2 u_res; uniform float u_blend;
float tri(float x){return abs(fract(x)-.5)*2.;}
void main(){
  vec2 uv=gl_FragCoord.xy/u_res;
  float cx=uv.x-.5,cy=.5-uv.y;
  float w1=sin(cx*1.6+cy*1.1+u_t*.11)*.62;
  float w2=sin(cy*1.9-cx*1.3-u_t*.09)*.52;
  float v=tri((cx+cy+w1)*5.5+u_t*.23)*2.5
         +tri((cx-cy+w2)*5.0-u_t*.19)*2.2
         +tri((cx+cy*.5+w1*.5)*3.6+u_t*.14)*1.3;
  float c=abs(cos(v*3.1));
  float b=pow(max(0.,(c-.18)/.82),.50);
  float w=sin(v*.5+u_t*.04)*.15+.85;
  float r=b*w;
  float thresh=mix(1.0,0.04,u_blend);
  vec4 col;
  if(b>thresh){col=vec4(r*228./255.,r*14./255.,r*18./255.,r*.92);}
  else{col=vec4(0.,0.,0.,1.);}
  gl_FragColor=col;
}`;

const FRUS_FS = `
precision mediump float;
uniform float u_t; uniform vec2 u_res; uniform float u_blend;
void main(){
  vec2 uv=gl_FragCoord.xy/u_res;
  float nx=uv.x,ny=1.-uv.y,cx=nx-.5,cy=ny-.5;
  float r=sqrt(cx*cx+cy*cy);
  float v=sin(nx*8.+u_t*.50)*1.1
         +sin(ny*6.-u_t*.40)*1.1
         +sin(r*16.-u_t*1.20)*1.5
         +sin((cx*9.-cy*7.)+u_t*.30)*.9
         +sin((cx*5.+cy*11.)-u_t*.22)*.7;
  float c1=abs(cos(v*3.14159265));
  float c2=abs(cos(v*3.14159265*.5+.9));
  float t1=mix(1.0,0.78,u_blend);
  float t2=mix(1.0,0.85,u_blend);
  vec4 col;
  if(c1>t1){
    float b=pow((c1-.78)/.22,.55);
    float purple=sin(v*1.4+u_t*.15)*.5+.5;
    col=vec4(b*(35.+purple*90.)/255.,b*(155.+purple*25.)/255.,b,b*248./255.);
  } else if(c2>t2){
    float b=pow((c2-.85)/.15,.5)*.42;
    col=vec4(b*45./255.,b*110./255.,b*200./255.,b*160./255.);
  } else {
    float depth=(sin(v*.4)+1.)*.5;
    col=vec4(depth*4./255.,depth*9./255.,depth*28./255.,1.);
  }
  gl_FragColor=col;
}`;

const GHOST_FS = `
precision mediump float;
uniform float u_t; uniform vec2 u_res; uniform float u_blend;
void main(){
  vec2 uv=gl_FragCoord.xy/u_res;
  vec2 p=vec2(uv.x,1.-uv.y);
  vec2 q=vec2(sin(p.x*3.2+u_t*.13)+sin(p.y*2.6+u_t*.10),
              sin(p.x*2.9-u_t*.11)+sin(p.y*3.4-u_t*.09));
  vec2 r=vec2(sin(p.x*3.+q.x*2.2+u_t*.09)+sin(p.y*2.2-q.y*1.8-u_t*.07),
              sin(p.x*2.2-q.y*2.1-u_t*.08)+sin(p.y*3.1+q.x*1.9+u_t*.10));
  float v=length(r);
  float c=abs(cos(v*4.2));
  float thresh=mix(1.0,0.76,u_blend);
  vec4 col;
  if(c>thresh){float b=pow((c-.76)/.24,.55);col=vec4(b*5./255.,b*185./255.,b*32./255.,b*.82);}
  else{float d=(cos(v*1.8)+1.)*.12;col=vec4(d*1./255.,d*6./255.,d*2./255.,1.);}
  gl_FragColor=col;
}`;

const PRESET_FS = [CLEAN_FS, CRUNCH_FS, HEAVY_FS, FRUS_FS, GHOST_FS];
const PRESET_OPACITY = [0.65, 0.74, 0.82, 0.88, 0.70];

type GlState = { tLoc: WebGLUniformLocation; rLoc: WebGLUniformLocation; blendLoc: WebGLUniformLocation; prog: WebGLProgram };

const BLEND_OUT = 550;
const BLEND_IN  = 750;

function buildShader(gl: WebGLRenderingContext, idx: number, old?: WebGLProgram): GlState {
  if (old) gl.deleteProgram(old);
  const compile = (type: number, src: string) => { const s = gl.createShader(type)!; gl.shaderSource(s, src); gl.compileShader(s); return s; };
  const prog = gl.createProgram()!;
  gl.attachShader(prog, compile(gl.VERTEX_SHADER, BG_VS));
  gl.attachShader(prog, compile(gl.FRAGMENT_SHADER, PRESET_FS[idx]));
  gl.linkProgram(prog); gl.useProgram(prog);
  const buf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1,-1,1,-1,-1,1,-1,1,1,-1,1,1]), gl.STATIC_DRAW);
  const pos = gl.getAttribLocation(prog, "a_pos");
  gl.enableVertexAttribArray(pos); gl.vertexAttribPointer(pos, 2, gl.FLOAT, false, 0, 0);
  return { tLoc: gl.getUniformLocation(prog, "u_t")!, rLoc: gl.getUniformLocation(prog, "u_res")!, blendLoc: gl.getUniformLocation(prog, "u_blend")!, prog };
}

function PresetBg({ presetIdx }: { presetIdx: number | null }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const glRef     = useRef<WebGLRenderingContext | null>(null);
  const glState   = useRef<GlState | null>(null);
  const rafRef    = useRef(0);
  const startRef  = useRef(performance.now());

  const [canvasOpacity, setCanvasOpacity] = useState(presetIdx !== null ? PRESET_OPACITY[presetIdx] : 0);
  const setOpacityRef = useRef(setCanvasOpacity);
  setOpacityRef.current = setCanvasOpacity;

  const tr = useRef<{
    phase: 'in' | 'out' | 'stable';
    phaseStart: number;
    blend: number;
    currentIdx: number | null;
    pendingIdx: number | null;
  }>({ phase: 'in', phaseStart: performance.now(), blend: 0, currentIdx: presetIdx, pendingIdx: null });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const gl = canvas.getContext("webgl");
    if (!gl) return;
    glRef.current = gl;
    const resize = () => { canvas.width = window.innerWidth; canvas.height = window.innerHeight; gl.viewport(0, 0, canvas.width, canvas.height); };
    resize();
    window.addEventListener("resize", resize);
    if (tr.current.currentIdx !== null) glState.current = buildShader(gl, tr.current.currentIdx);
    return () => window.removeEventListener("resize", resize);
  }, []);

  useEffect(() => {
    const t = tr.current;
    if (presetIdx === t.currentIdx && t.phase === 'stable') return;
    t.pendingIdx = presetIdx;
    if (t.phase !== 'out') { t.phase = 'out'; t.phaseStart = performance.now(); }
  }, [presetIdx]);

  useEffect(() => {
    const tick = () => {
      const gl = glRef.current;
      const s  = glState.current;
      const t  = tr.current;
      const now = performance.now();

      if (t.phase === 'out') {
        const p = Math.min(1, (now - t.phaseStart) / BLEND_OUT);
        const e = p * p;
        t.blend = 1 - e;
        if (p >= 1) {
          if (t.pendingIdx !== null && gl) {
            glState.current = buildShader(gl, t.pendingIdx, glState.current?.prog);
            setOpacityRef.current(PRESET_OPACITY[t.pendingIdx]);
          }
          t.currentIdx = t.pendingIdx;
          t.pendingIdx = null;
          t.phase = 'in';
          t.phaseStart = now;
          t.blend = 0;
        }
      } else if (t.phase === 'in') {
        const p = Math.min(1, (now - t.phaseStart) / BLEND_IN);
        const e = 1 - (1 - p) * (1 - p) * (1 - p);
        t.blend = e;
        if (p >= 1) { t.phase = 'stable'; t.blend = 1; }
      }

      if (s && gl) {
        const time = (now - startRef.current) * 0.00012;
        gl.uniform1f(s.tLoc, time);
        gl.uniform2f(s.rLoc, gl.canvas.width, gl.canvas.height);
        gl.uniform1f(s.blendLoc, t.blend);
        gl.drawArrays(gl.TRIANGLES, 0, 6);
      }

      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, []);

  return <canvas ref={canvasRef} className="fixed inset-0 pointer-events-none" style={{ width: "100%", height: "100%", zIndex: 1, opacity: canvasOpacity }} />;
}
