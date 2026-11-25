import { Injectable, computed, signal } from '@angular/core';
import {
  CuentaAutorizada,
  EstadoCuenta,
  RolPlataforma,
} from '../models/cuenta-autorizada.model';

/** Total de registros que simula el directorio mientras no exista el endpoint. */
const TOTAL_SIMULADO = 38;

/** Fecha local `dias` días antes de `ahora`, a las hh:mm. */
function haceDias(ahora: Date, dias: number, horas: number, minutos: number): Date {
  return new Date(ahora.getFullYear(), ahora.getMonth(), ahora.getDate() - dias, horas, minutos);
}

/** Las 6 cuentas de la vista de referencia (primera página del directorio). */
function cuentasReferencia(ahora: Date): CuentaAutorizada[] {
  return [
    {
      id: 'usr-001',
      nombre: 'Fernando Duarte',
      email: 'fernando.duarte@ocensa.com.co',
      enLinea: true,
      rol: 'ADMIN',
      mfaActivo: true,
      ultimoAcceso: haceDias(ahora, 0, 10, 24),
      ipUltimoAcceso: '190.25.110.14',
      estado: 'ACTIVO',
    },
    {
      id: 'usr-002',
      nombre: 'Claudia Rincón',
      email: 'claudia.rincon@ocensa.com.co',
      enLinea: true,
      rol: 'SUPERADMIN',
      mfaActivo: true,
      ultimoAcceso: haceDias(ahora, 0, 9, 12),
      ipUltimoAcceso: '10.20.4.31',
      estado: 'ACTIVO',
    },
    {
      id: 'usr-003',
      nombre: 'Carlos Méndez',
      email: 'carlos.mendez@ocensa.com.co',
      enLinea: false,
      rol: 'OPERADOR',
      mfaActivo: true,
      ultimoAcceso: haceDias(ahora, 1, 16, 30),
      ipUltimoAcceso: '181.49.22.105',
      estado: 'ACTIVO',
    },
    {
      id: 'usr-004',
      nombre: 'Valentina Serna',
      email: 'valentina.serna@corrosioncic.com',
      enLinea: true,
      rol: 'SOLO_LECTURA',
      mfaActivo: false,
      ultimoAcceso: haceDias(ahora, 0, 8, 5),
      ipUltimoAcceso: '186.84.12.77',
      estado: 'ACTIVO',
    },
    {
      id: 'usr-005',
      nombre: 'Roberto Peña',
      email: 'roberto.pena@ocensa.com.co',
      enLinea: false,
      rol: 'OPERADOR',
      mfaActivo: false,
      ultimoAcceso: haceDias(ahora, 2, 14, 5),
      ipUltimoAcceso: '10.20.8.112',
      estado: 'BLOQUEADO',
    },
    {
      id: 'usr-006',
      nombre: 'Sofía Alarcón',
      email: 'sofia.alarcon@corrosioncic.com',
      enLinea: false,
      rol: 'SOLO_LECTURA',
      mfaActivo: true,
      ultimoAcceso: haceDias(ahora, 5, 11, 48),
      ipUltimoAcceso: '190.85.47.201',
      estado: 'INACTIVO',
    },
  ];
}

const NOMBRES = [
  'Andrés', 'Paula', 'Julián', 'Natalia', 'Camilo', 'Diana', 'Sergio', 'Laura',
  'Mauricio', 'Catalina', 'Óscar', 'Juliana', 'Felipe', 'Marcela', 'Ricardo', 'Adriana',
];
const APELLIDOS = [
  'Gómez', 'Torres', 'Rojas', 'Castro', 'Vargas', 'Moreno', 'Herrera', 'Ortiz',
  'Ramírez', 'Jiménez', 'Suárez', 'Cárdenas', 'Pardo', 'Mejía', 'Salazar', 'Ospina',
];
const ROLES_CICLO: RolPlataforma[] = [
  'OPERADOR', 'SOLO_LECTURA', 'OPERADOR', 'SUPERADMIN', 'SOLO_LECTURA', 'OPERADOR', 'SOLO_LECTURA', 'ADMIN',
];
const DOMINIOS = ['ocensa.com.co', 'corrosioncic.com'];

/** "Óscar" → "oscar", "Peña" → "pena". */
function parteCorreo(texto: string): string {
  return texto.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
}

/** Cuenta de relleno determinista (mismo resultado en cada carga) para completar el total. */
function cuentaGenerada(i: number, ahora: Date): CuentaAutorizada {
  const nombre = NOMBRES[i % NOMBRES.length];
  // El desfase por vuelta evita repetir la combinación nombre + apellido.
  const apellido = APELLIDOS[(i * 3 + Math.floor(i / NOMBRES.length)) % APELLIDOS.length];
  const estado: EstadoCuenta = i % 11 === 4 ? 'BLOQUEADO' : i % 7 === 5 ? 'INACTIVO' : 'ACTIVO';
  const horasAtras = i % 6 === 0 ? 1 + (i % 4) : (i + 1) * 11 + (i % 5) * 7;
  const ip =
    i % 3 === 0
      ? `10.20.${(i * 3) % 16}.${((i * 37 + 11) % 250) + 2}`
      : `${i % 2 ? 181 : 190}.${((i * 13) % 200) + 20}.${(i * 29) % 250}.${((i * 41) % 250) + 3}`;

  return {
    id: `usr-${String(i + 7).padStart(3, '0')}`,
    nombre: `${nombre} ${apellido}`,
    email: `${parteCorreo(nombre)}.${parteCorreo(apellido)}@${DOMINIOS[i % DOMINIOS.length]}`,
    enLinea: estado === 'ACTIVO' && horasAtras < 8,
    rol: ROLES_CICLO[i % ROLES_CICLO.length],
    mfaActivo: i % 5 !== 2,
    ultimoAcceso: new Date(ahora.getTime() - horasAtras * 3_600_000 - ((i * 17) % 60) * 60_000),
    ipUltimoAcceso: ip,
    estado,
  };
}

function crearCuentasMock(ahora: Date): CuentaAutorizada[] {
  const referencia = cuentasReferencia(ahora);
  const relleno = Array.from({ length: TOTAL_SIMULADO - referencia.length }, (_, i) =>
    cuentaGenerada(i, ahora),
  );
  return [...referencia, ...relleno];
}

/**
 * Directorio de cuentas autorizadas de la plataforma.
 *
 * TODO(backend): hoy sirve datos mock. Cuando exista el endpoint, reemplazar `cuentas` por un
 * `httpResource<CuentaAutorizada[]>(() => `${environment.apiUrl}/...`)` (patrón de
 * `overview.service.ts`).
 */
@Injectable({ providedIn: 'root' })
export class CuentasAutorizadasService {
  readonly cuentas = signal<CuentaAutorizada[]>(crearCuentasMock(new Date())).asReadonly();
  readonly total = computed(() => this.cuentas().length);
}
