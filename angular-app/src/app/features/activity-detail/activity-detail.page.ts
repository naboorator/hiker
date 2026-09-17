import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';
import { HikeApiService } from '../../core/api/hike-api.service';
import type { Hike } from '../../core/interface/hike.interface';
import { LogWrapper } from '../../core/logging/log-wrapper.service';
import { MockHikeStore } from '../../core/stores/mock-hike.store';
import { activityTypeOption } from '../../core/utils/activity-type.helpers';
import { formatRegistrationDate } from '../../core/utils/date-format.helpers';
import { AppHeaderComponent } from '../../shared/ui/app-header/app-header.component';

@Component({
  imports: [AppHeaderComponent, RouterLink, TranslocoPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './activity-detail.page.html',
  styleUrl: './activity-detail.page.css',
})
export class ActivityDetailPage {
  readonly store = inject(MockHikeStore);
  private readonly api = inject(HikeApiService);
  private readonly route = inject(ActivatedRoute);
  private readonly transloco = inject(TranslocoService);
  private readonly logger = inject(LogWrapper);
  readonly activity = signal<Hike | null>(null);
  readonly loading = signal(true);
  readonly loadFailed = signal(false);
  readonly unavailable = signal(false);

  constructor() {
    void this.load();
  }

  async load(): Promise<void> {
    const id = this.route.snapshot.paramMap.get('id');
    if (!id) {
      this.loading.set(false);
      this.loadFailed.set(true);
      return;
    }
    try {
      this.activity.set(await this.api.loadHike(id));
    } catch (error) {
      this.logger.error('Unable to load activity details', error);
      if (
        error instanceof HttpErrorResponse &&
        (error.status === 403 || error.error?.code === 'ACTIVITY_UNAVAILABLE')
      ) {
        this.unavailable.set(true);
      } else {
        this.loadFailed.set(true);
      }
    } finally {
      this.loading.set(false);
    }
  }

  typeTranslationKey(activity: Hike): string {
    return activityTypeOption(activity.activityType).translationKey;
  }

  formattedDate(date: string): string {
    return formatRegistrationDate(`${date}T12:00:00`, this.transloco.getActiveLang());
  }
}
