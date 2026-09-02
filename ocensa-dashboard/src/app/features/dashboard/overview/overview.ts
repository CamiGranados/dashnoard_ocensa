import { Component, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ButtonModule } from 'primeng/button';
import { ChartModule } from 'primeng/chart';
import { OverviewService } from '../../../core/services/overview.service';
import { MicrobiologyKey } from '../../../core/models/overview.model';

const MESES = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];

// Etiqueta corta + descripción para las filas del grid de microbiología.
const MICRO_LABELS: Record<MicrobiologyKey, { short: string; long: string }> = {
  BSR: { short: 'BSR', long: 'Sulfato reductoras' },
  BPA: { short: 'BPA', long: 'Productoras de ácido' },
  BHT: { short: 'BHT', long: 'Heterótrofas totales' },
  BAnT: { short: 'BAnT', long: 'Anaerobias totales' },
};

// Tolerancia provisional para la desviación de FWV (mismo criterio que la imagen de referencia).
// TODO(backend): reemplazar por el valor real cuando el API lo entregue.
const FWV_TOLERANCE_BBL = 300;

@Component({
  selector: 'app-overview',
  imports: [CommonModule, ButtonModule, ChartModule],
  templateUrl: './overview.html',
  styleUrl: './overview.css',
})
export class Overview {
  private readonly overviewService = inject(OverviewService);

  readonly summary = this.overviewService.summary;

  readonly metrics = computed(() => {
    const data = this.summary.value();
    const resume = data?.summary;

    if (!resume) return [];

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

  // ----------------------------- Gráfica 1: desviación FWV reportada vs. calculada -----------------------------
  readonly fwvChart = computed(() => {
    const months = this.summary.value()?.freeWater?.months ?? [];
    return {
      labels: months.map((m) => `${MESES[m.month - 1]} ${m.year}`),
      datasets: [
        {
          label: `Dentro de ±${FWV_TOLERANCE_BBL} BBL`,
          backgroundColor: '#2f80d7',
          borderWidth: 0,
          data: months.map((m) =>
            Math.abs(m.deviation) <= FWV_TOLERANCE_BBL ? m.deviation : null,
          ),
        },
        {
          label: 'Excede tolerancia',
          backgroundColor: '#d94a4a',
          borderWidth: 0,
          data: months.map((m) =>
            Math.abs(m.deviation) > FWV_TOLERANCE_BBL ? m.deviation : null,
          ),
        },
      ],
    };
  });

  readonly fwvOptions = this.buildBarOptions('Desviación (BBL)', true);

  // ----------------------------- Gráfica 2: dosificación programada vs. inyectada -----------------------------
  readonly doseChart = computed(() => {
    const months = this.summary.value()?.dose?.months ?? [];
    return {
      labels: months.map((m) => `${MESES[m.month - 1]} ${m.year}`),
      datasets: [
        {
          label: 'Programada',
          backgroundColor: '#b9c2cc',
          borderWidth: 0,
          data: months.map((m) => m.scheduledMean),
        },
        {
          label: 'Inyectada',
          backgroundColor: '#2f80d7',
          borderWidth: 0,
          data: months.map((m) => m.injectedMean),
        },
      ],
    };
  });

  readonly doseOptions = this.buildBarOptions('Dosis', false);

  // ----------------------------- Gráfica 3: resumen de control microbiológico (grid) -----------------------------
  // Una fila por variable (BSR/BPA/BHT/BAnT) + fila "Todas las variables". Una columna por mes,
  // desde el primer dato hasta el mes en curso. Cada celda: `totalCount` puntos, `inControlCount`
  // en verde (dentro de 10² Bact/mL), el resto en rojo.
  readonly microGrid = computed(() => {
    const micro = this.summary.value()?.microbiology;
    if (!micro) return null;

    const keys = new Set<number>();
    for (const v of micro.variables) {
      for (const c of v.months) keys.add(this.monthKey(c.year, c.month));
    }
    for (const t of micro.monthlyTotals) keys.add(this.monthKey(t.year, t.month));
    if (keys.size === 0) return null;

    const sorted = [...keys].sort((a, b) => a - b);
    const now = new Date();
    const nowKey = now.getFullYear() * 12 + now.getMonth();
    const lastData = sorted[sorted.length - 1];
    // Se extiende hasta el mes en curso, pero como máximo 3 meses vacíos de cola.
    const end = Math.min(Math.max(lastData, nowKey), lastData + 3);

    const columns: { key: number; label: string; isCurrent: boolean }[] = [];
    for (let k = sorted[0]; k <= end; k++) {
      columns.push({ key: k, label: this.monthLabel(k), isCurrent: k === nowKey });
    }

    const rows = micro.variables.map((v) => {
      const meta = MICRO_LABELS[v.key];
      const cells = columns.map((col) => {
        const cell = v.months.find((c) => this.monthKey(c.year, c.month) === col.key);
        if (!cell || cell.totalCount === 0) {
          return { sampled: false, ok: 0, total: 0 };
        }
        return { sampled: true, ok: cell.inControlCount, total: cell.totalCount };
      });
      return { key: v.key, short: meta.short, long: meta.long, controlPercent: v.controlPercent, cells };
    });

    const totalCells = columns.map((col) => {
      const t = micro.monthlyTotals.find((mt) => this.monthKey(mt.year, mt.month) === col.key);
      return t && t.totalCount > 0
        ? { sampled: true, ok: t.inControlCount, total: t.totalCount, percent: t.controlPercent }
        : { sampled: false, ok: 0, total: 0, percent: null as number | null };
    });

    return {
      columns,
      rows,
      totalCells,
      controlPercent: micro.controlPercent,
      inControl: micro.inControlCount,
      total: micro.totalCount,
    };
  });

  // Array de banderas para pintar los puntos de una celda (true = dentro de límite).
  dots(ok: number, total: number): boolean[] {
    return Array.from({ length: total }, (_, i) => i < ok);
  }

  // Clase de color para un porcentaje de control.
  pctClass(percent: number | null): string {
    if (percent == null) return '';
    if (percent >= 80) return 'is-ok';
    if (percent >= 40) return 'is-warn';
    return 'is-bad';
  }

  private monthKey(year: number, month: number): number {
    return year * 12 + (month - 1);
  }

  private monthLabel(key: number): string {
    const year = Math.floor(key / 12);
    const month = key % 12;
    return `${MESES[month].toLowerCase()}/${String(year).slice(-2)}`;
  }

  // Opciones compartidas para las gráficas de barras (mismo tema que corrosion/physicochemistry).
  private buildBarOptions(yTitle: string, stacked: boolean) {
    return {
      responsive: true,
      maintainAspectRatio: false,
      animation: false as const,
      plugins: {
        legend: { position: 'top' as const, labels: { boxWidth: 12, usePointStyle: true } },
        tooltip: {
          mode: 'index' as const,
          intersect: false,
          backgroundColor: '#1f3a52',
          padding: 12,
          titleColor: '#ffffff',
          bodyColor: '#ffffff',
          borderColor: '#2a4f6b',
          borderWidth: 1,
          cornerRadius: 6,
          titleFont: { size: 13, weight: 'bold' },
          bodyFont: { size: 12 },
        },
      },
      scales: {
        x: {
          stacked,
          grid: { color: '#eef2f7' },
          ticks: { maxRotation: 0, autoSkip: true },
        },
        y: {
          stacked,
          grid: { color: '#eef2f7' },
          title: { display: true, text: yTitle },
        },
      },
    };
  }

  exportarCSV(): void {
    console.log('Exportar CSV');
  }

  exportarPDF(): void {
    console.log('Exportar PDF');
  }
}
