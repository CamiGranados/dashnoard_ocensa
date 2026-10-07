import { ChangeDetectionStrategy, Component, input } from '@angular/core';

/**
 * Cabecera estándar de tarjeta: icono a la izquierda + título + subtítulo.
 * Uso: `<app-card-header icon="fa-solid fa-flask" title="…" subtitle="…" />`.
 * Slots: `[subtitle]` para un subtítulo con marcado propio; contenido por defecto = acciones
 * a la derecha (p. ej. `<app-chart-toolbar>`).
 */
@Component({
  selector: 'app-card-header',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './card-header.html',
  styleUrl: './card-header.css',
})
export class CardHeader {
  readonly title = input.required<string>();
  readonly subtitle = input<string>('');
  /** Clases del icono (Font Awesome o PrimeIcons), p. ej. `fa-solid fa-table-list`. */
  readonly icon = input<string>('');
}
