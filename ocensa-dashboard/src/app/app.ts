import { Component, inject, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { Spinner } from './core/shared/components/spinner/spinner';
import { LoadingState } from './core/services/loading-state';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, Spinner],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App {
  protected readonly title = signal('ocensa-dashboard');
  protected readonly loadingState = inject(LoadingState);
}
