import { effect, Injectable, inject } from '@angular/core';
import { httpResource } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { FiltersStateService } from './filters-state.service';
import { ThpsReviewResponse } from '../models/thps-review.model';
import { DatasetReleaseStore } from './dataset-release-store.service';

@Injectable({ providedIn: 'root' })
export class ThpsReviewService {
  private readonly apiUrl = environment.apiUrl;
  private readonly filtersState = inject(FiltersStateService);
  private readonly releaseStore = inject(DatasetReleaseStore);

  readonly review = httpResource<ThpsReviewResponse>(() => {
    const { tank, years, months } = this.filtersState.filters();
    const datasetReleaseId = this.releaseStore.releaseId();

    if (!datasetReleaseId || !tank) {
      return undefined;
    }

    return {
      url: `${this.apiUrl}/Tanks/thps-review`,
      method: 'POST',
      body: {
        tankId: tank,
        years: years,
        months,
        datasetReleaseId,
      },
    };
  });

  private readonly invalidateReleaseOnError = effect(() => {
    if (this.releaseStore.releaseId() && this.review.error()) {
      this.releaseStore.invalidateForQueryFailure();
    }
  });
}
