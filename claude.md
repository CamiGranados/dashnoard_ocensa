Componentes standalone: <sí>
Estado: <signals / RxJS / NgRx>
Estilos: <CSS / primeNg>
Las llamadas HTTP van siempre en un servicio de core/services, nunca directamente en un componente.
Las interfaces que reflejan DTOs del backend viven en <core/models> y deben coincidir exactamente con las clases de C#.
Colores principales y estilos incluirlos en styles.css y llamarlos en cada componente.

## Stack técnico

- Angular 21 (standalone components, sin NgModules), TypeScript 5.9, `strict: true` + `strictTemplates` + `strictInjectionParameters`.
- UI: PrimeNG 21 (preset `Lara`, ver `app.config.ts`), PrimeIcons, Font Awesome free, `chart.js` vía `primeng/chart`, `xlsx` (SheetJS) para leer Excel en el cliente.
- Tests: Vitest (`@angular/build:unit-test`), no Karma/Jasmine.
- Formato: Prettier (`printWidth: 100`, comillas simples, parser `angular` para `.html`).
- El proyecto Angular real vive en `ocensa-dashboard/` (subcarpeta), no en la raíz del repo.

## Estructura de carpetas (`ocensa-dashboard/src/app`)

- `core/services` — llamadas HTTP y estado compartido (signals). Mezcla de sufijo `.service.ts` y sin sufijo (`file-store.service.ts`, `loading-state.ts`) — inconsistente, no asumir un patrón único al crear archivos nuevos.
- `core/models` — DTOs que deben coincidir exactamente con las clases C# del backend (`overview.model.ts`, `file-processing.model.ts`).
- `core/interceptors` — interceptores HTTP (`loading.interceptor.ts`).
- `shared/components` — componentes reutilizables sin estado, fuera de `core/` (p.ej. `spinner`).
- `shared/charts` — capa compartida de gráficas (tokens de color, `Chart.defaults`, estado de ventana/toggles, dataset builder, contenedor `ChartFrame` + `ChartToolbar` con zoom/exportar/expandir). Ver sección "Gráficas".
- `layout/` — `shell`, `sidebar` (chrome de la app).
- `features/dashboard/` — `dashboard-shell` (layout de la sección con `<app-topbar-filters>` + `<router-outlet>`), `topbar-filters` (filtros globales de tanque/año/mes + importación de Excel), `overview` (vista ejecutiva), `data-upload` (carga y preview de Excel), y `tabs/` (`corrosion`, `gaps`, `microbiology`, `physicochemistry`, `thps-tolerance`).
- Rutas en `app.routes.ts`, todas con `loadComponent` (lazy).

## Convenciones observadas

- Nombres de clase de componente/servicio SIN sufijo `Component`/`Service` en la clase (p.ej. `Overview`, `Sidebar`, `DataUpload`, `Api`), siguiendo el esquema por defecto de Angular 21. Los nombres de archivo son kebab-case sin `.component.` (`overview.ts`, `overview.html`, `overview.css`).
- usar siempre sufijo `.service.ts` en el archivo. Existen archivos antiguos sin sufijo (`loading-state.ts`, `filters-state.ts`); están pendientes de renombrar y no son el patrón a seguir.
- Dominio de negocio y UI en español (`filtros`, `tanque`, `archivos`, mensajes de usuario); identificadores técnicos de Angular/TS en inglés. Mantener ese mismo mix al añadir código nuevo.
- Estado con signals (`signal`/`computed`/`effect`) es el patrón dominante; RxJS se usa puntualmente para llamadas HTTP crudas, `debounceTime` en filtros y `forkJoin` para cargas paralelas. Para datos derivados de HTTP nuevos, preferir `httpResource` (ver `overview.service.ts`) sobre subscribe manual cuando encaje.
- Colores y tokens de diseño centralizados como variables CSS en `src/styles.css` (`--color-primary`, `--shadow-md`, etc.); los componentes los consumen con `var(--...)`, no hardcodean hex nuevos. Las gráficas (`<p-chart>` pinta sobre `<canvas>`, el CSS no llega) son la excepción: sus colores viven en `shared/charts/chart-tokens.css` (`--chart-*`) y entran a la config JS vía `chartToken()` — ver sección "Gráficas".
- El backend expone endpoints tipo `/Tanks/summary`, `/Tanks/years`, `/Tanks/listTanks`, `/Tanks/fwv`, `/LoadFile/procesar` bajo `environment.apiUrl`.

## Layout y rutas

- Jerarquía: `Shell` (layout global) → `DashboardShell` → pantallas. Cada shell tiene su propio `<router-outlet>`.
- `<app-sidebar>` se renderiza una sola vez en layout/shell. `<app-topbar-filters>` una sola vez en su shell. Nunca dentro de las pantallas hijas: si se duplican, se destruyen y recrean en cada navegación y la selección del usuario se pierde.
- Los filtros no aplican a todas las pantallas del dashboard (`overview` y `data-upload` no los usan). Las rutas que sí los necesitan van agrupadas bajo un shell intermedio, no condicionadas con `@if`
- Al agrupar rutas con `path: ''`, la ruta de `overview` necesita `pathMatch: 'full'` o captura por prefijo todas las demás.
- Las tabs no reciben los filtros por `input`: los leen inyectando `core/services/filters-state.service.ts`(FiltersStateService), única fuente de verdad de tanque/año/mes.
- La ruta en la URL coincide con el nombre de la carpeta (`/data-upload` → `features/dashboard/data-upload/`).

## Gráficas (`shared/charts/`)

5 componentes usan `<p-chart>` (PrimeNG sobre Chart.js): `overview`, `corrosion`,
`thps-tolerance`, `microbiology`, `physicochemistry`. **Todo lo repetido entre ellos
está en `src/app/shared/charts/` — al tocar una gráfica o añadir una nueva, reutilizar
esta capa, NO reimplementar.** Las gráficas "principales" (`overview` ×2, `corrosion`,
`physicochemistry` principal, las 3 bandas de `thps-tolerance`) llevan `<app-chart-frame>` /
`<app-chart-toolbar>` — ver más abajo.

- **Color: siempre por token, nunca hex en el `.ts`.** El `SERIES_CONFIG` del componente
  guarda el *nombre* del token (`'--chart-bsr'`); se resuelve con `chartToken(name)`
  (`chart-tokens.ts`) al armar los datasets y en los swatches del template. Si la variable
  de dominio no tiene token, añadirlo en `chart-tokens.css` (`:root`, prefijo `--chart-`);
  ese archivo es la fuente única. Catálogos compartidos: `PLANCTONICA_TOKEN` (BSR/BPA/BHT/
  BAnT) y `FWV_TOKEN`.
- **Cromo (tooltip, grid, color/tamaño de ejes, `maintainAspectRatio`) vive en
  `Chart.defaults`.** Cada componente de gráfica llama `applyChartDefaults()` en su
  **constructor** (`chart-defaults.ts`). NO repetir el bloque `tooltip: { backgroundColor…}`
  ni `grid.color` ni colores de eje en las `options`; sólo dejar los overrides puntuales
  (p.ej. `padding: 10`, `titleFont`, `mode: 'index'`, callbacks).
- **`applyChartDefaults()` NO es un APP_INITIALIZER** y `chart-defaults.ts` es lo único que
  importa `chart.js/auto`: no importarlo desde `app.config.ts` ni nada eager — metería
  ~200 kB (~62 kB transfer) en el bundle inicial. Debe quedarse sólo en los chunks lazy.
- **`animation: false` es por componente** (decisión explícita: no global). Los que hoy lo
  ponen lo siguen poniendo; las mini-gráficas de `physicochemistry` y las líneas por bache
  de `microbiology` sí animan.
- **Ventana visible (slider "últimos N puntos"):** `createWindowState(total, size=60)`
  (`window-state.ts`) → `{ size, position, range, move, reset }`. Instanciar en constructor
  o inicializador de campo (usa `effect`). Template: `[(ngModel)]="window.position"`,
  `(ngModelChange)="window.move($event)"`, `(click)="window.reset()"`, `window.range()`.
- **Toggles línea/barra + visibilidad:** `createSeriesToggles(defaults)` (`series-toggles.ts`)
  → `{ types, visible, setType, toggle }` + `CHART_TYPE_OPTIONS`.
- **Dataset de línea/barra:** `lineOrBarDataset(opts)` (`chart-datasets.ts`). Valores
  numéricos ya unificados. `physicochemistry` NO lo usa (sus series "media" tienen relleno
  de área y marcador de círculo hueco propios) — está bien, es la excepción.
- **Fechas:** `chart-dates.ts` — `MESES` (único), `dateParts()`, `formatMonthYear()`,
  `formatFullDate()`. `dateParts` hace slice del string ISO (`YYYY-MM-DD`) — **no usar
  `new Date('2025-08-05')`**, que se parsea como UTC y en Colombia muestra el día anterior.
  Hay `isoToLocalTimestamp()` listo pero aún sin cablear en `thps`/`physicochemistry`
  (pendiente de confirmar el formato del campo `date` del backend).
- **Leyenda HTML propia (no la nativa de Chart.js):** `<app-chart-legend [items]>`
  (`chart-legend/`). Los swatches usan la custom property `--swatch-color`.
- **Contenedor + barra de herramientas:** `<app-chart-frame>` (`chart-frame/`) envuelve el
  `<p-chart>` por **proyección de contenido** (`<ng-content select="p-chart">`) y le pone
  cabecera (título + subtítulo) + separador + `<app-chart-toolbar>` (8 herramientas: zoom ±,
  selección de área, pan, restablecer, descargar PNG/CSV, expandir, más opciones). El
  `<p-chart>` del consumidor **no se toca** — sus `[data]/[options]/[plugins]` siguen igual.
  - Zoom/pan: `chartjs-plugin-zoom` (registrado en `chart-defaults.ts`, lazy). El frame lo
    inyecta imperativamente en `chart.options.plugins.zoom` (no vía un `options` nuevo, para
    no disparar el `reinit()` de `<p-chart>`). **Ese plugin persiste el zoom escribiendo
    `scales.x.min/max` en el objeto de `options`**; si el consumidor reutiliza ese objeto
    (campo estático como `overview.fwvOptions`) contamina la siguiente gráfica → el frame lo
    limpia en `clearZoomLeak()` (al recrearse la gráfica y al destruirse). Input
    `[ownsAxisRange]` (`true` por defecto): ponerlo en `false` cuando el consumidor fija el
    rango del eje él mismo (slider de ventana).
  - Utilidades: `chart-view-state.ts` (`createChartViewState`), `chart-zoom.ts`
    (`buildZoomOptions`, `stepZoom`, `resetView`), `chart-export.ts` (`chartToCsv`,
    `chartToPng`/`stackChartsToPng` con cabecera compuesta, `matrixToCsv`, `downloadText`,
    `copyPngToClipboard`), `chart-reference-lines.ts` (`refLinesHidden`/`setRefLinesHidden`
    — los `*.plugins.ts` de líneas de referencia lo consultan y hacen `return` si está activo).
  - Input de callback: se llama **`resetHook`** (no `onReset`): Angular bloquea bindings `[on*]`.
  - "Expandir" = overlay CSS `position: fixed` sobre el **mismo nodo** (no `p-dialog`): la
    gráfica no se recrea, así el zoom/estado se conserva. `p-dialog` sí se usa para "ver
    datos en tabla".
  - **`overview`** (FWV, dosificación): frame estándar. **`corrosion`** y
    **`physicochemistry`** (gráfica principal): `[ownsAxisRange]="false"` + `[resetHook]` al
    `window.reset`/`resetMainView`; su slider pasa al pie del frame (`<ng-content>` por
    defecto). **`thps-tolerance`**: NO usa `ChartFrame` (rompería el crosshair de las 3
    bandas); usa `<app-chart-toolbar>` directo (barra completa) sobre las 3 bandas. El
    zoom/pan del plugin se inyecta en cada banda vía `afterEveryRender` y se **sincroniza a
    mano** entre las 3 (`syncBandZoom`: al hacer zoom/pan en una, se aplica el mismo rango X
    a las otras con `chart.zoomScale('x', …, 'none')`; guarda `syncingZoom` contra re-entrada).
    OJO: `chart.zoom()` **programático NO dispara `onZoomComplete`** (sólo rueda/arrastre) →
    los botones +/− llaman `syncBandZoom` explícitamente. Mover el slider descarta el zoom fino.
    Las mini-gráficas de `physicochemistry`/`microbiology` quedan sin barra (fase posterior).
- **NO unificar los dominios de eje Y:** `microbiology` (0–6 fijo), `thps.yDomainOf`
  (padding proporcional) y `corrosion.domainOf` (percentiles + nice step) son algoritmos
  legítimamente distintos; cada componente conserva el suyo y su bloque `scales`.
- Colores de dominio hoy sólo en `chart-tokens.css` salvo: los fallbacks del cromo en
  `chart-defaults.ts` (sitio único) y `#7c3aed`/`#84cc16` en los `*.plugins.ts`
  (`referenceLinePlugin`, `limitLinesPlugin` — no tocar).

## Puntos de atención (deuda técnica / código muerto detectado)

- Solo existe `environment.ts` (sin `environment.prod.ts`); `apiUrl` está hardcodeado a `http://localhost:5285/api`. Tenerlo en cuenta antes de asumir configuración por entorno.
- Hay `console.log` de depuración dejados en código (`overview.service.ts`, `overview.ts`, `data-upload.ts`) — limpiar si se toca ese archivo, pero no es objetivo de tareas no relacionadas.
- Los tabs `microbiology`, `physicochemistry` y `thps-tolerance` ya NO son placeholders (240 / 433 / 526 líneas). Solo gaps sigue vacío.
- `thps-review` (servicio y modelo) corresponde a la tab `thps-tolerance`. La discrepancia viene del backend, cuyo endpoint es `/Tanks/thps-review`. No es un error de nombrado.
- `filters.service.ts` (FiltersService) es el cliente HTTP de `/Tanks/*`; `filters-state.service.ts` (FiltersStateService) es el estado global de filtros. Nombres parecidos, responsabilidades distintas.
- `npm test` (Vitest 4 + `@angular/build:unit-test`) crasheaba en Windows al lanzar los ~25 spec en paralelo ("Worker exited unexpectedly"). `vitest.config.ts` (`pool: 'forks'`, cableado en `angular.json` con `runnerConfig`) lo estabiliza. 3 specs fallan de base y son ajenos a cualquier tarea de gráficas: `app.spec` (título del scaffold), `shell`/`sidebar` (`ActivatedRoute` sin `RouterTestingModule`).
- `chartjs-plugin-zoom` arrastra `hammerjs` (CJS, sólo pinch táctil); `angular.json` lo lista en `allowedCommonJsDependencies`. Ambos quedan en el chunk lazy de gráficas.
