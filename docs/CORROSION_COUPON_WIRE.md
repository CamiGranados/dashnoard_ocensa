# Contrato frontend — corrosión por cupón

## Endpoint exacto

`GET /api/v1/charts/H10-COR-COUPON.V1`

Parámetros:

- `datasetReleaseId` obligatorio y exacto.
- `tankId` opcional.
- `years` repetible.
- `months` repetible.

La fuente ejecutable de verdad del wire y su validación fail-closed está en
`ocensa-dashboard/src/app/core/models/corrosion-coupon.model.ts`.

## Identidad y evidencia raíz

La respuesta extiende `ScientificResultIdentity` y fija:

- `chartId = H10-COR-COUPON.V1`.
- `metricId = THPS.CORROSION.COUPON.MPY.V1`.
- `approvalStatus = provisional_descriptive`.
- `grain = CorrosionObservation`.
- `expectedGrain = CouponExposureEvent`.
- `grainWarning = EXPOSURE_PERIOD_MISSING`.
- `exposureStatus = missing`.
- `unit = mpy`.
- `unitEvidence = METRIC_CONTRACT_NOT_SOURCE_HEADER`.
- `thresholds = []` y `tableEquivalent = true`.

`cutoffDate` conserva `2026-05-23`. `partialPeriod` solo es `true` si la
población filtrada incluye 2026; `2026_PARTIAL` aparece si y solo si ese flag
es verdadero. Cada punto 2026 lleva también `partialPeriod = true`.

## Población

Raíz y cada faceta declaran:

```ts
interface CorrosionCouponPopulation {
  candidateCicRows: number;
  eligibleN: number;
  validN: number;
  reportedZeroN: number;
  invalidN: number;
  missingN: number;
  display: string;
}
```

Se exige `validN + reportedZeroN = eligibleN` y
`eligibleN + invalidN + missingN = candidateCicRows`. Para el release golden
sin filtros son 79 candidatas, 44 elegibles válidas, 35 inválidas y 0
faltantes. Los 35 guiones no viajan como puntos y nunca se transforman en cero.

## Ejes y ticks

`xAxis.field = plotX`, escala lineal y unidad nula. `plotX`, dominio y ticks de
fecha son coordenadas preparadas por la API; Angular no parsea la fecha para
ubicar puntos. `yAxis.field = plotValue`, escala lineal, unidad `mpy`, mínimo
exacto cero. Todos los ticks y rótulos vienen de la API.

## Categoría, faceta y punto

`categories[]` declara `id`, categoría reportada, texto, color, forma, símbolo
y conteo. Color, forma y texto son redundantes. No se derivan categorías desde
el valor.

`facets[]` representa tanques únicos y contiene su población, una sola serie
`method = coupon` con `allowedModes = [points]`, y sus puntos. Una faceta vacía,
como TK7313 en el release golden, permanece visible como “sin observación” y no
produce un cero.

Cada punto contiene:

```ts
interface CorrosionCouponPoint {
  observationId: string;
  resultSetId: string;
  facetId: string;
  seriesId: string;
  plotX: number;
  date: string;
  partialPeriod: boolean;
  tank: string;
  campaignRaw: string;
  method: 'coupon';
  value: number;
  plotValue: number;
  valueDisplay: string;
  rawValue: string;
  valueStatus: 'valid' | 'reported_zero';
  plotKind: 'exact' | 'reported_zero';
  categoryId: string;
  reportedCategory: string;
  categoryStandardVersion: 'NACE SP0775-23';
  exposureStatus: 'missing';
  exposureStart: null;
  exposureEnd: null;
  unit: 'mpy';
  source: {
    sheet: string;
    valueCell: string;
    categoryCell: string;
    rawValue: string;
    rawCategory: string;
  };
  traceToken: string;
  traceEndpoint: string;
  warnings: string[];
}
```

El valor debe venir de `Sheet1!AD{fila}` y la categoría de
`Sheet1!AE{misma fila}`. El frontend rechaza una pareja de filas distintas,
un método vecino, exposición inventada, valor fuera del eje, identidad de
ResultSet distinta o categoría que no concilie con la categoría reportada.

## Representación autorizada

Solo scatter de puntos por fecha y tabla permanente de la misma población.
No se autorizan barras, líneas, stems, suavizado, interpolación, media,
mediana, bandas NACE recalculadas, ranking entre tanques, MIC ni inferencia de
eficacia. Las campañas son eventos irregulares y no existe duración de
exposición consolidada; conectarlas visualmente sugeriría continuidad no
observada.
