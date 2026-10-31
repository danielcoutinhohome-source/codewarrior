// Small color helpers for the SVG art.
export function mix(hex: string, f: number, toWhite: boolean) {
  const h = hex.replace("#", "");
  const n = parseInt(h.length === 3 ? h.split("").map((c) => c + c).join("") : h, 16);
  const ch = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) => (toWhite ? v + (255 - v) * f : v * f));
  return "#" + ch.map((v) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, "0")).join("");
}
export const lighten = (hex: string, f: number) => mix(hex, f, true);
export const darken = (hex: string, f: number) => mix(hex, 1 - f, false);

// Perceived brightness 0..1, used to pick readable ink on a colored surface.
export function luma(hex: string) {
  const h = hex.replace("#", "");
  const n = parseInt(h, 16);
  return (0.299 * ((n >> 16) & 255) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255)) / 255;
}
