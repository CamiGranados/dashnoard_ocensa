// overview.model.ts

/** Par valor/fecha que repite el backend */
export interface Measurement<T = number> {
  value: T;
  date: string; // ISO: '2026-05-23T00:00:00'
}

export interface LastValues {
  bAnT: Measurement;
  bht: Measurement;
  bpa: Measurement;
  bsr: Measurement;
  company: Measurement<string>;
  reportedFwv: Measurement;
  thps: Measurement;
  lastMeasurementDate: string; // ojo: este NO es objeto, es string plano
}

export interface Summary {
  bsrInControlCount: number;
  categoryNace: string | null;
  levelAlarm: string | null;
  thpsMedian: number;
}

export interface OverviewResponse {
  summary: Summary;
  lastValues: LastValues;
}