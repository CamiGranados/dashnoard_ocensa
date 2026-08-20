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
- `core/models` — DTOs que deben coincidir exactamente con las clases C# del backend (`overview.model.ts`, `procesar-archivos.model.ts`).
- `core/shared/components` — componentes reutilizables (p.ej. `spinner`).
- `core/shared/interceptors` — interceptores HTTP (`loading.interceptor.ts`).
- `layout/` — `shell`, `sidebar`, `topbar-filters` (chrome de la app, filtros globales de tanque/año/mes).
- `features/dashboard/` — `overview` (vista ejecutiva), `data-upload` (carga y preview de Excel), `resultados`, y `tabs/` (`corrosion`, `gaps`, `microbiology`, `physicochemistry`, `thps-tolerance`).
- Rutas en `app.routes.ts`, todas con `loadComponent` (lazy).

## Convenciones observadas

- Nombres de clase de componente/servicio SIN sufijo `Component`/`Service` en la clase (p.ej. `Overview`, `Sidebar`, `DataUpload`, `Api`), siguiendo el esquema por defecto de Angular 21. Los nombres de archivo son kebab-case sin `.component.` (`overview.ts`, `overview.html`, `overview.css`).
- Dominio de negocio y UI en español (`filtros`, `tanque`, `archivos`, mensajes de usuario); identificadores técnicos de Angular/TS en inglés. Mantener ese mismo mix al añadir código nuevo.
- Estado con signals (`signal`/`computed`/`effect`) es el patrón dominante; RxJS se usa puntualmente para llamadas HTTP crudas, `debounceTime` en filtros y `forkJoin` para cargas paralelas. Para datos derivados de HTTP nuevos, preferir `httpResource` (ver `overview.service.ts`) sobre subscribe manual cuando encaje.
- Colores y tokens de diseño centralizados como variables CSS en `src/styles.css` (`--color-primary`, `--shadow-md`, etc.); los componentes los consumen con `var(--...)`, no hardcodean hex nuevos.
- El backend expone endpoints tipo `/Tanks/summary`, `/Tanks/years`, `/Tanks/listTanks`, `/Tanks/fwv`, `/LoadFile/procesar` bajo `environment.apiUrl`.

## Puntos de atención (deuda técnica / código muerto detectado)

- `core/services/loading-state.ts` (`LoadingState`) es el servicio realmente usado por el interceptor y por `app.ts`. `core/services/loading.service.ts` (`LoadingService`) es un duplicado que nadie importa — no usarlo ni extenderlo; si se toca loading global, es en `LoadingState`.
- `core/services/filters-state.ts` (`FiltersState`, clase vacía) es scaffold sin terminar; el servicio real de filtros globales es `core/services/filters-state.service.ts` (`FiltersStateService`). No confundirlos.
- Solo existe `environment.ts` (sin `environment.prod.ts`); `apiUrl` está hardcodeado a `http://localhost:5285/api`. Tenerlo en cuenta antes de asumir configuración por entorno.
- Hay `console.log` de depuración dejados en código (`overview.service.ts`, `overview.ts`, `data-upload.ts`) — limpiar si se toca ese archivo, pero no es objetivo de tareas no relacionadas.
- Varios tabs (`gaps`, `microbiology`, `physicochemistry`, `thps-tolerance`) son placeholders vacíos (~9 líneas); `corrosion` es el único tab con implementación real (gráfica Chart.js con series configurables y slider de rango).
