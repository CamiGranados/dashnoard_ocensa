import {
  ChangeDetectionStrategy,
  Component,
  DOCUMENT,
  Injector,
  afterNextRender,
  effect,
  inject,
  input,
  model,
  signal,
  untracked,
} from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { FocusTrap } from 'primeng/focustrap';
import { NuevoUsuario, RolPlataforma } from '../../../../core/models/cuenta-autorizada.model';
import {
  CAMPOS_TEXTO,
  CampoRegistro,
  MENSAJES_ERROR,
  ORDEN_CAMPOS,
  OpcionSelect,
  correoValido,
  mensajeRequerido,
  nombrePersona,
  normalizarUsuario,
  textoRequerido,
} from './register-user-modal.config';

const ERROR_GENERICO = 'No se pudo registrar el usuario. Intente de nuevo en unos minutos.';

let siguienteId = 0;

/**
 * Modal "Registrar Nuevo Usuario". Overlay propio (no `p-dialog`) para seguir el diseño al pixel;
 * el foco lo encierra `pFocusTrap` de PrimeNG.
 *
 * Se cierra con la X, "Cancelar", `Esc` o clic en el overlay (nunca mientras guarda). Al abrir
 * enfoca "Nombres"; al cerrar devuelve el foco al elemento que lo abrió.
 */
@Component({
  selector: 'app-register-user-modal',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, FocusTrap],
  templateUrl: './register-user-modal.html',
  styleUrl: './register-user-modal.css',
})
export class RegisterUserModal {
  private readonly fb = inject(NonNullableFormBuilder);
  private readonly document = inject(DOCUMENT);
  private readonly injector = inject(Injector);

  /** Abierto/cerrado. Two-way: `[(visible)]`. */
  readonly visible = model(false);
  readonly roles = input.required<readonly OpcionSelect<RolPlataforma>[]>();
  /** Catálogo de empresas. Vacío → el campo "Empresa" es texto libre. */
  readonly empresas = input<readonly string[]>([]);
  /**
   * Guarda el usuario (datos ya normalizados). Si la promesa resuelve, el modal se cierra; si
   * rechaza, muestra el error encima del pie (el `message` de un `Error`, o uno genérico).
   * No se llama `onSubmit`: Angular bloquea los bindings `[on*]`.
   */
  readonly submitHook = input.required<(usuario: NuevoUsuario) => Promise<unknown>>();

  private readonly uid = `register-user-${siguienteId++}`;
  protected readonly camposTexto = CAMPOS_TEXTO;
  protected readonly guardando = signal(false);
  protected readonly errorGeneral = signal<string | null>(null);

  protected readonly form = this.fb.group({
    nombres: ['', [textoRequerido, nombrePersona]],
    apellidos: ['', [textoRequerido, nombrePersona]],
    correo: ['', [textoRequerido, correoValido]],
    empresa: ['', textoRequerido],
    rol: this.fb.control<RolPlataforma | ''>('', Validators.required),
  });

  /** Elemento con el foco al abrir (el botón "Agregar usuario"), para devolvérselo al cerrar. */
  private disparador: HTMLElement | null = null;
  private abierto = false;
  /** El clic sólo cierra si también empezó (mousedown) en el overlay: arrastrar texto no cierra. */
  private pulsoEnOverlay = false;

  constructor() {
    effect(() => {
      const visible = this.visible();
      untracked(() => (visible ? this.alAbrir() : this.alCerrar()));
    });
  }

  protected idDe(sufijo: string): string {
    return `${this.uid}-${sufijo}`;
  }

  protected mostrarError(campo: CampoRegistro): boolean {
    const control = this.form.controls[campo];
    return control.invalid && control.touched;
  }

  protected mensajeError(campo: CampoRegistro): string {
    const errores = this.form.controls[campo].errors;
    if (!errores) return '';
    if (errores['required']) return mensajeRequerido(campo, this.empresas().length > 0);
    const clave = Object.keys(errores).find((k) => k in MENSAJES_ERROR);
    return clave ? MENSAJES_ERROR[clave] : 'Valor no válido.';
  }

  protected cerrar(): void {
    if (this.guardando()) return;
    this.visible.set(false);
  }

  protected onOverlayMouseDown(evento: MouseEvent): void {
    this.pulsoEnOverlay = evento.target === evento.currentTarget;
  }

  protected onOverlayClick(evento: MouseEvent): void {
    if (this.pulsoEnOverlay && evento.target === evento.currentTarget) this.cerrar();
    this.pulsoEnOverlay = false;
  }

  protected async guardar(): Promise<void> {
    if (this.guardando()) return;
    this.errorGeneral.set(null);

    const { rol, ...resto } = this.form.getRawValue();
    if (this.form.invalid || !rol) {
      this.form.markAllAsTouched();
      this.enfocarPrimerInvalido();
      return;
    }

    this.guardando.set(true);
    this.form.disable();
    try {
      await this.submitHook()(normalizarUsuario({ ...resto, rol }));
      this.guardando.set(false);
      this.visible.set(false);
    } catch (error) {
      this.guardando.set(false);
      this.form.enable();
      this.errorGeneral.set(error instanceof Error && error.message ? error.message : ERROR_GENERICO);
    }
  }

  private alAbrir(): void {
    const activo = this.document.activeElement;
    this.disparador = activo instanceof HTMLElement ? activo : null;
    this.abierto = true;

    this.form.reset();
    this.form.enable();
    this.guardando.set(false);
    this.errorGeneral.set(null);

    afterNextRender(() => this.enfocar('nombres'), { injector: this.injector });
  }

  private alCerrar(): void {
    if (!this.abierto) return;
    this.abierto = false;
    this.disparador?.focus();
    this.disparador = null;
  }

  private enfocarPrimerInvalido(): void {
    const campo = ORDEN_CAMPOS.find((c) => this.form.controls[c].invalid);
    if (campo) this.enfocar(campo);
  }

  private enfocar(campo: CampoRegistro): void {
    this.document.getElementById(this.idDe(campo))?.focus();
  }
}
