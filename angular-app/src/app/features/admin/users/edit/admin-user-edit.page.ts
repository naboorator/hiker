import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { TranslocoPipe } from '@jsverse/transloco';
import { HikeApiService } from '../../../../core/api/hike-api.service';
import { AuthService } from '../../../../core/auth/auth.service';
import type { AdminUserDraft } from '../../../../core/interface/admin-user-draft.interface';
import type { AdminUser } from '../../../../core/interface/admin-user.interface';
import { LogWrapper } from '../../../../core/logging/log-wrapper.service';
import { MockHikeStore } from '../../../../core/stores/mock-hike.store';
import { AdminUserFormComponent } from '../../../../shared/ui/admin-user-form/admin-user-form.component';
import { AdminUserActivitiesComponent } from '../../../../shared/ui/admin-user-activities/admin-user-activities.component';
import { AppHeaderComponent } from '../../../../shared/ui/app-header/app-header.component';

@Component({
  imports: [
    AdminUserActivitiesComponent,
    AdminUserFormComponent,
    AppHeaderComponent,
    RouterLink,
    TranslocoPipe,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './admin-user-edit.page.html',
  styleUrls: ['../../admin-subpage.css', './admin-user-edit.page.css'],
})
export class AdminUserEditPage {
  readonly store = inject(MockHikeStore);
  private readonly api = inject(HikeApiService);
  private readonly auth = inject(AuthService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly logger = inject(LogWrapper);
  readonly userId = this.route.snapshot.paramMap.get('id') ?? '';
  readonly user = signal<AdminUser | null>(null);
  readonly loading = signal(true);
  readonly saving = signal(false);
  readonly error = signal('');

  constructor() {
    void this.load();
  }

  draft(user: AdminUser): AdminUserDraft {
    return { name: user.name, email: user.email, role: user.role };
  }

  async save(draft: AdminUserDraft): Promise<void> {
    this.saving.set(true);
    this.error.set('');
    try {
      const updated = await this.api.updateAdminUser(this.userId, draft);
      if (this.auth.user()?.id === updated.id) {
        this.auth.updateAuthenticatedUser({
          id: updated.id,
          name: updated.name,
          email: updated.email,
          role: updated.role,
        });
      }
      await this.router.navigate(['/admin/users']);
    } catch (error) {
      this.logger.error('Updating user from administrator page failed', error);
      this.error.set(
        error instanceof HttpErrorResponse && typeof error.error?.error === 'string'
          ? error.error.error
          : 'admin.userSaveError',
      );
    } finally {
      this.saving.set(false);
    }
  }

  async cancel(): Promise<void> {
    await this.router.navigate(['/admin/users']);
  }

  private async load(): Promise<void> {
    try {
      this.user.set(await this.api.loadAdminUser(this.userId));
    } catch (error) {
      this.logger.error('Loading user for administrator edit failed', error);
      this.error.set('admin.userLoadError');
    } finally {
      this.loading.set(false);
    }
  }
}
