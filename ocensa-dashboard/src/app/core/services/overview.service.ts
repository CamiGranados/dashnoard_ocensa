import { Injectable, inject } from '@angular/core';
import { httpResource } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { FiltersStateService } from './filters-state.service';
import { MonthlyInjectionDetail, OverviewResponse } from '../models/overview.model';

export interface MonthlyInjectionRequest {
  tankId: string;
  anio: number;
  mes: number;
}


@Injectable({ providedIn: 'root' })
export class OverviewService {
    private readonly apiUrl = environment.apiUrl;
    private readonly filtersState = inject(FiltersStateService);

    readonly summary = httpResource<OverviewResponse>(() => {
        const { tank, years, months, company } = this.filtersState.filters();

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
                companyId: company,
            },
        };
    });

    // Detalle de inyección de un mes puntual (popup de la lupa en "Condiciones contractuales
    // vs. ejecutado"). Se dispara bajo demanda: `request()` devuelve `undefined` mientras no
    // haya un mes seleccionado, así el resource no pide nada hasta que se abre el popup.
    monthlyInjections(request: () => MonthlyInjectionRequest | undefined) {
        return httpResource<MonthlyInjectionDetail[]>(() => {
            const r = request();
            if (!r) {
                return undefined;
            }

            return {
                url: `${this.apiUrl}/Tanks/monthly-injections`,
                method: 'POST',
                body: {
                    tankId: r.tankId,
                    years: [r.anio],
                    months: [r.mes],
                },
            };
        });
    }
}