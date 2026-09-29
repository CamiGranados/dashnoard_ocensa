// biocide-efficacy.model.ts
// Coincide con BiocideEfficacyResponseDto (backend). Endpoint: /Tanks/biocide-efficacy.
import { PlanctonicaKey } from '../../shared/charts/chart-tokens';

/** Tabla 1: por ventana de inyección completa ("Prebache" hasta la siguiente). Todo o nada: si
 *  una sola muestra del periodo se pasó del umbral, la ventana completa cuenta como no controlada. */
export interface InjectionWindowEfficacy {
  injectionsCount: number;
  controlPercent: number | null;
  averageDaysToRebound: number | null;
  bsrControlPercent: number | null;
  bpaControlPercent: number | null;
  bhtControlPercent: number | null;
  bAntControlPercent: number | null;
}

/** Tabla 2: por muestra individual (Postbache/Seguimiento), sin mirar la ventana completa. */
export interface SampleControlSummary {
  bsrSamplesCount: number;
  bsrControlPercent: number | null;
  bsrOutOfControlPercent: number | null;

  bpaSamplesCount: number;
  bpaControlPercent: number | null;
  bpaOutOfControlPercent: number | null;

  bhtSamplesCount: number;
  bhtControlPercent: number | null;
  bhtOutOfControlPercent: number | null;

  bAntSamplesCount: number;
  bAntControlPercent: number | null;
  bAntOutOfControlPercent: number | null;

  evaluatedSamplesCount: number;
  controlPercent: number | null;
  outOfControlPercent: number | null;
}

/** Tabla 3: THPS promedio según si esa muestra individual quedó controlada o no. */
export interface ThpsByControlStatus {
  controlled: boolean;
  averageThpsPercent: number;
  samplesCount: number;
}

export interface BiocideEfficacyResponse {
  byInjectionWindow: InjectionWindowEfficacy;
  bySample: SampleControlSummary;
  thpsByControlStatus: ThpsByControlStatus[];
}

/** Fila de la tabla "eficacia por bacteria": fusiona byInjectionWindow + bySample para las 4
 *  bacterias planctónicas (mismo color que microbiology/thps-tolerance, vía PLANCTONICA_TOKEN).
 *  `key` es null para la fila de totales (agregados de bySample, sin bacteria específica). */
export interface BacteriaEfficacyRow {
  key: PlanctonicaKey | null;
  label: string;
  windowControlPercent: number | null;
  sampleControlPercent: number | null;
  sampleOutOfControlPercent: number | null;
  samplesCount: number;
}
