import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { DatasetReleaseStore } from '../../../core/services/dataset-release-store.service';
import { ReleaseGate } from '../../../core/shared/components/release-gate/release-gate';

@Component({
  selector: 'app-overview',
  imports: [CommonModule, RouterLink, ReleaseGate],
  templateUrl: './overview.html',
  styleUrls: ['./overview.css', './overview-sections.css'],
})
export class Overview {
  private readonly releaseStore = inject(DatasetReleaseStore);

  readonly hasQueryableRelease = this.releaseStore.hasQueryableRelease;
  readonly release = this.releaseStore.release;
}
