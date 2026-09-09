import { ChangeDetectionStrategy, Component, inject, input } from '@angular/core';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import { TranslocoPipe } from '@jsverse/transloco';
import { MockHikeStore } from '../../../core/stores/mock-hike.store';
import { AuthService } from '../../../core/auth/auth.service';
import { FriendsStore } from '../../../core/stores/friends.store';
@Component({
  selector: 'app-header',
  imports: [RouterLink, RouterLinkActive, TranslocoPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './app-header.component.html',
  styleUrl: './app-header.component.css',
})
export class AppHeaderComponent {
  readonly store = inject(MockHikeStore);
  readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  readonly friendsStore = inject(FriendsStore);
  readonly appName = input.required<string>();
  readonly subtitle = input<string>();

  constructor() {
    void this.friendsStore.loadHeaderData();
  }

  async logout(): Promise<void> {
    this.auth.logout();
    this.store.reset();
    this.friendsStore.reset();
    await this.router.navigate(['/login']);
  }
}
