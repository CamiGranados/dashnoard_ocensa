import { Component, input } from '@angular/core';

/** Barra de estado al pie. Cada dato es opcional: si no llega, su segmento no se muestra. */
@Component({
  selector: 'app-status-bar',
  templateUrl: './status-bar.html',
  styleUrl: './status-bar.css',
})
export class StatusBar {
  /** Texto ya formateado, p. ej. "hace 5 min". */
  readonly lastSync = input<string | null>(null);
  /** `null` oculta el segmento "Modelo IA". */
  readonly modelActive = input<boolean | null>(null);
  /** Texto ya formateado, p. ej. "09:15 AM". */
  readonly lastModelRun = input<string | null>(null);
  readonly version = input<string | null>(null);
}
