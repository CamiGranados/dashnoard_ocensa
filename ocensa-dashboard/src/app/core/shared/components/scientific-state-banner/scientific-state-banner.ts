import { Component, computed, input } from '@angular/core';
import {
  AnalyticsApprovalStatus,
  isAnalyticsApprovalStatus,
} from '../../../models/scientific-chart.model';

export interface ScientificStateView {
  status: AnalyticsApprovalStatus;
  title: string;
  icon: string;
  tone: 'success' | 'info' | 'warning' | 'danger' | 'neutral';
  blocking: boolean;
}

const STATE_VIEWS: Record<AnalyticsApprovalStatus, ScientificStateView> = {
  approved_current: {
    status: 'approved_current',
    title: 'Aprobado vigente',
    icon: 'pi pi-check-circle',
    tone: 'success',
    blocking: false,
  },
  provisional: {
    status: 'provisional',
    title: 'Resultado provisional',
    icon: 'pi pi-exclamation-triangle',
    tone: 'warning',
    blocking: true,
  },
  provisional_descriptive: {
    status: 'provisional_descriptive',
    title: 'Perfil descriptivo provisional',
    icon: 'pi pi-eye',
    tone: 'warning',
    blocking: false,
  },
  pending_validation: {
    status: 'pending_validation',
    title: 'Pendiente de validación',
    icon: 'pi pi-clock',
    tone: 'warning',
    blocking: true,
  },
  blocked_chemical_basis: {
    status: 'blocked_chemical_basis',
    title: 'Base química no confirmada',
    icon: 'pi pi-lock',
    tone: 'danger',
    blocking: true,
  },
  blocked_unit: {
    status: 'blocked_unit',
    title: 'Unidad no confirmada',
    icon: 'pi pi-lock',
    tone: 'danger',
    blocking: true,
  },
  blocked_event_grain: {
    status: 'blocked_event_grain',
    title: 'Grano de evento no aprobado',
    icon: 'pi pi-lock',
    tone: 'danger',
    blocking: true,
  },
  blocked_join: {
    status: 'blocked_join',
    title: 'Join no aprobado',
    icon: 'pi pi-link',
    tone: 'danger',
    blocking: true,
  },
  historical_not_current: {
    status: 'historical_not_current',
    title: 'Resultado histórico no vigente',
    icon: 'pi pi-history',
    tone: 'neutral',
    blocking: true,
  },
  stale_result: {
    status: 'stale_result',
    title: 'Resultado obsoleto',
    icon: 'pi pi-refresh',
    tone: 'danger',
    blocking: true,
  },
  partial_period: {
    status: 'partial_period',
    title: 'Periodo parcial',
    icon: 'pi pi-calendar-clock',
    tone: 'info',
    blocking: false,
  },
  insufficient_data: {
    status: 'insufficient_data',
    title: 'Datos insuficientes',
    icon: 'pi pi-info-circle',
    tone: 'warning',
    blocking: true,
  },
  no_eligible_data: {
    status: 'no_eligible_data',
    title: 'Sin datos elegibles',
    icon: 'pi pi-filter-slash',
    tone: 'neutral',
    blocking: true,
  },
  calculation_error: {
    status: 'calculation_error',
    title: 'Resultado no verificable',
    icon: 'pi pi-times-circle',
    tone: 'danger',
    blocking: true,
  },
};

export function scientificStateView(status: unknown): ScientificStateView {
  return isAnalyticsApprovalStatus(status)
    ? STATE_VIEWS[status]
    : STATE_VIEWS.calculation_error;
}

@Component({
  selector: 'app-scientific-state-banner',
  templateUrl: './scientific-state-banner.html',
  styleUrl: './scientific-state-banner.css',
})
export class ScientificStateBanner {
  readonly status = input<AnalyticsApprovalStatus | string>('calculation_error');
  readonly label = input<string | null>(null);
  readonly message = input<string | null>(null);
  readonly warnings = input<readonly string[]>([]);

  readonly view = computed(() => scientificStateView(this.status()));
}
