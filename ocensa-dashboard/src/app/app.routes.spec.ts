import { Route } from '@angular/router';
import { describe, expect, it } from 'vitest';
import { routes } from './app.routes';

function findRoute(path: string, candidates: readonly Route[] = routes): Route | null {
  for (const candidate of candidates) {
    if (candidate.path === path) return candidate;
    const nested = candidate.children ? findRoute(path, candidate.children) : null;
    if (nested) return nested;
  }
  return null;
}

describe('application routes', () => {
  it('exposes only the traceable coupon implementation for corrosion', () => {
    expect(findRoute('corrosion/coupon')?.loadComponent).toEqual(expect.any(Function));
    expect(findRoute('corrosion')).toMatchObject({
      redirectTo: 'corrosion/coupon',
      pathMatch: 'full',
    });
    expect(findRoute('corrosion')?.loadComponent).toBeUndefined();
  });

  it('redirects legacy microbiology and unsupported treatment routes safely', () => {
    expect(findRoute('microbiology')).toMatchObject({
      redirectTo: 'microbiology/distribution',
      pathMatch: 'full',
    });
    expect(findRoute('microbiology')?.loadComponent).toBeUndefined();
    expect(findRoute('thps-tolerance')).toMatchObject({
      redirectTo: '',
      pathMatch: 'full',
    });
    expect(findRoute('thps-tolerance')?.loadComponent).toBeUndefined();
  });
});
