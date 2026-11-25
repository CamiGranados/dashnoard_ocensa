import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormControl } from '@angular/forms';
import { Mock } from 'vitest';

import { NuevoUsuario, RolPlataforma } from '../../../../core/models/cuenta-autorizada.model';
import { RegisterUserModal } from './register-user-modal';
import {
  OpcionSelect,
  correoValido,
  nombrePersona,
  normalizarUsuario,
  textoRequerido,
} from './register-user-modal.config';

const ROLES: OpcionSelect<RolPlataforma>[] = [
  { value: 'ADMIN', label: 'Control Total / Admin' },
  { value: 'SOLO_LECTURA', label: 'Solo Lectura - Dashboards' },
];

/** Deja correr las microtareas (la promesa de `submitHook`) y vuelve a pintar. */
async function flush(fixture: ComponentFixture<unknown>): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve));
  fixture.detectChanges();
  await fixture.whenStable();
}

describe('RegisterUserModal', () => {
  let fixture: ComponentFixture<RegisterUserModal>;
  let host: HTMLElement;
  let hook: Mock<(usuario: NuevoUsuario) => Promise<unknown>>;

  const campo = <T extends HTMLElement>(nombre: string) =>
    host.querySelector<T>(`[id$="-${nombre}"]`)!;
  const errores = () =>
    Array.from(host.querySelectorAll('.register-modal__error')).map((e) => e.textContent!.trim());

  function escribir(nombre: string, valor: string): void {
    const el = campo<HTMLInputElement | HTMLSelectElement>(nombre);
    el.value = valor;
    el.dispatchEvent(new Event(el instanceof HTMLSelectElement ? 'change' : 'input'));
    el.dispatchEvent(new Event('blur'));
  }

  function llenarValido(): void {
    escribir('nombres', '  Ana   María ');
    escribir('apellidos', 'Duarte Gómez');
    escribir('correo', '  Ana.Duarte@Ocensa.com.co ');
    escribir('empresa', 'Ocensa');
    escribir('rol', 'ADMIN');
  }

  async function enviar(): Promise<void> {
    host.querySelector('form')!.dispatchEvent(new Event('submit'));
    fixture.detectChanges();
    await fixture.whenStable();
  }

  async function abrir(): Promise<void> {
    fixture.componentRef.setInput('visible', true);
    fixture.detectChanges();
    await fixture.whenStable();
  }

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [RegisterUserModal] }).compileComponents();
    fixture = TestBed.createComponent(RegisterUserModal);
    host = fixture.nativeElement;
    hook = vi.fn().mockResolvedValue(undefined);
    fixture.componentRef.setInput('roles', ROLES);
    fixture.componentRef.setInput('submitHook', hook);
    fixture.detectChanges();
    await fixture.whenStable();
  });

  it('cerrado no pinta nada', () => {
    expect(host.querySelector('[role="dialog"]')).toBeNull();
  });

  it('abierto es un diálogo accesible titulado por su h2', async () => {
    await abrir();
    const dialogo = host.querySelector('[role="dialog"]')!;
    expect(dialogo.getAttribute('aria-modal')).toBe('true');
    const titulo = host.querySelector(`#${dialogo.getAttribute('aria-labelledby')}`);
    expect(titulo?.textContent).toContain('Registrar Nuevo Usuario');
    // Cada campo tiene su label asociado
    for (const nombre of ['nombres', 'apellidos', 'correo', 'empresa', 'rol']) {
      expect(host.querySelector(`label[for="${campo(nombre).id}"]`)).toBeTruthy();
    }
  });

  it('no muestra errores antes de tocar; al enviar vacío los muestra y no llama al hook', async () => {
    await abrir();
    expect(errores()).toEqual([]);

    await enviar();
    expect(errores()).toEqual([
      'Este campo es obligatorio.',
      'Este campo es obligatorio.',
      'Este campo es obligatorio.',
      'Este campo es obligatorio.',
      'Seleccione un rol.',
    ]);
    expect(campo('nombres').getAttribute('aria-describedby')).toBe(`${campo('nombres').id}-error`);
    expect(hook).not.toHaveBeenCalled();
  });

  it('valida al salir del campo', async () => {
    await abrir();
    escribir('correo', 'no-es-correo');
    fixture.detectChanges();
    expect(errores()).toEqual(['Ingrese un correo válido (usuario@empresa.com).']);
    expect(campo('correo').getAttribute('aria-invalid')).toBe('true');
  });

  it('normaliza, envía y se cierra cuando el hook resuelve', async () => {
    await abrir();
    llenarValido();
    await enviar();
    expect(hook).toHaveBeenCalledWith({
      nombres: 'Ana María',
      apellidos: 'Duarte Gómez',
      correo: 'ana.duarte@ocensa.com.co',
      empresa: 'Ocensa',
      rol: 'ADMIN',
    });

    await flush(fixture);
    expect(fixture.componentInstance.visible()).toBe(false);
    expect(host.querySelector('[role="dialog"]')).toBeNull();
  });

  it('mientras guarda deshabilita el formulario y muestra "Guardando…"', async () => {
    hook.mockReturnValue(new Promise(() => {}));
    await abrir();
    llenarValido();
    await enviar();

    const primario = host.querySelector<HTMLButtonElement>('.register-modal__btn--primary')!;
    expect(primario.disabled).toBe(true);
    expect(primario.textContent).toContain('Guardando…');
    expect(campo<HTMLInputElement>('nombres').disabled).toBe(true);

    // Esc no cierra mientras guarda
    host.querySelector('[role="dialog"]')!.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'Escape' }),
    );
    expect(fixture.componentInstance.visible()).toBe(true);
  });

  it('si el hook rechaza, muestra el error general y sigue abierto', async () => {
    hook.mockRejectedValue(new Error('El correo ya está registrado.'));
    await abrir();
    llenarValido();
    await enviar();
    await flush(fixture);

    expect(host.querySelector('[role="alert"]')?.textContent).toContain(
      'El correo ya está registrado.',
    );
    expect(fixture.componentInstance.visible()).toBe(true);
    expect(campo<HTMLInputElement>('nombres').disabled).toBe(false);
  });

  it('Esc cierra el modal', async () => {
    await abrir();
    host.querySelector('[role="dialog"]')!.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'Escape' }),
    );
    expect(fixture.componentInstance.visible()).toBe(false);
  });

  it('con catálogo de empresas, "Empresa" es un select', async () => {
    fixture.componentRef.setInput('empresas', ['Ocensa', 'Corrosión CIC']);
    await abrir();
    expect(campo('empresa').tagName).toBe('SELECT');
  });
});

describe('validadores del registro', () => {
  const errores = (valor: string, ...validadores: typeof textoRequerido[]) =>
    new FormControl(valor, validadores).errors;

  it('textoRequerido trata los espacios como vacío', () => {
    expect(errores('   ', textoRequerido)).toEqual({ required: true });
    expect(errores('Ana', textoRequerido)).toBeNull();
  });

  it('nombrePersona: 2–60 caracteres, sólo letras (con tildes) y espacios', () => {
    expect(errores('Ñuñez Pérez', nombrePersona)).toBeNull();
    expect(errores('A', nombrePersona)).toEqual({ longitud: { min: 2, max: 60 } });
    expect(errores('a'.repeat(61), nombrePersona)).toEqual({ longitud: { min: 2, max: 60 } });
    expect(errores('Ana3', nombrePersona)).toEqual({ soloLetras: true });
  });

  it('correoValido', () => {
    expect(errores('ana@ocensa.com.co', correoValido)).toBeNull();
    expect(errores('ana@ocensa', correoValido)).toEqual({ correo: true });
    expect(errores('', correoValido)).toBeNull();
  });

  it('normalizarUsuario recorta y pone el correo en minúsculas', () => {
    expect(
      normalizarUsuario({
        nombres: ' Ana ',
        apellidos: 'Duarte  Gómez',
        correo: ' ANA@X.CO ',
        empresa: ' Ocensa ',
        rol: 'OPERADOR',
      }),
    ).toEqual({
      nombres: 'Ana',
      apellidos: 'Duarte Gómez',
      correo: 'ana@x.co',
      empresa: 'Ocensa',
      rol: 'OPERADOR',
    });
  });
});
