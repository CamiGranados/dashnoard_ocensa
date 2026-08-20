import { HttpErrorResponse } from '@angular/common/http';
import { Component, computed, effect, inject, signal } from '@angular/core';
import { ChartModule } from 'primeng/chart';
import { TableModule } from 'primeng/table';
import { finalize } from 'rxjs';
import {
  CorrosionCouponCategorySpec,
  CorrosionCouponResponse,
  validateCorrosionCouponContract,
} from '../../../core/models/corrosion-coupon.model';
import {
  AnalyticsApprovalStatus,
  isAnalyticsApprovalStatus,
} from '../../../core/models/scientific-chart.model';
import { CorrosionCouponService } from '../../../core/services/corrosion-coupon.service';
import { DatasetReleaseStore } from '../../../core/services/dataset-release-store.service';
import {
  FiltersStateService,
  validateAppliedDashboardFilters,
} from '../../../core/services/filters-state.service';
import { BlockedChartPlaceholder } from '../../../core/shared/components/blocked-chart-placeholder/blocked-chart-placeholder';
import { AnalyticalTraceLink } from '../../../core/shared/components/analytical-trace-link/analytical-trace-link';
import { ReleaseGate } from '../../../core/shared/components/release-gate/release-gate';
import { ResultIdentityStrip } from '../../../core/shared/components/result-identity-strip/result-identity-strip';
import { ScientificStateBanner } from '../../../core/shared/components/scientific-state-banner/scientific-state-banner';
import { Spinner } from '../../../core/shared/components/spinner/spinner';
import {
  buildCorrosionCouponChartData,
  buildCorrosionCouponChartOptions,
} from './corrosion-coupon.presenter';

interface CorrosionCouponFailureView {
  status: AnalyticsApprovalStatus;
  message: string;
  reasons: string[];
}

function errorBody(error: HttpErrorResponse): Record<string, unknown> {
  return typeof error.error === 'object' && error.error !== null
    ? (error.error as Record<string, unknown>)
    : {};
}

export function isRenderableCorrosionCouponStatus(status: AnalyticsApprovalStatus): boolean {
  return status === 'provisional_descriptive';
}

export function classifyCorrosionCouponFailure(error: unknown): CorrosionCouponFailureView {
  if (!(error instanceof HttpErrorResponse)) {
    return {
      status: 'calculation_error',
      message: 'La consulta de corrosión falló y se retiró cualquier resultado anterior.',
      reasons: ['Error de comunicación no verificable.'],
    };
  }

  const body = errorBody(error);
  const declared = body['approvalStatus'];
  const status =
    isAnalyticsApprovalStatus(declared) && !isRenderableCorrosionCouponStatus(declared)
      ? declared
      : error.status === 409
        ? 'blocked_join'
        : error.status === 422
          ? 'pending_validation'
          : error.status === 404 || error.status === 410
            ? 'stale_result'
            : 'calculation_error';
  const message =
    typeof body['detail'] === 'string'
      ? body['detail']
      : typeof body['message'] === 'string'
        ? body['message']
        : 'La API no entregó un ChartSpec de cupón publicable.';
  const rawReasons = Array.isArray(body['warnings'])
    ? body['warnings']
    : Array.isArray(body['reasons'])
      ? body['reasons']
      : [];
  const reasons = rawReasons
    .filter((item): item is string => typeof item === 'string')
    .slice(0, 10);

  return {
    status,
    message,
    reasons: reasons.length ? reasons : [`HTTP ${error.status || 'sin respuesta'}`],
  };
}

export function shouldInvalidateReleaseForCorrosionCouponFailure(error: unknown): boolean {
  if (!(error instanceof HttpErrorResponse)) return false;
  const body = errorBody(error);
  return (
    error.status === 404 ||
    error.status === 410 ||
    [
      'STALE_RESULT',
      'DATASET_RELEASE_NOT_FOUND',
      'ANALYTICAL_RESULT_IDENTITY_MISMATCH',
      'UAT_RELEASE_IDENTITY_MISMATCH',
    ].includes(String(body['code'] ?? ''))
  );
}

@Component({
  selector: 'app-corrosion-coupon',
  imports: [
    ChartModule,
    TableModule,
    AnalyticalTraceLink,
    BlockedChartPlaceholder,
    ReleaseGate,
    ResultIdentityStrip,
    ScientificStateBanner,
    Spinner,
  ],
  templateUrl: './corrosion-coupon.html',
  styleUrl: './corrosion-coupon.css',
})
export class CorrosionCoupon {
  private readonly service = inject(CorrosionCouponService);
  private readonly releaseStore = inject(DatasetReleaseStore);
  private readonly filtersState = inject(FiltersStateService);
  private requestId = 0;

  readonly hasQueryableRelease = this.releaseStore.hasQueryableRelease;
  readonly loading = signal(false);
  readonly result = signal<CorrosionCouponResponse | null>(null);
  readonly failure = signal<CorrosionCouponFailureView | null>(null);

  readonly visibleResult = computed(() => {
    const result = this.result();
    return result && isRenderableCorrosionCouponStatus(result.approvalStatus) ? result : null;
  });
  readonly facetViews = computed(() => {
    const result = this.visibleResult();
    if (!result) return [];
    const options = buildCorrosionCouponChartOptions(result);
    return result.facets.map((facet) => ({
      facet,
      data: buildCorrosionCouponChartData(result, facet),
      options,
    }));
  });

  private readonly loadChart = effect((onCleanup) => {
    const datasetReleaseId = this.releaseStore.analysisReleaseId();
    const filters = this.filtersState.filters();
    this.result.set(null);

    if (!datasetReleaseId) {
      this.loading.set(false);
      return;
    }

    const requestId = ++this.requestId;
    this.failure.set(null);
    this.loading.set(true);
    const subscription = this.service
      .getChart(datasetReleaseId, filters)
      .pipe(finalize(() => requestId === this.requestId && this.loading.set(false)))
      .subscribe({
        next: (response) => {
          if (requestId !== this.requestId) return;
          this.loading.set(false);
          const contractIssues = validateCorrosionCouponContract(response);
          const releaseMismatch = response.datasetReleaseId !== datasetReleaseId;
          const filterIssues = validateAppliedDashboardFilters(response.filtersApplied, filters, {
            method: 'coupon',
          });
          const issues = [...filterIssues, ...contractIssues];
          if (releaseMismatch) {
            issues.unshift({
              code: 'COUPON_RELEASE_MISMATCH',
              message: 'La respuesta de cupón no corresponde al release solicitado.',
            });
          }

          if (issues.length) {
            this.result.set(null);
            this.failure.set({
              status: 'calculation_error',
              message: 'El ChartSpec de corrosión por cupón no superó la validación contractual.',
              reasons: issues.slice(0, 10).map((item) => `${item.code}: ${item.message}`),
            });
            if (releaseMismatch || filterIssues.length) {
              this.releaseStore.invalidateForQueryFailure();
            }
            return;
          }

          this.result.set(response);
        },
        error: (error: unknown) => {
          if (requestId !== this.requestId) return;
          this.loading.set(false);
          this.result.set(null);
          this.failure.set(classifyCorrosionCouponFailure(error));
          if (shouldInvalidateReleaseForCorrosionCouponFailure(error)) {
            this.releaseStore.invalidateForQueryFailure();
          }
        },
      });

    onCleanup(() => {
      this.requestId += 1;
      subscription.unsubscribe();
    });
  });

  categoryFor(categoryId: string): CorrosionCouponCategorySpec | null {
    return this.visibleResult()?.categories.find((category) => category.id === categoryId) ?? null;
  }
}
