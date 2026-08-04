import { useCallback, useEffect, useRef, useState } from "react";
import { useEffects } from "./hooks/useEffects";
import { useMetronome } from "./hooks/useMetronome";
import { useTuner } from "./hooks/useTuner";
import { useSynth, NOTE_KEYS } from "./hooks/useSynth";
import Pedal3D from "./Pedal3D";
import LoadingScreen from "./LoadingScreen";
import OnboardingModal from "./OnboardingModal";
import GhostMark from "./GhostMark";
import PresetBg from "./background/PresetBg";
import { PRESETS, PALETTE, PRESET_META } from "./data/presets";
import {
  RecorderControls,
  Console,
  MobileSheet,
  TunerModal,
  TunerButton,
  PanelLabel,
  Metronome,
  TopBar,
  AboutModal,
  MicBlockedModal,
  FeedbackModal,
  PresetCard,
  KeyboardDisplay,
  Fader,
  WebGLFallback,
  PresetInfo,
  ErrorBoundary,
} from "./components";

const WEBGL_OK = (() => {
  try {
    const c = document.createElement("canvas");
    return !!(c.getContext("webgl2") || c.getContext("webgl"));
  } catch {
    return false;
  }
})();

function hexToRgb(h: string): [number, number, number] {
  return [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
}
function lerpHex(a: string, b: string, t: number): string {
  const [r1, g1, b1] = hexToRgb(a),
    [r2, g2, b2] = hexToRgb(b);
  return (
    "#" +
    [r1 + (r2 - r1) * t, g1 + (g2 - g1) * t, b1 + (b2 - b1) * t]
      .map((v) => Math.round(v).toString(16).padStart(2, "0"))
      .join("")
  );
}

const WARNING_ACK_KEY = "ghostfx.onboardAck";

const SHEET_TABS = [
  { key: "signal", label: "Signal" },
  { key: "keyboard", label: "Keys" },
  { key: "rec", label: "Rec" },
] as const;

const EXPLODE_MS = 2400;
const smoothstep = (x: number) => (x <= 0 ? 0 : x >= 1 ? 1 : x * x * (3 - 2 * x));
const easeInOut = (x: number) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);

export default function App() {
  const [warningDone, setWarningDone] = useState(() => {
    try {
      return localStorage.getItem(WARNING_ACK_KEY) === "1";
    } catch {
      return false;
    }
  });
  const [micDismissed, setMicDismissed] = useState(false);
  const [keyboardMode, setKeyboardMode] = useState(false);
  const [sheetTab, setSheetTab] = useState<"signal" | "keyboard" | "rec">("signal");
  const [sheetExpanded, setSheetExpanded] = useState(false);
  const [stompCount, setStompCount] = useState(0);
  const [presetIdx, setPresetIdx] = useState<number | null>(0);
  const presetIdxRef = useRef<number | null>(0);
  useEffect(() => {
    presetIdxRef.current = presetIdx;
  }, [presetIdx]);
  const [drive, setDrive] = useState<number>(PRESETS[0].drive);
  const [echo, setEcho] = useState<number>(PRESETS[0].echo);
  const [tone, setTone] = useState<number>(PRESETS[0].tone);
  const [reverb, setReverb] = useState<number>(PRESETS[0].reverb);
  const [mod, setMod] = useState<number>(PRESETS[0].mod);
  const [masterVolume, setMasterVolume] = useState<number>(0);

  const applyPreset = useCallback((preset: (typeof PRESETS)[number]) => {
    setDrive(preset.drive);
    setEcho(preset.echo);
    setTone(preset.tone);
    setReverb(preset.reverb);
    setMod(preset.mod);
  }, []);

  const handlePresetSelect = useCallback(
    (idx: number) => {
      const i = ((idx % PRESETS.length) + PRESETS.length) % PRESETS.length;
      if (i === presetIdxRef.current) return;
      setPresetIdx(i);
      applyPreset(PRESETS[i]);
    },
    [applyPreset],
  );

  const fx = useEffects({ drive, echo, tone, reverb, mod, masterVolume, presetIdx });
  const { toggleRecording, isRecording } = fx.recorder;
  useEffect(() => {
    if (!fx.micBlocked) setMicDismissed(false);
  }, [fx.micBlocked]);

  const metronome = useMetronome({ ctxRef: fx.ctxRef, ensureAudio: fx.ensureAudio });
  const [countInEnabled, setCountInEnabled] = useState(false);
  const [tunerOpen, setTunerOpen] = useState(false);
  const [aboutOpen, setAboutOpen] = useState(false);
  const tuning = useTuner({
    enabled: tunerOpen,
    getMicWaveform: fx.getMicWaveform,
    getSampleRate: fx.getSampleRate,
  });

  const { countIn } = metronome;
  const handleRecord = useCallback(async () => {
    if (isRecording) {
      await toggleRecording();
      return;
    }
    if (countInEnabled) await countIn();
    await toggleRecording();
  }, [isRecording, countInEnabled, countIn, toggleRecording]);

  const handleRecordRef = useRef(handleRecord);
  useEffect(() => {
    handleRecordRef.current = handleRecord;
  }, [handleRecord]);

  useEffect(() => {
    if (!warningDone) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.code !== "Space" || e.repeat) return;
      const el = document.activeElement as HTMLElement | null;
      if (el && (el.tagName === "INPUT" || el.tagName === "TEXTAREA" || el.isContentEditable))
        return;
      e.preventDefault();
      void handleRecordRef.current();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [warningDone]);

  useEffect(() => {
    if (!warningDone) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.repeat || e.ctrlKey || e.metaKey || e.altKey) return;
      const n = Number(e.key);
      if (!Number.isInteger(n) || n < 1 || n > PRESETS.length) return;
      const el = document.activeElement as HTMLElement | null;
      if (el && (el.tagName === "INPUT" || el.tagName === "TEXTAREA" || el.isContentEditable))
        return;
      handlePresetSelect(n - 1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [warningDone, handlePresetSelect]);

  const synth = useSynth({ drive, echo, tone, reverb, mod, masterVolume, presetIdx });
  const { playNote, stopNote } = synth;

  useEffect(() => {
    if (!keyboardMode) return;
    const onDown = (e: KeyboardEvent) => {
      if (e.repeat || e.ctrlKey || e.metaKey || e.altKey) return;
      if ((e.target as HTMLElement).tagName === "INPUT") return;
      const entry = NOTE_KEYS[e.key.toLowerCase()];
      if (entry) playNote(e.key.toLowerCase(), entry.freq);
    };
    const onUp = (e: KeyboardEvent) => {
      const entry = NOTE_KEYS[e.key.toLowerCase()];
      if (entry) stopNote(e.key.toLowerCase());
    };
    window.addEventListener("keydown", onDown);
    window.addEventListener("keyup", onUp);
    return () => {
      window.removeEventListener("keydown", onDown);
      window.removeEventListener("keyup", onUp);
    };
  }, [keyboardMode, playNote, stopNote]);

  const getLevelRef = useRef(fx.getLevel);
  useEffect(() => {
    getLevelRef.current = fx.getLevel;
  }, [fx.getLevel]);

  const handleTap = useCallback(() => {
    fx.toggle();
  }, [fx]);

  const handleStomp = useCallback(() => {
    setStompCount((c) => c + 1);
  }, []);

  const [pulseExplode, setPulseExplode] = useState(0);
  const [pulseSpin, setPulseSpin] = useState<number | null>(null);
  const [pulsing, setPulsing] = useState(false);
  const pulseRaf = useRef(0);
  const runExplode = useCallback(() => {
    if (pulsing) return;
    setPulsing(true);
    const start = performance.now();
    const step = () => {
      const t = Math.min(1, (performance.now() - start) / EXPLODE_MS);
      const e = t < 0.3 ? smoothstep(t / 0.3) : t < 0.7 ? 1 : 1 - smoothstep((t - 0.7) / 0.3);
      setPulseExplode(e);
      setPulseSpin(easeInOut(t) * Math.PI * 2);
      if (t < 1) {
        pulseRaf.current = requestAnimationFrame(step);
      } else {
        setPulseExplode(0);
        setPulseSpin(null);
        setPulsing(false);
      }
    };
    pulseRaf.current = requestAnimationFrame(step);
  }, [pulsing]);
  useEffect(() => () => cancelAnimationFrame(pulseRaf.current), []);

  const isActive = fx.state === "active";
  const themeTarget = presetIdx !== null ? PRESET_META[presetIdx].color : PALETTE.accent;
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
      const e = p < 0.5 ? 2 * p * p : -1 + (4 - 2 * p) * p;
      const c = lerpHex(from, to, e);
      liveColorRef.current = c;
      setThemeColor(c);
      if (p < 1) colorAnimRaf.current = requestAnimationFrame(tick);
    };
    colorAnimRaf.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(colorAnimRaf.current);
  }, [themeTarget]);

  const handleKnobChange = useCallback(
    (knob: "drive" | "echo" | "tone" | "reverb" | "mod" | "master", value: number) => {
      if (knob === "drive") setDrive(value);
      else if (knob === "echo") setEcho(value);
      else if (knob === "tone") setTone(value);
      else if (knob === "reverb") setReverb(value);
      else if (knob === "mod") setMod(value);
      else setMasterVolume(value);
    },
    [],
  );

  return (
    <div className="h-screen w-full overflow-hidden relative" style={{ background: PALETTE.bg }}>
      {WEBGL_OK && <LoadingScreen />}
      {!warningDone && (
        <OnboardingModal
          onDismiss={() => {
            try {
              localStorage.setItem(WARNING_ACK_KEY, "1");
            } catch {}
            setWarningDone(true);
          }}
        />
      )}

      <PresetBg presetIdx={presetIdx} introActive={!warningDone} />

      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          zIndex: 2,
          background:
            "radial-gradient(ellipse 62% 58% at 52% 46%, rgba(4,5,8,0.18) 0%, rgba(4,5,8,0.62) 46%, rgba(4,5,8,0.88) 78%, rgba(4,5,8,0.96) 100%)",
        }}
      />

      {drive > 0.45 && (
        <div
          className="absolute inset-0 pointer-events-none z-[5]"
          style={{
            boxShadow: `inset 0 0 140px rgba(245,62,62,${(Math.max(0, drive - 0.45) / 0.55) * (isActive ? 0.35 : 0.12)})`,
            transition: "box-shadow 300ms ease",
          }}
        />
      )}

      {warningDone && (
        <div
          className="hidden lg:flex fixed bottom-0 left-0 right-0 z-[40] flex-col items-stretch pointer-events-none"
          style={{ padding: "8px max(22px,1.8vw) 16px", gap: 10 }}
        >
          {keyboardMode && (
            <div
              className="pointer-events-auto self-center w-full"
              style={{
                maxWidth: 620,
                padding: "12px 14px",
                background: "rgba(3,3,8,0.94)",
                border: "1px solid rgba(255,255,255,0.09)",
                borderRadius: 14,
              }}
            >
              <KeyboardDisplay
                activeKeys={synth.activeKeys}
                accent={themeColor}
                playNote={synth.playNote}
                stopNote={synth.stopNote}
                labelMode="key"
              />
            </div>
          )}
          <div
            className="flex-1 flex items-stretch px-5 py-3.5 pointer-events-auto"
            style={{
              background: "rgba(3,3,8,0.94)",
              border: `1px solid ${
                fx.recorder.isRecording || metronome.countingIn
                  ? themeColor + "55"
                  : "rgba(255,255,255,0.09)"
              }`,
              borderRadius: 14,
              transition: "border-color 200ms",
            }}
          >
            <Console
              recorder={fx.recorder}
              metronome={metronome}
              levels={{ drive, echo, tone, reverb, mod, master: masterVolume }}
              onKnobChange={handleKnobChange}
              onOpenTuner={() => setTunerOpen(true)}
              keyboardMode={keyboardMode}
              onToggleKeyboard={() => setKeyboardMode((v) => !v)}
              countInEnabled={countInEnabled}
              onToggleCountIn={() => setCountInEnabled((v) => !v)}
              onRecord={() => void handleRecord()}
              getLevelRef={getLevelRef}
              accent={themeColor}
            />
          </div>
        </div>
      )}

      <TopBar
        activePresetIdx={presetIdx}
        onPresetSelect={handlePresetSelect}
        onOpenAbout={() => setAboutOpen(true)}
        accent={themeColor}
        ledColor={ledColor}
        statusLabel={isActive ? "Active" : fx.ready ? "Ready" : "Idle"}
        live={isActive}
      />

      <div className="lg:hidden fixed inset-0 z-[25] flex flex-col pointer-events-none">
        <div
          className="pointer-events-auto flex items-center justify-between"
          style={{
            padding: "max(12px,env(safe-area-inset-top,12px)) 16px 10px",
            background: "rgba(7,10,12,0.96)",
          }}
        >
          <div className="flex items-center gap-2.5">
            <GhostMark variant="solid" size={22} color="#e7e4dc" ledColor={themeColor} />
            <span
              style={{
                fontFamily: "'Saira', sans-serif",
                fontWeight: 800,
                fontSize: 16,
                letterSpacing: "-0.02em",
                color: "#e7e4dc",
              }}
            >
              GHOST<span style={{ color: themeColor }}>FX</span>
            </span>
          </div>
          <div className="flex items-center" style={{ gap: 10 }}>
            <TunerButton onOpen={() => setTunerOpen(true)} accent={themeColor} variant="icon" />
            <div
              className="flex items-center gap-2 font-[var(--font-mono)]"
              style={{
                fontSize: 9,
                letterSpacing: "0.16em",
                textTransform: "uppercase",
                color: "rgba(159,196,173,0.7)",
              }}
            >
              <div
                className={isActive ? "animate-pulse" : ""}
                style={{
                  width: 7,
                  height: 7,
                  borderRadius: "50%",
                  background: ledColor,
                  boxShadow: `0 0 8px ${ledColor}`,
                }}
              />
              {isActive ? "Active" : fx.ready ? "Ready" : "Idle"}
            </div>
          </div>
        </div>

        <div
          className="preset-scroll pointer-events-auto flex gap-2 overflow-x-auto px-4 pb-3 pt-1"
          style={{
            WebkitOverflowScrolling: "touch",
            background: "rgba(7,10,12,0.96)",
            borderBottom: "1px solid rgba(231,228,220,0.1)",
          }}
        >
          {PRESETS.map((p, i) => (
            <PresetCard
              key={i}
              name={p.name}
              color={PRESET_META[i].color}
              isActive={presetIdx === i}
              onSelect={() => handlePresetSelect(i)}
              fitScroll
            />
          ))}
        </div>

        <div className="flex-1" />

        <MobileSheet
          tabs={SHEET_TABS}
          active={sheetTab}
          onSelect={setSheetTab}
          expanded={sheetExpanded}
          onExpandedChange={setSheetExpanded}
          accent={themeColor}
        >
          {sheetTab === "signal" && (
            <div className="flex flex-col" style={{ gap: 2 }}>
              <Fader
                label="DRIVE"
                value={drive}
                accent={themeColor}
                onChange={(v) => handleKnobChange("drive", v)}
              />
              <Fader
                label="ECHO"
                value={echo}
                accent={themeColor}
                onChange={(v) => handleKnobChange("echo", v)}
              />
              <Fader
                label="TONE"
                value={tone}
                accent={themeColor}
                onChange={(v) => handleKnobChange("tone", v)}
              />
              <Fader
                label="REVERB"
                value={reverb}
                accent={themeColor}
                onChange={(v) => handleKnobChange("reverb", v)}
              />
              <Fader
                label="MOD"
                value={mod}
                accent={themeColor}
                onChange={(v) => handleKnobChange("mod", v)}
              />
              <Fader
                label="VOLUME"
                value={masterVolume}
                accent={themeColor}
                onChange={(v) => handleKnobChange("master", v)}
                highlight
              />
              <div style={{ marginTop: 12 }}>
                <PresetInfo presetIdx={presetIdx} accent={themeColor} />
              </div>
            </div>
          )}
          {sheetTab === "keyboard" && (
            <KeyboardDisplay
              activeKeys={synth.activeKeys}
              accent={themeColor}
              playNote={synth.playNote}
              stopNote={synth.stopNote}
              labelMode="note"
            />
          )}
          {sheetTab === "rec" && warningDone && (
            <div className="flex flex-col" style={{ gap: 20 }}>
              <div className="flex flex-col" style={{ gap: 10 }}>
                <PanelLabel accent={themeColor}>Tempo</PanelLabel>
                <Metronome
                  metronome={metronome}
                  countInEnabled={countInEnabled}
                  onToggleCountIn={() => setCountInEnabled((v) => !v)}
                  accent={themeColor}
                  compact
                />
              </div>
              <div className="flex flex-col" style={{ gap: 10 }}>
                <PanelLabel accent={themeColor}>
                  {metronome.countingIn ? "Counting in" : "Recorder"}
                </PanelLabel>
                <RecorderControls
                  recorder={fx.recorder}
                  onRecord={() => void handleRecord()}
                  getLevelRef={getLevelRef}
                  accent={themeColor}
                  scopeHeight={54}
                  countingIn={metronome.countingIn}
                />
              </div>
            </div>
          )}
        </MobileSheet>
      </div>

      {WEBGL_OK ? (
        <ErrorBoundary
          fallback={<WebGLFallback isActive={isActive} onTap={handleTap} accent={themeColor} />}
        >
          <div className="absolute inset-0" style={{ zIndex: 3 }}>
            <Pedal3D
              ledColor={themeColor}
              isPlaying={isActive}
              onTap={handleTap}
              onStomp={handleStomp}
              knobDrive={drive}
              knobEcho={echo}
              knobTone={tone}
              knobReverb={reverb}
              knobMod={mod}
              knobMaster={masterVolume}
              onKnobChange={handleKnobChange}
              palette={{
                ...PALETTE,
                accent: themeColor,
                pedal: presetIdx !== null ? PRESET_META[presetIdx].chassis : PALETTE.pedal,
              }}
              presetIdx={presetIdx}
              stompCount={stompCount}
              explode={pulseExplode}
              split={pulsing}
              spin={pulseSpin}
              onExplode={runExplode}
            />
          </div>
        </ErrorBoundary>
      ) : (
        <WebGLFallback isActive={isActive} onTap={handleTap} accent={themeColor} />
      )}

      {fx.error && (
        <div className="absolute inset-x-0 bottom-24 flex justify-center z-20 pointer-events-none">
          <div
            className="px-4 py-2 rounded font-[var(--font-mono)]"
            style={{ fontSize: 10, background: "#1a0000", color: "#ff6b6b", opacity: 0.9 }}
          >
            {fx.error}
          </div>
        </div>
      )}

      {fx.micBlocked && !micDismissed && (
        <MicBlockedModal
          accent={themeColor}
          onRetry={() => fx.toggle()}
          onKeyboard={() => {
            setMicDismissed(true);
            setKeyboardMode(true);
            setSheetTab("keyboard");
            setSheetExpanded(true);
          }}
          onDismiss={() => setMicDismissed(true)}
        />
      )}

      {aboutOpen && (
        <AboutModal presetIdx={presetIdx} accent={themeColor} onClose={() => setAboutOpen(false)} />
      )}

      {tunerOpen && (
        <TunerModal reading={tuning} accent={themeColor} onClose={() => setTunerOpen(false)} />
      )}

      {fx.feedbackBlocked && <FeedbackModal onResume={() => fx.resumeFromFeedback()} />}
    </div>
  );
}
