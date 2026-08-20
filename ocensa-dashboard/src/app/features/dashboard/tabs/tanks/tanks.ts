import { Component, inject } from '@angular/core';
import { DatasetReleaseStore } from '../../../../core/services/dataset-release-store.service';
import { ReleaseGate } from '../../../../core/shared/components/release-gate/release-gate';

@Component({
  selector: 'app-tanks',
  imports: [ReleaseGate],
  templateUrl: './tanks.html',
  styleUrl: './tanks.css',
})
export class Tanks {
  private readonly releaseStore = inject(DatasetReleaseStore);
  readonly hasPublishedRelease = this.releaseStore.hasPublishedRelease;
}
