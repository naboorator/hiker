import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormField, email, form, required } from '@angular/forms/signals';
import { Router, RouterLink } from '@angular/router';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';
import { AuthService } from '../../../core/auth/auth.service';
import type { RegisterDraft } from '../../../core/interface/register-draft.interface';
import { apiErrorMessage } from '../../../core/utils/api-error.helpers';

@Component({
  imports: [FormField, RouterLink, TranslocoPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './register.page.html',
  styleUrl: '../auth.css',
})
export class RegisterPage {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly transloco = inject(TranslocoService);
  readonly model = signal<RegisterDraft>({ name: '', email: '', password: '', repeatPassword: '' });
  readonly registerForm = form(this.model, (schema) => {
    required(schema.name);
    required(schema.email);
    email(schema.email);
    required(schema.password);
    required(schema.repeatPassword);
  });
  readonly error = signal('');
  readonly submitting = signal(false);

  async submit(event: SubmitEvent): Promise<void> {
    event.preventDefault();
    this.registerForm().markAsTouched();
    this.error.set('');
    if (this.registerForm.email().invalid()) {
      this.error.set('auth.invalidEmail');
      return;
    }
    if (this.model().password.length < 8) {
      this.error.set('auth.passwordLength');
      return;
    }
    if (this.model().password !== this.model().repeatPassword) {
      this.error.set('auth.passwordMismatch');
      return;
    }
    this.submitting.set(true);
    try {
      await this.auth.register({
        ...this.model(),
        language: this.transloco.getActiveLang() === 'si' ? 'si' : 'en',
      });
      await this.router.navigate(['/login'], { state: { registered: true } });
    } catch (error) {
      this.error.set(apiErrorMessage(error, 'Unable to register. Please try again.'));
    } finally {
      this.submitting.set(false);
    }
  }
}
