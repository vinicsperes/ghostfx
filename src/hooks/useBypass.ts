import { useCallback, useEffect, useRef } from "react";

const HOLD_MS = 220;

export function useBypass({
  enabled,
  isBypassed,
  setBypass,
}: {
  enabled: boolean;
  isBypassed: boolean;
  setBypass: (on: boolean) => Promise<void>;
}) {
  const heldRef = useRef(false);
  const timerRef = useRef<number | null>(null);
  const bypassedRef = useRef(isBypassed);
  const setBypassRef = useRef(setBypass);

  useEffect(() => {
    bypassedRef.current = isBypassed;
  }, [isBypassed]);
  useEffect(() => {
    setBypassRef.current = setBypass;
  }, [setBypass]);

  const clearTimer = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const press = useCallback(() => {
    if (heldRef.current) return;
    heldRef.current = true;
    const wasBypassed = bypassedRef.current;
    void setBypassRef.current(!wasBypassed);
    clearTimer();
    timerRef.current = window.setTimeout(() => {
      timerRef.current = null;
    }, HOLD_MS);
  }, [clearTimer]);

  const release = useCallback(() => {
    if (!heldRef.current) return;
    heldRef.current = false;
    if (timerRef.current) {
      clearTimer();
      return;
    }
    void setBypassRef.current(!bypassedRef.current);
  }, [clearTimer]);

  useEffect(() => {
    if (!enabled) return;
    const typing = () => {
      const el = document.activeElement as HTMLElement | null;
      return !!el && (el.tagName === "INPUT" || el.tagName === "TEXTAREA" || el.isContentEditable);
    };
    const onDown = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() !== "b" || e.ctrlKey || e.metaKey || e.altKey || typing()) return;
      e.preventDefault();
      if (!e.repeat) press();
    };
    const onUp = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() !== "b") return;
      release();
    };
    window.addEventListener("keydown", onDown);
    window.addEventListener("keyup", onUp);
    window.addEventListener("blur", release);
    return () => {
      window.removeEventListener("keydown", onDown);
      window.removeEventListener("keyup", onUp);
      window.removeEventListener("blur", release);
    };
  }, [enabled, press, release]);

  useEffect(() => () => clearTimer(), [clearTimer]);

  return { press, release };
}
