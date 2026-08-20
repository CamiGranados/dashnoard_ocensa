import { ScientificValue } from './dataset-release.model';

/** Par valor/fecha que repite el backend */
export interface Measurement<T = number> extends ScientificValue<T> {
  date: string | null;
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
  bsrInControlCount: number | null;
  categoryNace: string | null;
  levelAlarm: string | null;
  thpsMedian: number | null;
}

export interface OverviewResponse {
  summary: Summary;
  lastValues: LastValues;
}
