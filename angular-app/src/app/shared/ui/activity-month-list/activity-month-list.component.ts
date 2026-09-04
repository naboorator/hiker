import { ChangeDetectionStrategy, Component, inject, input, output } from '@angular/core';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';
import type { ActivityDayGroup } from '../../../core/interface/activity-day-group.interface';
import type { Hike } from '../../../core/interface/hike.interface';
@Component({
  selector: 'app-activity-month-list',
  imports: [TranslocoPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './activity-month-list.component.html',
  styleUrl: './activity-month-list.component.css',
})
export class ActivityMonthListComponent {
  private readonly transloco = inject(TranslocoService);
  readonly title = input.required<string>();
  readonly days = input.required<readonly ActivityDayGroup[]>();
  readonly minutes = input.required<number>();
  readonly metres = input.required<number>();
  readonly allowEdits = input(false);
  readonly showLikes = input(false);
  readonly edit = output<Hike>();
  readonly remove = output<string>();
  format(minutes: number) {
    return minutes >= 60
      ? `${(minutes / 60).toFixed(1)} ${this.transloco.translate('common.hourShort')}`
      : `${minutes} ${this.transloco.translate('common.minuteShort')}`;
  }
  distance(metres: number) {
    return metres >= 1000
      ? `${(metres / 1000).toFixed(1)} ${this.transloco.translate('common.kilometreShort')}`
      : `${metres} ${this.transloco.translate('common.metreShort')}`;
  }
}
