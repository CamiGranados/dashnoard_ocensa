import { Injectable, inject } from '@angular/core';
import { httpResource } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { FiltersStateService } from './filters-state.service';
import { OverviewResponse } from '../models/overview.model';


@Injectable({ providedIn: 'root' })
export class OverviewService {
    private readonly apiUrl = environment.apiUrl;
    private readonly filtersState = inject(FiltersStateService);

    readonly summary = httpResource<OverviewResponse>(() => {
        const { tank, years, months } = this.filtersState.filters();

        // Sin tanque seleccionado no hay nada que pedir todavía.
        console.log('tank', tank, 'years', years, 'months', months)
        if (!tank) {
            return undefined;
        }

        return {
            url: `${this.apiUrl}/Tanks/summary`,
            method: 'POST',
            body: {
                tankId: tank,
                years: years,
                months: months,
            },
        };
    });
}