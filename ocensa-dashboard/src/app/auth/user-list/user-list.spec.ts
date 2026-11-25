import { ComponentFixture, TestBed } from '@angular/core/testing';

import { UserList } from './user-list';
import { inicialesDe } from './user-list.config';

describe('UserList', () => {
  let fixture: ComponentFixture<UserList>;
  let host: HTMLElement;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [UserList],
    }).compileComponents();

    fixture = TestBed.createComponent(UserList);
    host = fixture.nativeElement;
    await fixture.whenStable();
  });

  it('muestra el total de registros en el badge', () => {
    expect(host.querySelector('.user-list__count')?.textContent?.trim()).toBe('38 Registros');
  });

  it('pagina en el cliente: 10 filas en la primera página', () => {
    expect(host.querySelectorAll('tr.user-list__row').length).toBe(10);
    expect(host.querySelector('.user-list__footer-start')?.textContent).toContain('1-10');
  });

  it('cambiar filas por página vuelve a la primera página', async () => {
    const cmp = fixture.componentInstance as unknown as {
      onPage(e: { first: number; rows: number }): void;
      cambiarFilasPorPagina(n: number): void;
    };
    cmp.onPage({ first: 30, rows: 10 });
    fixture.detectChanges();
    await fixture.whenStable();
    expect(host.querySelector('.user-list__footer-start')?.textContent).toContain('31-38');

    cmp.cambiarFilasPorPagina(25);
    fixture.detectChanges();
    await fixture.whenStable();
    expect(host.querySelectorAll('tr.user-list__row').length).toBe(25);
    expect(host.querySelector('.user-list__footer-start')?.textContent).toContain('1-25');
  });

  it('la búsqueda filtra sin distinguir tildes y vuelve a la primera página', async () => {
    const cmp = fixture.componentInstance as unknown as {
      onPage(e: { first: number; rows: number }): void;
      onBuscar(texto: string): void;
    };
    cmp.onPage({ first: 10, rows: 10 });
    cmp.onBuscar('RINCON');
    fixture.detectChanges();
    await fixture.whenStable();

    const filas = host.querySelectorAll('tr.user-list__row');
    expect(filas.length).toBe(1);
    expect(filas[0].textContent).toContain('Claudia Rincón');
    expect(host.querySelector('.user-list__footer-start')?.textContent).toContain('1-1');

    cmp.onBuscar('zzz-sin-resultados');
    fixture.detectChanges();
    await fixture.whenStable();
    expect(host.querySelectorAll('tr.user-list__row').length).toBe(0);
    expect(host.querySelector('.user-list__empty')?.textContent).toContain('No hay usuarios');
  });

  it('"Agregar usuario" abre el modal de registro', async () => {
    expect(host.querySelector('[role="dialog"]')).toBeNull();
    host.querySelector<HTMLButtonElement>('.user-list__add-btn')!.click();
    fixture.detectChanges();
    await fixture.whenStable();
    expect(host.querySelector('app-register-user-modal [role="dialog"]')).toBeTruthy();
  });

  it('los botones de solo icono llevan aria-label', () => {
    const botones = host.querySelectorAll<HTMLButtonElement>('.user-list__action button');
    expect(botones.length).toBe(30);
    botones.forEach((b) => expect(b.getAttribute('aria-label')).toBeTruthy());
  });
});

describe('inicialesDe', () => {
  it('toma la primera letra del primer y último nombre', () => {
    expect(inicialesDe('Fernando Duarte')).toBe('FD');
    expect(inicialesDe('Sofía Alarcón')).toBe('SA');
    expect(inicialesDe('  Óscar  ')).toBe('Ó');
    expect(inicialesDe('')).toBe('');
  });
});
