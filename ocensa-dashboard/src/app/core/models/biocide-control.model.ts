// biocide-control.model.ts
// Coincide con BiocideControlResponseDto (backend). Endpoint: /Tanks/biocide-control.
import { KpiAccent } from '../../shared/components/kpi-card/kpi-card';

export interface BiocideControlWindow {
  injectionDate: string; // ISO
  /** true = controlado, false = no controlado, null = sin dato de bacteria planctónica para evaluar. */
  controlled: boolean | null;
  daysSinceLastInjection: number | null;
  thpsPercent: number | null;
  bswPercent: number | null;
  actualInjectedDose: number | null;
  temperatureC: number | null;
  realVolume: number | null;
  ph: number | null;
  h2S: number | null;
  conductivity: number | null;
  alkalinity: number | null;
  calcium: number | null;
}

/**
 * Cinco números de un boxplot estándar (caja Q1-Q3, bigotes a 1.5*IQR) + rango real del grupo.
 * absoluteMin/absoluteMax son el mínimo/máximo real (esté o no dentro del bigote); outliers son
 * los puntos fuera del bigote.
 */
export interface BoxplotGroupStats {
  count: number;
  absoluteMin: number;
  whiskerMin: number;
  q1: number;
  median: number;
  q3: number;
  whiskerMax: number;
  absoluteMax: number;
  outliers: number[];
}

export interface BiocideControlVariable {
  /** Nombre de columna (mismo del Excel/SQL de origen). */
  variable: string;
  /** Etiqueta lista para mostrar en el eje/título del gráfico. */
  label: string;
  controlled: BoxplotGroupStats | null;
  notControlled: BoxplotGroupStats | null;
}

export interface BiocideControlResponse {
  /** Una fila por ventana de inyección ("Prebache"), para tabla/export. */
  data: BiocideControlWindow[];
  /** Estadísticas de caja (Controlado vs No controlado) por variable, para el boxplot. */
  variables: BiocideControlVariable[];
}

export interface AnalyticsMetricCard {
  title: string;
  value: number | null;
  unit: string;
  subtitle: string;
  icon: string;
  color: KpiAccent;
}

/** Punto de dataset del tipo `boxplot` (`@sgratzl/chartjs-chart-boxplot`): min/max son el rango
 *  ABSOLUTO del grupo (BoxplotGroupStats.absoluteMin/Max), no los bigotes. */
export interface BoxPoint {
  min: number;
  max: number;
  q1: number;
  median: number;
  q3: number;
  whiskerMin: number;
  whiskerMax: number;
  outliers: number[];
  count: number;
}

export interface VariableBoxChart {
  variable: string;
  label: string;
  hasData: boolean;
  data: { labels: string[]; datasets: unknown[] };
  options: Record<string, unknown>;
}