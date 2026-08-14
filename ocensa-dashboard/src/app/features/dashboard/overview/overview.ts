import { Component, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { OverviewService } from '../../../core/services/overview.service';
// import { GridModule } from 'primeng/grid';

@Component({
  selector: 'app-overview',
  imports: [CommonModule, ButtonModule, CardModule],
  templateUrl: './overview.html',
  styleUrl: './overview.css',
})
export class Overview{
  private readonly overviewService = inject(OverviewService);

  readonly summary = this.overviewService.summary;

    readonly metrics = computed(() => {
    const data = this.summary.value();
    const resume = data?.summary;
    if (!resume) return [];
    console.log(data)

    return [
      {
        title: 'RETENCIÓN MEDIANA DE THPS',
        value: resume.thpsMedian?.toFixed(2) ?? '—',
        unit: '%',
        subtitle: 'Referencia contractual: ≥ 20%',
        icon: 'pi pi-chart-pie',
        color: 'info',
      },
      {
        title: 'EVENTOS MICROBIOLÓGICOS EN CONTROL',
        value: String(resume.bsrInControlCount),
        unit: '%',
        subtitle: '685 de 1.238 eventos con dato',
        icon: 'pi pi-check-circle',
        color: 'success',
      },
      {
        title: 'ÚLTIMA CATEGORÍA NACE',
        value: resume.categoryNace,
        unit: '',
        subtitle: 'TQ55000 · 19 de may de 2026',
        icon: 'pi pi-flag',
        color: 'warning',
      },
      {
        title: 'ÍNDICE CENTINELA MÁS RECIENTE',
        value: resume.levelAlarm,
        unit: '',
        subtitle: 'TQ55000 · 20 de nov de 2024',
        icon: 'pi pi-exclamation-triangle',
        color: 'danger',
      },
    ];
  });

  registrosVisibles = 2850;
  constructor() { }
  ngOnInit(): void {}
  exportarCSV(): void {
    console.log('Exportar CSV');
  }

  exportarPDF(): void {
    console.log('Exportar PDF');
  }
}
