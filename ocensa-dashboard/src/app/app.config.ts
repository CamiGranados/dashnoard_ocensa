import { ApplicationConfig, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideRouter } from '@angular/router';
import { providePrimeNG } from 'primeng/config';
import { provideLottieOptions } from 'ngx-lottie';
// import Aura from '@primeng/themes/aura';
import Lara from '@primeng/themes/lara';

import { routes } from './app.routes';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { loadingInterceptor } from './core/shared/interceptors/loading.interceptor';

// const MiTema = definePreset(Lara, {
//   semantic: {
//     primary: {
//       50:  '#e7eef4',
//       100: '#c2d3e2',
//       200: '#98b5cc',
//       300: '#6d97b6',
//       400: '#447da2',
//       500: '#1c4463',  // azul petróleo-marino principal
//       600: '#16364f',
//       700: '#10273a',
//       800: '#091826',
//       900: '#040c13',
//       950: '#02060a'
//     }
//   }
// });

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes),
    provideHttpClient(withInterceptors([loadingInterceptor])),
    providePrimeNG({
      theme: {
        preset: Lara,
        options: {
          darkModeSelector: false,
        },
      },
    }),
  ]
};
