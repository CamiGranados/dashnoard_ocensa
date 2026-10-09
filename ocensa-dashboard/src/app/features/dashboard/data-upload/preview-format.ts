export interface PreviewColumn {
  field: string;
  header: string;
}

export const EMPTY_CELL = '–';

const MAX_PREVIEW_COLUMNS = 4;
const MIN_PREVIEW_COLUMNS = 3;
const SCIENTIFIC_THRESHOLD = 10000;
const SUPERSCRIPT_DIGITS = '⁰¹²³⁴⁵⁶⁷⁸⁹';

const NUMBER_RE = /^-?\d+(?:\.\d+)?(?:e[+-]?\d+)?$/i;
const THOUSANDS_COMMA_RE = /^-?\d{1,3}(?:,\d{3})+(?:\.\d+)?$/;
const ISO_DATE_RE = /^(\d{4})-(\d{2})-(\d{2})(?:[T ](\d{2}):(\d{2}))?/;

/** Prioridad de columnas "clave" para la tarjeta de vista previa (la fecha siempre va primero). */
const KEY_COLUMN_PRIORITY: RegExp[] = [
  /^tanque$/i,
  /tipo_?muestreo/i,
  /biocida/i,
  /^bsr/i,
  /^ph$/i,
  /corros|tasa/i,
  /agua_?libre|fwv/i,
  /thps/i,
];

const NON_KEY_COLUMNS = /^(archivo|hoja|estacion|estación)$/i;

const COLUMN_CATEGORY_RULES: { pattern: RegExp; label: string }[] = [
  { pattern: /^(bsr|bpa|bht|bant)_?/i, label: 'Microbiología' },
  { pattern: /^(ph|conductividad|temperatura)/i, label: 'Fisicoquímica' },
  { pattern: /corros|^tasa/i, label: 'Corrosión' },
  { pattern: /agua_?libre|^fwv/i, label: 'Agua libre' },
];

export function isDateField(field: string): boolean {
  return /fecha/i.test(field);
}

/** Categoría por columnas presentes; sólo si apunta a una única categoría (si no, null). */
export function categoryFromColumns(columns: PreviewColumn[]): string | null {
  const found = new Set<string>();
  for (const col of columns) {
    const rule = COLUMN_CATEGORY_RULES.find((r) => r.pattern.test(col.field));
    if (rule) found.add(rule.label);
  }
  return found.size === 1 ? [...found][0] : null;
}

/** Fecha primero + hasta 3 columnas clave; el resto queda en el modal de detalle. */
export function keyColumns(columns: PreviewColumn[]): PreviewColumn[] {
  if (columns.length <= MAX_PREVIEW_COLUMNS) return columns;

  const date =
    columns.find((c) => /^fecha$/i.test(c.field)) ?? columns.find((c) => isDateField(c.field));
  const picked: PreviewColumn[] = date ? [date] : [];

  for (const pattern of KEY_COLUMN_PRIORITY) {
    if (picked.length >= MAX_PREVIEW_COLUMNS) break;
    const match = columns.find((c) => pattern.test(c.field) && !picked.includes(c));
    if (match) picked.push(match);
  }

  for (const col of columns) {
    if (picked.length >= Math.min(MIN_PREVIEW_COLUMNS, MAX_PREVIEW_COLUMNS)) break;
    if (!picked.includes(col) && !NON_KEY_COLUMNS.test(col.field)) picked.push(col);
  }

  return picked;
}

function superscript(exp: number): string {
  return String(exp)
    .split('')
    .map((c) => (c === '-' ? '⁻' : SUPERSCRIPT_DIGITS[Number(c)]))
    .join('');
}

function formatScientific(value: number): string {
  const [mantissa, exp] = value.toExponential(1).split('e');
  return `${Number(mantissa)} × 10${superscript(Number(exp))}`;
}

/** `YYYY-MM-DD[ HH:mm]` → `dd/mm/aaaa[ HH:mm]`. Otros formatos se dejan tal cual (evita invertir mes/día). */
function formatDate(raw: string): string {
  const m = ISO_DATE_RE.exec(raw);
  if (!m) return raw;
  const [, y, mo, d, hh, mm] = m;
  return hh ? `${d}/${mo}/${y} ${hh}:${mm}` : `${d}/${mo}/${y}`;
}

/** Valor para la tarjeta: vacío → "–", fechas dd/mm/aaaa, números ≤2 decimales o notación científica. */
export function formatPreviewCell(field: string, value: unknown): string {
  const raw = String(value ?? '').trim();
  if (!raw) return EMPTY_CELL;
  if (isDateField(field)) return formatDate(raw);

  const normalized = THOUSANDS_COMMA_RE.test(raw) ? raw.replace(/,/g, '') : raw.replace(',', '.');
  if (!NUMBER_RE.test(normalized)) return raw;

  const num = Number(normalized);
  if (Math.abs(num) >= SCIENTIFIC_THRESHOLD) return formatScientific(num);
  return String(Number(num.toFixed(2)));
}
