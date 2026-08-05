import { useLayoutEffect, useState, type ReactNode, type RefObject } from "react";
import { createPortal } from "react-dom";

const MARGIN = 8;

export function Popover({
  anchorRef,
  open,
  onClose,
  width,
  placement = "top",
  align = "left",
  children,
}: {
  anchorRef: RefObject<HTMLElement | null>;
  open: boolean;
  onClose: () => void;
  width?: number;
  placement?: "top" | "bottom";
  align?: "left" | "right";
  children: ReactNode;
}) {
  const [box, setBox] = useState<{
    left: number;
    top?: number;
    bottom?: number;
    width: number;
  } | null>(null);

  useLayoutEffect(() => {
    if (!open) return;
    const place = () => {
      const el = anchorRef.current;
      if (!el) return;
      const r = el.getBoundingClientRect();
      const w = width ?? r.width;
      const raw = align === "right" ? r.right - w : r.left;
      const left = Math.max(MARGIN, Math.min(raw, window.innerWidth - w - MARGIN));
      setBox(
        placement === "top"
          ? { left, bottom: window.innerHeight - r.top + 6, width: w }
          : { left, top: r.bottom + 6, width: w },
      );
    };
    place();
    window.addEventListener("resize", place);
    window.addEventListener("scroll", place, true);
    return () => {
      window.removeEventListener("resize", place);
      window.removeEventListener("scroll", place, true);
    };
  }, [open, anchorRef, width, placement, align]);

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
        top: box.top,
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
