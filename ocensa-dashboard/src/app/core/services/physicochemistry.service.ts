import { Injectable, inject } from '@angular/core';
import { httpResource } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { FiltersStateService } from './filters-state.service';
import { PhysicalChemistryResponse } from '../models/physicochemistry.model';

@Injectable({ providedIn: 'root' })
export class PhysicochemistryService {
  private readonly apiUrl = environment.apiUrl;
  private readonly filtersState = inject(FiltersStateService);

  readonly review = httpResource<PhysicalChemistryResponse>(() => {
    const { tank, years, months, company } = this.filtersState.filters();

    // Sin tanque seleccionado no hay nada que pedir todavía.
    if (!tank) {
      return undefined;
    }

    return {
      url: `${this.apiUrl}/Tanks/physical-chemistry`,
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
