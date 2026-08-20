import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import {
  Component,
  ElementRef,
  OnDestroy,
  computed,
  effect,
  inject,
  input,
  signal,
  viewChild,
} from '@angular/core';
import { Subscription } from 'rxjs';
import {
  AnalyticalTraceResponse,
  deriveAnalyticalTracePageEndpoint,
  isInternalAnalyticalTraceEndpoint,
  validateAnalyticalTraceResponse,
} from '../../../models/analytical-trace.model';

let nextTraceViewerId = 0;

@Component({
  selector: 'app-analytical-trace-link',
  templateUrl: './analytical-trace-link.html',
  styleUrl: './analytical-trace-link.css',
})
export class AnalyticalTraceLink implements OnDestroy {
  private readonly http = inject(HttpClient);
  private readonly triggerElement = viewChild<ElementRef<HTMLButtonElement>>('trigger');
  private readonly viewerElement = viewChild<ElementRef<HTMLElement>>('viewer');
  private subscription: Subscription | null = null;
  private requestId = 0;
  private previousSafeEndpoint: string | null | undefined;

  readonly endpoint = input.required<string>();
  readonly label = input('Ver trazabilidad');
  readonly contextLabel = input<string | null>(null);
  readonly viewerId = `analytical-trace-viewer-${++nextTraceViewerId}`;

  readonly viewerOpen = signal(false);
  readonly loading = signal(false);
  readonly requestedPage = signal(1);
  readonly response = signal<AnalyticalTraceResponse | null>(null);
  private readonly responseBaseEndpoint = signal<string | null>(null);
  readonly errorMessage = signal<string | null>(null);

  readonly safeEndpoint = computed(() => {
    const endpoint = this.endpoint();
    return isInternalAnalyticalTraceEndpoint(endpoint) ? endpoint : null;
  });
  readonly currentJsonEndpoint = computed(() => {
    const endpoint = this.safeEndpoint();
    const page = this.response()?.page;
    return endpoint && endpoint === this.responseBaseEndpoint() && page
      ? deriveAnalyticalTracePageEndpoint(endpoint, page)
      : null;
  });
  readonly accessibleLabel = computed(() => {
    const context = this.contextLabel()?.trim();
    return context
      ? `${this.label()}: ${context} (abre el visor de metadatos de trazabilidad)`
      : `${this.label()} (abre el visor de metadatos de trazabilidad)`;
  });
  readonly viewerTitle = computed(() => {
    const context = this.contextLabel()?.trim();
    return context ? `Trazabilidad · ${context}` : 'Trazabilidad de celdas fuente';
  });

  private readonly focusViewer = effect(() => {
    if (this.viewerOpen()) this.viewerElement()?.nativeElement.focus();
  });
  private readonly resetOnEndpointChange = effect(() => {
    const endpoint = this.safeEndpoint();
    if (this.previousSafeEndpoint === undefined) {
      this.previousSafeEndpoint = endpoint;
      return;
    }
    if (endpoint !== this.previousSafeEndpoint) {
      this.previousSafeEndpoint = endpoint;
      this.resetViewer(false);
    }
  });

  openViewer(): void {
    if (!this.safeEndpoint()) return;
    this.viewerOpen.set(true);
    this.loadPage(1);
  }

  closeViewer(): void {
    this.resetViewer(true);
  }

  private resetViewer(restoreFocus: boolean): void {
    this.requestId += 1;
    this.subscription?.unsubscribe();
    this.subscription = null;
    this.viewerOpen.set(false);
    this.loading.set(false);
    this.response.set(null);
    this.responseBaseEndpoint.set(null);
    this.errorMessage.set(null);
    this.requestedPage.set(1);
    if (restoreFocus) this.triggerElement()?.nativeElement.focus();
  }

  previousPage(): void {
    const current = this.response();
    if (current?.hasPreviousPage) this.loadPage(current.page - 1);
  }

  nextPage(): void {
    const current = this.response();
    if (current?.hasNextPage) this.loadPage(current.page + 1);
  }

  retry(): void {
    this.loadPage(this.requestedPage());
  }

  onViewerKeydown(event: KeyboardEvent): void {
    if (event.key === 'Escape') {
      event.preventDefault();
      this.closeViewer();
      return;
    }
    if (event.key !== 'Tab') return;

    const viewer = this.viewerElement()?.nativeElement;
    if (!viewer) return;
    const focusable = [
      ...viewer.querySelectorAll<HTMLElement>('button:not([disabled]), a[href]'),
    ].filter((element) => element.tabIndex >= 0);
    if (!focusable.length) return;
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (event.shiftKey && (document.activeElement === first || document.activeElement === viewer)) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  }

  ngOnDestroy(): void {
    this.requestId += 1;
    this.subscription?.unsubscribe();
  }

  private loadPage(page: number): void {
    const sourceEndpoint = this.safeEndpoint();
    const current = this.response();
    if (
      !sourceEndpoint ||
      !Number.isSafeInteger(page) ||
      page < 1 ||
      (current?.totalPages === 0 && page !== 1) ||
      (!!current?.totalPages && page > current.totalPages)
    ) {
      return;
    }

    const requestEndpoint = deriveAnalyticalTracePageEndpoint(sourceEndpoint, page);
    if (!requestEndpoint) {
      this.response.set(null);
      this.errorMessage.set('La página solicitada no pertenece al contrato TRACE.V1.');
      return;
    }

    const requestId = ++this.requestId;
    this.subscription?.unsubscribe();
    this.response.set(null);
    this.responseBaseEndpoint.set(null);
    this.errorMessage.set(null);
    this.requestedPage.set(page);
    this.loading.set(true);
    this.subscription = this.http.get<unknown>(requestEndpoint).subscribe({
      next: (wire) => {
        if (requestId !== this.requestId || sourceEndpoint !== this.safeEndpoint()) return;
        const validation = validateAnalyticalTraceResponse(wire, sourceEndpoint, page);
        this.loading.set(false);
        if (!validation.response) {
          this.errorMessage.set(
            `La respuesta de trazabilidad fue bloqueada (${validation.issues[0]?.code ?? 'TRACE_RESPONSE_INVALID'}).`,
          );
          return;
        }
        this.responseBaseEndpoint.set(sourceEndpoint);
        this.response.set(validation.response);
      },
      error: (error: unknown) => {
        if (requestId !== this.requestId || sourceEndpoint !== this.safeEndpoint()) return;
        this.loading.set(false);
        const status =
          error instanceof HttpErrorResponse && error.status ? ` HTTP ${error.status}` : '';
        this.errorMessage.set(`No fue posible consultar la trazabilidad${status}.`);
      },
    });
  }
}
