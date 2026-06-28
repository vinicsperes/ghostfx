import { useCallback, useEffect, useRef, useState } from "react";
import { useEffects } from "./hooks/useEffects";
import { useSynth, NOTE_KEYS } from "./hooks/useSynth";
import Pedal3D from "./Pedal3D";
import LoadingScreen from "./LoadingScreen";
import WarningModal from "./WarningModal";
import GhostMark from "./GhostMark";
import PresetBg from "./background/PresetBg";
import { PRESETS, PALETTE, PRESET_META, PRESET_TAGS } from "./data/presets";
import { RecorderControls, MicBlockedModal, FeedbackModal, PresetCard, BottomBar, KeyboardDisplay, Fader } from "./components";

function hexToRgb(h: string): [number, number, number] {
  return [parseInt(h.slice(1,3),16), parseInt(h.slice(3,5),16), parseInt(h.slice(5,7),16)];
}
function lerpHex(a: string, b: string, t: number): string {
  const [r1,g1,b1] = hexToRgb(a), [r2,g2,b2] = hexToRgb(b);
  return '#'+[r1+(r2-r1)*t,g1+(g2-g1)*t,b1+(b2-b1)*t].map(v=>Math.round(v).toString(16).padStart(2,'0')).join('');
}

const WARNING_ACK_KEY = "ghostfx.warningAck";

export default function App() {
  const [warningDone, setWarningDone] = useState(() => {
    try { return localStorage.getItem(WARNING_ACK_KEY) === "1"; } catch { return false; }
  });
  const [micDismissed, setMicDismissed] = useState(false);
  const [keyboardMode, setKeyboardMode] = useState(false);
  const [sheetTab, setSheetTab] = useState<"signal" | "keyboard" | "rec">("signal");
  const [sheetExpanded, setSheetExpanded] = useState(true);
  const [stompCount, setStompCount] = useState(0);
  const [presetIdx, setPresetIdx] = useState<number | null>(0);
  const presetIdxRef = useRef<number | null>(0);
  useEffect(() => { presetIdxRef.current = presetIdx; }, [presetIdx]);
  const [drive, setDrive] = useState(0.55);
  const [echo, setEcho] = useState(0.48);
  const [tone, setTone] = useState(0.50);
  const [reverb, setReverb] = useState(0.58);
  const [flanger, setFlanger] = useState(0.45);
  const [masterVolume, setMasterVolume] = useState(0.76);

  const applyPreset = useCallback((preset: typeof PRESETS[number]) => {
    setDrive(preset.drive);
    setEcho(preset.echo);
    setTone(preset.tone);
    setReverb(preset.reverb);
    setFlanger(preset.flanger);
    setMasterVolume(preset.master);
  }, []);

  const handlePresetSelect = useCallback((idx: number) => {
    const i = ((idx % PRESETS.length) + PRESETS.length) % PRESETS.length;
    if (i === presetIdxRef.current) return;
    setPresetIdx(i);
    applyPreset(PRESETS[i]);
  }, [applyPreset]);

  const fx = useEffects({ drive, echo, tone, reverb, flanger, masterVolume });
  useEffect(() => { if (!fx.micBlocked) setMicDismissed(false); }, [fx.micBlocked]);

  useEffect(() => {
    if (!warningDone) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.code !== "Space" || e.repeat) return;
      const el = document.activeElement as HTMLElement | null;
      if (el && (el.tagName === "INPUT" || el.tagName === "TEXTAREA" || el.isContentEditable)) return;
      e.preventDefault();
      fx.toggleRecording();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [warningDone, fx.toggleRecording]);
  const synth = useSynth({ drive, echo, tone, reverb, flanger, masterVolume });

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
  useEffect(() => { getLevelRef.current = fx.getLevel; }, [fx.getLevel]);

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
    (knob: "drive" | "echo" | "tone" | "reverb" | "flanger" | "master", value: number) => {
      if (knob === "drive") setDrive(value);
      else if (knob === "echo") setEcho(value);
      else if (knob === "tone") setTone(value);
      else if (knob === "reverb") setReverb(value);
      else if (knob === "flanger") setFlanger(value);
      else setMasterVolume(value);
    },
    [],
  );

  return (
    <div className="h-screen w-full overflow-hidden relative" style={{ background: PALETTE.bg }}>
      <LoadingScreen />
      {!warningDone && <WarningModal onDismiss={() => {
        try { localStorage.setItem(WARNING_ACK_KEY, "1"); } catch { /* ignore */ }
        setWarningDone(true);
      }} />}

      <PresetBg presetIdx={presetIdx} introActive={!warningDone} />

      {drive > 0.45 && (
        <div
          className="absolute inset-0 pointer-events-none z-[5]"
          style={{
            boxShadow: `inset 0 0 140px rgba(245,62,62,${(Math.max(0, drive - 0.45) / 0.55) * (isActive ? 0.35 : 0.12)})`,
            transition: "box-shadow 300ms ease",
          }}
        />
      )}

      {/* ===== DESKTOP transport bar (bottom of the stage) ===== */}
      {/* floating card inset from the sidebar / screen edge — mirrors the preset
          rail's margins (left-[360px] + max(28px,2.2vw) gutters) instead of a
          full-width bar glued to the corners */}
      {warningDone && (
        <div
          className="hidden lg:flex fixed bottom-0 left-[360px] right-0 z-[40] items-stretch pointer-events-none"
          style={{ padding: "8px max(28px,2.2vw) 16px" }}
        >
          <div
            className="flex-1 flex items-center px-5 py-3 pointer-events-auto"
            style={{ background: "rgba(3,3,8,0.94)", border: `1px solid ${fx.isRecording ? themeColor + "55" : "rgba(255,255,255,0.09)"}`, borderRadius: 14, transition: "border-color 200ms" }}
          >
            <RecorderControls
              isRecording={fx.isRecording}
              hasRecording={fx.hasRecording}
              recordedDuration={fx.recordedDuration}
              onToggle={fx.toggleRecording}
              onDownload={fx.downloadRecording}
              getLevelRef={getLevelRef}
              getRecordedPeaks={fx.getRecordedPeaks}
              accent={themeColor}
            />
          </div>
        </div>
      )}

      {/* ===== DESKTOP preset rail (top of the stage) ===== */}
      <BottomBar
        presets={PRESETS}
        activePresetIdx={presetIdx}
        onPresetSelect={handlePresetSelect}
      />

      {/* ===== MOBILE chrome: top-bar + preset scroller + bottom-sheet ===== */}
      <div className="lg:hidden fixed inset-0 z-[25] flex flex-col pointer-events-none">

        <div
          className="pointer-events-auto flex items-center justify-between"
          style={{ padding: "max(12px,env(safe-area-inset-top,12px)) 16px 10px", background: "rgba(7,10,12,0.96)" }}
        >
          <div className="flex items-center gap-2.5">
            <GhostMark variant="solid" size={22} color="#e7e4dc" ledColor={themeColor} />
            <span style={{ fontFamily: "'Saira', sans-serif", fontWeight: 800, fontSize: 16, letterSpacing: "-0.02em", color: "#e7e4dc" }}>
              GHOST<span style={{ color: themeColor }}>FX</span>
            </span>
          </div>
          <div className="flex items-center gap-2 font-[var(--font-mono)]" style={{ fontSize: 9, letterSpacing: "0.16em", textTransform: "uppercase", color: "rgba(159,196,173,0.7)" }}>
            <div className={isActive ? "animate-pulse" : ""} style={{ width: 7, height: 7, borderRadius: "50%", background: ledColor, boxShadow: `0 0 8px ${ledColor}` }} />
            {isActive ? "Active" : fx.ready ? "Ready" : "Idle"}
          </div>
        </div>

        {/* the scroller IS the flex container: fitScroll cards grow to fill when
            they fit and scroll (no clipping) when they overflow narrow screens */}
        <div
          className="preset-scroll pointer-events-auto flex gap-2 overflow-x-auto px-4 pb-3 pt-1"
          style={{ WebkitOverflowScrolling: "touch", background: "rgba(7,10,12,0.96)", borderBottom: "1px solid rgba(231,228,220,0.1)" }}
        >
          {PRESETS.map((p, i) => (
            <PresetCard
              key={i}
              name={p.name}
              tag={PRESET_TAGS[i]}
              color={PRESET_META[i].color}
              isActive={presetIdx === i}
              onSelect={() => handlePresetSelect(i)}
              fitScroll
            />
          ))}
        </div>

        {/* stage spacer — pedal shows through here; touches fall to the canvas */}
        <div className="flex-1" />

        <div
          className="pointer-events-auto"
          style={{ borderTopLeftRadius: 18, borderTopRightRadius: 18, borderTop: "1px solid rgba(231,228,220,0.16)", background: "linear-gradient(180deg,#0a0e0c,#070a09)", boxShadow: "0 -10px 30px rgba(0,0,0,0.5)" }}
        >
          <button onClick={() => setSheetExpanded(v => !v)} className="w-full flex justify-center pt-2.5 pb-1" aria-label={sheetExpanded ? "Collapse panel" : "Expand panel"}>
            <span style={{ width: 38, height: 4, borderRadius: 2, background: "rgba(231,228,220,0.22)" }} />
          </button>

          <div className="flex px-3" style={{ gap: 4, borderBottom: "1px solid rgba(231,228,220,0.08)" }}>
            {([["signal", "Signal"], ["keyboard", "Teclado"], ["rec", "Rec"]] as const).map(([key, label]) => {
              const on = sheetTab === key;
              return (
                <button
                  key={key}
                  onClick={() => { setSheetTab(key); setSheetExpanded(true); }}
                  className="flex-1 flex items-center justify-center font-[var(--font-mono)] relative"
                  style={{ padding: "12px 0", fontSize: 10.5, letterSpacing: "0.14em", textTransform: "uppercase", color: on ? themeColor : "rgba(95,122,108,0.9)" }}
                >
                  {label}
                  {on && <span style={{ position: "absolute", left: "20%", right: "20%", bottom: -1, height: 2, background: themeColor, boxShadow: `0 0 8px ${themeColor}` }} />}
                </button>
              );
            })}
          </div>

          {sheetExpanded && (
            <div style={{ padding: "16px 16px max(18px,env(safe-area-inset-bottom,16px))", maxHeight: "46vh", overflowY: "auto" }}>
              {sheetTab === "signal" && (
                <div className="flex flex-col" style={{ gap: 2 }}>
                  <Fader label="DRIVE"  value={drive}        accent={themeColor} onChange={(v) => handleKnobChange("drive",  v)} />
                  <Fader label="ECHO"   value={echo}         accent={themeColor} onChange={(v) => handleKnobChange("echo",   v)} />
                  <Fader label="TONE"   value={tone}         accent={themeColor} onChange={(v) => handleKnobChange("tone",   v)} />
                  <Fader label="REVERB" value={reverb}       accent={themeColor} onChange={(v) => handleKnobChange("reverb", v)} />
                  <Fader label="FLANGER" value={flanger}       accent={themeColor} onChange={(v) => handleKnobChange("flanger", v)} />
                  <Fader label="VOLUME" value={masterVolume} accent={themeColor} onChange={(v) => handleKnobChange("master", v)} highlight />
                </div>
              )}
              {sheetTab === "keyboard" && (
                <KeyboardDisplay activeKeys={synth.activeKeys} accent={themeColor} playNote={synth.playNote} stopNote={synth.stopNote} labelMode="note" />
              )}
              {sheetTab === "rec" && warningDone && (
                <RecorderControls
                  isRecording={fx.isRecording}
                  hasRecording={fx.hasRecording}
                  recordedDuration={fx.recordedDuration}
                  onToggle={fx.toggleRecording}
                  onDownload={fx.downloadRecording}
                  getLevelRef={getLevelRef}
                  getRecordedPeaks={fx.getRecordedPeaks}
                  accent={themeColor}
                  scopeHeight={62}
                />
              )}
            </div>
          )}
        </div>
      </div>

      <div className="absolute left-0 right-0 top-[88px] bottom-[150px] z-[2] lg:top-[78px] lg:left-[360px] lg:right-0 lg:bottom-[92px]">
        <Pedal3D
          ledColor={themeColor}
          isPlaying={isActive}
          onTap={handleTap}
          knobDrive={drive}
          knobEcho={echo}
          knobTone={tone}
          knobReverb={reverb}
          knobFlanger={flanger}
          knobMaster={masterVolume}
          onKnobChange={handleKnobChange}
          palette={{ ...PALETTE, accent: themeColor, pedal: presetIdx !== null ? PRESET_META[presetIdx].chassis : PALETTE.pedal }}
          presetIdx={presetIdx}
          stompCount={stompCount}
        />
      </div>

      <aside
        className="hud-scroll hidden lg:flex fixed left-0 top-0 h-full z-[25] select-none flex-col"
        style={{
          width: 360,
          background: "linear-gradient(105deg, rgba(6,9,11,0.95) 48%, rgba(6,9,11,0.82) 76%, rgba(6,9,11,0.30) 100%)",
          backdropFilter: "blur(7px)",
          WebkitBackdropFilter: "blur(7px)",
          borderRight: "1px solid rgba(231,228,220,0.07)",
          padding: "clamp(22px,2.4vh,34px) 30px",
          gap: "clamp(18px,2.4vh,30px)",
          pointerEvents: "auto",
          overflowY: "auto",
        }}
      >

        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-3">
            <GhostMark variant="solid" size={28} color="#e7e4dc" ledColor={themeColor} />
            <span
              style={{ fontFamily: "'Saira', sans-serif", fontWeight: 800, fontSize: 25, lineHeight: 1, letterSpacing: "-0.01em", color: "#e7e4dc" }}
            >
              GHOST<span style={{ color: themeColor }}>FX</span>
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
              fontSize: "clamp(30px, 4.4vw, 44px)",
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
              fontSize: "clamp(30px, 4.4vw, 44px)",
              color: themeColor,
              fontFamily: '"Rock 3D", system-ui',
              fontWeight: 400,
              letterSpacing: "0.02em",
              lineHeight: 1.2,
              whiteSpace: "nowrap",
              textShadow: `0 0 24px ${themeColor}66, 0 0 48px ${themeColor}22`,
            }}
          >
            {presetIdx !== null ? PRESET_META[presetIdx].word : "HAUNTED"}
          </span>
          <span
            className="font-[var(--font-serif)] italic"
            style={{
              fontSize: "clamp(34px, 5vw, 50px)",
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
            tone, flanger &amp; reverb. Zero install.
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
            <KeyboardDisplay activeKeys={synth.activeKeys} accent={themeColor} playNote={synth.playNote} stopNote={synth.stopNote} labelMode="key" />
          </div>
        )}

        <div className="flex flex-col pointer-events-auto" style={{ gap: 4 }}>

          <div className="flex items-center gap-2" style={{ marginBottom: 6 }}>
            <div style={{ width: 8, height: 1, background: themeColor }} />
            <span
              className="font-[var(--font-mono)] uppercase tracking-[0.35em]"
              style={{ fontSize: 9, color: themeColor }}
            >
              Signal
            </span>
            <div style={{ flex: 1, height: 1, background: `${themeColor}30` }} />
          </div>

          <Fader label="DRIVE"  value={drive}        accent={themeColor} onChange={(v) => handleKnobChange("drive",  v)} />
          <Fader label="ECHO"   value={echo}         accent={themeColor} onChange={(v) => handleKnobChange("echo",   v)} />
          <Fader label="TONE"   value={tone}         accent={themeColor} onChange={(v) => handleKnobChange("tone",   v)} />
          <Fader label="REVERB" value={reverb}       accent={themeColor} onChange={(v) => handleKnobChange("reverb", v)} />
          <Fader label="FLANGER" value={flanger}       accent={themeColor} onChange={(v) => handleKnobChange("flanger", v)} />
          <Fader label="VOLUME" value={masterVolume} accent={themeColor} onChange={(v) => handleKnobChange("master", v)} highlight />
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

        <div style={{ flex: 1 }} />

        {(() => {
          const blocked = fx.feedbackBlocked;
          const lit = blocked || isActive;
          const tone = blocked ? "#ff5a5a" : isActive ? ledColor : "rgba(150,160,175,0.5)";
          return (
            <div className="flex items-center" style={{
              gap: 8, padding: "5px 11px", borderRadius: 999,
              border: `1px solid ${blocked ? "#ff5a5a45" : isActive ? ledColor + "45" : "rgba(255,255,255,0.08)"}`,
              background: blocked ? "rgba(255,90,90,0.07)" : isActive ? ledColor + "10" : "rgba(255,255,255,0.02)",
              transition: "border-color 240ms ease, background 240ms ease",
            }}>
              <div
                className={lit ? "animate-pulse" : ""}
                style={{ width: 7, height: 7, borderRadius: "50%", background: tone, boxShadow: lit ? `0 0 8px ${tone}` : "none", flexShrink: 0 }}
              />
              <span className="font-[var(--font-mono)]" style={{ fontSize: 9, letterSpacing: "0.08em",
                color: blocked ? "#ff9090" : isActive ? "rgba(222,226,230,0.82)" : "rgba(188,188,210,0.5)" }}>
                {blocked ? "MUTED · FEEDBACK" : isActive ? "ACTIVE · MONITORING" : fx.ready ? "BYPASS · STOMP TO ARM" : "IDLE"}
              </span>
            </div>
          );
        })()}
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
          onKeyboard={() => { setMicDismissed(true); setKeyboardMode(true); setSheetTab("keyboard"); setSheetExpanded(true); }}
          onDismiss={() => setMicDismissed(true)}
        />
      )}

      {fx.feedbackBlocked && <FeedbackModal onResume={() => fx.resumeFromFeedback()} />}

    </div>
  );
}
