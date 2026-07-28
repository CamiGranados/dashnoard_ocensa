export interface ArchivoResumen {
  nombreArchivo: string;
  filas: number;
  filasOmitidas: number;
}

export interface ErrorArchivo {
  archivo: string;
  fila: number | null;
  columna: string | null;
  motivo: string;
  valorEncontrado: string | null;
}

export interface ProcesarArchivosResultado {
  exito: true;
  mensaje?: string;
  totalFilas: number;
  columnas: string[];
  datos: Record<string, string>[];
  archivos: ArchivoResumen[];
  errores: ErrorArchivo[];
}

export interface ProcesarArchivosError {
  exito: false;
  mensaje?: string;
  errores: ErrorArchivo[];
}

export interface FileTable {
  [columna: string]: any; // filas dinámicas
}

export interface FinalTable {
  columnas: string[];
  filas: FileTable[];
}