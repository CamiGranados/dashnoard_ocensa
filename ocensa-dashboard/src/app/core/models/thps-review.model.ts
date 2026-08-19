// thps-review.model.ts

export interface ThpsReviewSummary {
  residualMedian: number | null;
  effectiveDoseMedian: number | null;
  retentionMedian: number | null;
  eventsWithRealDoseCount: number;
  totalRecords: number;
}

export interface ThpsReviewRecord {
  date: string; // ISO: '2026-05-23T00:00:00'
  realInjectedDose: number | null;
  scheduled_Dose: number | null;
  residual_per: number | null;
  reported_FWV: number | null;
  estimated_FWV: number | null;
  calculated_FWV: number | null;
  bAntPlanct: number | null;
  bhtPlanct: number | null;
  bpaPlanct: number | null;
  bsrPlanct: number | null;
}

export interface ThpsReviewResponse {
  summary: ThpsReviewSummary;
  data: ThpsReviewRecord[];
}

export interface ThpsChartRow {
  timestamp: number; // date, como epoch ms, para el eje X numérico
  dosisReal: number | null; // realInjectedDose
  dosisProgramada: number | null; // scheduled_Dose
  residualPct: number | null; // residual_per
  fwvReportada: number | null; // reported_FWV
  fwvEstimada: number | null; // estimated_FWV
  fwvCalculada: number | null; // calculated_FWV
  bant: number | null; // bAntPlanct
  bht: number | null; // bhtPlanct
  bpa: number | null; // bpaPlanct
  bsr: number | null; // bsrPlanct
}

export interface ThpsReviewMetricCard {
  title: string;
  value: number | null;
  unit: string;
  icon: string;
  color: 'info' | 'success' | 'warning' | 'danger';
}