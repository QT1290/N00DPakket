// Gedeelde datumlogica voor de app en de wekelijkse controle.

export const STANDAARD_DAGEN = 21;

// Dagen tussen vandaag en een ISO-datum (YYYY-MM-DD), op kalenderdagen.
export function dagenTot(iso, vandaag = new Date()) {
  if (!iso) return null;
  const [j, m, d] = iso.split("-").map(Number);
  const doel = Date.UTC(j, m - 1, d);
  const nu = Date.UTC(vandaag.getFullYear(), vandaag.getMonth(), vandaag.getDate());
  return Math.round((doel - nu) / 86400000);
}

// "bad" = verlopen, "warn" = binnen de waarschuwingstermijn, "ok", "none" = geen datum.
export function status(item, dagen = STANDAARD_DAGEN, vandaag = new Date()) {
  const n = dagenTot(item.houdbaar, vandaag);
  if (n === null) return "none";
  if (n < 0) return "bad";
  if (n <= dagen) return "warn";
  return "ok";
}
