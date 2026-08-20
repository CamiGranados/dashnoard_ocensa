import { Component, computed, input } from '@angular/core';
import { AnalyticsApprovalStatus } from '../../../models/scientific-chart.model';
import { ScientificStateBanner } from '../scientific-state-banner/scientific-state-banner';

@Component({
  selector: 'app-blocked-chart-placeholder',
  imports: [ScientificStateBanner],
  templateUrl: './blocked-chart-placeholder.html',
  styleUrl: './blocked-chart-placeholder.css',
})
export class BlockedChartPlaceholder {
  readonly status = input<AnalyticsApprovalStatus | string>('pending_validation');
  readonly title = input('Gráfica no disponible');
  readonly message = input('El resultado no cumple todavía la puerta de publicación.');
  readonly reasons = input<readonly string[]>([]);
  readonly requiredAction = input<string | null>(null);
  readonly owner = input<string | null>(null);
  readonly reference = input<string | null>(null);

  readonly safeStatus = computed(() =>
    this.status() === 'approved_current' ? 'calculation_error' : this.status(),
  );
}
