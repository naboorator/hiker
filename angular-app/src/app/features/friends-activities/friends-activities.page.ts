import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  computed,
  inject,
  signal,
} from '@angular/core';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';
import { toSignal } from '@angular/core/rxjs-interop';
import type { FriendActivity } from '../../core/interface/friend-activity.interface';
import type { Hike } from '../../core/interface/hike.interface';
import { groupActivitiesByMonth } from '../../core/utils/group-activities-by-month';
import { FriendsStore } from '../../core/stores/friends.store';
import { MockHikeStore } from '../../core/stores/mock-hike.store';
import { AppHeaderComponent } from '../../shared/ui/app-header/app-header.component';
import { AuthService } from '../../core/auth/auth.service';
import { ActivityMonthListComponent } from '../../shared/ui/activity-month-list/activity-month-list.component';

@Component({
  imports: [AppHeaderComponent, ActivityMonthListComponent, TranslocoPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './friends-activities.page.html',
  styleUrl: './friends-activities.page.css',
})
export class FriendsActivitiesPage {
  readonly hikeStore = inject(MockHikeStore);
  readonly store = inject(FriendsStore);
  private readonly transloco = inject(TranslocoService);
  private readonly auth = inject(AuthService);
  private readonly activeLanguage = toSignal(this.transloco.langChanges$, {
    initialValue: this.transloco.getActiveLang(),
  });
  readonly activities = computed(() => {
    const userId = this.auth.user()?.id;
    return this.store.activities().filter((activity) => activity.author.id !== userId);
  });
  readonly slapVisible = signal(false);
  readonly months = computed(() =>
    groupActivitiesByMonth(this.activities(), this.activeLanguage()),
  );
  private slapTimeout?: number;
  private readonly destroyRef = inject(DestroyRef);

  constructor() {
    void this.store.load();
    this.destroyRef.onDestroy(() => window.clearTimeout(this.slapTimeout));
  }

  async slap(activity: FriendActivity): Promise<void> {
    const isAddingSlap = !activity.myReactions.includes('slap');
    const succeeded = await this.store.toggleReaction(activity, 'slap');
    if (!succeeded || !isAddingSlap) return;
    window.clearTimeout(this.slapTimeout);
    this.slapVisible.set(true);
    this.slapTimeout = window.setTimeout(() => this.slapVisible.set(false), 1700);
  }

  toggleLike(activity: Hike): void {
    void this.store.toggleReaction(activity as FriendActivity, 'like');
  }

  giveSlap(activity: Hike): void {
    void this.slap(activity as FriendActivity);
  }
}
