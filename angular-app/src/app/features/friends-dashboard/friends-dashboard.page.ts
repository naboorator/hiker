import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TranslocoPipe } from '@jsverse/transloco';
import { MockHikeStore } from '../../core/stores/mock-hike.store';
import { AppHeaderComponent } from '../../shared/ui/app-header/app-header.component';

@Component({
  imports: [AppHeaderComponent, RouterLink, TranslocoPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './friends-dashboard.page.html',
  styleUrl: './friends-dashboard.page.css',
})
export class FriendsDashboardPage {
  readonly store = inject(MockHikeStore);
}
