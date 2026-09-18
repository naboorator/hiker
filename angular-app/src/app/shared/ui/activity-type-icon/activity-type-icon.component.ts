import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import type { ActivityType } from '../../../core/interface/activity-type.type';

@Component({
  selector: 'app-activity-type-icon',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './activity-type-icon.component.html',
  styleUrl: './activity-type-icon.component.css',
})
export class ActivityTypeIconComponent {
  readonly type = input.required<ActivityType>();
  readonly size = input<'default' | 'large'>('default');
}
