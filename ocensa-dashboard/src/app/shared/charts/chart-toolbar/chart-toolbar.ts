import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { MenuModule } from 'primeng/menu';
import { MenuItem } from 'primeng/api';
import { TooltipModule } from 'primeng/tooltip';
import { ChartInteractionMode } from '../chart-view-state';

/** Herramientas de la barra, en el orden en que se pintan (izq → der). */
export type ChartTool =
  | 'zoom-in'
  | 'zoom-out'
  | 'select'
  | 'pan'
  | 'reset'
  | 'download'
  | 'expand'
  | 'more';

export const ALL_CHART_TOOLS: readonly ChartTool[] = [
  'zoom-in',
  'zoom-out',
  'select',
  'pan',
  'reset',
  'download',
  'expand',
  'more',
] as const;

/** Herramientas que colapsan dentro del menú "más opciones" cuando `dense` está activo. */
const COLLAPSIBLE: readonly ChartTool[] = ['select', 'pan', 'download', 'expand'] as const;

/**
 * Barra de herramientas de una gráfica: 100 % presentacional. No toca la gráfica — emite
 * intenciones y el contenedor (`ChartFrame`, o el componente en el caso de thps) las cumple.
 * El aspecto (iconos lineales, botón cuadrado ~32 px, estado activo con fondo redondeado)
 * replica la imagen de referencia y usa sólo tokens de `styles.css`.
 */
@Component({
  selector: 'app-chart-toolbar',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MenuModule, TooltipModule],
  templateUrl: './chart-toolbar.html',
  styleUrl: './chart-toolbar.css',
})
export class ChartToolbar {
  /** Qué herramientas mostrar. Por defecto las 8. */
  readonly tools = input<readonly ChartTool[]>(ALL_CHART_TOOLS);
  /** Modo de interacción activo (para `aria-pressed` y el resaltado). */
  readonly mode = input<ChartInteractionMode>('pan');
  readonly canZoomIn = input(true);
  readonly canZoomOut = input(false);
  /** La gráfica tiene líneas de referencia (habilita el ítem del menú para ocultarlas). */
  readonly hasRefLines = input(false);
  readonly refLinesVisible = input(true);
  /** La gráfica está expandida (cambia el tooltip/ível del botón "expandir"). */
  readonly expanded = input(false);
  /** Ancho reducido: colapsa selección/pan/descargar/expandir en el menú "más opciones". */
  readonly dense = input(false);

  readonly zoomIn = output<void>();
  readonly zoomOut = output<void>();
  readonly modeChange = output<ChartInteractionMode>();
  readonly resetView = output<void>();
  readonly download = output<'png' | 'csv'>();
  readonly expandToggle = output<void>();
  readonly toggleRefLines = output<void>();
  readonly showData = output<void>();
  readonly copyImage = output<void>();

  /** ¿Se pinta este botón como icono suelto? (respeta `tools` y el colapso responsive). */
  protected visible(tool: ChartTool): boolean {
    if (!this.tools().includes(tool)) return false;
    if (this.dense() && COLLAPSIBLE.includes(tool)) return false;
    return true;
  }

  protected has(tool: ChartTool): boolean {
    return this.tools().includes(tool);
  }

  /** Ítems del menú "descargar" (icono de flecha abajo). */
  protected readonly downloadItems = computed<MenuItem[]>(() => [
    { label: 'Imagen PNG', icon: 'pi pi-image', command: () => this.download.emit('png') },
    { label: 'Datos CSV', icon: 'pi pi-file', command: () => this.download.emit('csv') },
  ]);

  /** Ítems del menú "más opciones" (⋮): acciones secundarias + lo colapsado en `dense`. */
  protected readonly moreItems = computed<MenuItem[]>(() => {
    const items: MenuItem[] = [];

    if (this.dense()) {
      if (this.has('select')) {
        items.push({
          label: 'Selección de área',
          icon: 'pi pi-clone',
          command: () => this.modeChange.emit('select'),
        });
      }
      if (this.has('pan')) {
        items.push({
          label: 'Desplazar',
          icon: 'pi pi-arrows-alt',
          command: () => this.modeChange.emit('pan'),
        });
      }
      if (this.has('download')) {
        items.push(
          { label: 'Descargar PNG', icon: 'pi pi-image', command: () => this.download.emit('png') },
          { label: 'Descargar CSV', icon: 'pi pi-file', command: () => this.download.emit('csv') },
        );
      }
      if (this.has('expand')) {
        items.push({
          label: this.expanded() ? 'Contraer' : 'Expandir',
          icon: 'pi pi-window-maximize',
          command: () => this.expandToggle.emit(),
        });
      }
      if (items.length) items.push({ separator: true });
    }

    items.push(
      { label: 'Ver datos en tabla', icon: 'pi pi-table', command: () => this.showData.emit() },
      { label: 'Copiar imagen', icon: 'pi pi-clone', command: () => this.copyImage.emit() },
    );

    if (this.hasRefLines()) {
      items.push({
        label: this.refLinesVisible() ? 'Ocultar líneas de referencia' : 'Mostrar líneas de referencia',
        icon: this.refLinesVisible() ? 'pi pi-eye-slash' : 'pi pi-eye',
        command: () => this.toggleRefLines.emit(),
      });
    }

    return items;
  });
}
