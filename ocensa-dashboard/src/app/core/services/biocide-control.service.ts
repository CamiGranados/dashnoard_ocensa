import { Injectable, inject } from '@angular/core';
import { httpResource } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { FiltersStateService } from './filters-state.service';
import { BiocideControlResponse } from '../models/biocide-control.model';

@Injectable({ providedIn: 'root' })
export class BiocideControlService {
  private readonly apiUrl = environment.apiUrl;
  private readonly filtersState = inject(FiltersStateService);

  readonly review = httpResource<BiocideControlResponse>(() => {
    const { tank, years, months, company } = this.filtersState.filters();

    // Sin tanque seleccionado no hay nada que pedir todavía.
    if (!tank) {
      return undefined;
    }

    return {
      url: `${this.apiUrl}/Analysis/biocide-control`,
      method: 'POST',
      body: {
        tankId: tank,
        years: years,
        months: months,
        companyId: company,
      },
    };
  });
}
