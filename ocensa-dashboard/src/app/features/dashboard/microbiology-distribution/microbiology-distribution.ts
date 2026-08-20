import { HttpErrorResponse } from '@angular/common/http';
import { Component, computed, effect, inject, signal } from '@angular/core';
import { ChartModule } from 'primeng/chart';
import { TableModule } from 'primeng/table';
import { finalize } from 'rxjs';
import {
  H08DistributionFacet,
  H08DistributionResponse,
  validateH08DistributionContract,
} from '../../../core/models/h08-distribution.model';
import {
  AnalyticsApprovalStatus,
  ScientificChartMode,
  coerceScientificChartMode,
  isAnalyticsApprovalStatus,
} from '../../../core/models/scientific-chart.model';
import { DatasetReleaseStore } from '../../../core/services/dataset-release-store.service';
import {
  FiltersStateService,
  validateAppliedDashboardFilters,
} from '../../../core/services/filters-state.service';
import { H08DistributionService } from '../../../core/services/h08-distribution.service';
import { BlockedChartPlaceholder } from '../../../core/shared/components/blocked-chart-placeholder/blocked-chart-placeholder';
import { AnalyticalTraceLink } from '../../../core/shared/components/analytical-trace-link/analytical-trace-link';
import { EquivalentRepresentationSelector } from '../../../core/shared/components/equivalent-representation-selector/equivalent-representation-selector';
import { ReleaseGate } from '../../../core/shared/components/release-gate/release-gate';
import { ResultIdentityStrip } from '../../../core/shared/components/result-identity-strip/result-identity-strip';
import { ScientificStateBanner } from '../../../core/shared/components/scientific-state-banner/scientific-state-banner';
import { Spinner } from '../../../core/shared/components/spinner/spinner';
import { buildH08ChartData, buildH08ChartOptions } from './h08-distribution.presenter';

interface H08FailureView {
  status: AnalyticsApprovalStatus;
  message: string;
  reasons: string[];
}

function errorBody(error: HttpErrorResponse): Record<string, unknown> {
  return typeof error.error === 'object' && error.error !== null
    ? (error.error as Record<string, unknown>)
    : {};
}

export function isRenderableH08Status(status: AnalyticsApprovalStatus): boolean {
  return status === 'approved_current' || status === 'provisional_descriptive';
}

export function classifyH08Failure(error: unknown): H08FailureView {
  if (!(error instanceof HttpErrorResponse)) {
    return {
      status: 'calculation_error',
      message: 'La consulta H08 falló y se retiró cualquier resultado anterior.',
      reasons: ['Error de comunicación no verificable.'],
    };
  }

  const body = errorBody(error);
  const declared = body['approvalStatus'];
  const status =
    isAnalyticsApprovalStatus(declared) && !isRenderableH08Status(declared)
      ? declared
      : error.status === 409
        ? 'blocked_join'
        : error.status === 422 || error.status === 404
          ? 'pending_validation'
          : error.status === 410
            ? 'stale_result'
            : 'calculation_error';
  const message =
    typeof body['detail'] === 'string'
      ? body['detail']
      : typeof body['message'] === 'string'
        ? body['message']
        : 'La API no entregó un ChartSpec H08 publicable.';
  const reasons = Array.isArray(body['warnings'])
    ? body['warnings'].filter((item): item is string => typeof item === 'string').slice(0, 10)
    : [];

  return {
    status,
    message,
    reasons: reasons.length ? reasons : [`HTTP ${error.status || 'sin respuesta'}`],
  };
}

export function shouldInvalidateReleaseForH08Failure(error: unknown): boolean {
  if (!(error instanceof HttpErrorResponse)) return false;
  const body = errorBody(error);
  return [
    'STALE_RESULT',
    'DATASET_RELEASE_NOT_FOUND',
    'ANALYTICAL_RESULT_IDENTITY_MISMATCH',
    'UAT_RELEASE_IDENTITY_MISMATCH',
  ].includes(String(body['code'] ?? ''));
}

@Component({
  selector: 'app-microbiology-distribution',
  imports: [
    ChartModule,
    TableModule,
    AnalyticalTraceLink,
    BlockedChartPlaceholder,
    EquivalentRepresentationSelector,
    ReleaseGate,
    ResultIdentityStrip,
    ScientificStateBanner,
    Spinner,
  ],
  templateUrl: './microbiology-distribution.html',
  styleUrl: './microbiology-distribution.css',
})
export class MicrobiologyDistribution {
  private readonly service = inject(H08DistributionService);
  private readonly releaseStore = inject(DatasetReleaseStore);
  private readonly filtersState = inject(FiltersStateService);
  private requestId = 0;

  readonly hasQueryableRelease = this.releaseStore.hasQueryableRelease;
  readonly loading = signal(false);
  readonly result = signal<H08DistributionResponse | null>(null);
  readonly failure = signal<H08FailureView | null>(null);
  readonly modes = signal<Record<string, ScientificChartMode>>({});

  readonly visibleResult = computed(() => {
    const result = this.result();
    return result && isRenderableH08Status(result.approvalStatus) ? result : null;
  });
  readonly facetViews = computed(() => {
    const result = this.visibleResult();
    if (!result) return [];
    return result.facets.map((facet) => {
      const mode = this.modeFor(facet);
      return {
        facet,
        mode,
        data: buildH08ChartData(result, facet, mode),
        options: buildH08ChartOptions(result),
      };
    });
  });

  private readonly loadDistribution = effect((onCleanup) => {
    const datasetReleaseId = this.releaseStore.analysisReleaseId();
    const filters = this.filtersState.filters();
    this.result.set(null);
    this.modes.set({});

    if (!datasetReleaseId) {
      this.loading.set(false);
      return;
    }

    const requestId = ++this.requestId;
    this.failure.set(null);
    this.loading.set(true);
    const subscription = this.service
      .getDistribution(datasetReleaseId, filters)
      .pipe(finalize(() => requestId === this.requestId && this.loading.set(false)))
      .subscribe({
        next: (response) => {
          if (requestId !== this.requestId) return;
          this.loading.set(false);
          const contractIssues = validateH08DistributionContract(response);
          const releaseMismatch = response.datasetReleaseId !== datasetReleaseId;
          const filterIssues = validateAppliedDashboardFilters(response.filtersApplied, filters);
          const issues = [...filterIssues, ...contractIssues];
          if (releaseMismatch) {
            issues.unshift({
              code: 'H08_RELEASE_MISMATCH',
              message: 'La respuesta H08 no corresponde al release solicitado.',
            });
          }

          if (issues.length) {
            this.result.set(null);
            this.failure.set({
              status: 'calculation_error',
              message: 'El ChartSpec H08 no superó la validación contractual.',
              reasons: issues.slice(0, 10).map((item) => `${item.code}: ${item.message}`),
            });
            if (releaseMismatch || filterIssues.length) {
              this.releaseStore.invalidateForQueryFailure();
            }
            return;
          }

          this.modes.set(
            Object.fromEntries(
              response.facets.map((facet) => [facet.facetId, facet.series.defaultMode]),
            ),
          );
          this.result.set(response);
        },
        error: (error: unknown) => {
          if (requestId !== this.requestId) return;
          this.loading.set(false);
          this.result.set(null);
          this.failure.set(classifyH08Failure(error));
          if (shouldInvalidateReleaseForH08Failure(error)) {
            this.releaseStore.invalidateForQueryFailure();
          }
        },
      });

    onCleanup(() => {
      this.requestId += 1;
      subscription.unsubscribe();
    });
  });

  modeFor(facet: H08DistributionFacet): ScientificChartMode {
    return coerceScientificChartMode(
      facet.series,
      this.modes()[facet.facetId] ?? facet.series.defaultMode,
    );
  }

  setMode(facet: H08DistributionFacet, requested: ScientificChartMode): void {
    const mode = coerceScientificChartMode(facet.series, requested);
    this.modes.update((current) => ({ ...current, [facet.facetId]: mode }));
  }
}
