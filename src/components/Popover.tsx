import { useLayoutEffect, useState, type ReactNode, type RefObject } from "react";
import { createPortal } from "react-dom";

const MARGIN = 8;

export function Popover({
  anchorRef,
  open,
  onClose,
  width,
  children,
}: {
  anchorRef: RefObject<HTMLElement | null>;
  open: boolean;
  onClose: () => void;
  width?: number;
  children: ReactNode;
}) {
  const [box, setBox] = useState<{ left: number; bottom: number; width: number } | null>(null);

  useLayoutEffect(() => {
    if (!open) return;
    const place = () => {
      const el = anchorRef.current;
      if (!el) return;
      const r = el.getBoundingClientRect();
      const w = width ?? r.width;
      const left = Math.max(MARGIN, Math.min(r.left, window.innerWidth - w - MARGIN));
      setBox({ left, bottom: window.innerHeight - r.top + 6, width: w });
    };
    place();
    window.addEventListener("resize", place);
    window.addEventListener("scroll", place, true);
    return () => {
      window.removeEventListener("resize", place);
      window.removeEventListener("scroll", place, true);
    };
  }, [open, anchorRef, width]);

  useLayoutEffect(() => {
    if (!open) return;
    const away = () => onClose();
    window.addEventListener("pointerdown", away);
    return () => window.removeEventListener("pointerdown", away);
  }, [open, onClose]);

  if (!open || !box) return null;

  return createPortal(
    <div
      className="tool-tray-in"
      onPointerDown={(e) => e.stopPropagation()}
      style={{
        position: "fixed",
        left: box.left,
        bottom: box.bottom,
        width: box.width,
        maxHeight: "min(52vh, 320px)",
        overflowY: "auto",
        zIndex: 200,
        padding: 5,
        borderRadius: 10,
        background: "rgba(9,11,14,0.98)",
        border: "1px solid rgba(231,228,220,0.13)",
        boxShadow: "0 18px 44px rgba(0,0,0,0.7)",
      }}
    >
      {children}
    </div>,
    document.body,
  );
}
