import { Injectable, inject } from '@angular/core';
import { httpResource } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { FiltersStateService } from './filters-state.service';
import { ThpsReviewResponse } from '../models/thps-review.model';

@Injectable({ providedIn: 'root' })
export class ThpsReviewService {
  private readonly apiUrl = environment.apiUrl;
  private readonly filtersState = inject(FiltersStateService);

  readonly review = httpResource<ThpsReviewResponse>(() => {
    const { tank, years, months } = this.filtersState.filters();

    // Sin tanque seleccionado no hay nada que pedir todavía.
    if (!tank) {
      return undefined;
    }

    return {
      url: `${this.apiUrl}/Tanks/thps-review`,
      method: 'POST',
      body: {
        tankId: tank,
        years: years,
        months: months
      },
    };
  });
}
