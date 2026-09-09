// overview.model.ts

/** Par valor/fecha que repite el backend */
export interface Measurement<T = number> {
  value: T;
  date: string; // ISO: '2026-05-23T00:00:00'
}

// export interface LastValues {
//   bAnT: Measurement;
//   bht: Measurement;
//   bpa: Measurement;
//   bsr: Measurement;
//   company: Measurement<string>;
//   reportedFwv: Measurement;
//   thps: Measurement;
//   lastMeasurementDate: string;
// }
// --------------------------------------------- FWV -----------------------
export interface FreeWater {
  meanDeviation: number | null;
  stdDeviation: number | null;
  meanAbsoluteDeviation: number | null;
  outOfTolerancePercent: number | null;
  accumulatedIncreasedWater: number | null;
  months: FreeWaterMonth[];
}

interface FreeWaterMonth {
  year: number;
  month: number;
  reportedMean: number;
  calculatedMean: number;
  deviation: number;
}

// --------------------------------------------- DOSE -----------------------
export interface Dose {
  globalCompliancePercent: number | null;
  deviationPercent: number | null;
  outOfToleranceCount: number | null;
  evaluatedCount: number | null;
  accumulatedActualVolume: number | null;
  months: DoseMonth[];
}

interface DoseMonth {
  year: number;
  month: number;
  scheduledMean: number;
  injectedMean: number;
  deviation: number;
}

// --------------------------------------------- MICROBIOLOGY -----------------------
export interface Microbiology {
  inControlCount: number;
  totalCount: number;
  controlPercent: number | null;
  variables: MicrobiologyVariable[];
  monthlyTotals: MicrobiologyMonthTotal[];
}

export interface MicrobiologyVariable {
  key: MicrobiologyKey;          // "BSR" | "BPA" | "BHT" | "BAnT"
  inControlCount: number;
  totalCount: number;
  controlPercent: number | null; // columna "Total periodo"
  months: MicrobiologyMonthCell[];
}

// MicrobiologyMonthCellDto (los meses sin dato NO vienen -> pintar "sin muestreo")
export interface MicrobiologyMonthCell {
  year: number;
  month: number;
  inControlCount: number;
  totalCount: number;
}

// MicrobiologyMonthTotalDto (fila "Todas las variables")
export interface MicrobiologyMonthTotal {
  year: number;
  month: number;
  inControlCount: number;
  totalCount: number;
  controlPercent: number | null;
}

export type MicrobiologyKey = 'BSR' | 'BPA' | 'BHT' | 'BAnT';



export interface Summary {
  bsrInControlCount: number;
  categoryNace: string | null;
  levelAlarm: string | null;
  thpsMedian: number;
}

export interface OverviewResponse {
  summary: Summary;
  freeWater: FreeWater;
  dose: Dose;
  microbiology: Microbiology;
}