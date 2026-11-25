import { Pipe, PipeTransform } from '@angular/core';
import { MESES, dateParts } from '../charts/chart-dates';

const MS_POR_DIA = 86_400_000;
const SOLO_FECHA = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Normaliza la entrada a `Date`. Un ISO sólo-fecha se arma en hora local: `new Date('2025-08-05')`
 * lo parsearía como UTC y en Colombia mostraría el día anterior.
 */
function aFecha(valor: Date | string): Date {
  if (valor instanceof Date) return valor;
  if (SOLO_FECHA.test(valor)) {
    const [anio, mes, dia] = dateParts(valor);
    return new Date(anio, mes - 1, dia);
  }
  return new Date(valor);
}

/** Días de calendario (hora local) entre `fecha` y `ahora`: 0 = hoy, 1 = ayer, < 0 = futuro. */
export function diasNaturalesEntre(fecha: Date, ahora: Date): number {
  const inicioDelDia = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  return Math.round((inicioDelDia(ahora) - inicioDelDia(fecha)) / MS_POR_DIA);
}

/** "10:24 AM" */
export function hora12(fecha: Date): string {
  const h = fecha.getHours();
  const hh = String(h % 12 || 12).padStart(2, '0');
  const mm = String(fecha.getMinutes()).padStart(2, '0');
  return `${hh}:${mm} ${h < 12 ? 'AM' : 'PM'}`;
}

/** "Hoy" · "Ayer" · "Hace 3 días" (2–6) · "18 Nov 2026" (≥ 7 días o fecha futura). */
export function etiquetaDia(fecha: Date, ahora: Date = new Date()): string {
  const dias = diasNaturalesEntre(fecha, ahora);
  if (dias === 0) return 'Hoy';
  if (dias === 1) return 'Ayer';
  if (dias > 1 && dias < 7) return `Hace ${dias} días`;
  return `${fecha.getDate()} ${MESES[fecha.getMonth()]} ${fecha.getFullYear()}`;
}

/**
 * Fecha relativa para listados: "Hoy, 10:24 AM", "Ayer, 04:30 PM", "Hace 2 días", "18 Nov 2026".
 * Acepta `Date` o string ISO (lo que llegará del backend). `ahora` sólo se pasa en pruebas.
 *
 * Pipe puro: el texto se recalcula cuando cambia la fecha, no con el paso del tiempo.
 */
@Pipe({ name: 'fechaRelativa' })
export class FechaRelativaPipe implements PipeTransform {
  transform(valor: Date | string | null | undefined, ahora: Date = new Date()): string {
    if (valor == null || valor === '') return '—';

    const fecha = aFecha(valor);
    if (Number.isNaN(fecha.getTime())) return '—';

    const dias = diasNaturalesEntre(fecha, ahora);
    const dia = etiquetaDia(fecha, ahora);
    return dias === 0 || dias === 1 ? `${dia}, ${hora12(fecha)}` : dia;
  }
}
