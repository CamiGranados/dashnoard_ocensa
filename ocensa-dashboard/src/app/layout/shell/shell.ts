import { Component, computed, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { LastUploadService } from '../../core/services/last-upload.service';
import { FiltersStateService } from '../../core/services/filters-state.service';
import { Sidebar } from '../sidebar/sidebar';
import { StatusBar } from '../../shared/components/status-bar/status-bar';

@Component({
  selector: 'app-shell',
  imports: [RouterOutlet, Sidebar, StatusBar],
  templateUrl: './shell.html',
  styleUrl: './shell.css',
})
export class Shell {
  private readonly filtersState = inject(FiltersStateService);
  readonly activeTank = computed(() => this.filtersState.tankName() ?? '—');
  readonly lastUpdate = inject(LastUploadService).lastUpdateLabel;
  readonly overallStatus = 'Normal';
}
