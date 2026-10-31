import type { Decor, Theme } from "./game";

// Stable layouts avoid scenery jumping on rerenders. Three roadside bands keep
// the central battle path open and maintain detail throughout the camera route.
export function worldDetails(theme: Theme, mobile: boolean) {
  const count = mobile ? 60 : 96;
  const props = Array.from({ length: count }, (_, i) => {
    const row = Math.floor(i / (mobile ? 4 : 6));
    const band = Math.floor(i % (mobile ? 4 : 6) / 2);
    return {
      z: 1.1 + row * 1.12 + (i % 2) * .23 + band * .16,
      lat: (i % 2 ? 1 : -1) * (.92 + band * .79 + ((i * 17) % 7) * .045),
      size: .13 + ((i * 13) % 5) * .022,
      kind: theme.decor[(row + band * 2 + (i % 2)) % theme.decor.length] as Decor,
    };
  });
  const landmarks = Array.from({ length: mobile ? 8 : 12 }, (_, i) => ({
    z: 2.4 + Math.floor(i / 2) * 2.65 + (i % 2) * .65,
    lat: (i % 2 ? 1 : -1) * (1.8 + (i % 3) * .18),
    variant: i % 3,
  }));
  return { props, landmarks };
}
