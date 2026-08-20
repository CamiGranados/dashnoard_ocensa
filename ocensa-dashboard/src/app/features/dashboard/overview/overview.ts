import { Component, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { OverviewService } from '../../../core/services/overview.service';
import { LastValues } from '../../../core/models/overview.model';
import { DatasetReleaseStore } from '../../../core/services/dataset-release-store.service';
import { ReleaseGate } from '../../../core/shared/components/release-gate/release-gate';
import { formatScientificValue } from '../../../core/models/dataset-release.model';
// import { GridModule } from 'primeng/grid';

type LastValueKey = keyof Omit<LastValues, 'lastMeasurementDate'>;

interface LastValueRowConfig {
  key: LastValueKey;
  label: string;
}

const LAST_VALUE_ROWS: LastValueRowConfig[] = [
  { key: 'bAnT', label: 'Bacterias anaerobias totales (BAnT)' },
  { key: 'bht', label: 'Bacterias heterótrofas totales (BHT)' },
  { key: 'bpa', label: 'Bacterias productoras de ácido (BPA)' },
  { key: 'bsr', label: 'Bacterias sulfato-reductoras (BSR)' },
  { key: 'thps', label: 'Tolerancia a THPS' },
  { key: 'reportedFwv', label: 'FWV reportada' },
  { key: 'company', label: 'Empresa' },
];

@Component({
  selector: 'app-overview',
  imports: [CommonModule, ButtonModule, CardModule, ReleaseGate],
  templateUrl: './overview.html',
  styleUrl: './overview.css',
})
export class Overview{
  private readonly overviewService = inject(OverviewService);
  private readonly releaseStore = inject(DatasetReleaseStore);

  readonly summary = this.overviewService.summary;
  readonly hasPublishedRelease = this.releaseStore.hasPublishedRelease;
  readonly recordCount = computed(() => this.releaseStore.release()?.recordCount ?? null);

    readonly metrics = computed(() => {
    if (!this.hasPublishedRelease()) return [];
    const data = this.summary.value();
    const resume = data?.summary;
    if (!resume) return [];

    return [
      {
        title: 'THPS RESIDUAL · MEDIANA',
        value: resume.thpsMedian,
        unit: '%',
        subtitle: 'Calculado exclusivamente por el release publicado',
        icon: 'pi pi-chart-pie',
        color: 'info',
      },
      {
        title: 'EVENTOS MICROBIOLÓGICOS EN CONTROL',
        value: resume.bsrInControlCount,
        unit: ' eventos',
        subtitle: 'Conteo con dato válido; no es un porcentaje',
        icon: 'pi pi-check-circle',
        color: 'success',
      },
      {
        title: 'ÚLTIMA CATEGORÍA NACE',
        value: resume.categoryNace,
        unit: '',
        subtitle: 'Sin tanque o fecha inferidos por la interfaz',
        icon: 'pi pi-flag',
        color: 'warning',
      },
      {
        title: 'ÍNDICE CENTINELA MÁS RECIENTE',
        value: resume.levelAlarm,
        unit: '',
        subtitle: 'Clasificación recibida del release',
        icon: 'pi pi-exclamation-triangle',
        color: 'danger',
      },
    ];
  });

  readonly lastValueRows = computed(() => {
    if (!this.hasPublishedRelease()) return [];
    const lastValues = this.summary.value()?.lastValues;
    if (!lastValues) return [];

    const safeLastValues: Partial<LastValues> = lastValues;

    return LAST_VALUE_ROWS.map(({ key, label }) => {
      const measurement = safeLastValues[key];
      return {
        key,
        label,
        value: measurement ? formatScientificValue(measurement) : '—',
        date: measurement?.date ?? null,
      };
    });
  });

  readonly lastMeasurementDate = computed(
    () => this.summary.value()?.lastValues?.lastMeasurementDate ?? null,
  );

}
