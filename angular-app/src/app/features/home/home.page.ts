import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  computed,
  effect,
  inject,
  signal,
} from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';
import { AppHeaderComponent } from '../../shared/ui/app-header/app-header.component';
import { HikeFormComponent } from '../../shared/ui/hike-form/hike-form.component';
import { HikeListComponent } from '../../shared/ui/hike-list/hike-list.component';
import { ActivityMonthListComponent } from '../../shared/ui/activity-month-list/activity-month-list.component';
import { MyWeightComponent } from '../../shared/ui/my-weight/my-weight.component';
import { ModalDialogComponent } from '../../shared/ui/modal-dialog/modal-dialog.component';
import type { HikeDraft } from '../../core/interface/hike-draft.interface';
import { MockHikeStore } from '../../core/stores/mock-hike.store';
import { ARNOLD_SCHWARZENEGGER_QUOTES } from '../../core/constants/arnold-quotes.constant';
import { groupCurrentMonthActivities, randomItem } from './home.helpers';
import { LiveActivityStore } from '../../core/stores/live-activity.store';
import type { ActivityType } from '../../core/interface/activity-type.type';
import { LiveActivityStartComponent } from '../../shared/ui/live-activity-start/live-activity-start.component';
import { LiveActivityStatusComponent } from '../../shared/ui/live-activity-status/live-activity-status.component';
@Component({
  imports: [
    AppHeaderComponent,
    HikeFormComponent,
    HikeListComponent,
    ActivityMonthListComponent,
    MyWeightComponent,
    ModalDialogComponent,
    TranslocoPipe,
    LiveActivityStartComponent,
    LiveActivityStatusComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './home.page.html',
  styleUrl: './home.page.css',
})
export class HomePage {
  readonly store = inject(MockHikeStore);
  readonly liveActivity = inject(LiveActivityStore);
  private readonly transloco = inject(TranslocoService);
  private readonly activeLanguage = toSignal(this.transloco.langChanges$, {
    initialValue: this.transloco.getActiveLang(),
  });
  readonly startModalOpen = signal(false);
  readonly completionModalOpen = signal(false);
  readonly discardModalOpen = signal(false);
  readonly completionDismissed = signal(false);
  readonly completionDraft = signal<HikeDraft | null>(null);
  readonly weightModalOpen = signal(false);
  readonly loginQuote = signal(
    history.state?.['loggedIn'] === true
      ? (randomItem(ARNOLD_SCHWARZENEGGER_QUOTES) ?? null)
      : null,
  );
  readonly names = computed(() => [...new Set(this.store.hikes().map((x) => x.name))]);
  readonly month = computed(() =>
    groupCurrentMonthActivities(this.store.hikes(), this.activeLanguage()),
  );

  constructor() {
    effect(() => {
      const activity = this.liveActivity.activity();
      if (activity?.status !== 'stopped' || this.completionDismissed()) return;
      const draft = this.liveActivity.draft();
      this.completionDraft.set(
        draft ? { ...draft, people: [this.store.settings().ownerName] } : null,
      );
      this.completionModalOpen.set(Boolean(draft));
    });
    if (!this.loginQuote()) return;
    history.replaceState({ ...history.state, loggedIn: undefined }, '');
    const timeoutId = window.setTimeout(() => this.loginQuote.set(null), 5000);
    inject(DestroyRef).onDestroy(() => window.clearTimeout(timeoutId));
  }
  format(m: number) {
    return m >= 60
      ? `${(m / 60).toFixed(1)} ${this.transloco.translate('common.hourShort')}`
      : `${m} ${this.transloco.translate('common.minuteShort')}`;
  }
  start(activityType: ActivityType): void {
    if (this.liveActivity.start(activityType)) this.startModalOpen.set(false);
  }
  stop(): void {
    this.completionDismissed.set(false);
    const draft = this.liveActivity.stop();
    if (!draft) return;
    this.completionDraft.set({ ...draft, people: [this.store.settings().ownerName] });
    this.completionModalOpen.set(true);
  }
  reopenCompletion(): void {
    this.completionDismissed.set(false);
    const draft = this.liveActivity.draft();
    this.completionDraft.set(
      draft ? { ...draft, people: [this.store.settings().ownerName] } : null,
    );
    this.completionModalOpen.set(Boolean(draft));
  }
  closeCompletion(): void {
    this.completionDismissed.set(true);
    this.completionModalOpen.set(false);
  }
  async save(draft: HikeDraft): Promise<void> {
    this.liveActivity.markSaving(draft);
    try {
      await this.store.addMockHike(draft);
      this.liveActivity.completeSave();
      this.completionModalOpen.set(false);
      this.completionDraft.set(null);
    } catch {
      this.liveActivity.saveFailed();
    }
  }
  discard(): void {
    this.liveActivity.discard();
    this.discardModalOpen.set(false);
    this.completionModalOpen.set(false);
    this.completionDraft.set(null);
  }
}
