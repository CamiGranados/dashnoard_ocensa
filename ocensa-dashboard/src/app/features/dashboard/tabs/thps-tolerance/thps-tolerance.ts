import { Component, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CardModule } from 'primeng/card';
import { TableModule } from 'primeng/table';
import { ThpsReviewService } from '../../../../core/services/thps-review.service';

interface ThpsReviewMetricCard {
  title: string;
  value: number | null;
  unit: string;
  icon: string;
  color: 'info' | 'success' | 'warning' | 'danger';
}

@Component({
  selector: 'app-thps-tolerance',
  imports: [CommonModule, CardModule, TableModule],
  templateUrl: './thps-tolerance.html',
  styleUrl: './thps-tolerance.css',
})
export class ThpsTolerance {
  private readonly thpsReviewService = inject(ThpsReviewService);

  readonly review = this.thpsReviewService.review;

  readonly metrics = computed<ThpsReviewMetricCard[]>(() => {
    const summary = this.review.value()?.summary;
    if (!summary) return [];
    return [
      {
        title: 'THPS residual (mediana)',
        value: summary.residualMedian,
        unit: ' ppm',
        icon: 'pi pi-shield',
        color: 'info',
      },
      {
        title: 'Dosis efectiva (mediana)',
        value: summary.effectiveDoseMedian,
        unit: ' ppm',
        icon: 'pi pi-syringe',
        color: 'success',
      },
      {
        title: 'Retención (mediana)',
        value: summary.retentionMedian,
        unit: ' %',
        icon: 'pi pi-percentage',
        color: 'warning',
      },
      {
        title: 'Eventos con dosis real',
        value: summary.eventsWithRealDoseCount,
        unit: ` / ${summary.totalRecords}`,
        icon: 'pi pi-check-circle',
        color: 'danger',
      },
    ];
  });

  readonly records = computed(() => this.review.value()?.data.items ?? []);
  readonly totalRecords = computed(() => this.review.value()?.data.totalRecords ?? 0);
}
