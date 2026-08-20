import {
  ApplicationConfig,
  inject,
  LOCALE_ID,
  provideAppInitializer,
  provideBrowserGlobalErrorListeners,
} from '@angular/core';
import { provideRouter } from '@angular/router';
import { providePrimeNG } from 'primeng/config';

import { routes } from './app.routes';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { loadingInterceptor } from './core/shared/interceptors/loading.interceptor';
import { DatasetReleaseRestorationService } from './core/services/dataset-release-restoration.service';
import LaraDashboard from './core/theme/lara-dashboard.preset';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    { provide: LOCALE_ID, useValue: 'es-CO' },
    provideRouter(routes),
    provideHttpClient(withInterceptors([loadingInterceptor])),
    provideAppInitializer(() => inject(DatasetReleaseRestorationService).restore()),
    providePrimeNG({
      theme: {
        preset: LaraDashboard,
        options: {
          darkModeSelector: false,
        },
      },
    }),
  ],
};
