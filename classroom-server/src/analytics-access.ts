// Server configuration only. Never trust a browser-supplied role or capability.
export function trafficOwners(config: string | undefined): string[] {
  const names = [...new Set((config || "").split(",").map(s => s.trim().toLowerCase()).filter(Boolean))];
  // Fail closed for missing, invalid, or accidentally broad configuration.
  return names.length > 0 && names.length <= 2 && names.every(s => /^[a-z0-9_]{3,20}$/.test(s)) ? names : [];
}
export const canViewTraffic = (username: string, config: string | undefined) => trafficOwners(config).includes(username.toLowerCase());
