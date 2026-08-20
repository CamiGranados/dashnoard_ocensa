# Dashboard THPS OCENSA · Angular

## Estado operativo

El frontend usa un flujo **API-first y fail-closed**:

1. acepta exactamente un archivo `.xlsx` de máximo 25 MiB;
2. valida en el navegador solo metadatos (extensión, tamaño y duplicidad), sin abrir el libro;
3. envía una única parte multipart denominada `file` a `POST /api/v1/import-batches`;
4. mantiene ocultos filtros, tablas y gráficas hasta que el servidor demuestre un `DatasetRelease` exacto: `published` o, solo para revisión local, `approved_uat` con lectura allowlisted y sin publicación;
5. invalida el release al cambiar la selección, fallar una importación o detectar un fallo de identidad/release; cualquier consulta analítica fallida retira siempre su propio resultado sin conservar cifras anteriores.

Para restaurar una revisión local tras recargar, `sessionStorage` conserva solo
la identidad SHA-256. El arranque vuelve a consultar
`GET /api/v1/dataset-releases/{id}` y no muestra resultados si la metadata,
aprobación, conteos o scope no concilian. Nunca selecciona `latest`.

Los estados HTTP `404`, `410`, `422` y `503` se muestran explícitamente. Un
preflight almacenado pero no aprobado/publicado mantiene bloqueado el dashboard.

## Toolchain

- Node compatible con Angular 21: `^20.19.0`, `^22.12.0` o `>=24.0.0`.
- npm: `11.13.0`.
- Angular: `21.2.21`.
- Vitest: ejecución serial fijada en `vitest.config.ts` para evitar resultados intermitentes entre suites de componentes.

## Ejecución local

```bash
npm ci
npm start
```

La aplicación usa la ruta same-origin `/api` en todos los entornos. `npm start` activa el proxy versionado `proxy.conf.json`, que reenvía `/api` al backend local en `http://localhost:5285`; el navegador nunca llama a ese origen directamente. La compilación productiva conserva `/api` y CI rechaza cualquier `localhost` dentro de `dist/`.

## Verificación obligatoria

```bash
npm ci
npm run test:ci
npm run build:production
npm audit --audit-level=high
```

GitHub Actions ejecuta esos controles en `main`, en ramas `codex/**` y en pull requests hacia `main`.

## Semántica de datos

Los valores científicos publicados llevan un estado obligatorio:

- `observed`: valor observado;
- `reported_zero`: cero informado explícitamente;
- `censored`: valor sujeto a calificador o límite;
- `not_detected`: no detectado, sin convertirlo en cero;
- `missing`: valor faltante.
- `invalid`: valor rechazado por el contrato, sin representación numérica.

La interfaz no reemplaza faltantes, no detectados, inválidos o censurados por
cero. En cobertura, las barras representan proporciones 0..1 calculadas por la
API. En H08, solo los positivos exactos usan el eje logarítmico en `Bac/mL`;
ceros, ND, censura, faltantes e inválidos aparecen en carriles de estado y no
reciben un piso artificial. El modo de caja usa únicamente el resumen enviado
por la API y conserva los puntos observados.

Rutas del primer corte funcional:

- `/coverage`: cobertura/estados con tabla equivalente.
- `/microbiology/distribution`: H08 por tanque y grupo, puntos exactos y caja
  opcional respaldada por el servidor.
- `/corrosion/coupon`: H10 descriptiva por cupón AD/AE, únicamente puntos por
  evento y tabla equivalente; eje lineal `mpy` con cero visible.

Las representaciones se habilitan por semántica, no como un selector visual
genérico:

- cobertura: barras proporcionales y tabla;
- microbiología: puntos exactos o caja calculada por la API, manteniendo los
  puntos y los carriles de estados no numéricos;
- corrosión por cupón: puntos y tabla, sin unir observaciones irregulares;
- agua/FWV, dosis, residual y recomendación: sin gráfica numérica mientras no
  existan unidad, plantilla, identidad de evento y regla química aprobadas.

Las rutas heredadas `/microbiology`, `/corrosion` y `/thps-tolerance` ya no
cargan sus componentes analíticos antiguos. Redirigen respectivamente a H08,
H10 o al panel coordinador. El menú deja sin enlace los dominios pendientes.

## Límites del corte

- El backend debe pasar CI .NET/SQL; autenticación, autorización humana y
  publicación productiva siguen pendientes.
- Los módulos sin métricas científicas aprobadas muestran un bloqueo o una indicación de módulo pendiente; no muestran cifras de ejemplo.
- No se debe habilitar producción únicamente porque el frontend compile.
