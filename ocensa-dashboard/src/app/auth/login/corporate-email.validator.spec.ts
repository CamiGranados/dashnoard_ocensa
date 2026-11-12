import { FormControl } from '@angular/forms';

import { corporateEmailValidator } from './corporate-email.validator';

describe('corporateEmailValidator', () => {
  const validate = (value: string | null) => corporateEmailValidator()(new FormControl(value));

  it.each(['ana.perez@ocensa.com.co', 'J.Rojas@Corrosion.CICT.org.co', '  ana@ocensa.com.co  '])(
    'acepta %s',
    (value) => expect(validate(value)).toBeNull(),
  );

  it.each([
    'ana@gmail.com',
    'ana@ocensa.com',
    'ana@sub.ocensa.com.co',
    '@ocensa.com.co',
    'ana',
    'a@b@ocensa.com.co',
    'ana perez@ocensa.com.co',
  ])('rechaza %s', (value) => {
    expect(validate(value)).toEqual({
      corporateEmail: { allowed: ['ocensa.com.co', 'corrosion.cict.org.co'] },
    });
  });

  it('deja el valor vacío a Validators.required', () => {
    expect(validate('')).toBeNull();
    expect(validate(null)).toBeNull();
  });
});
