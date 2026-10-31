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

// Special paints: "gold" and "rainbow" are not hex colors, so art asks for a solid stand-in.
export const RAINBOW_STOPS = ["#FF4D6D", "#FF9F1C", "#FFE14D", "#3EE07A", "#3DB8FF", "#8B5CF6", "#FF4D6D"];
export const isSpecial = (c?: string) => c === "gold" || c === "rainbow";
export const solid = (c: string) => (c === "gold" ? "#FFC83D" : c === "rainbow" ? "#FF5AD9" : c);
// A CSS background for a swatch or chip.
export function paintCss(c: string) {
  if (c === "gold") return "radial-gradient(circle at 35% 30%, #FFF6C8, #FFC83D 45%, #B97F00)";
  if (c === "rainbow") return `conic-gradient(from 200deg, ${RAINBOW_STOPS.join(", ")})`;
  return `radial-gradient(circle at 35% 30%, ${lighten(c, 0.5)}, ${c} 55%, ${darken(c, 0.5)})`;
}
