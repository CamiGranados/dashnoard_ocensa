import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ChartToolbar, ChartTool } from './chart-toolbar';

describe('ChartToolbar', () => {
  let fixture: ComponentFixture<ChartToolbar>;

  function buttons(): HTMLButtonElement[] {
    return Array.from(fixture.nativeElement.querySelectorAll('button.cht__btn'));
  }
  function byLabel(label: string): HTMLButtonElement | undefined {
    return buttons().find((b) => b.getAttribute('aria-label') === label);
  }

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ChartToolbar],
    }).compileComponents();
    fixture = TestBed.createComponent(ChartToolbar);
  });

  it('pinta un botón por herramienta pedida', () => {
    fixture.componentRef.setInput('tools', ['zoom-in', 'zoom-out', 'reset'] as ChartTool[]);
    fixture.detectChanges();
    expect(buttons().length).toBe(3);
    expect(byLabel('Acercar')).toBeTruthy();
    expect(byLabel('Alejar')).toBeTruthy();
    expect(byLabel('Restablecer vista')).toBeTruthy();
  });

  it('deshabilita zoom según canZoomIn / canZoomOut', () => {
    fixture.componentRef.setInput('tools', ['zoom-in', 'zoom-out'] as ChartTool[]);
    fixture.componentRef.setInput('canZoomIn', false);
    fixture.componentRef.setInput('canZoomOut', true);
    fixture.detectChanges();
    expect(byLabel('Acercar')!.disabled).toBe(true);
    expect(byLabel('Alejar')!.disabled).toBe(false);
  });

  it('aria-pressed refleja el modo activo en los botones de modo', () => {
    fixture.componentRef.setInput('tools', ['select', 'pan'] as ChartTool[]);
    fixture.componentRef.setInput('mode', 'pan');
    fixture.detectChanges();
    expect(byLabel('Desplazar')!.getAttribute('aria-pressed')).toBe('true');
    expect(byLabel('Selección de área')!.getAttribute('aria-pressed')).toBe('false');
  });

  it('emite la intención al hacer clic', () => {
    fixture.componentRef.setInput('tools', ['zoom-in', 'select'] as ChartTool[]);
    fixture.detectChanges();
    const zoomIn = vi.fn();
    const modeChange = vi.fn();
    fixture.componentInstance.zoomIn.subscribe(zoomIn);
    fixture.componentInstance.modeChange.subscribe(modeChange);

    byLabel('Acercar')!.click();
    byLabel('Selección de área')!.click();

    expect(zoomIn).toHaveBeenCalledOnce();
    expect(modeChange).toHaveBeenCalledWith('select');
  });

  it('en modo dense, selección/pan/expandir no se pintan como iconos sueltos', () => {
    fixture.componentRef.setInput('tools', [
      'zoom-in',
      'select',
      'pan',
      'expand',
      'more',
    ] as ChartTool[]);
    fixture.componentRef.setInput('dense', true);
    fixture.detectChanges();
    expect(byLabel('Selección de área')).toBeUndefined();
    expect(byLabel('Desplazar')).toBeUndefined();
    expect(byLabel('Expandir')).toBeUndefined();
    expect(byLabel('Más opciones')).toBeTruthy();
  });
});
