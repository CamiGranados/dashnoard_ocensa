// Directorio de cuentas autorizadas (auth/user-list).
// TODO(backend): aún no existe la clase C#; al publicarse el endpoint, ajustar para que coincida
// exactamente. Ojo: un `DateTime` llega en el JSON como string ISO, no como `Date`.

export type RolPlataforma = 'ADMIN' | 'SUPERADMIN' | 'OPERADOR' | 'SOLO_LECTURA';
export type EstadoCuenta = 'ACTIVO' | 'INACTIVO' | 'BLOQUEADO';

export interface CuentaAutorizada {
  id: string;
  nombre: string;
  email: string;
  /** Sesión abierta en este momento (punto verde junto al nombre). */
  enLinea: boolean;
  rol: RolPlataforma;
  mfaActivo: boolean;
  ultimoAcceso: Date;
  ipUltimoAcceso: string;
  estado: EstadoCuenta;
}

/** Alta de una cuenta (modal "Registrar Nuevo Usuario"). Campos ya normalizados (trim, correo en minúsculas). */
export interface NuevoUsuario {
  nombres: string;
  apellidos: string;
  correo: string;
  empresa: string;
  rol: RolPlataforma;
}
