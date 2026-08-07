export const LANES = 4;
export const LANE_H = 40;
export const LANE_GAP = 4;
export const RULER_H = 18;

export function slotAt(
  rect: DOMRect,
  x: number,
  y: number,
  pps: number,
): { lane: number; at: number } {
  const at = Math.max(0, (x - rect.left) / pps);
  const lane = Math.max(
    0,
    Math.min(LANES - 1, Math.round((y - rect.top - RULER_H) / (LANE_H + LANE_GAP))),
  );
  return { lane, at };
}
