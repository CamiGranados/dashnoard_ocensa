import { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';
import { NuevoUsuario } from '../../../../core/models/cuenta-autorizada.model';

export type CampoRegistro = keyof NuevoUsuario;

/** Opción de un `<select>` del modal. */
export interface OpcionSelect<T extends string = string> {
  value: T;
  label: string;
}

/** Campos de texto libre que se pintan con el mismo bloque del template (`@for`). */
export interface CampoTexto {
  key: Extract<CampoRegistro, 'nombres' | 'apellidos' | 'correo'>;
  label: string;
  type: 'text' | 'email';
  icon: string;
  placeholder: string;
  autocomplete: string;
}

export const CAMPOS_TEXTO: readonly CampoTexto[] = [
  {
    key: 'nombres',
    label: 'Nombres',
    type: 'text',
    icon: 'pi pi-user',
    placeholder: 'Ej. Fernando',
    autocomplete: 'given-name',
  },
  {
    key: 'apellidos',
    label: 'Apellidos',
    type: 'text',
    icon: 'pi pi-user',
    placeholder: 'Ej. Duarte Gómez',
    autocomplete: 'family-name',
  },
  {
    key: 'correo',
    label: 'Correo',
    type: 'email',
    icon: 'fa-solid fa-at',
    placeholder: 'usuario@empresa.com',
    autocomplete: 'email',
  },
];

/** Orden visual de los campos: el envío inválido enfoca el primero con error. */
export const ORDEN_CAMPOS: readonly CampoRegistro[] = [
  'nombres',
  'apellidos',
  'correo',
  'empresa',
  'rol',
];

// --- Validadores ---

export const NOMBRE_MIN = 2;
export const NOMBRE_MAX = 60;

/** Letras (con tildes/ñ) y espacios. */
const SOLO_LETRAS = /^[\p{L}\p{M}\s]+$/u;
const CORREO = /^[a-z0-9._%+-]+@[a-z0-9-]+(\.[a-z0-9-]+)*\.[a-z]{2,}$/i;

function texto(control: AbstractControl): string {
  return String(control.value ?? '').trim();
}

/** Como `Validators.required`, pero un valor de sólo espacios también cuenta como vacío. */
export const textoRequerido: ValidatorFn = (control): ValidationErrors | null =>
  texto(control) ? null : { required: true };

/** 2–60 caracteres, sólo letras y espacios. El vacío se deja a `textoRequerido`. */
export const nombrePersona: ValidatorFn = (control): ValidationErrors | null => {
  const valor = texto(control);
  if (!valor) return null;
  if (valor.length < NOMBRE_MIN || valor.length > NOMBRE_MAX) {
    return { longitud: { min: NOMBRE_MIN, max: NOMBRE_MAX } };
  }
  return SOLO_LETRAS.test(valor) ? null : { soloLetras: true };
};

/** Formato `usuario@dominio.tld`. El vacío se deja a `textoRequerido`. */
export const correoValido: ValidatorFn = (control): ValidationErrors | null => {
  const valor = texto(control);
  return !valor || CORREO.test(valor) ? null : { correo: true };
};

export const MENSAJES_ERROR: Record<string, string> = {
  longitud: `Debe tener entre ${NOMBRE_MIN} y ${NOMBRE_MAX} caracteres.`,
  soloLetras: 'Solo se permiten letras y espacios.',
  correo: 'Ingrese un correo válido (usuario@empresa.com).',
};

/** Mensaje de "obligatorio" según el tipo de campo (los `<select>` piden "Seleccione…"). */
export function mensajeRequerido(campo: CampoRegistro, empresaEsSelect: boolean): string {
  if (campo === 'rol') return 'Seleccione un rol.';
  if (campo === 'empresa' && empresaEsSelect) return 'Seleccione una empresa.';
  return 'Este campo es obligatorio.';
}

// --- Normalización ---

/** Recorta y colapsa espacios repetidos ("  Ana   María " → "Ana María"). */
function limpiar(valor: string): string {
  return valor.trim().replace(/\s+/g, ' ');
}

/** `trim()` en todo y correo en minúsculas. */
export function normalizarUsuario(datos: NuevoUsuario): NuevoUsuario {
  return {
    nombres: limpiar(datos.nombres),
    apellidos: limpiar(datos.apellidos),
    correo: datos.correo.trim().toLowerCase(),
    empresa: limpiar(datos.empresa),
    rol: datos.rol,
  };
}
