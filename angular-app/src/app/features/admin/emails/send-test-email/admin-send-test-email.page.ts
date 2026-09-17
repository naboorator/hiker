import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import type { NgForm } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { TranslocoPipe } from '@jsverse/transloco';
import { HikeApiService } from '../../../../core/api/hike-api.service';
import type { AdminTestEmailDraft } from '../../../../core/interface/admin-test-email-draft.interface';
import { LogWrapper } from '../../../../core/logging/log-wrapper.service';
import { MockHikeStore } from '../../../../core/stores/mock-hike.store';
import { AppHeaderComponent } from '../../../../shared/ui/app-header/app-header.component';

@Component({
  imports: [AppHeaderComponent, FormsModule, RouterLink, TranslocoPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './admin-send-test-email.page.html',
  styleUrls: ['../../admin-subpage.css', './admin-send-test-email.page.css'],
})
export class AdminSendTestEmailPage {
  readonly store = inject(MockHikeStore);
  private readonly api = inject(HikeApiService);
  private readonly logger = inject(LogWrapper);
  readonly draft: AdminTestEmailDraft = { email: '', subject: '', body: '' };
  readonly sending = signal(false);
  readonly submitted = signal(false);
  readonly error = signal('');
  readonly success = signal(false);

  async send(form: NgForm): Promise<void> {
    this.submitted.set(true);
    this.success.set(false);
    this.error.set('');
    if (form.invalid) return;
    this.sending.set(true);
    try {
      await this.api.sendAdminTestEmail(this.draft);
      this.success.set(true);
      form.resetForm({ email: '', subject: '', body: '' });
      this.submitted.set(false);
    } catch (error) {
      this.logger.error('Sending administrator test email failed', error);
      this.error.set(
        error instanceof HttpErrorResponse && typeof error.error?.error === 'string'
          ? error.error.error
          : 'admin.testEmailSendError',
      );
    } finally {
      this.sending.set(false);
    }
  }
}
