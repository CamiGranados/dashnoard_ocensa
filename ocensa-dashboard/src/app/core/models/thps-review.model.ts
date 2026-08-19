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
  actualInjectedDose: number | null;
  actualVolume: number | null;
  residualThps: number | null;
  bsrPlanct: number | null;
  bpaPlanct: number | null;
  bhtPlanct: number | null;
  bAntPlanct: number | null;
}

export interface PagedResult<T> {
  items: T[];
  page: number;
  pageSize: number;
  totalRecords: number;
}

export interface ThpsReviewResponse {
  summary: ThpsReviewSummary;
  data: PagedResult<ThpsReviewRecord>;
}
