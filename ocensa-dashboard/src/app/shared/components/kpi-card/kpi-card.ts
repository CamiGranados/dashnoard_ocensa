import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { DecimalPipe } from '@angular/common';

/** Color de acento de la tarjeta. Se resuelve a un token de styles.css en el CSS. */
export type KpiAccent = 'info' | 'success' | 'warning' | 'danger';

/**
 * Tarjeta de KPI presentacional, compartida por `overview` y `thps-tolerance`.
 * No tiene estado ni lógica de negocio: recibe el valor ya calculado y lo pinta.
 *
 * - `value` string -> se pinta tal cual; number -> se formatea con DecimalPipe
 *   (`1.0-2`, locale es-CO); null/undefined/'' -> guion largo.
 * - `caption` sólo se renderiza si trae texto (no reserva espacio si se omite).
 * - El color de acento entra por `--kpi-accent` según `accent` (ver kpi-card.css).
 */
@Component({
  selector: 'app-kpi-card',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [DecimalPipe],
  templateUrl: './kpi-card.html',
  styleUrl: './kpi-card.css',
})
export class KpiCard {
  readonly label = input.required<string>();
  readonly value = input.required<string | number | null | undefined>();
  readonly unit = input('');
  readonly caption = input('');
  readonly icon = input.required<string>();
  readonly accent = input<KpiAccent>('info');

  /** No hay valor que mostrar. */
  protected readonly isEmpty = computed(() => {
    const v = this.value();
    return v === null || v === undefined || v === '';
  });

  /** El valor es numérico -> se formatea con DecimalPipe en el template. */
  protected readonly isNumeric = computed(() => {
    const v = this.value();
    return typeof v === 'number' && Number.isFinite(v);
  });
}
