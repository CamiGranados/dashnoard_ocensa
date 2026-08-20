import { Component, computed, input, output } from '@angular/core';
import {
  ScientificChartMode,
  ScientificSeriesSpec,
  coerceScientificChartMode,
} from '../../../models/scientific-chart.model';

const MODE_LABELS: Record<ScientificChartMode, string> = {
  points: 'Puntos',
  bars: 'Barras por evento',
  stems: 'Stems por evento',
  line: 'Línea intrasserie',
  box: 'Caja y puntos',
  intervals: 'Intervalos',
  matrix: 'Matriz',
};

@Component({
  selector: 'app-equivalent-representation-selector',
  templateUrl: './equivalent-representation-selector.html',
  styleUrl: './equivalent-representation-selector.css',
})
export class EquivalentRepresentationSelector {
  readonly series = input.required<ScientificSeriesSpec>();
  readonly selectedMode = input<ScientificChartMode | null>(null);
  readonly disabled = input(false);
  readonly modeChange = output<ScientificChartMode>();

  readonly modes = computed(() => [...new Set(this.series().allowedModes)]);
  readonly activeMode = computed(() =>
    coerceScientificChartMode(
      this.series(),
      this.selectedMode() ?? this.series().defaultMode,
    ),
  );

  label(mode: ScientificChartMode): string {
    return MODE_LABELS[mode];
  }

  select(mode: ScientificChartMode): void {
    if (this.disabled() || !this.series().allowedModes.includes(mode)) return;
    this.modeChange.emit(mode);
  }
}
