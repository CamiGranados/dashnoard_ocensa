import {
  afterEveryRender,
  ChangeDetectionStrategy,
  Component,
  contentChild,
  DestroyRef,
  effect,
  ElementRef,
  inject,
  input,
  signal,
  untracked,
} from '@angular/core';
import type { Chart } from 'chart.js';
import { UIChart } from 'primeng/chart';
import { DialogModule } from 'primeng/dialog';
import { ChartToolbar, ChartTool, ALL_CHART_TOOLS } from '../chart-toolbar/chart-toolbar';
import { createChartViewState, ChartInteractionMode } from '../chart-view-state';
import { buildZoomOptions, readZoomBounds, readZoomLevel, resetView, stepZoom, ZoomAxisMode } from '../chart-zoom';
import {
  buildChartFileName,
  chartToCsv,
  chartToPng,
  chartToTable,
  ChartTable,
  copyChartImage,
  downloadDataUrl,
  downloadText,
} from '../chart-export';
import { setRefLinesHidden } from '../chart-reference-lines';
import { applyChartDefaults } from '../chart-defaults';

/**
 * Contenedor común de las gráficas del dashboard: cabecera (título + subtítulo +
 * `<app-chart-toolbar>`), separador y la gráfica proyectada. El consumidor proyecta su
 * `<p-chart>` tal cual — sus `[data]`/`[options]`/`[plugins]` no se tocan — y, si tiene su
 * propio "restablecer" (slider de ventana), lo pasa por `resetHook`.
 *
 * La config de zoom se inyecta imperativamente en la instancia viva (`chart.options.plugins.zoom`),
 * no vía un objeto de `options` nuevo, para no disparar el `reinit()` de `<p-chart>`. Como
 * `chartjs-plugin-zoom` persiste el zoom escribiendo `scales.x.min/max` en el objeto de
 * `options` —que el consumidor puede reutilizar (campo estático)—, el frame limpia ese rastro
 * al recrearse la gráfica y al destruirse (ver `clearZoomLeak`).
 */
@Component({
  selector: 'app-chart-frame',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [DialogModule, ChartToolbar],
  templateUrl: './chart-frame.html',
  styleUrl: './chart-frame.css',
  host: {
    '[class.chart-frame--expanded]': 'view.expanded()',
    '(document:keydown.escape)': 'onEscape()',
  },
})
export class ChartFrame {
  private readonly host = inject(ElementRef<HTMLElement>);
  private readonly destroyRef = inject(DestroyRef);

  readonly title = input.required<string>();
  readonly subtitle = input<string>();
  /** Qué herramientas mostrar. Por defecto las 8. */
  readonly tools = input<readonly ChartTool[]>(ALL_CHART_TOOLS);
  /** Alto del área de gráfica. `Chart.defaults.maintainAspectRatio=false` exige uno explícito. */
  readonly bodyHeight = input('300px');
  /** Sin "tarjeta" propia (borde/fondo/sombra/padding): para gráficas que ya viven dentro de un panel. */
  readonly bare = input(false);
  /** Base del nombre de archivo al exportar. Por defecto, el título. */
  readonly exportName = input<string>();
  /** La gráfica dibuja líneas de referencia (habilita el toggle del menú "más opciones"). */
  readonly hasRefLines = input(false);
  /** Ejes sobre los que actúan zoom y pan. `'xy'` para gráficas de doble eje libre. */
  readonly axisMode = input<ZoomAxisMode>('x');
  /**
   * El frame es dueño del rango visible del eje (vía zoom). `true` por defecto: al recrearse
   * la gráfica limpia cualquier `min/max` que el plugin de zoom haya dejado en las `options`.
   * Las gráficas que fijan el rango del eje ellas mismas (slider de ventana: corrosion,
   * physicochemistry) deben pasar `false`.
   */
  readonly ownsAxisRange = input(true);
  /** "Restablecer" del componente (p. ej. `window.reset` del slider de ventana). Se ejecuta al final. */
  readonly resetHook = input<(() => void) | undefined>(undefined);

  protected readonly view = createChartViewState();

  private readonly uiChart = contentChild(UIChart);
  private readonly denseSig = signal(false);
  protected readonly dense = this.denseSig.asReadonly();

  protected readonly dataDialogOpen = signal(false);
  protected readonly dataTable = signal<ChartTable | null>(null);
  protected readonly copyFeedback = signal<'ok' | 'error' | null>(null);

  /** Instancia ya configurada, para reconfigurar sólo cuando `<p-chart>` la recrea. */
  private configuredChart: Chart | undefined;

  constructor() {
    // Registra el cromo + el plugin de zoom en `Chart.defaults` (idempotente).
    applyChartDefaults();

    // `<p-chart>` hace destroy()+new Chart() cuando el consumidor cambia su data/options
    // (nuevo filtro, recarga). `afterEveryRender` es barato: sólo actúa al ver una instancia
    // nueva; entonces re-inyecta el zoom y devuelve la vista al rango completo.
    afterEveryRender(() => {
      const chart = this.chart();
      if (!chart || chart === this.configuredChart) return;
      const isFirst = this.configuredChart === undefined;
      this.configuredChart = chart;

      // Instancia nueva por cambio de datos ⇒ la vista vuelve a cero: el zoom anterior apuntaba
      // a los datos viejos y el plugin pudo dejar min/max en un objeto de options reutilizado.
      if (!isFirst) {
        untracked(() => this.view.reset());
        this.clearZoomLeak();
      }
      this.applyZoom(chart);
      setRefLinesHidden(chart, !untracked(() => this.view.refLinesVisible()));
      chart.update('none');
      untracked(() => this.view.zoomLevel.set(readZoomLevel(chart)));
    });

    // Cambio de modo (pan ↔ selección): la instancia es la misma, sólo se re-inyecta el zoom.
    effect(() => {
      const mode = this.view.mode();
      const chart = untracked(() => this.chart());
      if (!chart) return;
      this.applyZoom(chart, mode);
      chart.update('none');
    });

    this.observeWidth();

    // Al recrearse el frame (p. ej. el `@if` de "cargando" lo quita y lo repone), deja el
    // objeto de options del consumidor sin el rastro de zoom, para que la próxima gráfica
    // arranque en rango completo.
    this.destroyRef.onDestroy(() => this.clearZoomLeak());
  }

  /**
   * Instancia Chart.js actual, sólo si está pintada. `undefined` mientras no hay datos y en
   * jsdom (`<canvas>` sin contexto 2D ⇒ `chart.ctx` nulo), lo que mantiene los tests simples.
   */
  protected chart(): Chart | undefined {
    const c = this.uiChart()?.chart as (Chart & { ctx?: unknown }) | undefined;
    return c?.ctx ? c : undefined;
  }

  private applyZoom(chart: Chart, mode: ChartInteractionMode = this.view.mode()): void {
    const plugins = (chart.options.plugins ??= {});
    plugins.zoom = buildZoomOptions({
      mode,
      axisMode: this.axisMode(),
      onZoomComplete: (c) => this.syncZoomState(c),
      onPanComplete: (c) => this.syncZoomState(c),
    });
  }

  /** Ejes en los que el frame controla el rango (para limpiar el rastro del plugin de zoom). */
  private ownedAxes(): readonly ('x' | 'y')[] {
    if (!this.ownsAxisRange()) return [];
    const m = this.axisMode();
    return m === 'xy' ? (['x', 'y'] as const) : [m];
  }

  /**
   * Borra el `min`/`max` que `chartjs-plugin-zoom` deja escrito en `options.scales[axis]` al
   * hacer zoom. `uiChart().options` ES el objeto que pasó el consumidor (posible campo
   * estático), así que limpiarlo evita que la siguiente gráfica herede el zoom.
   */
  private clearZoomLeak(): void {
    const scales = (this.uiChart()?.options as { scales?: Record<string, { min?: unknown; max?: unknown } | undefined> })
      ?.scales;
    if (!scales) return;
    for (const axis of this.ownedAxes()) {
      const s = scales[axis];
      if (s) {
        delete s.min;
        delete s.max;
      }
    }
  }

  private syncZoomState(chart: Chart): void {
    this.view.zoomLevel.set(readZoomLevel(chart));
    this.view.zoomBounds.set(readZoomBounds(chart));
  }

  private observeWidth(): void {
    if (typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver((entries) => {
      const w = entries[0]?.contentRect.width ?? 0;
      this.denseSig.set(w > 0 && w < 520);
    });
    ro.observe(this.host.nativeElement);
    this.destroyRef.onDestroy(() => ro.disconnect());
  }

  // ---------------------------------------------------------------- barra de herramientas ---

  protected onZoom(direction: 'in' | 'out'): void {
    const c = this.chart();
    if (!c) return;
    stepZoom(c, direction);
    this.syncZoomState(c);
  }

  protected onModeChange(mode: ChartInteractionMode): void {
    this.view.mode.set(mode);
  }

  protected handleReset(): void {
    const c = this.chart();
    if (c) resetView(c, this.view, this.resetHook());
    else {
      this.view.reset();
      this.resetHook()?.();
    }
    this.clearZoomLeak();
  }

  protected onDownload(kind: 'png' | 'csv'): void {
    const c = this.chart();
    if (!c) return;
    const base = buildChartFileName(this.exportName() ?? this.title(), c);
    if (kind === 'png') {
      downloadDataUrl(chartToPng(c, this.pngHeader()), `${base}.png`);
    } else {
      downloadText(chartToCsv(c), `${base}.csv`);
    }
  }

  protected onExpandToggle(): void {
    this.view.expanded.update((v) => !v);
    // El canvas se re-mide solo (ResizeObserver de Chart.js), pero forzarlo evita un frame
    // con el tamaño viejo mientras corre la transición CSS.
    requestAnimationFrame(() => this.chart()?.resize());
  }

  protected onToggleRefLines(): void {
    this.view.refLinesVisible.update((v) => !v);
    const c = this.chart();
    if (!c) return;
    setRefLinesHidden(c, !this.view.refLinesVisible());
    c.update('none');
  }

  protected onShowData(): void {
    const c = this.chart();
    if (!c) return;
    this.dataTable.set(chartToTable(c));
    this.dataDialogOpen.set(true);
  }

  protected async onCopyImage(): Promise<void> {
    const c = this.chart();
    if (!c) return;
    try {
      await copyChartImage(c, this.pngHeader());
      this.copyFeedback.set('ok');
    } catch {
      this.copyFeedback.set('error');
    }
    setTimeout(() => this.copyFeedback.set(null), 2500);
  }

  protected onEscape(): void {
    if (this.view.expanded()) this.view.expanded.set(false);
  }

  private pngHeader(): { title: string; subtitle?: string } {
    return { title: this.title(), subtitle: this.subtitle() };
  }
}
