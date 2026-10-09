import { Component, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router, RouterLink, RouterLinkActive } from '@angular/router';
import { Drawer } from 'primeng/drawer';
import { filter, map } from 'rxjs';

interface NavItem {
  label: string;
  icon: string;
  route: string;
  /** Sub-vista/pestaña activa del módulo; sin valor no se muestra badge. */
  badge?: string;
  /** Muestra siempre el chevron (indica submenú). */
  hasSubmenu?: boolean;
}

interface NavSection {
  title: string;
  items: NavItem[];
}

@Component({
  selector: 'app-sidebar',
  imports: [Drawer, RouterLink, RouterLinkActive],
  templateUrl: './sidebar.html',
  styleUrl: './sidebar.css',
})
export class Sidebar {
  private readonly router = inject(Router);

  /** Vista Ejecutiva: estilo activo propio, no pertenece a ninguna sección resaltable. */
  readonly primaryItem: NavItem = {
    label: 'Vista Ejecutiva',
    icon: 'pi pi-th-large',
    route: '/',
  };

  readonly sections: NavSection[] = [
    {
      title: 'Interacción de Variables',
      items: [
        { label: 'Operación e Inyección', icon: 'pi pi-bolt', route: '/corrosion', badge: '✓'},
        { label: 'Analítica', icon: 'pi pi-chart-bar', route: '/analytics', badge: '✓' },
      ],
    },
    {
      title: 'Seguimiento de Variables',
      items: [
        {
          label: 'Microbiología',
          icon: 'pi pi-search',
          route: '/microbiology',
          badge: '↪',
        },
        { label: 'Corrosión', icon: 'pi pi-chart-line', route: '/physicochemistry', badge: '↪', },
        { label: 'Tratamiento y Residual', icon: 'pi pi-shield', route: '/thps-tolerance', badge: '↪', },
      ],
    },
  ];

  /** URL actual; se usa para que los títulos de sección reaccionen a la navegación. */
  private readonly url = toSignal(
    this.router.events.pipe(
      filter((e): e is NavigationEnd => e instanceof NavigationEnd),
      map(e => e.urlAfterRedirects),
    ),
    { initialValue: this.router.url },
  );

  isSectionActive(section: NavSection): boolean {
    this.url(); // dependencia reactiva
    return section.items.some(item =>
      this.router.isActive(item.route, {
        paths: 'subset',
        queryParams: 'ignored',
        fragment: 'ignored',
        matrixParams: 'ignored',
      }),
    );
  }
}
