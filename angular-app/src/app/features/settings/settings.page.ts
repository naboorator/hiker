import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  signal,
} from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormField, form, minLength, required } from '@angular/forms/signals';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';
import type { AppSettings } from '../../core/interface/app-settings.interface';
import { MockHikeStore } from '../../core/stores/mock-hike.store';
import { AppHeaderComponent } from '../../shared/ui/app-header/app-header.component';
import { ModalDialogComponent } from '../../shared/ui/modal-dialog/modal-dialog.component';
import type { ChangePasswordDraft } from '../../core/interface/change-password-draft.interface';
import { HikeApiService } from '../../core/api/hike-api.service';
import { passwordErrorTranslation } from './settings.helpers';
import { LanguageSwitcherComponent } from '../../shared/ui/language-switcher/language-switcher.component';
@Component({
  imports: [
    AppHeaderComponent,
    FormField,
    ModalDialogComponent,
    TranslocoPipe,
    LanguageSwitcherComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './settings.page.html',
  styleUrl: './settings.page.css',
})
export class SettingsPage {
  readonly store = inject(MockHikeStore);
  private readonly transloco = inject(TranslocoService);
  private readonly language = toSignal(this.transloco.langChanges$, {
    initialValue: this.transloco.getActiveLang(),
  });
  readonly activeLanguage = computed(() => (this.language() === 'si' ? 'si' : 'en'));
  private readonly api = inject(HikeApiService);
  readonly model = signal<AppSettings>({ ...this.store.settings() });
  readonly settingsForm = form(this.model, (schema) => {
    required(schema.appName);
    required(schema.ownerName);
  });
  readonly saved = signal(false);
  readonly passwordModel = signal<ChangePasswordDraft>({
    currentPassword: '',
    newPassword: '',
    repeatPassword: '',
  });
  readonly passwordForm = form(this.passwordModel, (schema) => {
    required(schema.currentPassword);
    required(schema.newPassword);
    minLength(schema.newPassword, 8);
    required(schema.repeatPassword);
  });
  readonly passwordStatus = signal('');
  readonly passwordError = signal('');
  readonly changingPassword = signal(false);

  constructor() {
    effect(() => this.model.set({ ...this.store.settings() }));
  }

  changeLanguage(language: 'si' | 'en'): void {
    this.transloco.setActiveLang(language);
    localStorage.setItem('language', language);
  }

  async save(event: SubmitEvent): Promise<void> {
    event.preventDefault();
    this.settingsForm().markAsTouched();
    if (this.settingsForm().invalid()) return;
    await this.store.saveSettings(this.model());
    this.saved.set(true);
  }

  async changePassword(event: SubmitEvent): Promise<void> {
    event.preventDefault();
    this.passwordForm().markAsTouched();
    this.passwordStatus.set('');
    this.passwordError.set('');
    const draft = this.passwordModel();
    if (draft.newPassword.length < 8) {
      this.passwordError.set('settings.passwordLength');
      return;
    }
    if (draft.newPassword !== draft.repeatPassword) {
      this.passwordError.set('settings.passwordMismatch');
      return;
    }
    if (draft.currentPassword === draft.newPassword) {
      this.passwordError.set('settings.passwordMustDiffer');
      return;
    }
    this.changingPassword.set(true);
    try {
      await this.api.changePassword(draft);
      this.passwordModel.set({ currentPassword: '', newPassword: '', repeatPassword: '' });
      this.passwordStatus.set('settings.passwordChanged');
    } catch (error) {
      this.passwordError.set(passwordErrorTranslation(error));
    } finally {
      this.changingPassword.set(false);
    }
  }

  readonly importStatus = signal('');
  readonly confirmClear = signal(false);
  async download(): Promise<void> {
    const blob = new Blob([await this.store.exportData()], { type: 'application/json' }),
      url = URL.createObjectURL(blob),
      link = document.createElement('a');
    link.href = url;
    link.download = 'my-hike-backup-' + new Date().toISOString().slice(0, 10) + '.json';
    link.click();
    URL.revokeObjectURL(url);
  }
  async import(event: Event): Promise<void> {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file) return;
    try {
      this.importStatus.set(this.transloco.translate('settings.importing'));
      const result = await this.store.importData(file);
      const skipped = result.skippedActivities + result.skippedWeights;
      this.importStatus.set(
        this.transloco.translate(
          skipped ? 'settings.importSuccessWithSkipped' : 'settings.importSuccess',
          { ...result, skipped },
        ),
      );
    } catch {
      this.importStatus.set(this.transloco.translate('settings.importError'));
    }
  }
  async clear(): Promise<void> {
    await this.download();
    await this.store.clearHikes();
    this.confirmClear.set(false);
    this.importStatus.set(this.transloco.translate('settings.clearSuccess'));
  }
}
