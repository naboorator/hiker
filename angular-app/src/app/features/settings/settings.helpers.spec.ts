import { HttpErrorResponse } from '@angular/common/http';
import { describe, expect, it } from 'vitest';
import { passwordErrorTranslation } from './settings.helpers';

describe('settings helpers', () => {
  it('maps password API errors to translation keys', () => {
    const error = new HttpErrorResponse({
      status: 400,
      error: { error: 'Current password is incorrect' },
    });
    expect(passwordErrorTranslation(error)).toBe('settings.currentPasswordIncorrect');
  });

  it('uses a safe fallback for unknown errors', () => {
    expect(passwordErrorTranslation(new Error('network failure'))).toBe(
      'settings.passwordChangeError',
    );
  });
});
