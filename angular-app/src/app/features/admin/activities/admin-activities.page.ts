import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TranslocoPipe } from '@jsverse/transloco';
import { MockHikeStore } from '../../../core/stores/mock-hike.store';
import { AppHeaderComponent } from '../../../shared/ui/app-header/app-header.component';

@Component({
  imports: [AppHeaderComponent, RouterLink, TranslocoPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './admin-activities.page.html',
  styleUrl: '../admin-subpage.css',
})
export class AdminActivitiesPage {
  readonly store = inject(MockHikeStore);
}
