import { ScientificValue, ScientificValueStatus } from './dataset-release.model';

export interface ThpsReviewSummary {
  residualMedian: number | null;
  effectiveDoseMedian: number | null;
  retentionMedian: number | null;
  eventsWithRealDoseCount: number;
  totalRecords: number;
}

export interface ThpsReviewRecord {
  date: string; // ISO: '2026-05-23T00:00:00'
  realInjectedDose: ScientificValue<number>;
  scheduled_Dose: ScientificValue<number>;
  residual_per: ScientificValue<number>;
  reported_FWV: ScientificValue<number>;
  estimated_FWV: ScientificValue<number>;
  calculated_FWV: ScientificValue<number>;
  bAntPlanct: ScientificValue<number>;
  bhtPlanct: ScientificValue<number>;
  bpaPlanct: ScientificValue<number>;
  bsrPlanct: ScientificValue<number>;
}

export interface ThpsReviewResponse {
  summary: ThpsReviewSummary;
  data: ThpsReviewRecord[];
}

export interface ThpsChartRow {
  timestamp: number; // date, como epoch ms, para el eje X numérico
  dosisReal: ThpsChartValue;
  dosisProgramada: ThpsChartValue;
  residualPct: ThpsChartValue;
  fwvReportada: ThpsChartValue;
  fwvEstimada: ThpsChartValue;
  fwvCalculada: ThpsChartValue;
  bant: ThpsChartValue;
  bht: ThpsChartValue;
  bpa: ThpsChartValue;
  bsr: ThpsChartValue;
}

export interface ThpsChartValue {
  numeric: number | null;
  display: string;
  status: ScientificValueStatus;
}

export interface ThpsReviewMetricCard {
  title: string;
  value: number | null;
  unit: string;
  icon: string;
  color: 'info' | 'success' | 'warning' | 'danger';
}
