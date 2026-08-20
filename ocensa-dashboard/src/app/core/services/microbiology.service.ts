import { effect, Injectable, inject } from '@angular/core';
import { httpResource } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { FiltersStateService } from './filters-state.service';
import { MicroResponseDto } from '../models/microbiology.model';
import { DatasetReleaseStore } from './dataset-release-store.service';

@Injectable({ providedIn: 'root' })
export class MicrobiologyService {
  private readonly apiUrl = environment.apiUrl;
  private readonly filtersState = inject(FiltersStateService);
  private readonly releaseStore = inject(DatasetReleaseStore);

  readonly review = httpResource<MicroResponseDto>(() => {
    const { tank, years, months } = this.filtersState.filters();
    const datasetReleaseId = this.releaseStore.releaseId();

    if (!datasetReleaseId || !tank) {
      return undefined;
    }

    return {
      url: `${this.apiUrl}/Tanks/mic`,
      method: 'POST',
      body: {
        tankId: tank,
        years: years,
        months: months,
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
