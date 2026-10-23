/** 2026-10-23 → 23/10/2026 */
export function fmtDate(value?: string | null): string {
  if (!value) return "";
  const [y, m, d] = value.slice(0, 10).split("-");
  return d && m && y ? `${d}/${m}/${y}` : value;
}

/** Codi comptable que mostra el programa antic: 430 + 7 dígits */
export function accountCode(code: number | string | null | undefined): string {
  const n = Number(code);
  return n > 0 ? "430" + String(n).padStart(7, "0") : "";
}

export function fullName(first?: string | null, last?: string | null): string {
  return [first, last].filter(Boolean).join(" ").trim();
}

export function todayISO(): string {
  const d = new Date();
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
}

export function addDaysISO(iso: string, days: number): string {
  const d = new Date(iso + "T12:00:00");
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

/** null/undefined → "" (els formularis treballen sempre amb text) */
export function s(v: unknown): string {
  return v === null || v === undefined ? "" : String(v);
}

/** Valida DNI/NIE espanyol (lletra de control). Retorna missatge o null. */
export function checkDniNie(value: string): string | null {
  const v = value.toUpperCase().replace(/[\s-]/g, "");
  if (!v) return null;
  const letters = "TRWAGMYFPDXBNJZSQVHLCKE";
  let num = v;
  if (/^[XYZ]/.test(v)) num = String("XYZ".indexOf(v[0])) + v.slice(1);
  const m = num.match(/^(\d{8})([A-Z])$/);
  if (!m) return "Format no vàlid (8 xifres + lletra, o X/Y/Z + 7 xifres + lletra)";
  return letters[Number(m[1]) % 23] === m[2] ? null : "La lletra de control no coincideix";
}

export function checkEmail(value: string): string | null {
  if (!value) return null;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim()) ? null : "Correu no vàlid";
}
