import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormField, email, form, required } from '@angular/forms/signals';
import { TranslocoPipe } from '@jsverse/transloco';
import { FriendsStore } from '../../core/stores/friends.store';
import { MockHikeStore } from '../../core/stores/mock-hike.store';
import { AppHeaderComponent } from '../../shared/ui/app-header/app-header.component';
import { ModalDialogComponent } from '../../shared/ui/modal-dialog/modal-dialog.component';
import type { Friend } from '../../core/interface/friend.interface';

@Component({
  imports: [AppHeaderComponent, FormField, ModalDialogComponent, TranslocoPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './friends.page.html',
  styleUrl: './friends.page.css',
})
export class FriendsPage {
  readonly hikeStore = inject(MockHikeStore);
  readonly store = inject(FriendsStore);
  readonly model = signal({ email: '' });
  readonly friendForm = form(this.model, (schema) => {
    required(schema.email);
    email(schema.email);
  });
  readonly adding = signal(false);
  readonly pendingFriendRemoval = signal<Friend | null>(null);

  constructor() {
    void this.store.load();
  }

  async connect(event: SubmitEvent): Promise<void> {
    event.preventDefault();
    if (this.friendForm.email().invalid()) return;
    this.adding.set(true);
    try {
      if (await this.store.addFriend(this.model().email)) this.model.set({ email: '' });
    } finally {
      this.adding.set(false);
    }
  }

  async confirmFriendRemoval(): Promise<void> {
    const friend = this.pendingFriendRemoval();
    if (!friend) return;
    await this.store.removeFriend(friend.id);
    this.pendingFriendRemoval.set(null);
  }
}
