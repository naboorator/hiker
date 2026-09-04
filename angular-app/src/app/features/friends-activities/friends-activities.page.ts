import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  computed,
  inject,
  signal,
} from '@angular/core';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';
import type { FriendActivity } from '../../core/interface/friend-activity.interface';
import { FriendsStore } from '../../core/stores/friends.store';
import { MockHikeStore } from '../../core/stores/mock-hike.store';
import { AppHeaderComponent } from '../../shared/ui/app-header/app-header.component';
import { AuthService } from '../../core/auth/auth.service';

@Component({
  imports: [AppHeaderComponent, TranslocoPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './friends-activities.page.html',
  styleUrl: './friends-activities.page.css',
})
export class FriendsActivitiesPage {
  readonly hikeStore = inject(MockHikeStore);
  readonly store = inject(FriendsStore);
  private readonly transloco = inject(TranslocoService);
  private readonly auth = inject(AuthService);
  readonly activities = computed(() => {
    const userId = this.auth.user()?.id;
    return this.store.activities().filter((activity) => activity.author.id !== userId);
  });
  readonly slapVisible = signal(false);
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

  duration(activity: FriendActivity): string {
    const hours = Math.floor(activity.minutes / 60);
    const minutes = activity.minutes % 60;
    return hours ? `${hours} h ${minutes} min` : `${minutes} min`;
  }

  calendarDay(date: string): number {
    return new Date(`${date}T12:00:00`).getDate();
  }

  calendarMonth(date: string): string {
    return new Intl.DateTimeFormat(this.transloco.getActiveLang() === 'si' ? 'sl' : 'en', {
      month: 'short',
    }).format(new Date(`${date}T12:00:00`));
  }

  length(metres: number): string {
    return metres >= 1000 ? `${(metres / 1000).toFixed(1)} km` : `${metres} m`;
  }
}
