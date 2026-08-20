import { CommonModule } from '@angular/common';
import { Component, computed, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { TopbarFilters } from '../../../layout/topbar-filters/topbar-filters';
import { DatasetReleaseStore } from '../../../core/services/dataset-release-store.service';
import { FiltersStateService } from '../../../core/services/filters-state.service';

@Component({
  selector: 'app-dashboard-shell',
  imports: [CommonModule, RouterOutlet, TopbarFilters],
  templateUrl: './dashboard-shell.html',
  styleUrl: './dashboard-shell.css',
})
export class DashboardShell {
  private readonly releaseStore = inject(DatasetReleaseStore);
  private readonly filtersState = inject(FiltersStateService);

  readonly activeTank = computed(() => this.filtersState.tanque() ?? '—');
  readonly publishedAt = computed(() => this.releaseStore.release()?.publishedAt ?? null);
  readonly datasetStatus = computed(() =>
    this.releaseStore.hasPublishedRelease() ? 'Publicado' : 'Bloqueado',
  );
  readonly hasPublishedRelease = this.releaseStore.hasPublishedRelease;
}
