import { Injectable, computed } from '@angular/core';
import { httpResource } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { LastUploadResponse } from '../models/last-upload.model';

const MESES_CORTOS = [
  'Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun',
  'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic',
];

@Injectable({ providedIn: 'root' })
export class LastUploadService {
  private readonly apiUrl = environment.apiUrl;

  readonly lastUpload = httpResource<LastUploadResponse>(() => `${this.apiUrl}/Tanks/lastUpload`);

  // "10 Jul 2026 · 09:35 AM" en hora local; '—' si no hay cargue o aún no responde.
  readonly lastUpdateLabel = computed(() => {
    const raw = this.lastUpload.value()?.uploadedAt;
    if (!raw) return '—';

    // El backend guarda UTC pero puede serializar sin sufijo de zona: sin 'Z' el
    // navegador lo interpretaría como hora local y mostraría 5 h de diferencia.
    const date = new Date(/(Z|[+-]\d{2}:?\d{2})$/.test(raw) ? raw : `${raw}Z`);
    if (isNaN(date.getTime())) return '—';

    const h = date.getHours();
    const hh = String(h % 12 || 12).padStart(2, '0');
    const mm = String(date.getMinutes()).padStart(2, '0');
    const ampm = h < 12 ? 'AM' : 'PM';
    return `${date.getDate()} ${MESES_CORTOS[date.getMonth()]} ${date.getFullYear()} · ${hh}:${mm} ${ampm}`;
  });

  // Llamar tras un cargue exitoso para refrescar el header.
  reload(): void {
    this.lastUpload.reload();
  }
}
