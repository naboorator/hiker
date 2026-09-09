import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  computed,
  inject,
  signal,
} from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';
import { AppHeaderComponent } from '../../shared/ui/app-header/app-header.component';
import type { HikeDraft } from '../../core/interface/hike-draft.interface';
import type { Hike } from '../../core/interface/hike.interface';
import { groupActivitiesByMonth } from '../../core/utils/group-activities-by-month';
import { ActivityMonthListComponent } from '../../shared/ui/activity-month-list/activity-month-list.component';
import { HikeFormComponent } from '../../shared/ui/hike-form/hike-form.component';
import { ModalDialogComponent } from '../../shared/ui/modal-dialog/modal-dialog.component';
import { MockHikeStore } from '../../core/stores/mock-hike.store';
import { toHikeDraft } from '../../core/utils/activity.helpers';
@Component({
  imports: [
    AppHeaderComponent,
    ActivityMonthListComponent,
    HikeFormComponent,
    ModalDialogComponent,
    TranslocoPipe,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './activities.page.html',
  styleUrl: './activities.page.css',
})
export class ActivitiesPage {
  readonly store = inject(MockHikeStore);
  private readonly transloco = inject(TranslocoService);
  private readonly activeLanguage = toSignal(this.transloco.langChanges$, {
    initialValue: this.transloco.getActiveLang(),
  });
  readonly selected = signal<Hike | null>(null);
  readonly adding = signal(false);
  readonly pendingDelete = signal<string | null>(null);
  readonly names = computed(() => [...new Set(this.store.hikes().map((x) => x.name))]);
  readonly months = computed(() =>
    groupActivitiesByMonth(this.store.hikes(), this.activeLanguage()),
  );

  constructor() {
    void this.store.refreshHikes();
    const refreshInterval = window.setInterval(() => void this.store.refreshHikes(), 5000);
    inject(DestroyRef).onDestroy(() => window.clearInterval(refreshInterval));
  }
  draft(h: Hike): HikeDraft {
    return toHikeDraft(h);
  }
  async save(id: string, d: HikeDraft) {
    await this.store.updateHike(id, d);
    this.selected.set(null);
  }
  async add(draft: HikeDraft): Promise<void> {
    await this.store.addMockHike(draft);
    this.adding.set(false);
  }
  async confirmDelete() {
    const id = this.pendingDelete();
    if (id) {
      await this.store.removeMockHike(id);
      this.pendingDelete.set(null);
    }
  }
}
