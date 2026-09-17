import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { FormField, email, form, required } from '@angular/forms/signals';
import { Router, RouterLink } from '@angular/router';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';
import { AuthService } from '../../../core/auth/auth.service';
import type { LoginDraft } from '../../../core/interface/login-draft.interface';
import { MockHikeStore } from '../../../core/stores/mock-hike.store';
import { apiErrorMessage } from '../../../core/utils/api-error.helpers';

@Component({
  imports: [FormField, RouterLink, TranslocoPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './login.page.html',
  styleUrl: '../auth.css',
})
export class LoginPage {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly store = inject(MockHikeStore);
  private readonly transloco = inject(TranslocoService);
  readonly model = signal<LoginDraft>({ email: '', password: '' });
  readonly loginForm = form(this.model, (schema) => {
    required(schema.email);
    email(schema.email);
    required(schema.password);
  });
  readonly error = signal('');
  readonly registrationSuccessful = signal(history.state?.['registered'] === true);
  readonly submitting = signal(false);
  readonly confirmationRequired = signal(false);
  readonly resending = signal(false);
  readonly confirmationResent = signal(false);

  async submit(event: SubmitEvent): Promise<void> {
    event.preventDefault();
    this.loginForm().markAsTouched();
    if (this.loginForm().invalid()) return;
    this.error.set('');
    this.confirmationRequired.set(false);
    this.confirmationResent.set(false);
    this.submitting.set(true);
    try {
      await this.auth.login(this.model());
      if (!(await this.store.load())) return;
      await this.router.navigate(['/'], { state: { loggedIn: true } });
    } catch (error) {
      if (error instanceof HttpErrorResponse && error.error?.code === 'EMAIL_NOT_CONFIRMED') {
        this.confirmationRequired.set(true);
        this.error.set('auth.emailNotConfirmed');
        return;
      }
      this.error.set(apiErrorMessage(error, 'Unable to log in. Please try again.'));
    } finally {
      this.submitting.set(false);
    }
  }

  async resendConfirmation(): Promise<void> {
    if (!this.model().email || this.resending()) return;
    this.resending.set(true);
    this.error.set('');
    try {
      await this.auth.resendConfirmation(
        this.model().email,
        this.transloco.getActiveLang() === 'si' ? 'si' : 'en',
      );
      this.confirmationResent.set(true);
      this.confirmationRequired.set(false);
    } catch (error) {
      this.error.set(apiErrorMessage(error, 'auth.resendConfirmationError'));
    } finally {
      this.resending.set(false);
    }
  }
}
