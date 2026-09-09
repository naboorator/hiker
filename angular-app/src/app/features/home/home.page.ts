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
import { HikeFormComponent } from '../../shared/ui/hike-form/hike-form.component';
import { HikeListComponent } from '../../shared/ui/hike-list/hike-list.component';
import { ActivityMonthListComponent } from '../../shared/ui/activity-month-list/activity-month-list.component';
import { MyWeightComponent } from '../../shared/ui/my-weight/my-weight.component';
import { ModalDialogComponent } from '../../shared/ui/modal-dialog/modal-dialog.component';
import type { HikeDraft } from '../../core/interface/hike-draft.interface';
import { MockHikeStore } from '../../core/stores/mock-hike.store';
import { ARNOLD_SCHWARZENEGGER_QUOTES } from '../../core/constants/arnold-quotes.constant';
import { groupCurrentMonthActivities, randomItem } from './home.helpers';
@Component({
  imports: [
    AppHeaderComponent,
    HikeFormComponent,
    HikeListComponent,
    ActivityMonthListComponent,
    MyWeightComponent,
    ModalDialogComponent,
    TranslocoPipe,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './home.page.html',
  styleUrl: './home.page.css',
})
export class HomePage {
  readonly store = inject(MockHikeStore);
  private readonly transloco = inject(TranslocoService);
  private readonly activeLanguage = toSignal(this.transloco.langChanges$, {
    initialValue: this.transloco.getActiveLang(),
  });
  readonly formOpen = signal(false);
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
  async save(d: HikeDraft) {
    await this.store.addMockHike(d);
    this.formOpen.set(false);
  }
}
