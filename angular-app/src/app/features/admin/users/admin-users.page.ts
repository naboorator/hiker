import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { TranslocoPipe } from '@jsverse/transloco';
import { MockHikeStore } from '../../../core/stores/mock-hike.store';
import { AppHeaderComponent } from '../../../shared/ui/app-header/app-header.component';
import { HikeApiService } from '../../../core/api/hike-api.service';
import { LogWrapper } from '../../../core/logging/log-wrapper.service';
import type { AdminUser } from '../../../core/interface/admin-user.interface';
import { TranslocoService } from '@jsverse/transloco';
import { ModalDialogComponent } from '../../../shared/ui/modal-dialog/modal-dialog.component';
import { AuthService } from '../../../core/auth/auth.service';
import { formatRegistrationDate } from '../../../core/utils/date-format.helpers';

@Component({
  imports: [AppHeaderComponent, ModalDialogComponent, RouterLink, TranslocoPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './admin-users.page.html',
  styleUrls: ['../admin-subpage.css', './admin-users.page.css'],
})
export class AdminUsersPage {
  readonly store = inject(MockHikeStore);
  private readonly api = inject(HikeApiService);
  private readonly logger = inject(LogWrapper);
  private readonly transloco = inject(TranslocoService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  readonly auth = inject(AuthService);
  readonly users = signal<AdminUser[]>([]);
  readonly page = signal(1);
  readonly totalPages = signal(1);
  readonly total = signal(0);
  readonly loading = signal(true);
  readonly loadFailed = signal(false);
  readonly actionError = signal(false);
  readonly pendingDelete = signal<AdminUser | null>(null);
  readonly actionInProgress = signal<string | null>(null);
  readonly searchTerm = signal(this.route.snapshot.queryParamMap.get('search')?.trim() ?? '');
  readonly appliedSearch = signal(this.searchTerm());

  constructor() {
    void this.loadPage(1);
  }

  async loadPage(page: number): Promise<void> {
    if (page < 1 || page > this.totalPages()) return;
    this.loading.set(true);
    this.loadFailed.set(false);
    try {
      const result = await this.api.loadAdminUsers(page, 10, this.appliedSearch());
      this.users.set(result.items);
      this.page.set(result.page);
      this.totalPages.set(result.totalPages);
      this.total.set(result.total);
    } catch (error) {
      this.logger.error('Loading administrator user list failed', error);
      this.loadFailed.set(true);
    } finally {
      this.loading.set(false);
    }
  }

  async search(): Promise<void> {
    const search = this.searchTerm().trim();
    this.searchTerm.set(search);
    this.appliedSearch.set(search);
    await this.updateSearchUrl(search);
    await this.loadPage(1);
  }

  async resetSearch(): Promise<void> {
    this.searchTerm.set('');
    this.appliedSearch.set('');
    await this.updateSearchUrl('');
    await this.loadPage(1);
  }

  private async updateSearchUrl(search: string): Promise<void> {
    await this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { search: search || null },
      queryParamsHandling: 'merge',
    });
  }

  registrationDate(user: AdminUser): string {
    return formatRegistrationDate(user.createdAt, this.transloco.getActiveLang());
  }

  async toggleBlocked(user: AdminUser): Promise<void> {
    this.actionInProgress.set(user.id);
    this.actionError.set(false);
    try {
      const updated = await this.api.setAdminUserBlocked(user.id, user.status !== 'blocked');
      this.users.update((users) => users.map((item) => (item.id === updated.id ? updated : item)));
    } catch (error) {
      this.logger.error('Changing administrator user block status failed', error);
      this.actionError.set(true);
    } finally {
      this.actionInProgress.set(null);
    }
  }

  async confirmDelete(): Promise<void> {
    const user = this.pendingDelete();
    if (!user) return;
    this.actionInProgress.set(user.id);
    this.actionError.set(false);
    try {
      await this.api.deleteAdminUser(user.id);
      this.pendingDelete.set(null);
      await this.loadPage(this.page());
    } catch (error) {
      this.logger.error('Deleting user from administrator page failed', error);
      this.actionError.set(true);
    } finally {
      this.actionInProgress.set(null);
    }
  }
}
