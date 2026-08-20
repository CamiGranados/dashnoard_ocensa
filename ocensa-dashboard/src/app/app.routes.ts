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
        path: 'tanks',
        loadComponent: () => import('./features/dashboard/tabs/tanks/tanks')
          .then(m => m.Tanks),
      }, {
        path: 'physicochemistry',
        loadComponent: () => import('./features/dashboard/tabs/physicochemistry/physicochemistry')
          .then(m => m.Physicochemistry),
      }, {
        path: 'corrosion/coupon',
        loadComponent: () => import('./features/dashboard/corrosion-coupon/corrosion-coupon')
          .then(m => m.CorrosionCoupon),
      }, {
        path: 'corrosion',
        redirectTo: 'corrosion/coupon',
        pathMatch: 'full',
      }, {
        path: 'thps-tolerance',
        redirectTo: '',
        pathMatch: 'full',
      }, {
        path: 'microbiology/distribution',
        loadComponent: () => import('./features/dashboard/microbiology-distribution/microbiology-distribution')
          .then(m => m.MicrobiologyDistribution),
      }, {
        path: 'microbiology',
        redirectTo: 'microbiology/distribution',
        pathMatch: 'full',
      }, {
        path: 'coverage',
        loadComponent: () => import('./features/dashboard/coverage/coverage')
          .then(m => m.Coverage),
      }],
    }],
}];
