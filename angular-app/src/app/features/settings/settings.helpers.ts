import { HttpErrorResponse } from '@angular/common/http';

const passwordErrorTranslations: Record<string, string> = {
  'Current password is incorrect': 'settings.currentPasswordIncorrect',
  'New passwords do not match': 'settings.passwordMismatch',
  'New password must be different from the current password': 'settings.passwordMustDiffer',
  'New password must contain at least 8 characters': 'settings.passwordLength',
};

export function passwordErrorTranslation(error: unknown): string {
  if (error instanceof HttpErrorResponse && typeof error.error?.error === 'string') {
    return passwordErrorTranslations[error.error.error] ?? 'settings.passwordChangeError';
  }
  return 'settings.passwordChangeError';
}
