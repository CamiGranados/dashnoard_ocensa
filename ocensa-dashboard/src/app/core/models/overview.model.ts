// overview.model.ts

/** Par valor/fecha que repite el backend */
export interface Measurement<T = number> {
  value: T;
  date: string; // ISO: '2026-05-23T00:00:00'
}

// export interface LastValues {
//   bAnT: Measurement;
//   bht: Measurement;
//   bpa: Measurement;
//   bsr: Measurement;
//   company: Measurement<string>;
//   reportedFwv: Measurement;
//   thps: Measurement;
//   lastMeasurementDate: string;
// }
// --------------------------------------------- FWV -----------------------
export interface FreeWater {
  // Cumplimiento global: nº de mediciones (registros de operación diaria) con FWV
  // calculado presente en el rango filtrado.
  globalCompliancePercent: number | null;
  // Brecha de agua contra línea base: Σ "Agua estimada línea base" (meses con operación
  // diaria en el rango) - FWV calculado acumulado. Positivo = falta para alcanzar la
  // línea base; negativo = ya se superó.
  targetWater: number | null;
  // Brecha reportado vs calculado: FWV reportado acumulado - FWV calculado acumulado.
  reportedCalculatedGap: number | null;
  // FWV calculado acumulado: suma corrida (total) de Calculated_FWV sobre todas las
  // mediciones del rango de fechas.
  accumulatedCalculatedWater: number | null;
  months: FreeWaterMonth[];
}

interface FreeWaterMonth {
  year: number;
  month: number;
  reportedMean: number;
  calculatedMean: number;
  deviation: number;
}

// --------------------------------------------- DOSE -----------------------
export interface Dose {
  globalCompliancePercent: number | null;
  targetDose: number | null;
  targetVolumen: number | null;
  accumulatedActualVolume: number | null;
  months: DoseMonth[];
}

interface DoseMonth {
  year: number;
  month: number;
  scheduledMean: number;
  injectedMean: number;
  deviation: number;
}

// --------------------------------------------- MICROBIOLOGY -----------------------
export interface Microbiology {
  inControlCount: number;
  totalCount: number;
  controlPercent: number | null;
  variables: MicrobiologyVariable[];
  monthlyTotals: MicrobiologyMonthTotal[];
}

export interface MicrobiologyVariable {
  key: MicrobiologyKey;          // "BSR" | "BPA" | "BHT" | "BAnT"
  inControlCount: number;
  totalCount: number;
  controlPercent: number | null; // columna "Total periodo"
  months: MicrobiologyMonthCell[];
}

// MicrobiologyMonthCellDto (los meses sin dato NO vienen -> pintar "sin muestreo")
export interface MicrobiologyMonthCell {
  year: number;
  month: number;
  inControlCount: number;
  totalCount: number;
}

// MicrobiologyMonthTotalDto (fila "Todas las variables")
export interface MicrobiologyMonthTotal {
  year: number;
  month: number;
  inControlCount: number;
  totalCount: number;
  controlPercent: number | null;
}

export type MicrobiologyKey = 'BSR' | 'BPA' | 'BHT' | 'BAnT';



// Equivalente a ContractualComplianceDto: ejecutado, meta y % (ejecutado / meta × 100).
// Target/compliancePercent quedan en null cuando no hay meta contractual para el rango.
export interface ComplianceMetric {
  compliancePercent: number | null;
  executed: number | null;
  target: number | null;
}

// Un TankTargetPeriod tal como está en la tabla, para el tanque y rango filtrados.
export interface TargetPeriod {
  scenarioName: string; // Contractual | Línea base | Actual
  validFrom: string; // DateOnly ISO: 'yyyy-MM-dd'
  validTo: string | null;
  periodicity: number | null;
  dose: number | null;
  estimatedGallons: number | null;
  estimatedWaterMin: number | null;
  estimatedWaterMax: number | null;
}

export interface Summary {
  dose: ComplianceMetric;
  periodicity: ComplianceMetric;
  volume: ComplianceMetric;
  // Periodos de meta (TankTargetPeriod) de los 3 escenarios vigentes en algún mes con
  // datos ejecutados (operación diaria o medición) dentro del filtro Years/Months.
  targetPeriods: TargetPeriod[];
}

// --------------------------------------------- RAW SERIES -----------------------
// Una fila del listado crudo: una variable con dato en una fecha (los días sin dato para esa
// variable simplemente no generan fila). Mismo formato que GET /Tanks/fwv.
export interface RawSeriesPoint {
  variable: string;
  numericValue: number;
  date: string; // ISO
}

// --------------------------------------------- ANNUAL SUMMARY -----------------------
// Resumen de metas (TankTargetPeriod) vs ejecutado del tanque, agrupado por año.
export interface TankSummary {
  tanque: string;
  // Perfil físico del tanque (Tank.NominalCapacity_bbl), tal como está almacenado.
  capacidadNominalKBbls: number | null;
  periodos: TankSummaryPeriod[];
}

export interface TankSummaryPeriod {
  anio: number;
  condiciones: TankSummaryCondiciones;
  ejecutado: TankSummaryEjecutado[];
}

// Condiciones pactadas vigentes ese año: escenario Contractual (oferta económica) y Línea base.
// Si el contrato cambió de términos a mitad de año, son los términos vigentes en el último mes
// con actividad de ese año.
export interface TankSummaryCondiciones {
  aguaEstimadaContractualBls: number | null;
  periodicidadContractualBachesMes: number | null;
  dosisOfertaEconomicaPpm: number | null;
  galonesEstimadosOferta: number | null;

  aguaEstimadaLineaBaseBls: number | null;
  periodicidadLineaBase: number | null;
  dosisLineaBase: number | null;
  galonesEstimadosLineaBase: number | null;
}

export interface TankSummaryEjecutado {
  mes: string; // 'yyyy-MM'
  aguaRealBls: number | null;
  periodicidadReal: number;
  dosisRealPpm: number | null;
  galonesReales: number | null;
}

export interface OverviewResponse {
  summary: Summary;
  freeWater: FreeWater;
  dose: Dose;
  microbiology: Microbiology;
  // Listado crudo (sin agregar), pivoteado por variable, acotado al tanque y rango filtrados.
  rawSeries: RawSeriesPoint[];
  annualSummary: TankSummary;
}