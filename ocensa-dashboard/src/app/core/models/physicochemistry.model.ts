// physicochemistry.model.ts

export interface PhysicalChemistryRecord {
  date: string; // ISO: '2026-05-23T00:00:00'
  temperatureC: number | null;
  h2S: number | null;
  ph: number | null;
  conductivity: number | null;
  alkalinity: number | null;
  calcium: number | null;
  generalCorrosionRate: number | null;
  maximumStingSpeed: number | null;
  corrosionRateMean: number | null;
  maximumStingMean: number | null;
}

export interface PhysicalChemistryResponse {
  data: PhysicalChemistryRecord[];
}
