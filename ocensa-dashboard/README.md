# Dashboard THPS OCENSA · Angular

## Estado operativo

El frontend usa un flujo **API-first y fail-closed**:

1. acepta exactamente un archivo `.xlsx` de máximo 25 MiB;
2. valida en el navegador solo metadatos (extensión, tamaño y duplicidad), sin abrir el libro;
3. envía una única parte multipart denominada `file` a `POST /api/v1/import-batches`;
4. mantiene ocultos filtros, KPIs, tablas y gráficas hasta que el servidor devuelva un `DatasetRelease` con estado `published` y trazabilidad completa;
5. invalida el release y todos los resultados al cambiar la selección, fallar una importación o fallar una consulta de filtros/analítica asociada al release.

Los estados HTTP `410` y `503` se muestran explícitamente. Un preflight aceptado pero no publicado también mantiene bloqueado el dashboard.

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

La configuración de desarrollo apunta a `http://localhost:5285/api`. La compilación productiva sustituye esa configuración por la ruta relativa `/api`; CI rechaza cualquier `localhost` dentro de `dist/`.

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

La interfaz no reemplaza faltantes, no detectados, inválidos o censurados por cero. Los ceros microbiológicos no se sustituyen por un piso inventado; la banda microbiológica usa escala lineal y conserva el cero reportado.

## Límites del corte

- El backend debe implementar y probar persistencia transaccional, autenticación/autorización y publicación de releases.
- Los módulos sin métricas científicas aprobadas muestran un bloqueo o una indicación de módulo pendiente; no muestran cifras de ejemplo.
- No se debe habilitar producción únicamente porque el frontend compile.
