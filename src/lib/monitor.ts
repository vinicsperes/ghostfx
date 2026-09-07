import type { ErrorInfo } from "react";

type Capture = (err: unknown, info?: ErrorInfo) => void;

const dsn = import.meta.env.VITE_SENTRY_DSN;
const queued: { err: unknown; info?: ErrorInfo }[] = [];
let capture: Capture | null = null;

export function startMonitor(): void {
  if (!dsn || capture) return;
  void import("@sentry/react").then(({ init, captureException }) => {
    init({
      dsn,
      environment: import.meta.env.MODE,
      sendDefaultPii: false,
    });
    capture = (err, info) =>
      captureException(
        err,
        info ? { extra: { componentStack: info.componentStack } } : undefined,
      );
    for (const item of queued) capture(item.err, item.info);
    queued.length = 0;
  });
}

export function reportError(err: unknown, info?: ErrorInfo): void {
  if (!dsn) return;
  if (capture) capture(err, info);
  else if (queued.length < 20) queued.push({ err, info });
}
