import { ScientificValue } from './dataset-release.model';

export interface MicroRecordDto {
  date: string; // ISO: '2026-05-23T00:00:00'
  bsrPlanct: ScientificValue<number>;
  bpaPlanct: ScientificValue<number>;
  bhtPlanct: ScientificValue<number>;
  bAntPlanct: ScientificValue<number>;
  thpsPercent: ScientificValue<number>;
  standardSamplingType: string;
}

export interface MicroResponseDto {
  data: MicroRecordDto[];
}
