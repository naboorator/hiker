import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';
import { HikeApiService } from '../../core/api/hike-api.service';
import type { Hike } from '../../core/interface/hike.interface';
import type { ActivityGpsLocation } from '../../core/interface/activity-gps-location.interface';
import { LogWrapper } from '../../core/logging/log-wrapper.service';
import { MockHikeStore } from '../../core/stores/mock-hike.store';
import { activityTypeOption } from '../../core/utils/activity-type.helpers';
import { formatRegistrationDate } from '../../core/utils/date-format.helpers';
import { AppHeaderComponent } from '../../shared/ui/app-header/app-header.component';
import { ActivityRouteMapComponent } from '../../shared/ui/activity-route-map/activity-route-map.component';
import { ActivityTypeIconComponent } from '../../shared/ui/activity-type-icon/activity-type-icon.component';
import { environment } from '../../../environments/environment';

@Component({
  imports: [
    ActivityRouteMapComponent,
    ActivityTypeIconComponent,
    AppHeaderComponent,
    RouterLink,
    TranslocoPipe,
  ],
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
  readonly routeLocations = signal<readonly ActivityGpsLocation[]>([]);
  readonly routeLoading = signal(false);
  readonly routeLoadFailed = signal(false);
  readonly mapbox = environment.mapbox;

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
      const activity = await this.api.loadHike(id);
      this.activity.set(activity);
      if (activity.hasGpsLocations) await this.loadRoute(activity.id);
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

  async loadRoute(activityId = this.activity()?.id): Promise<void> {
    if (!activityId) return;
    this.routeLoading.set(true);
    this.routeLoadFailed.set(false);
    try {
      this.routeLocations.set(await this.api.loadActivityLocations(activityId));
    } catch (error) {
      this.logger.error('Unable to load activity GPS route', error);
      if (
        error instanceof HttpErrorResponse &&
        (error.status === 403 || error.error?.code === 'ACTIVITY_UNAVAILABLE')
      ) {
        this.unavailable.set(true);
      } else {
        this.routeLoadFailed.set(true);
      }
    } finally {
      this.routeLoading.set(false);
    }
  }

  typeTranslationKey(activity: Hike): string {
    return activityTypeOption(activity.activityType).translationKey;
  }

  formattedDate(date: string): string {
    return formatRegistrationDate(`${date}T12:00:00`, this.transloco.getActiveLang());
  }
}
