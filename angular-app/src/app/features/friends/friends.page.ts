import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { TranslocoPipe } from '@jsverse/transloco';
import { FriendsStore } from '../../core/stores/friends.store';
import { MockHikeStore } from '../../core/stores/mock-hike.store';
import { AppHeaderComponent } from '../../shared/ui/app-header/app-header.component';
import { ModalDialogComponent } from '../../shared/ui/modal-dialog/modal-dialog.component';
import type { Friend } from '../../core/interface/friend.interface';

@Component({
  imports: [AppHeaderComponent, ModalDialogComponent, RouterLink, TranslocoPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './friends.page.html',
  styleUrl: './friends.page.css',
})
export class FriendsPage {
  readonly hikeStore = inject(MockHikeStore);
  readonly store = inject(FriendsStore);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  readonly searchTerm = signal(this.route.snapshot.queryParamMap.get('search')?.trim() ?? '');
  readonly appliedSearch = signal(this.searchTerm());
  readonly sendingRequest = signal<string | null>(null);
  readonly pendingFriendRemoval = signal<Friend | null>(null);

  constructor() {
    void this.store.load();
    if (this.appliedSearch()) void this.store.searchUsers(this.appliedSearch());
  }

  async search(event: SubmitEvent): Promise<void> {
    event.preventDefault();
    const search = this.searchTerm().trim();
    this.searchTerm.set(search);
    this.appliedSearch.set(search);
    await this.updateSearchUrl(search);
    await this.store.searchUsers(search);
  }

  async resetSearch(): Promise<void> {
    this.searchTerm.set('');
    this.appliedSearch.set('');
    this.store.searchResults.set([]);
    await this.updateSearchUrl('');
  }

  async sendFriendRequest(id: string, email: string): Promise<void> {
    this.sendingRequest.set(id);
    try {
      await this.store.addFriend(email);
    } finally {
      this.sendingRequest.set(null);
    }
  }

  private async updateSearchUrl(search: string): Promise<void> {
    await this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { search: search || null },
      queryParamsHandling: 'merge',
    });
  }

  async confirmFriendRemoval(): Promise<void> {
    const friend = this.pendingFriendRemoval();
    if (!friend) return;
    await this.store.removeFriend(friend.id);
    this.pendingFriendRemoval.set(null);
  }
}
