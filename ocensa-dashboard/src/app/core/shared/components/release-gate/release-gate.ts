import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { DatasetReleaseStore } from '../../../services/dataset-release-store.service';

@Component({
  selector: 'app-release-gate',
  imports: [RouterLink],
  templateUrl: './release-gate.html',
  styleUrl: './release-gate.css',
})
export class ReleaseGate {
  private readonly releaseStore = inject(DatasetReleaseStore);

  readonly message = this.releaseStore.gateMessage;
  readonly state = this.releaseStore.importState;
}
