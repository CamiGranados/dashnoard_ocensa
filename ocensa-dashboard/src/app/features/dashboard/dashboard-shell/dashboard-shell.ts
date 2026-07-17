import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { TopbarFilters } from '../../../layout/topbar-filters/topbar-filters';

@Component({
  selector: 'app-dashboard-shell',
  imports: [RouterOutlet, TopbarFilters],
  templateUrl: './dashboard-shell.html',
  styleUrl: './dashboard-shell.css',
})
export class DashboardShell {
  readonly activeTank = 'TK-001';
  readonly lastUpdate = '10 Jul 2026 · 09:35 AM';
  readonly overallStatus = 'Normal';
}
