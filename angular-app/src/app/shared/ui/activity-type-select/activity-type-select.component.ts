import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';
import { ACTIVITY_TYPE_OPTIONS } from '../../../core/constants/activity-types.constants';
import type { ActivityType } from '../../../core/interface/activity-type.type';
import { activityTypeOption } from '../../../core/utils/activity-type.helpers';
import { ActivityTypeIconComponent } from '../activity-type-icon/activity-type-icon.component';

@Component({
  selector: 'app-activity-type-select',
  imports: [TranslocoPipe, ActivityTypeIconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './activity-type-select.component.html',
  styleUrl: './activity-type-select.component.css',
})
export class ActivityTypeSelectComponent {
  readonly value = input.required<ActivityType>();
  readonly valueChange = output<ActivityType>();
  readonly options = ACTIVITY_TYPE_OPTIONS;
  readonly selectedOption = computed(() => activityTypeOption(this.value()));
}
