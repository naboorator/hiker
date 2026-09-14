import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';
import { HikeApiService } from '../../../core/api/hike-api.service';
import type { AdminActivity } from '../../../core/interface/admin-activity.interface';
import { LogWrapper } from '../../../core/logging/log-wrapper.service';
import { MockHikeStore } from '../../../core/stores/mock-hike.store';
import { groupActivitiesByMonth } from '../../../core/utils/group-activities-by-month';
import { ActivityMonthListAdminComponent } from '../../../shared/ui/activity-month-list-admin/activity-month-list-admin.component';
import { AppHeaderComponent } from '../../../shared/ui/app-header/app-header.component';

@Component({
  imports: [ActivityMonthListAdminComponent, AppHeaderComponent, RouterLink, TranslocoPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './admin-activities.page.html',
  styleUrls: ['../admin-subpage.css', './admin-activities.page.css'],
})
export class AdminActivitiesPage {
  readonly store = inject(MockHikeStore);
  private readonly api = inject(HikeApiService);
  private readonly logger = inject(LogWrapper);
  private readonly transloco = inject(TranslocoService);
  private readonly activeLanguage = toSignal(this.transloco.langChanges$, {
    initialValue: this.transloco.getActiveLang(),
  });
  readonly activities = signal<AdminActivity[]>([]);
  readonly page = signal(1);
  readonly totalPages = signal(1);
  readonly totalActivities = signal(0);
  readonly totalDays = signal(0);
  readonly loading = signal(true);
  readonly loadFailed = signal(false);
  readonly months = computed(() =>
    groupActivitiesByMonth(this.activities(), this.activeLanguage()),
  );

  constructor() {
    void this.loadPage(1);
  }

  async loadPage(page: number): Promise<void> {
    if (page < 1 || page > this.totalPages()) return;
    this.loading.set(true);
    this.loadFailed.set(false);
    try {
      const result = await this.api.loadAdminActivities(page, 10);
      this.activities.set(result.items);
      this.page.set(result.page);
      this.totalPages.set(result.totalPages);
      this.totalActivities.set(result.totalActivities);
      this.totalDays.set(result.totalDays);
    } catch (error) {
      this.logger.error('Loading administrator activity list failed', error);
      this.loadFailed.set(true);
    } finally {
      this.loading.set(false);
    }
  }
}
