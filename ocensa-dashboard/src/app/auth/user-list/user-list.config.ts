import { EstadoCuenta, RolPlataforma } from '../../core/models/cuenta-autorizada.model';

/** Cómo se pinta un rol: texto de la píldora, icono y modificador CSS (ver `user-list.css`). */
export interface RolVista {
  label: string;
  icon: string;
  cssClass: string;
}

/** Fuente única del mapeo rol → píldora. El template sólo lee de aquí. */
export const ROL_CONFIG: Record<RolPlataforma, RolVista> = {
  ADMIN: {
    label: 'Control Total / Admin',
    icon: 'pi pi-shield',
    cssClass: 'user-list__rol--admin',
  },
  SUPERADMIN: {
    label: 'Ingesta & LIMS',
    icon: 'fa-solid fa-flask',
    cssClass: 'user-list__rol--ingesta',
  },
  OPERADOR: {
    label: 'Operación & Dosificación',
    icon: 'pi pi-sliders-h',
    cssClass: 'user-list__rol--operacion',
  },
  SOLO_LECTURA: {
    label: 'Solo Lectura - Dashboards',
    icon: 'pi pi-eye',
    cssClass: 'user-list__rol--lectura',
  },
};

/** Opciones del select "Rol" del modal de registro, en el mismo orden y con las mismas etiquetas. */
export const OPCIONES_ROL = (Object.keys(ROL_CONFIG) as RolPlataforma[]).map((value) => ({
  value,
  label: ROL_CONFIG[value].label,
}));

export interface EstadoVista {
  label: string;
  cssClass: string;
}

export const ESTADO_CONFIG: Record<EstadoCuenta, EstadoVista> = {
  ACTIVO: { label: 'Activo', cssClass: 'user-list__estado--activo' },
  INACTIVO: { label: 'Inactivo', cssClass: 'user-list__estado--inactivo' },
  BLOQUEADO: { label: 'Bloqueado', cssClass: 'user-list__estado--bloqueado' },
};

export const FILAS_POR_PAGINA = [10, 25, 50] as const;

/** Minúsculas y sin tildes, para buscar "rincon" y encontrar "Rincón". */
export function normalizarTexto(texto: string): string {
  return texto.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
}

/** "Fernando Duarte" → "FD"; "Sofía" → "S". */
export function inicialesDe(nombre: string): string {
  const partes = nombre.trim().split(/\s+/).filter(Boolean);
  if (partes.length === 0) return '';
  const primera = partes[0][0];
  const ultima = partes.length > 1 ? partes[partes.length - 1][0] : '';
  return (primera + ultima).toUpperCase();
}
