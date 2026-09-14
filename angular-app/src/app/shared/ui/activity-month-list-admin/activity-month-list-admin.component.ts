import { ChangeDetectionStrategy, Component } from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';
import { ActivityMonthListComponent } from '../activity-month-list/activity-month-list.component';

@Component({
  selector: 'app-activity-month-list-admin',
  imports: [TranslocoPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './activity-month-list-admin.component.html',
  styleUrl: './activity-month-list-admin.component.css',
})
export class ActivityMonthListAdminComponent extends ActivityMonthListComponent {}
