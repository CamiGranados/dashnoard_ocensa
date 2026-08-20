import { Component, inject } from '@angular/core';
import { DatasetReleaseStore } from '../../../../core/services/dataset-release-store.service';
import { ReleaseGate } from '../../../../core/shared/components/release-gate/release-gate';

@Component({
  selector: 'app-physicochemistry',
  imports: [ReleaseGate],
  templateUrl: './physicochemistry.html',
  styleUrl: './physicochemistry.css',
})
export class Physicochemistry {
  private readonly releaseStore = inject(DatasetReleaseStore);
  readonly hasPublishedRelease = this.releaseStore.hasPublishedRelease;
}
