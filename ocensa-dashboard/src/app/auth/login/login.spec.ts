import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Login } from './login';

describe('Login', () => {
  let fixture: ComponentFixture<Login>;
  let el: HTMLElement;

  const submitButton = () => el.querySelector<HTMLButtonElement>('button[type="submit"]')!;

  async function type(selector: string, value: string): Promise<void> {
    const input = el.querySelector<HTMLInputElement>(selector)!;
    input.value = value;
    input.dispatchEvent(new Event('input'));
    input.dispatchEvent(new Event('blur'));
    fixture.detectChanges();
    await fixture.whenStable();
  }

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Login],
    }).compileComponents();

    fixture = TestBed.createComponent(Login);
    el = fixture.nativeElement;
    await fixture.whenStable();
  });

  it('preselecciona el Terminal Marítimo Coveñas', () => {
    const select = el.querySelector<HTMLSelectElement>('#login-terminal')!;
    expect(select.selectedOptions[0].textContent?.trim()).toBe('Terminal Marítimo Coveñas (Sucre)');
  });

  it('deshabilita el botón mientras el formulario es inválido', () => {
    expect(submitButton().disabled).toBe(true);
  });

  it('habilita el botón con correo de dominio autorizado y contraseña', async () => {
    await type('#login-username', 'ana.perez@ocensa.com.co');
    await type('#login-password', 'secreto');
    expect(submitButton().disabled).toBe(false);
  });

  it('muestra el error de dominio al salir del campo', async () => {
    await type('#login-username', 'ana@gmail.com');
    expect(el.querySelector('#login-username-error')?.textContent).toContain('dominio');
    expect(submitButton().disabled).toBe(true);
  });

  it('alterna la visibilidad de la contraseña', async () => {
    const input = el.querySelector<HTMLInputElement>('#login-password')!;
    const toggle = el.querySelector<HTMLButtonElement>('.field__toggle')!;
    expect(input.type).toBe('password');

    toggle.click();
    await fixture.whenStable();
    expect(input.type).toBe('text');
    expect(toggle.getAttribute('aria-label')).toBe('Ocultar contraseña');
  });

  it('no incluye los elementos excluidos del diseño', () => {
    const text = el.textContent ?? '';
    expect(el.querySelector('h1')?.textContent?.trim()).toBe('Iniciar Sesión');
    expect(text).not.toContain('Microsoft 365');
    expect(text).not.toContain('Directorio Activo');
    expect(text.toUpperCase()).not.toContain('O AUTENTICAR CON IDENTIDAD CORPORATIVA');
    expect(text).not.toContain('Lote activo');
    expect(text).not.toContain('Nodo transmisor');
  });
});
