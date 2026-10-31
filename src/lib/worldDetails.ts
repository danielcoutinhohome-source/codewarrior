import type { Decor, Theme } from "./game";
// One quiet band on each side, with breathing room between silhouettes.
// Landmarks belong in the distance; the threshold is the focal point.
export function worldDetails(theme: Theme, mobile: boolean) {
  const props = Array.from({ length: mobile ? 18 : 26 }, (_, i) => {
    const row=Math.floor(i/2);
    return { z:1.8+row*1.16+(i%2)*.32, lat:(i%2?1:-1)*(.88+(row%3)*.23), size:.2+(row%3)*.025,
      kind:theme.decor[(row+(i%2))%theme.decor.length] as Decor };
  });
  const landmarks=[{z:8.6,lat:-1.9,variant:2},{z:14.8,lat:2.1,variant:0}];
  return {props,landmarks};
}
