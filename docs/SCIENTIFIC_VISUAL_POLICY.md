# Política visual y de cálculo científico

Estado: contrato de implementación para la rama `codex/thps-phase3-functional-analytics`.

Esta política evita que un cambio de apariencia altere la población, el cálculo o el significado técnico. Angular presenta resultados; C#/.NET calcula, clasifica y resuelve eventos; SQL Server conserva la evidencia y la trazabilidad.

## Reglas invariantes

1. Cambiar entre puntos, barras o stems no puede modificar valores, filtros, denominadores ni agregación.
2. Una línea solo puede unir observaciones de la misma variable, tanque, drenaje, unidad, método y población comparable. No atraviesa una reinyección ni une baches distintos.
3. Las aplicaciones de biocida son eventos discretos: se muestran como stem, punto o barra de evento; nunca como una curva suavizada.
4. Microbiología planctónica y sésil se presentan por separado. BSR, BPA, BHT y BAnT no se promedian entre sí.
5. La escala logarítmica admite únicamente valores positivos exactos. Ceros reportados, no detectados, censurados, faltantes e inválidos conservan su estado y usan una capa/símbolo separado.
6. El umbral planctónico de referencia es estrictamente `> 100 Bac/mL`; el valor 100 no lo supera. El umbral sésil permanece sin aprobar.
7. Dosis real cero o faltante nunca se reemplaza por dosis programada. Residual, retención y regla de inyección permanecen bloqueados hasta aprobar unidad y base química.
8. FWV, GSV y BSW no comparten escala ni se convierten hasta aprobar unidad/semántica por plantilla.
9. Corrosión conserva método, unidad, campaña y periodo de exposición. Una coincidencia temporal con microbiología se etiqueta como asociación, no como causalidad o MIC demostrada.
10. KPI, gráfica, tabla, drill-through y exportación deben compartir un identificador inmutable de población (`resultSetId`).

## Modos permitidos por pregunta

| Vista | Representación por defecto | Alternativas compatibles | No permitido |
|---|---|---|---|
| Aplicaciones y dosis real | stems | puntos o barras de evento | línea suavizada; dosis programada como sustituto |
| Volumen real por aplicación | barras de evento | puntos/stems | suma sin evento único; mediana como consumo |
| Microbiología temporal | puntos por grupo | stems/lollipop; línea segmentada solo dentro del mismo bache si el contrato lo habilita | barra acumulada entre grupos; conexión entre baches/tanques/drenajes |
| Estado micro por tanque | barra apilada con numerador/denominador | tabla/matriz | pastel sin denominador; parcial como completo |
| Distribución micro por grupo | dot/strip + resumen | caja con puntos y estados separados | imputar cero/LOD; mezclar grupos |
| Dosis vs reducción observada | dispersión | facetas por tanque/grupo | barras; regresión global; dosis programada |
| Rebote | barra/rango intervalar `(lower, upper]` | tabla intervalar | punto que invente un día exacto |
| Agua reportada vs calculada | dispersión con línea 1:1, solo pares compatibles | tabla de conflictos | tendencia temporal con unidades mezcladas |
| Fisicoquímica | puntos/linea por variable y unidad | barras para campañas discretas | doble eje que sugiera relación con corrosión |
| Corrosión | puntos/linea por método | barras por campaña | combinar cupón, biocupón y electroquímica en una serie |

## Metadatos visibles obligatorios

Cada tarjeta, tabla y gráfica publicada debe mostrar o exponer en detalle: métrica y versión, release, corte, periodo, unidad, base química si aplica, `n`, población elegible, numerador/denominador, cobertura, estado de aprobación, advertencias y enlace a celdas fuente.

Los estados bloqueados no conservan el último valor y no se representan como cero. Las salidas provisionales deben llevar la marca permanente `PROVISIONAL — no usar como decisión operativa`.
