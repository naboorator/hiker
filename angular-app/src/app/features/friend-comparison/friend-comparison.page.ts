import {
  ChangeDetectionStrategy,
  Component,
  computed,
  HostListener,
  inject,
  signal,
} from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';
import { MockHikeStore } from '../../core/stores/mock-hike.store';
import { FriendsStore } from '../../core/stores/friends.store';
import { HikeApiService } from '../../core/api/hike-api.service';
import type { FriendComparisonSeries } from '../../core/interface/friend-comparison-series.interface';
import { LogWrapper } from '../../core/logging/log-wrapper.service';
import { AppHeaderComponent } from '../../shared/ui/app-header/app-header.component';
import { FriendComparisonChartComponent } from '../../shared/ui/friend-comparison-chart/friend-comparison-chart.component';
import { toMonthKey } from '../../core/utils/date-format.helpers';

@Component({
  imports: [AppHeaderComponent, FriendComparisonChartComponent, RouterLink, TranslocoPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './friend-comparison.page.html',
  styleUrl: './friend-comparison.page.css',
})
export class FriendComparisonPage {
  readonly store = inject(MockHikeStore);
  readonly friendsStore = inject(FriendsStore);
  private readonly api = inject(HikeApiService);
  private readonly logger = inject(LogWrapper);
  private readonly transloco = inject(TranslocoService);
  private readonly activeLanguage = toSignal(this.transloco.langChanges$, {
    initialValue: this.transloco.getActiveLang(),
  });
  private readonly today = new Date();
  private readonly currentMonth = toMonthKey(this.today.getFullYear(), this.today.getMonth());
  readonly selectedFriendIds = signal<string[]>([]);
  readonly comparison = signal<FriendComparisonSeries[]>([]);
  readonly selectOpen = signal(false);
  readonly loading = signal(false);
  readonly friendsLoading = signal(true);
  readonly loadFailed = signal(false);
  readonly selectedMonth = signal(this.currentMonth);
  readonly canGoToNextMonth = computed(() => this.selectedMonth() < this.currentMonth);
  readonly monthLabel = computed(() => {
    const [year, month] = this.selectedMonth().split('-').map(Number);
    return new Intl.DateTimeFormat(this.activeLanguage() === 'si' ? 'sl' : 'en', {
      month: 'long',
      year: 'numeric',
    }).format(new Date(year, month - 1, 1));
  });
  readonly selectedNames = computed(() =>
    this.friendsStore
      .friends()
      .filter((friend) => this.selectedFriendIds().includes(friend.id))
      .map((friend) => friend.name)
      .join(', '),
  );

  constructor() {
    void this.loadFriends();
  }

  @HostListener('document:click', ['$event.target'])
  closeSelectOnOutsideClick(target: EventTarget | null): void {
    const element = target as HTMLElement | null;
    if (!element?.closest('.friend-select')) this.selectOpen.set(false);
  }

  async toggleFriend(friendId: string, selected: boolean): Promise<void> {
    this.selectedFriendIds.update((ids) =>
      selected ? [...ids, friendId] : ids.filter((id) => id !== friendId),
    );
    await this.loadComparison();
  }

  async changeMonth(offset: number): Promise<void> {
    const [year, month] = this.selectedMonth().split('-').map(Number);
    const target = new Date(year, month - 1 + offset, 1);
    const monthKey = toMonthKey(target.getFullYear(), target.getMonth());
    if (monthKey > this.currentMonth) return;
    this.selectedMonth.set(monthKey);
    await this.loadComparison();
  }

  private async loadFriends(): Promise<void> {
    try {
      await this.friendsStore.loadHeaderData();
    } finally {
      this.friendsLoading.set(false);
    }
  }

  private async loadComparison(): Promise<void> {
    if (!this.selectedFriendIds().length) {
      this.comparison.set([]);
      return;
    }
    this.loading.set(true);
    this.loadFailed.set(false);
    try {
      this.comparison.set(
        await this.api.loadFriendComparison(this.selectedFriendIds(), this.selectedMonth()),
      );
    } catch (error) {
      this.logger.error('Loading friend comparison failed', error);
      this.loadFailed.set(true);
    } finally {
      this.loading.set(false);
    }
  }
}
