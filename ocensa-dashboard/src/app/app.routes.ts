import { Routes } from '@angular/router';

export const routes: Routes = [{
    path: '',
    loadComponent: () => import('./layout/shell/shell')
      .then(m => m.Shell),
    children: [{
      path: '',
      loadComponent: () => import('./features/dashboard/dashboard-shell/dashboard-shell')
        .then(m => m.DashboardShell),
      children: [{
        path: '',
        loadComponent: () => import('./features/dashboard/overview/overview')
          .then(m => m.Overview),
      }, {
        path: 'carga-datos',
        loadComponent: () => import('./features/dashboard/data-upload/data-upload')
          .then(m => m.DataUpload),
      }, {
        path: 'corrosion',
        loadComponent: () => import('./features/dashboard/tabs/corrosion/corrosion')
          .then(m => m.Corrosion),
      }, {
        path: 'thps-tolerance',
        loadComponent: () => import('./features/dashboard/tabs/thps-tolerance/thps-tolerance')
          .then(m => m.ThpsTolerance),
      }, {
        path: 'microbiology',
        loadComponent: () => import('./features/dashboard/tabs/microbiology/microbiology')
          .then(m => m.Microbiology),
      }],
    }],
}];
