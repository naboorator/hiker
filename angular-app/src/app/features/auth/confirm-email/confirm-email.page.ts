import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { TranslocoPipe } from '@jsverse/transloco';
import { AuthService } from '../../../core/auth/auth.service';

@Component({
  imports: [RouterLink, TranslocoPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './confirm-email.page.html',
  styleUrl: '../auth.css',
})
export class ConfirmEmailPage {
  private readonly auth = inject(AuthService);
  private readonly route = inject(ActivatedRoute);
  readonly status = signal<'confirming' | 'confirmed' | 'invalid'>('confirming');

  constructor() {
    void this.confirm();
  }

  private async confirm(): Promise<void> {
    const token = this.route.snapshot.queryParamMap.get('token');
    if (!token) {
      this.status.set('invalid');
      return;
    }
    try {
      await this.auth.confirmEmail(token);
      this.status.set('confirmed');
      window.history.replaceState({}, '', '/confirm-email');
    } catch {
      this.status.set('invalid');
    }
  }
}
