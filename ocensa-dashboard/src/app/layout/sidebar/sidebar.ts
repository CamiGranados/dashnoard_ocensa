import { Component, DestroyRef, OnDestroy, OnInit, inject, signal } from '@angular/core';
import { NavigationEnd, Router } from '@angular/router';
import { MenuItem } from 'primeng/api';
import { Drawer } from 'primeng/drawer';
import { PanelMenu } from 'primeng/panelmenu';
import { filter } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

@Component({
  selector: 'app-sidebar',
  imports: [Drawer, PanelMenu],
  templateUrl: './sidebar.html',
  styleUrl: './sidebar.css',
})
export class Sidebar implements OnInit, OnDestroy {
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);
  private mediaQuery: MediaQueryList | null = null;

  readonly mobile = signal(false);
  readonly visible = signal(true);

  readonly items: MenuItem[] = [
    {
      label: 'Vista Ejecutiva',
      icon: 'pi pi-th-large',
      routerLink: '/',
      routerLinkActiveOptions: { exact: true },
    },
    {
      label: 'Análisis',
      icon: 'pi pi-wave-pulse',
      expanded: true,
      items: [
        { label: 'Tanques · pendiente', icon: 'pi pi-circle', disabled: true },
        { label: 'Operación e Inyección · pendiente', icon: 'pi pi-lock', disabled: true },
        { label: 'Escenarios · pendiente', icon: 'pi pi-lock', disabled: true },
      ],
    },
    {
      label: 'Calidad',
      icon: 'pi pi-verified',
      expanded: true,
      items: [
        {
          label: 'Microbiología · distribución',
          icon: 'pi pi-chart-scatter',
          routerLink: '/microbiology/distribution',
        },
        { label: 'Fisicoquímica · pendiente', icon: 'pi pi-lock', disabled: true },
        {
          label: 'Corrosión por cupón',
          icon: 'pi pi-chart-scatter',
          routerLink: '/corrosion/coupon',
        },
        { label: 'Tratamiento y Residual · pendiente', icon: 'pi pi-lock', disabled: true },
      ],
    },
    {
      label: 'Información',
      icon: 'pi pi-book',
      items: [
        {
          label: 'Cobertura del archivo',
          icon: 'pi pi-table',
          routerLink: '/coverage',
        },
      ],
    },
    {
      label: 'Histórico',
      icon: 'pi pi-history',
      items: [{ label: 'Próximamente', icon: 'pi pi-clock', disabled: true }],
    },
  ];

  constructor() {
    this.router.events
      .pipe(
        filter((event): event is NavigationEnd => event instanceof NavigationEnd),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe(() => {
        if (this.mobile()) this.visible.set(false);
      });
  }

  ngOnInit(): void {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return;
    this.mediaQuery = window.matchMedia('(max-width: 900px)');
    this.applyViewport(this.mediaQuery.matches);
    this.mediaQuery.addEventListener('change', this.onMediaChange);
  }

  ngOnDestroy(): void {
    this.mediaQuery?.removeEventListener('change', this.onMediaChange);
  }

  openNavigation(): void {
    this.visible.set(true);
  }

  onVisibleChange(visible: boolean): void {
    this.visible.set(this.mobile() ? visible : true);
  }

  private readonly onMediaChange = (event: MediaQueryListEvent): void => {
    this.applyViewport(event.matches);
  };

  private applyViewport(mobile: boolean): void {
    this.mobile.set(mobile);
    this.visible.set(!mobile);
  }
}
