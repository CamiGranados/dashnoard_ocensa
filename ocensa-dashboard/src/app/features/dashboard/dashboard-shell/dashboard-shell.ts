import { Component } from '@angular/core';
import { TopbarFilters } from '../../../layout/topbar-filters/topbar-filters';

@Component({
  selector: 'app-dashboard-shell',
  imports: [TopbarFilters],
  templateUrl: './dashboard-shell.html',
  styleUrl: './dashboard-shell.css',
})
export class DashboardShell {}
