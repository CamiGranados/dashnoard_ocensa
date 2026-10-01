import { Component, input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TableModule } from 'primeng/table';
import { BacteriaEfficacyRow } from '../../../../../core/models/biocide-efficacy.model';
import {
  chartToken,
  PLANCTONICA_TOKEN,
  PlanctonicaKey,
} from '../../../../../shared/charts/chart-tokens';

/** Umbrales (en %) de la regla de color de "% control (muestra) & eficacia". */
export const EFFICACY_THRESHOLDS = { low: 40, high: 70 } as const;

export type EfficacyColor = 'red' | 'amber' | 'green';

/** < low → rojo · low ≤ valor ≤ high → ámbar · > high → verde. */
export function getEfficacyColor(
  value: number,
  thresholds: { low: number; high: number } = EFFICACY_THRESHOLDS,
): EfficacyColor {
  if (value < thresholds.low) return 'red';
  if (value <= thresholds.high) return 'amber';
  return 'green';
}

type Tone = 'ok' | 'bad' | 'warn' | 'info' | 'neutral';
interface Level {
  label: string;
  tone: Tone;
}

/** Estado de la ventana según % control (ventana). */
function windowLevel(value: number): Level {
  if (value >= 80) return { label: 'Cumple Meta', tone: 'ok' };
  if (value >= 60) return { label: 'Aceptable', tone: 'info' };
  if (value >= 40) return { label: 'Intermedio', tone: 'neutral' };
  return { label: 'Crítico', tone: 'bad' };
}

/** Nivel según % fuera de control (muestra). */
function outOfControlLevel(value: number): Level {
  if (value <= 25) return { label: 'Bajo', tone: 'ok' };
  if (value < 40) return { label: 'Moderado', tone: 'neutral' };
  if (value <= 50) return { label: 'Medio', tone: 'warn' };
  return { label: 'Alto', tone: 'bad' };
}

@Component({
  selector: 'app-efficacy-table',
  imports: [CommonModule, TableModule],
  templateUrl: './efficacy-table.html',
  styleUrl: './efficacy-table.css',
})
export class EfficacyTable {
  readonly rows = input.required<BacteriaEfficacyRow[]>();
  readonly totalSamples = input<number>(0);

  /** Resuelve el swatch de color de una fila (PLANCTONICA_TOKEN; la fila "Total" no tiene uno propio). */
  protected bacteriaColor(row: BacteriaEfficacyRow): string | null {
    return row.key == null ? null : chartToken(PLANCTONICA_TOKEN[row.key]);
  }

  private static readonly BACTERIA_DESCRIPTIONS: Record<PlanctonicaKey, string> = {
    bsr: 'Sulfatorreductoras',
    bpa: 'Productoras Ácido',
    bht: 'Heterótrofas Totales',
    bant: 'Anaerobias Totales',
  };

  /** Nombre completo de la bacteria (fila "Total" no tiene uno propio). */
  protected bacteriaDescription(row: BacteriaEfficacyRow): string | null {
    return row.key == null ? null : EfficacyTable.BACTERIA_DESCRIPTIONS[row.key];
  }

  private static readonly BACTERIA_ROLES: Record<PlanctonicaKey, { role: string; impact: string }> = {
    bsr: { role: 'Cepa crítica MIC:', impact: 'Generación de H₂S y picadura severa' },
    bpa: { role: 'Cepa de riesgo:', impact: 'Reducción local de pH y daño pitting' },
    bht: { role: 'Biomasa facultativa:', impact: 'Formación de lodos y bio-acumulación' },
    bant: { role: 'Consorcio anóxico:', impact: 'Sinergia con BSR en interfase agua-aceite' },
  };

  protected bacteriaRole(row: BacteriaEfficacyRow) {
    return row.key == null ? null : EfficacyTable.BACTERIA_ROLES[row.key];
  }

  protected windowLevel(row: BacteriaEfficacyRow): Level | null {
    return row.windowControlPercent == null ? null : windowLevel(row.windowControlPercent);
  }

  protected outOfControlLevel(row: BacteriaEfficacyRow): Level | null {
    return row.sampleOutOfControlPercent == null
      ? null
      : outOfControlLevel(row.sampleOutOfControlPercent);
  }

  protected efficacyColor(value: number): EfficacyColor {
    return getEfficacyColor(value);
  }

  /** Posición (%) de la marca de meta en la barra de eficacia. */
  protected readonly efficacyGoal = EFFICACY_THRESHOLDS.high;
}
