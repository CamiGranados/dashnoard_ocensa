import { Component, inject } from '@angular/core';
import { Router } from '@angular/router';
import { Button } from 'primeng/button';
import { Message } from 'primeng/message';
import { TableModule } from 'primeng/table';
import { ProcessedDataStore } from '../../../core/services/processed-data-store.service';

@Component({
  selector: 'app-resultados',
  imports: [Button, Message, TableModule],
  templateUrl: './resultados.html',
  styleUrl: './resultados.css',
})
export class Resultados {
  private readonly router = inject(Router);
  private readonly processedDataStore = inject(ProcessedDataStore);

  readonly result = this.processedDataStore.result;

  volverACargarDatos(): void {
    this.router.navigate(['/carga-datos']);
  }
}
