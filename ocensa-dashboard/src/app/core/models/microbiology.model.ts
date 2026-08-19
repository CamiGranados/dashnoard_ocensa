// microbiology.model.ts

export interface MicroRecordDto {
  date: string; // ISO: '2026-05-23T00:00:00'
  bsrPlanct: number | null;
  bpaPlanct: number | null;
  bhtPlanct: number | null;
  bAntPlanct: number | null;
  thpsPercent: number | null;
  standardSamplingType: string;
}

export interface MicroResponseDto {
  data: MicroRecordDto[];
}
