import { useCallback, useEffect, useRef, useState } from "react";
import { useEffects } from "./hooks/useEffects";
import { useMetronome } from "./hooks/useMetronome";
import { useTuner } from "./hooks/useTuner";
import { useSynth, NOTE_KEYS } from "./hooks/useSynth";
import { useTrack } from "./hooks/useTrack";
import { useArrangement } from "./hooks/useArrangement";
import { useBypass } from "./hooks/useBypass";
import { useColorTransition } from "./hooks/useColorTransition";
import type { ToolId } from "./components/Console";
import type { Source } from "./components/Deck";
import type { StudioTool } from "./components/StudioView";
import type { Backing } from "./audio/render";
import Pedal3D from "./Pedal3D";
import LoadingScreen from "./LoadingScreen";
import OnboardingModal from "./OnboardingModal";
import GhostMark from "./GhostMark";
import PresetBg from "./background/PresetBg";
import { PRESETS, PALETTE, PRESET_META } from "./data/presets";
import {
  Deck,
  Console,
  MobileSheet,
  StudioView,
  ToolDock,
  FaderIcon,
  ForkIcon,
  KeysIcon,
  TunerDisplay,
  TopBar,
  AboutModal,
  MicBlockedModal,
  FeedbackModal,
  PresetCard,
  KeyboardDisplay,
  Fader,
  WebGLFallback,
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

const WARNING_ACK_KEY = "ghostfx.onboardAck";

const SHEET_TABS = [{ key: "deck", label: "Deck" }] as const;

const TOOL_LABEL: Record<string, string> = {
  mix: "Signal",
  tune: "Tuner",
  synth: "Keyboard synth",
};

const MOBILE_TOOLS = [
  { id: "mix" as const, label: "MIX", icon: <FaderIcon />, title: "Signal faders" },
  { id: "tune" as const, label: "TUNE", icon: <ForkIcon />, title: "Tuner" },
  { id: "synth" as const, label: "KEYS", icon: <KeysIcon />, title: "Keyboard synth" },
];

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
  const [sheetTab, setSheetTab] = useState<(typeof SHEET_TABS)[number]["key"]>("deck");
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

  const backingRef = useRef<(() => Backing | null) | null>(null);
  const fx = useEffects({ drive, echo, tone, reverb, mod, masterVolume, presetIdx, backingRef });
  const { toggleRecording, isRecording } = fx.recorder;
  useEffect(() => {
    if (!fx.micBlocked) setMicDismissed(false);
  }, [fx.micBlocked]);

  const metronome = useMetronome({ ctxRef: fx.ctxRef, ensureAudio: fx.ensureAudio });
  const track = useTrack({ ctxRef: fx.ctxRef, ensureAudio: fx.ensureAudio });
  const arrangement = useArrangement({ ctxRef: fx.ctxRef });
  const [source, setSource] = useState<Source>("take");

  const { snapshot: trackSnapshot } = track;
  const { snapshot: takeSnapshot } = fx.recorder;
  const { snapshot: arrangementSnapshot } = arrangement;
  useEffect(() => {
    backingRef.current = () => arrangementSnapshot() ?? trackSnapshot() ?? takeSnapshot();
  }, [arrangementSnapshot, trackSnapshot, takeSnapshot]);

  const { pause: pauseTake } = fx.recorder;
  const { pause: pauseTrack, track: loadedTrack } = track;
  const selectSource = useCallback(
    (next: Source) => {
      if (next === "track") pauseTake();
      else if (next === "take") pauseTrack();
      setSource(next);
    },
    [pauseTake, pauseTrack],
  );

  useEffect(() => {
    if (loadedTrack) {
      pauseTake();
      setSource("track");
    } else {
      setSource("take");
    }
  }, [loadedTrack, pauseTake]);

  const { activeTakeId, playingId } = fx.recorder;
  useEffect(() => {
    if (activeTakeId) selectSource("take");
  }, [activeTakeId, selectSource]);

  useEffect(() => {
    if (playingId) pauseTrack();
  }, [playingId, pauseTrack]);

  const [studioOpen, setStudioOpen] = useState(false);
  const [studioTool, setStudioTool] = useState<StudioTool>("mix");
  const [countInEnabled, setCountInEnabled] = useState(false);
  const [aboutOpen, setAboutOpen] = useState(false);
  const [activeTool, setActiveTool] = useState<ToolId | null>(null);
  const tunerOn = activeTool === "tune" || (studioOpen && studioTool === "tune");
  const tuning = useTuner({
    enabled: tunerOn,
    getMicWaveform: fx.getMicWaveform,
    getSampleRate: fx.getSampleRate,
  });

  const { ensureAudio } = fx;
  useEffect(() => {
    if (tunerOn) void ensureAudio();
  }, [tunerOn, ensureAudio]);

  const { countIn } = metronome;
  const { countingIn } = metronome;
  const handleRecord = useCallback(async () => {
    if (countingIn) return;
    if (isRecording) {
      await toggleRecording();
      return;
    }
    if (countInEnabled) await countIn();
    await toggleRecording();
  }, [countingIn, isRecording, countInEnabled, countIn, toggleRecording]);

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

  const keyboardMode = activeTool === "synth";
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

  const wake = useCallback(() => {
    if (fx.state !== "idle") return;
    setMasterVolume((v) => (v > 0 ? v : PRESETS[presetIdxRef.current ?? 0].master));
  }, [fx.state]);

  const handleTap = useCallback(() => {
    wake();
    void fx.toggle();
  }, [fx, wake]);

  const { setBypass } = fx;
  const bypass = useBypass({
    enabled: warningDone,
    isBypassed: fx.state === "bypass",
    setBypass,
    onArm: wake,
  });

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
  const chassisTarget = presetIdx !== null ? PRESET_META[presetIdx].chassis : PALETTE.pedal;
  const themeColor = useColorTransition(themeTarget);
  const chassisColor = useColorTransition(chassisTarget);
  const ledColor = isActive ? "#f53e3e" : themeColor;

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
          <Console
            recorder={fx.recorder}
            metronome={metronome}
            synth={synth}
            tuning={tuning}
            track={track}
            source={source}
            onSourceChange={selectSource}
            levels={{ drive, echo, tone, reverb, mod, master: masterVolume }}
            onKnobChange={handleKnobChange}
            activeTool={activeTool}
            onToolChange={setActiveTool}
            countInEnabled={countInEnabled}
            onToggleCountIn={() => setCountInEnabled((v) => !v)}
            onRecord={() => void handleRecord()}
            onOpenStudio={() => setStudioOpen(true)}
            getLevelRef={getLevelRef}
            accent={themeColor}
          />
        </div>
      )}

      <TopBar
        activePresetIdx={presetIdx}
        onPresetSelect={handlePresetSelect}
        onOpenAbout={() => setAboutOpen(true)}
        accent={themeColor}
        ledColor={ledColor}
        statusLabel={
          isActive ? "Active" : fx.state === "bypass" ? "Clean" : fx.ready ? "Ready" : "Idle"
        }
        live={isActive}
        cleanOn={fx.state === "bypass"}
        onBypassPress={bypass.press}
        onBypassRelease={bypass.release}
        dock={
          <ToolDock
            tools={[
              { id: "mix", label: "MIX", icon: <FaderIcon />, title: "Signal faders" },
              { id: "tune", label: "TUNE", icon: <ForkIcon />, title: "Tuner" },
              {
                id: "synth",
                label: "SYNTH",
                icon: <KeysIcon />,
                title: "Play the built-in synth with your keyboard",
              },
            ]}
            activeTool={activeTool}
            onToolChange={setActiveTool}
            accent={themeColor}
          />
        }
      />

      <div className="lg:hidden fixed inset-0 z-[25] flex flex-col pointer-events-none">
        <div
          className="preset-scroll pointer-events-auto flex overflow-x-auto"
          style={{
            gap: 8,
            padding: "max(10px,env(safe-area-inset-top,10px)) 12px 10px",
            WebkitOverflowScrolling: "touch",
            background: "linear-gradient(180deg, rgba(5,7,9,0.92) 60%, rgba(5,7,9,0) 100%)",
          }}
        >
          {PRESETS.map((p, i) => (
            <PresetCard
              key={p.name}
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
          leading={
            <div className="flex items-center" style={{ gap: 8 }}>
              <button
                onPointerDown={(e) => {
                  e.preventDefault();
                  bypass.press();
                }}
                onPointerUp={bypass.release}
                onPointerCancel={bypass.release}
                aria-pressed={fx.state === "bypass"}
                title="Tap to bypass, hold to compare"
                className="font-[var(--font-mono)] uppercase shrink-0"
                style={{
                  touchAction: "none",
                  userSelect: "none",
                  padding: "4px 8px",
                  borderRadius: 999,
                  border: `1px solid ${fx.state === "bypass" ? themeColor + "55" : "rgba(231,228,220,0.12)"}`,
                  background: fx.state === "bypass" ? `${themeColor}14` : "transparent",
                  fontSize: 8,
                  letterSpacing: "0.16em",
                  color: fx.state === "bypass" ? themeColor : "rgba(231,228,220,0.5)",
                }}
              >
                Clean
              </button>
              <button
                onClick={() => setAboutOpen(true)}
                className="flex items-center"
                style={{ gap: 6 }}
                aria-label="About GHOSTFX"
              >
                <GhostMark variant="solid" size={17} color="#e7e4dc" ledColor={themeColor} />
                <span
                  style={{
                    fontFamily: "'Saira', sans-serif",
                    fontWeight: 800,
                    fontSize: 12,
                    letterSpacing: "-0.02em",
                    color: "rgba(231,228,220,0.75)",
                  }}
                >
                  GHOST<span style={{ color: themeColor }}>FX</span>
                </span>
              </button>
            </div>
          }
          trailing={
            <ToolDock
              tools={MOBILE_TOOLS}
              activeTool={activeTool}
              onToolChange={(tool) => {
                setActiveTool(tool);
                setSheetExpanded(true);
              }}
              accent={themeColor}
            />
          }
        >
          {activeTool !== null && (
            <button
              onClick={() => setActiveTool(null)}
              className="flex items-center font-[var(--font-mono)] uppercase"
              style={{
                gap: 8,
                marginBottom: 14,
                padding: "6px 10px 6px 7px",
                borderRadius: 7,
                border: "1px solid rgba(231,228,220,0.1)",
                background: "rgba(255,255,255,0.02)",
                fontSize: 9.5,
                letterSpacing: "0.18em",
                color: "rgba(231,228,220,0.66)",
                cursor: "pointer",
              }}
            >
              <span style={{ fontSize: 12, lineHeight: 1, color: themeColor }}>‹</span>
              Deck
              <span style={{ opacity: 0.4 }}>·</span>
              <span style={{ color: themeColor }}>{TOOL_LABEL[activeTool]}</span>
            </button>
          )}

          {activeTool === null && warningDone && (
            <Deck
              recorder={fx.recorder}
              track={track}
              metronome={metronome}
              countInEnabled={countInEnabled}
              onToggleCountIn={() => setCountInEnabled((v) => !v)}
              source={source}
              onSourceChange={selectSource}
              onRecord={() => void handleRecord()}
              onOpenStudio={() => setStudioOpen(true)}
              getLevelRef={getLevelRef}
              accent={themeColor}
              countingIn={metronome.countingIn}
              height={54}
            />
          )}

          {activeTool === "tune" && <TunerDisplay reading={tuning} accent={themeColor} size="sm" />}

          {activeTool === "mix" && (
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
            </div>
          )}

          {activeTool === "synth" && (
            <KeyboardDisplay
              activeKeys={synth.activeKeys}
              accent={themeColor}
              playNote={synth.playNote}
              stopNote={synth.stopNote}
              labelMode="note"
            />
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
                pedal: chassisColor,
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
            setActiveTool("synth");
            setSheetExpanded(true);
          }}
          onDismiss={() => setMicDismissed(true)}
        />
      )}

      {aboutOpen && (
        <AboutModal presetIdx={presetIdx} accent={themeColor} onClose={() => setAboutOpen(false)} />
      )}

      {studioOpen && (
        <StudioView
          recorder={fx.recorder}
          track={track}
          arrangement={arrangement}
          metronome={metronome}
          tuning={tuning}
          countInEnabled={countInEnabled}
          onToggleCountIn={() => setCountInEnabled((v) => !v)}
          tool={studioTool}
          onToolChange={setStudioTool}
          presetIdx={presetIdx}
          getLevelRef={getLevelRef}
          onRecord={() => void handleRecord()}
          source={source}
          onSourceChange={selectSource}
          accent={themeColor}
          onClose={() => setStudioOpen(false)}
        />
      )}

      {fx.feedbackBlocked && <FeedbackModal onResume={() => fx.resumeFromFeedback()} />}
    </div>
  );
}
