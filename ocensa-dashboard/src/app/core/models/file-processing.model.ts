export interface FileSummary {
  nombreArchivo: string;
  filas: number;
  filasOmitidas: number;
}

export interface FileError {
  archivo: string;
  fila: number | null;
  columna: string | null;
  motivo: string;
  valorEncontrado: string | null;
}

export interface FileProcessingResult {
  exito: true;
  mensaje?: string;
  totalFilas: number;
  columnas: string[];
  datos: Record<string, string>[];
  archivos: FileSummary[];
  errores: FileError[];
}

export interface FileProcessingError {
  exito: false;
  mensaje?: string;
  errores: FileError[];
}

export interface FileTable {
  [columna: string]: any; // dynamic rows
}

export interface FinalTable {
  columnas: string[];
  filas: FileTable[];
}
