import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';
import type { ActivityType } from '../../../core/interface/activity-type.type';

@Component({
  selector: 'app-activity-type-select',
  imports: [TranslocoPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './activity-type-select.component.html',
  styleUrl: './activity-type-select.component.css',
})
export class ActivityTypeSelectComponent {
  readonly value = input.required<ActivityType>();
  readonly valueChange = output<ActivityType>();
}
