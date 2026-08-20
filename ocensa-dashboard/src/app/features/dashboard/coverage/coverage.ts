import { HttpErrorResponse } from '@angular/common/http';
import { Component, computed, effect, inject, signal } from '@angular/core';
import { ChartModule } from 'primeng/chart';
import { finalize } from 'rxjs';
import {
  CoverageMetricResponse,
  CoverageRow,
  validateCoverageMetricContract,
} from '../../../core/models/coverage.model';
import {
  AnalyticsApprovalStatus,
  isAnalyticsApprovalStatus,
} from '../../../core/models/scientific-chart.model';
import { CoverageService } from '../../../core/services/coverage.service';
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
  buildCoverageChartData,
  buildCoverageChartOptions,
  coverageColor,
} from './coverage-chart.presenter';

interface CoverageFailureView {
  status: AnalyticsApprovalStatus;
  message: string;
  reasons: string[];
}

function objectBody(error: HttpErrorResponse): Record<string, unknown> {
  return typeof error.error === 'object' && error.error !== null
    ? (error.error as Record<string, unknown>)
    : {};
}

export function classifyCoverageFailure(error: unknown): CoverageFailureView {
  if (!(error instanceof HttpErrorResponse)) {
    return {
      status: 'calculation_error',
      message: 'La consulta de cobertura falló y se retiraron los resultados anteriores.',
      reasons: ['Error de comunicación no verificable.'],
    };
  }

  const body = objectBody(error);
  const message =
    typeof body['detail'] === 'string'
      ? body['detail']
      : typeof body['message'] === 'string'
        ? body['message']
        : 'La API no entregó un resultado de cobertura publicable.';
  const declaredReasons = Array.isArray(body['reasons'])
    ? body['reasons']
    : Array.isArray(body['warnings'])
      ? body['warnings']
      : [];
  const reasons = declaredReasons
    .filter((reason): reason is string => typeof reason === 'string')
    .slice(0, 10);

  const bodyStatus = body['approvalStatus'];
  const declaredBlockingStatus =
    isAnalyticsApprovalStatus(bodyStatus) && !isRenderableCoverageStatus(bodyStatus)
      ? bodyStatus
      : null;
  const status: AnalyticsApprovalStatus =
    declaredBlockingStatus ??
    (error.status === 409
      ? 'blocked_join'
      : error.status === 410 || error.status === 404
        ? 'stale_result'
        : error.status === 422
          ? 'pending_validation'
          : 'calculation_error');

  return {
    status,
    message,
    reasons: reasons.length ? reasons : [`HTTP ${error.status || 'sin respuesta'}`],
  };
}

export function shouldInvalidateReleaseForCoverageFailure(error: unknown): boolean {
  if (!(error instanceof HttpErrorResponse)) return false;
  if (error.status === 404 || error.status === 410) return true;

  const body = objectBody(error);
  return [
    'STALE_RESULT',
    'DATASET_RELEASE_NOT_FOUND',
    'ANALYTICAL_RESULT_IDENTITY_MISMATCH',
    'UAT_RELEASE_IDENTITY_MISMATCH',
  ].includes(String(body['code'] ?? ''));
}

export function isRenderableCoverageStatus(status: AnalyticsApprovalStatus): boolean {
  return status === 'approved_current' || status === 'provisional_descriptive';
}

@Component({
  selector: 'app-coverage',
  imports: [
    ChartModule,
    AnalyticalTraceLink,
    BlockedChartPlaceholder,
    ReleaseGate,
    ResultIdentityStrip,
    ScientificStateBanner,
    Spinner,
  ],
  templateUrl: './coverage.html',
  styleUrl: './coverage.css',
})
export class Coverage {
  private readonly coverageService = inject(CoverageService);
  private readonly releaseStore = inject(DatasetReleaseStore);
  private readonly filtersState = inject(FiltersStateService);
  private requestId = 0;

  readonly hasQueryableRelease = this.releaseStore.hasQueryableRelease;
  readonly loading = signal(false);
  readonly result = signal<CoverageMetricResponse | null>(null);
  readonly failure = signal<CoverageFailureView | null>(null);

  readonly visibleResult = computed(() => {
    const result = this.result();
    return result && isRenderableCoverageStatus(result.approvalStatus) ? result : null;
  });
  readonly chartData = computed(() => {
    const result = this.visibleResult();
    return result ? buildCoverageChartData(result) : null;
  });
  readonly chartOptions = computed(() => {
    const result = this.visibleResult();
    return result ? buildCoverageChartOptions(result) : null;
  });

  protected readonly coverageColor = coverageColor;

  private readonly loadCoverage = effect((onCleanup) => {
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

    const subscription = this.coverageService
      .getCoverage(datasetReleaseId, filters)
      .pipe(
        finalize(() => {
          if (requestId === this.requestId) this.loading.set(false);
        }),
      )
      .subscribe({
        next: (response) => {
          if (requestId !== this.requestId) return;
          this.loading.set(false);
          const contractIssues = validateCoverageMetricContract(response);
          const releaseMismatch = response.datasetReleaseId !== datasetReleaseId;
          const filterIssues = validateAppliedDashboardFilters(response.filtersApplied, filters);
          const issues = [...filterIssues, ...contractIssues];
          if (releaseMismatch) {
            issues.unshift({
              code: 'COVERAGE_RELEASE_MISMATCH',
              message: 'La respuesta no corresponde al release solicitado.',
            });
          }

          if (issues.length) {
            this.result.set(null);
            this.failure.set({
              status: 'calculation_error',
              message: 'La respuesta de cobertura no superó la validación contractual.',
              reasons: issues.slice(0, 10).map((issue) => `${issue.code}: ${issue.message}`),
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
          this.failure.set(classifyCoverageFailure(error));
          if (shouldInvalidateReleaseForCoverageFailure(error)) {
            this.releaseStore.invalidateForQueryFailure();
          }
        },
      });

    onCleanup(() => {
      this.requestId += 1;
      subscription.unsubscribe();
    });
  });

  cellFor(row: CoverageRow, stateId: string) {
    return row.cells.find((cell) => cell.stateId === stateId) ?? null;
  }
}
