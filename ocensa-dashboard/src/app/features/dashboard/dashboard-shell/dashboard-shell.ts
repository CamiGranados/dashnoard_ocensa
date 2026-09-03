import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { TopbarFilters } from '../topbar-filters/topbar-filters';

@Component({
  selector: 'app-dashboard-shell',
  imports: [RouterOutlet, TopbarFilters],
  templateUrl: './dashboard-shell.html',
  styleUrl: './dashboard-shell.css',
})
export class DashboardShell {}
