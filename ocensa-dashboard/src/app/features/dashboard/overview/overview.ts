import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
// import { GridModule } from 'primeng/grid';

@Component({
  selector: 'app-overview',
  imports: [CommonModule, ButtonModule, CardModule],
  templateUrl: './overview.html',
  styleUrl: './overview.css',
})
export class Overview implements OnInit {

  metrics = [
    {
      title: 'RETENCIÓN MEDIANA DE THPS',
      value: '8,9',
      unit: '%',
      subtitle: 'Referencia contractual: ≥ 20%',
      icon: 'pi pi-chart-pie',
      color: 'info'
    },
    {
      title: 'EVENTOS MICROBIOLÓGICOS EN CONTROL',
      value: '55',
      unit: '%',
      subtitle: '685 de 1.238 eventos con dato',
      icon: 'pi pi-check-circle',
      color: 'success'
    },
    {
      title: 'ÚLTIMA CATEGORÍA NACE',
      value: 'MODERADA',
      unit: '',
      subtitle: 'TQ55000 · 19 de may de 2026',
      icon: 'pi pi-flag',
      color: 'warning'
    },
    {
      title: 'ÍNDICE CENTINELA MÁS RECIENTE',
      value: 'Media',
      unit: '',
      subtitle: 'TQ55000 · 20 de nov de 2024',
      icon: 'pi pi-exclamation-triangle',
      color: 'danger'
    }
  ];

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
