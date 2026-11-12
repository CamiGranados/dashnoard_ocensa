import { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';

/** Dominios corporativos autorizados para iniciar sesión. */
export const CORPORATE_EMAIL_DOMAINS: readonly string[] = [
  'ocensa.com.co',
  'corrosion.cict.org.co',
];

const LOCAL_PART = /^[a-z0-9._%+-]+$/i;

/**
 * Exige un correo cuyo dominio sea exactamente uno de `domains` (sin subdominios),
 * sin distinguir mayúsculas. El valor vacío se deja a `Validators.required`.
 * Error: `{ corporateEmail: { allowed: string[] } }`.
 */
export function corporateEmailValidator(
  domains: readonly string[] = CORPORATE_EMAIL_DOMAINS,
): ValidatorFn {
  const allowed = domains.map((d) => d.toLowerCase());

  return (control: AbstractControl<string | null>): ValidationErrors | null => {
    const value = (control.value ?? '').trim().toLowerCase();
    if (!value) return null;

    const at = value.lastIndexOf('@');
    const local = value.slice(0, at);
    const domain = value.slice(at + 1);

    const valid = at > 0 && LOCAL_PART.test(local) && allowed.includes(domain);
    return valid ? null : { corporateEmail: { allowed: [...domains] } };
  };
}
