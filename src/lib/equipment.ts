import type { Avatar } from "./db";
import type { ShopItem } from "./game";

const DEFAULTS: Partial<Avatar> = { body: "bot", finish: "standard", aura: "none", weapon: "saber", headwear: "none" };

// Shop previews and saved equipment use the same slot mapping. A weapon can
// never accidentally replace an aura when another cosmetic category is added.
export function withEquipment(avatar: Avatar, item: ShopItem): Avatar {
  return item.kind === "power" ? avatar : { ...avatar, [item.kind]: item.value };
}

export function equipmentSelected(avatar: Avatar, item: ShopItem): boolean {
  return item.kind !== "power" && (avatar[item.kind] || DEFAULTS[item.kind]) === item.value;
}
