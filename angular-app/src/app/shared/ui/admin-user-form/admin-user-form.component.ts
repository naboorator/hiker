import { ChangeDetectionStrategy, Component, effect, input, output, signal } from '@angular/core';
import { FormField, email, form, required } from '@angular/forms/signals';
import { TranslocoPipe } from '@jsverse/transloco';
import type { AdminUserDraft } from '../../../core/interface/admin-user-draft.interface';

@Component({
  selector: 'app-admin-user-form',
  imports: [FormField, TranslocoPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './admin-user-form.component.html',
  styleUrl: './admin-user-form.component.css',
})
export class AdminUserFormComponent {
  readonly user = input.required<AdminUserDraft>();
  readonly saving = input(false);
  readonly emailInvalid = input(false);
  readonly saved = output<AdminUserDraft>();
  readonly cancelled = output<void>();
  readonly model = signal<AdminUserDraft>({ name: '', email: '', role: 'normal_user' });
  readonly userForm = form(this.model, (schema) => {
    required(schema.name);
    required(schema.email);
    email(schema.email);
    required(schema.role);
  });

  constructor() {
    effect(() => this.model.set({ ...this.user() }));
  }

  submit(event: SubmitEvent): void {
    event.preventDefault();
    this.userForm().markAsTouched();
    if (this.userForm().invalid() || this.saving()) return;
    this.saved.emit(this.model());
  }
}
