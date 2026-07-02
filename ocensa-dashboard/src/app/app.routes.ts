import { Routes } from '@angular/router';

export const routes: Routes = [{
    path: '',
    loadComponent: () => import('./layout/shell/shell')
      .then(m => m.Shell),
    children: [{
      path: '',
      loadComponent: () => import('./features/dashboard/dashboard-shell/dashboard-shell')
        .then(m => m.DashboardShell),
    }],
}];
