import { ChangeDetectionStrategy, Component, computed, inject, input, signal } from '@angular/core';
import type { OnInit } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';
import { HikeApiService } from '../../../core/api/hike-api.service';
import type { Hike } from '../../../core/interface/hike.interface';
import { LogWrapper } from '../../../core/logging/log-wrapper.service';
import { groupActivitiesByMonth } from '../../../core/utils/group-activities-by-month';
import { ActivityMonthListComponent } from '../activity-month-list/activity-month-list.component';

@Component({
  selector: 'app-admin-user-activities',
  imports: [ActivityMonthListComponent, TranslocoPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './admin-user-activities.component.html',
  styleUrl: './admin-user-activities.component.css',
})
export class AdminUserActivitiesComponent implements OnInit {
  private readonly api = inject(HikeApiService);
  private readonly logger = inject(LogWrapper);
  private readonly transloco = inject(TranslocoService);
  private readonly activeLanguage = toSignal(this.transloco.langChanges$, {
    initialValue: this.transloco.getActiveLang(),
  });

  readonly userId = input.required<string>();
  readonly activities = signal<Hike[]>([]);
  readonly page = signal(1);
  readonly totalPages = signal(1);
  readonly total = signal(0);
  readonly loading = signal(true);
  readonly loadFailed = signal(false);
  readonly months = computed(() =>
    groupActivitiesByMonth(this.activities(), this.activeLanguage()),
  );

  ngOnInit(): void {
    void this.loadPage(1);
  }

  async loadPage(page: number): Promise<void> {
    if (page < 1 || (!this.loading() && page > this.totalPages())) return;

    this.loading.set(true);
    this.loadFailed.set(false);
    try {
      const result = await this.api.loadAdminUserActivities(this.userId(), page, 10);
      this.activities.set(result.items);
      this.page.set(result.page);
      this.totalPages.set(result.totalPages);
      this.total.set(result.total);
    } catch (error) {
      this.logger.error('Loading user activities for administrator failed', error);
      this.loadFailed.set(true);
    } finally {
      this.loading.set(false);
    }
  }
}
