/**
 * "Pipes" – pure transformation functions used in the views (React equivalent of Angular pipes).
 * They can be chained with `pipe(value, fn1, fn2, ...)`, e.g. pipe(text, truncate(80), capitalize).
 */

export const pipe = (value, ...fns) => fns.reduce((acc, fn) => fn(acc), value);

const YEAR_MS = 365.25 * 24 * 3600 * 1000;

/** 1) Date of birth -> age in years */
export function age(dateOfBirth) {
  if (!dateOfBirth) return null;
  return Math.floor((Date.now() - new Date(dateOfBirth).getTime()) / YEAR_MS);
}

const MONTHS_MK = ['јануари', 'февруари', 'март', 'април', 'мај', 'јуни', 'јули', 'август', 'септември', 'октомври', 'ноември', 'декември'];

/** 2) Date -> "20.09.2026" (short) or "20 септември 2026, 14:32" (long) */
export function formatDate(date, format = 'short') {
  if (!date) return '–';
  const d = new Date(date);
  if (Number.isNaN(d.getTime())) return '–';
  if (format === 'long') {
    const hh = String(d.getHours()).padStart(2, '0');
    const mm = String(d.getMinutes()).padStart(2, '0');
    return `${d.getDate()} ${MONTHS_MK[d.getMonth()]} ${d.getFullYear()}, ${hh}:${mm}`;
  }
  if (format === 'iso') return d.toISOString().slice(0, 10);
  return `${String(d.getDate()).padStart(2, '0')}.${String(d.getMonth() + 1).padStart(2, '0')}.${d.getFullYear()}`;
}

/** 3) Market value -> "€450K", "€1.2M" */
export function marketValue(value) {
  const v = Number(value) || 0;
  if (v >= 1e6) return `€${(v / 1e6).toFixed(v % 1e6 === 0 ? 0 : 1)}M`;
  if (v >= 1e3) return `€${Math.round(v / 1e3)}K`;
  return `€${v}`;
}

/** 4) Position code -> full name */
export const POSITION_NAMES = {
  GK: 'Голман', CB: 'Централен бек', LB: 'Лев бек', RB: 'Десен бек', CDM: 'Дефанзивен везен',
  CM: 'Централен везен', CAM: 'Офанзивен везен', LW: 'Лево крило', RW: 'Десно крило', ST: 'Напаѓач',
};
export const positionName = (code, withCode = false) =>
  (POSITION_NAMES[code] ? `${POSITION_NAMES[code]}${withCode ? ` (${code})` : ''}` : code || '–');

/** 5) Player status / recommendation / foot -> Macedonian label + Bootstrap colour */
export const STATUS = {
  monitoring: { label: 'Се следи', color: 'warning' },
  shortlisted: { label: 'Потесен избор', color: 'primary' },
  recommended: { label: 'Препорачан', color: 'success' },
  rejected: { label: 'Одбиен', color: 'danger' },
};
export const RECOMMENDATION = {
  sign: { label: 'Потпиши', color: 'success', icon: 'bi-pen' },
  monitor: { label: 'Следи', color: 'warning', icon: 'bi-eye' },
  reject: { label: 'Одбиј', color: 'danger', icon: 'bi-x-circle' },
};
export const FOOT = { left: 'Лева', right: 'Десна', both: 'Двете' };
export const statusLabel = (s) => STATUS[s]?.label || s;
export const recommendationLabel = (r) => RECOMMENDATION[r]?.label || r;
export const footLabel = (f) => FOOT[f] || '–';

/** 6) Rating (1–10) -> Bootstrap colour class */
export function ratingColor(r) {
  if (r == null) return 'secondary';
  if (r >= 7.5) return 'success';
  if (r >= 6.5) return 'warning';
  return 'danger';
}

/** 7) Text -> truncated text (curried so it can be used inside pipe()) */
export const truncate = (n = 100) => (text = '') => (text.length > n ? `${text.slice(0, n).trimEnd()}…` : text);

/** 8) First letter upper case */
export const capitalize = (s = '') => s.charAt(0).toUpperCase() + s.slice(1);

/** 9) Date -> relative time ("пред 2 часа") */
export function timeAgo(date) {
  const diff = (Date.now() - new Date(date).getTime()) / 1000;
  if (diff < 60) return 'пред момент';
  if (diff < 3600) return `пред ${Math.floor(diff / 60)} мин.`;
  if (diff < 86400) return `пред ${Math.floor(diff / 3600)} ч.`;
  if (diff < 86400 * 30) return `пред ${Math.floor(diff / 86400)} дена`;
  return formatDate(date);
}

/** 10) Name -> initials ("David Trokoski" -> "DT") */
export const initials = (name = '') =>
  name.split(/[\s._]+/).filter(Boolean).slice(0, 2).map((w) => w[0].toUpperCase()).join('');
