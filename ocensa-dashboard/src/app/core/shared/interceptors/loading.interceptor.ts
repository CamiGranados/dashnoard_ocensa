import { inject } from '@angular/core';
import { HttpInterceptorFn } from '@angular/common/http';
import { finalize } from 'rxjs';
import { LoadingState } from '../../services/loading-state';

export const loadingInterceptor: HttpInterceptorFn = (req, next) => {
  const loadingState = inject(LoadingState);
  loadingState.start();
  return next(req).pipe(finalize(() => loadingState.stop()));
};
