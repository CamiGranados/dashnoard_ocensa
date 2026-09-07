import type { Chart } from 'chart.js';
import { chartToken } from './chart-tokens';

/**
 * Exportación de una gráfica: PNG (con cabecera compuesta), CSV de las series y copia al
 * portapapeles. Usado por la herramienta "descargar" y el menú "más opciones" de
 * `<app-chart-toolbar>`, a través de `ChartFrame`.
 *
 * Chart.js pinta en `<canvas>`: el PNG del canvas ya trae ejes y líneas de referencia, pero
 * NO el título/subtítulo (son HTML). `chartToPng` los compone en un canvas offscreen para
 * cumplir "la exportación conserva título, subtítulo y líneas de referencia".
 */

interface PngHeader {
  title: string;
  subtitle?: string;
}

export type CsvCell = string | number | null;

/** Punto `{x, y}` de un dataset de Chart.js (gráficas de eje temporal/lineal). */
function isXYPoint(p: unknown): p is { x: number | string; y: number | null } {
  return typeof p === 'object' && p !== null && 'x' in p && 'y' in p;
}

function pointValue(p: unknown): number | null {
  if (typeof p === 'number') return p;
  if (isXYPoint(p)) return typeof p.y === 'number' ? p.y : null;
  return null;
}

function slug(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
}

function looksLikeTimestamp(n: number): boolean {
  return Number.isFinite(n) && n > 1e11;
}

function isoMonth(ms: number): string {
  return new Date(ms).toISOString().slice(0, 7);
}

function csvField(value: CsvCell): string {
  const s = value == null ? '' : String(value);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

/** Rango de fechas/etiquetas para el nombre de archivo, leído del `data` de la gráfica. */
function dataRange(chart: Chart): string {
  const labels = chart.data.labels;
  if (Array.isArray(labels) && labels.length) {
    return `${slug(String(labels[0]))}_${slug(String(labels[labels.length - 1]))}`;
  }
  const xs: number[] = [];
  for (const ds of chart.data.datasets) {
    for (const p of ds.data as unknown[]) {
      if (isXYPoint(p) && typeof p.x === 'number') xs.push(p.x);
    }
  }
  if (xs.length) {
    const min = Math.min(...xs);
    const max = Math.max(...xs);
    return looksLikeTimestamp(min) ? `${isoMonth(min)}_${isoMonth(max)}` : `${min}_${max}`;
  }
  return new Date().toISOString().slice(0, 10);
}

/** `desviacion-fwv-nov-25_may-26` — base (título o `exportName`) + rango leído del `data`. */
export function buildChartFileName(baseName: string, chart: Chart): string {
  return `${slug(baseName)}-${dataRange(chart)}`;
}

export interface ChartTable {
  headers: string[];
  rows: CsvCell[][];
}

/** Tabla plana de las series: una fila por etiqueta/x, una columna por serie. Base de CSV y "ver datos". */
export function chartToTable(chart: Chart): ChartTable {
  const datasets = chart.data.datasets;
  const seriesNames = datasets.map((d, i) => d.label ?? `Serie ${i + 1}`);
  const labels = chart.data.labels;
  const rows: CsvCell[][] = [];

  if (Array.isArray(labels) && labels.length) {
    labels.forEach((label, i) => {
      rows.push([String(label), ...datasets.map((d) => pointValue((d.data as unknown[])[i]))]);
    });
    return { headers: ['', ...seriesNames], rows };
  }

  // Series de puntos {x,y}: eje X común ordenado.
  const xSet = new Set<number | string>();
  for (const d of datasets) {
    for (const p of d.data as unknown[]) if (isXYPoint(p)) xSet.add(p.x);
  }
  const xs = [...xSet].sort((a, b) => (a < b ? -1 : a > b ? 1 : 0));
  for (const x of xs) {
    const label = typeof x === 'number' && looksLikeTimestamp(x) ? new Date(x).toISOString() : x;
    const cells = datasets.map((d) => {
      const hit = (d.data as unknown[]).find((p) => isXYPoint(p) && p.x === x);
      return hit ? pointValue(hit) : null;
    });
    rows.push([label as CsvCell, ...cells]);
  }
  return { headers: ['x', ...seriesNames], rows };
}

/** Serializa una matriz de celdas a CSV (CRLF, campos con coma/comilla escapados). */
export function matrixToCsv(rows: CsvCell[][]): string {
  return rows.map((r) => r.map(csvField).join(',')).join('\r\n');
}

/** CSV con una fila por etiqueta/x y una columna por serie. Soporta `data` numérico y `{x,y}`. */
export function chartToCsv(chart: Chart): string {
  const table = chartToTable(chart);
  return matrixToCsv([table.headers, ...table.rows]);
}

/**
 * Compone un PNG (dataURL): fondo blanco + título + subtítulo + los `<canvas>` apilados en
 * vertical. Un solo canvas → gráfica normal; varios → bandas sincronizadas (thps).
 */
function compositePng(canvases: HTMLCanvasElement[], header: PngHeader, dpr: number): string {
  const width = Math.max(...canvases.map((c) => c.width));
  const padX = 16 * dpr;
  const titleSize = 16 * dpr;
  const subSize = 12 * dpr;
  const headerH = header.subtitle ? 58 * dpr : 40 * dpr;

  const out = document.createElement('canvas');
  out.width = width;
  out.height = headerH + canvases.reduce((h, c) => h + c.height, 0);
  const ctx = out.getContext('2d');
  if (!ctx) return canvases[0].toDataURL('image/png');

  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, out.width, out.height);

  ctx.textBaseline = 'top';
  ctx.fillStyle = chartToken('--chart-axis-title', '#1c4463');
  ctx.font = `700 ${titleSize}px Inter, sans-serif`;
  ctx.fillText(header.title, padX, 12 * dpr);
  if (header.subtitle) {
    ctx.fillStyle = chartToken('--chart-axis-text', '#6b7a99');
    ctx.font = `400 ${subSize}px Inter, sans-serif`;
    ctx.fillText(header.subtitle, padX, 12 * dpr + titleSize + 6 * dpr);
  }

  let y = headerH;
  for (const c of canvases) {
    ctx.drawImage(c, 0, y);
    y += c.height;
  }
  return out.toDataURL('image/png');
}

/** PNG (dataURL) = fondo blanco + título + subtítulo + el canvas de la gráfica debajo. */
export function chartToPng(chart: Chart, header: PngHeader): string {
  return compositePng([chart.canvas], header, chart.currentDevicePixelRatio || 1);
}

/** PNG (dataURL) de varias gráficas apiladas (bandas sincronizadas de thps-tolerance). */
export function stackChartsToPng(charts: readonly Chart[], header: PngHeader): string {
  return compositePng(
    charts.map((c) => c.canvas),
    header,
    charts[0]?.currentDevicePixelRatio || 1,
  );
}

/** Descarga un dataURL (PNG) como archivo. El sandbox del navegador ya permite `<a download>`. */
export function downloadDataUrl(dataUrl: string, fileName: string): void {
  const a = document.createElement('a');
  a.href = dataUrl;
  a.download = fileName;
  a.click();
}

/** Descarga texto (CSV) como archivo vía Blob. */
export function downloadText(text: string, fileName: string, mime = 'text/csv;charset=utf-8'): void {
  const url = URL.createObjectURL(new Blob(['﻿' + text], { type: mime }));
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 0);
}

/** Copia un PNG (dataURL) al portapapeles. Rechaza si el navegador no lo soporta. */
export async function copyPngToClipboard(dataUrl: string): Promise<void> {
  if (typeof ClipboardItem === 'undefined' || !navigator.clipboard?.write) {
    throw new Error('El navegador no permite copiar imágenes al portapapeles.');
  }
  const blob = await (await fetch(dataUrl)).blob();
  await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
}

/** Copia el PNG de la gráfica (con cabecera) al portapapeles. */
export function copyChartImage(chart: Chart, header: PngHeader): Promise<void> {
  return copyPngToClipboard(chartToPng(chart, header));
}
