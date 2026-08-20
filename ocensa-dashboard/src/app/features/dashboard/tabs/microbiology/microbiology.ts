import { Component, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TableModule } from 'primeng/table';
import { MicrobiologyService } from '../../../../core/services/microbiology.service';
import { DatasetReleaseStore } from '../../../../core/services/dataset-release-store.service';
import { ReleaseGate } from '../../../../core/shared/components/release-gate/release-gate';
import { ScientificValue, formatScientificValue } from '../../../../core/models/dataset-release.model';

@Component({
  selector: 'app-microbiology',
  imports: [CommonModule, TableModule, ReleaseGate],
  templateUrl: './microbiology.html',
  styleUrl: './microbiology.css',
})
export class Microbiology {
  private readonly microbiologyService = inject(MicrobiologyService);
  private readonly releaseStore = inject(DatasetReleaseStore);

  readonly review = this.microbiologyService.review;
  readonly hasPublishedRelease = this.releaseStore.hasPublishedRelease;

  readonly records = computed(() =>
    this.hasPublishedRelease() ? (this.review.value()?.data ?? []) : [],
  );
  readonly totalRecords = computed(() => this.records().length);

  display(value: ScientificValue<number>): string {
    return formatScientificValue(value);
  }
}
