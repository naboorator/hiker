import type { OnInit } from '@angular/core';
import { ChangeDetectionStrategy, Component, input, output, signal } from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';
import type { ActivityType } from '../../../core/interface/activity-type.type';
import { ActivityTypeSelectComponent } from '../activity-type-select/activity-type-select.component';

@Component({
  selector: 'app-live-activity-start',
  imports: [ActivityTypeSelectComponent, TranslocoPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './live-activity-start.component.html',
  styleUrl: './live-activity-start.component.css',
})
export class LiveActivityStartComponent implements OnInit {
  readonly defaultActivityType = input<ActivityType>('hiking');
  readonly started = output<ActivityType>();
  readonly cancelled = output<void>();
  readonly activityType = signal<ActivityType>('hiking');

  ngOnInit(): void {
    this.activityType.set(this.defaultActivityType());
  }
}
