import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { ChartModule } from 'primeng/chart';

import { ChartFrame } from './chart-frame';

@Component({
  imports: [ChartFrame, ChartModule],
  template: `
    <app-chart-frame
      title="Desviación FWV"
      subtitle="Diferencia mensual"
      [hasRefLines]="true"
      [ownsAxisRange]="ownsAxisRange"
    >
      <p-chart type="bar" [data]="data" [options]="options" />
    </app-chart-frame>
  `,
})
class Host {
  data = { labels: ['Ene'], datasets: [{ label: 'A', data: [1] }] };
  // Simula el rastro que deja chartjs-plugin-zoom al hacer zoom sobre el eje X.
  options: { responsive: boolean; scales: { x: { min?: number; max?: number } } } = {
    responsive: true,
    scales: { x: { min: 1, max: 1 } },
  };
  ownsAxisRange = true;
}

describe('ChartFrame', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [Host] }).compileComponents();
  });

  it('pinta la cabecera (título + subtítulo + separador + barra)', async () => {
    const fixture = TestBed.createComponent(Host);
    await fixture.whenStable();
    fixture.detectChanges();

    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelector('.chart-frame__title')?.textContent).toContain('Desviación FWV');
    expect(el.querySelector('.chart-frame__subtitle')?.textContent).toContain('Diferencia mensual');
    expect(el.querySelector('.chart-frame__sep')).toBeTruthy();
    expect(el.querySelector('app-chart-toolbar')).toBeTruthy();
    // La gráfica proyectada queda en el slot del cuerpo.
    expect(el.querySelector('.chart-frame__body p-chart')).toBeTruthy();
  });

  it('tolera que no haya instancia de Chart.js (jsdom): "restablecer" no rompe', async () => {
    const fixture = TestBed.createComponent(Host);
    await fixture.whenStable();
    fixture.detectChanges();

    const frame = fixture.debugElement.children[0].componentInstance as ChartFrame;
    expect(() => frame['handleReset']()).not.toThrow();
  });

  it('al destruirse limpia el min/max que el plugin de zoom dejó en las options del consumidor', async () => {
    const fixture = TestBed.createComponent(Host);
    await fixture.whenStable();
    fixture.detectChanges();

    expect(fixture.componentInstance.options.scales.x.min).toBe(1);
    fixture.destroy();
    expect(fixture.componentInstance.options.scales.x.min).toBeUndefined();
    expect(fixture.componentInstance.options.scales.x.max).toBeUndefined();
  });

  it('con ownsAxisRange=false NO toca el rango del eje del consumidor (slider de ventana)', async () => {
    const fixture = TestBed.createComponent(Host);
    fixture.componentInstance.ownsAxisRange = false;
    await fixture.whenStable();
    fixture.detectChanges();

    fixture.destroy();
    expect(fixture.componentInstance.options.scales.x.min).toBe(1);
  });
});
