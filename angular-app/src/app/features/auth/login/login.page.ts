import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormField, form, required } from '@angular/forms/signals';
import { Router, RouterLink } from '@angular/router';
import { TranslocoPipe } from '@jsverse/transloco';
import { AuthService } from '../../../core/auth/auth.service';
import type { LoginDraft } from '../../../core/interface/login-draft.interface';
import { MockHikeStore } from '../../../core/stores/mock-hike.store';

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
  readonly model = signal<LoginDraft>({ email: '', password: '' });
  readonly loginForm = form(this.model, (schema) => {
    required(schema.email);
    required(schema.password);
  });
  readonly error = signal('');
  readonly registrationSuccessful = signal(history.state?.['registered'] === true);
  readonly submitting = signal(false);

  async submit(event: SubmitEvent): Promise<void> {
    event.preventDefault();
    this.error.set('');
    this.submitting.set(true);
    try {
      await this.auth.login(this.model());
      if (!(await this.store.load())) return;
      await this.router.navigate(['/'], { state: { loggedIn: true } });
    } catch (error) {
      this.error.set(apiMessage(error));
    } finally {
      this.submitting.set(false);
    }
  }
}

function apiMessage(error: unknown): string {
  if (error instanceof HttpErrorResponse && typeof error.error?.error === 'string')
    return error.error.error;
  return 'Unable to log in. Please try again.';
}
