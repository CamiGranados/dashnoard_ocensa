import { Component } from '@angular/core';
import { MenuItem } from 'primeng/api';
import { Drawer } from 'primeng/drawer';
import { PanelMenu } from 'primeng/panelmenu';

@Component({
  selector: 'app-sidebar',
  imports: [Drawer, PanelMenu],
  templateUrl: './sidebar.html',
  styleUrl: './sidebar.css',
})
export class Sidebar {
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
        { label: 'Tanque', icon: 'pi pi-circle' },
        { label: 'Operación e Inyección', icon: 'pi pi-bolt', routerLink: '/corrosion'},
        { label: 'Escenarios', icon: 'pi pi-chart-bar' },
      ],
    },
    {
      label: 'Calidad',
      icon: 'pi pi-verified',
      expanded: true,
      items: [
        { label: 'Microbiología', icon: 'pi pi-search' },
        { label: 'Fisicoquímica', icon: 'pi pi-chart-line' },
        { label: 'Corrosión', icon: 'pi pi-exclamation-triangle' },
        { label: 'Tratamiento y Residual', icon: 'pi pi-shield', routerLink: '/thps-tolerance' },
      ],
    },
    {
      label: 'Información',
      icon: 'pi pi-book',
      items: [{ label: 'Próximamente', icon: 'pi pi-clock', disabled: true }],
    },
    {
      label: 'Histórico',
      icon: 'pi pi-history',
      items: [{ label: 'Próximamente', icon: 'pi pi-clock', disabled: true }],
    },
  ];
}
