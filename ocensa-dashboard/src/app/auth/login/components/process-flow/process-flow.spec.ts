import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ProcessFlow } from './process-flow';

const SVG_NS = 'http://www.w3.org/2000/svg';

describe('ProcessFlow', () => {
  let fixture: ComponentFixture<ProcessFlow>;
  let el: HTMLElement;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ProcessFlow],
    }).compileComponents();

    fixture = TestBed.createComponent(ProcessFlow);
    el = fixture.nativeElement;
    await fixture.whenStable();
  });

  it('pinta las 3 etapas en orden', () => {
    const titles = Array.from(el.querySelectorAll('.pf__title'), (t) => t.textContent?.trim());
    expect(titles).toEqual(['Planta', 'Datos', 'Decisiones']);
  });

  it('crea las partículas como elementos SVG con su desplazamiento hacia el nodo', () => {
    const particles = el.querySelectorAll<SVGCircleElement>('.pf-particle');
    expect(particles.length).toBe(8);
    particles.forEach((p) => {
      expect(p.namespaceURI).toBe(SVG_NS);
      expect(p.style.getPropertyValue('--dx')).toMatch(/px$/);
    });
  });

  it('enlaza el relleno del área con el id único del degradado', () => {
    const gradientId = el.querySelector('linearGradient')?.getAttribute('id');
    expect(gradientId).toBeTruthy();
    expect(el.querySelector('.pf-area')?.getAttribute('fill')).toBe(`url(#${gradientId})`);
  });
});
