import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { Sidebar } from '../sidebar/sidebar';

@Component({
  selector: 'app-shell',
  imports: [RouterOutlet, Sidebar],
  templateUrl: './shell.html',
  styleUrl: './shell.css',
})
export class Shell {
  readonly activeTank = 'TK-001';
  readonly lastUpdate = '10 Jul 2026 · 09:35 AM';
  readonly overallStatus = 'Normal';
}
