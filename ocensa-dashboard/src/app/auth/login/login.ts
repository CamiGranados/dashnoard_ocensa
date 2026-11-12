import { ChangeDetectionStrategy, Component, DestroyRef, inject, signal } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ProcessFlow } from './components/process-flow/process-flow';
import { CORPORATE_EMAIL_DOMAINS, corporateEmailValidator } from './corporate-email.validator';

interface TerminalOption {
  readonly value: string;
  readonly label: string;
}

/**
 * Lo que entrega el formulario al enviar. Aún no hay endpoint ni DTO de autenticación en el
 * backend: cuando exista, el DTO va en core/models (calcado de la clase C#) y la llamada en
 * un servicio de core/services.
 */
export interface LoginPayload {
  terminal: string;
  username: string;
  password: string;
  rememberTerminal: boolean;
}

/** Catálogo provisional de estaciones del oleoducto. TODO: traerlo del backend cuando exista. */
const TERMINALS: readonly TerminalOption[] = [
  { value: 'covenas', label: 'Terminal Marítimo Coveñas (Sucre)' },
  { value: 'cusiana', label: 'Estación Cusiana (Casanare)' },
  { value: 'el-porvenir', label: 'Estación El Porvenir (Casanare)' },
  { value: 'miraflores', label: 'Estación Miraflores (Boyacá)' },
  { value: 'la-belleza', label: 'Estación La Belleza (Santander)' },
  { value: 'vasconia', label: 'Estación Vasconia (Boyacá)' },
  { value: 'caucasia', label: 'Estación Caucasia (Antioquia)' },
];

/** Latencia simulada del envío mientras no exista el servicio de autenticación. */
const FAKE_SUBMIT_MS = 1200;

@Component({
  selector: 'app-login',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, ProcessFlow],
  templateUrl: './login.html',
  styleUrl: './login.css',
})
export class Login {
  private readonly fb = inject(NonNullableFormBuilder);
  private pendingSubmit?: ReturnType<typeof setTimeout>;

  protected readonly terminals = TERMINALS;
  protected readonly allowedDomains = CORPORATE_EMAIL_DOMAINS;

  protected readonly showPassword = signal(false);
  protected readonly loading = signal(false);

  protected readonly form = this.fb.group({
    terminal: [TERMINALS[0].value, Validators.required],
    username: ['', [Validators.required, corporateEmailValidator()]],
    password: ['', Validators.required],
    rememberTerminal: [false],
  });

  constructor() {
    inject(DestroyRef).onDestroy(() => clearTimeout(this.pendingSubmit));
  }

  protected togglePassword(): void {
    this.showPassword.update((visible) => !visible);
  }

  protected submit(): void {
    if (this.loading()) return;
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const raw = this.form.getRawValue();
    const payload: LoginPayload = { ...raw, username: raw.username.trim() };

    this.loading.set(true);
    // TODO(auth): sustituir por la llamada al servicio de autenticación cuando exista.
    console.log('[login] payload', { ...payload, password: '••••••' });
    this.pendingSubmit = setTimeout(() => this.loading.set(false), FAKE_SUBMIT_MS);
  }
}
