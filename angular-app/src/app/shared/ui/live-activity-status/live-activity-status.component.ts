import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  computed,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { DatePipe } from '@angular/common';
import { TranslocoPipe } from '@jsverse/transloco';
import { LIVE_ACTIVITY_TIMER_INTERVAL_MS } from '../../../core/constants/live-activity.constants';
import type { LiveActivity } from '../../../core/interface/live-activity.interface';
import { formatTrackedDistance } from '../../../core/utils/geo-distance.helpers';
import {
  elapsedMilliseconds,
  formatElapsedTime,
} from '../../../core/utils/live-activity-time.helpers';

@Component({
  selector: 'app-live-activity-status',
  imports: [DatePipe, TranslocoPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './live-activity-status.component.html',
  styleUrl: './live-activity-status.component.css',
})
export class LiveActivityStatusComponent {
  readonly activity = input.required<LiveActivity>();
  readonly stopped = output<void>();
  readonly discardRequested = output<void>();
  readonly locationRetryRequested = output<void>();
  private readonly now = signal(Date.now());
  readonly elapsed = computed(() =>
    formatElapsedTime(
      elapsedMilliseconds(this.activity().startedAt, new Date(this.now()).toISOString()),
    ),
  );
  readonly locationKey = computed(
    () => `liveActivity.location.${this.activity().locationTracking}`,
  );
  readonly gpsPulseKey = computed(() => this.activity().lastAcceptedSampleAt ?? 'waiting');
  readonly distance = computed(() => formatTrackedDistance(this.activity().trackedDistanceMetres));
  readonly canRetryLocation = computed(() =>
    ['denied', 'unavailable', 'stale', 'error'].includes(this.activity().locationTracking),
  );

  constructor() {
    const intervalId = window.setInterval(
      () => this.now.set(Date.now()),
      LIVE_ACTIVITY_TIMER_INTERVAL_MS,
    );
    inject(DestroyRef).onDestroy(() => window.clearInterval(intervalId));
  }
}
