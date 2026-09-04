import { ChangeDetectionStrategy, Component, effect, inject, signal } from '@angular/core';
import { FormField, form, required } from '@angular/forms/signals';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';
import type { AppSettings } from '../../core/interface/app-settings.interface';
import { MockHikeStore } from '../../core/stores/mock-hike.store';
import { AppHeaderComponent } from '../../shared/ui/app-header/app-header.component';
import { ModalDialogComponent } from '../../shared/ui/modal-dialog/modal-dialog.component';
@Component({
  imports: [AppHeaderComponent, FormField, ModalDialogComponent, TranslocoPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './settings.page.html',
  styleUrl: './settings.page.css',
})
export class SettingsPage {
  readonly store = inject(MockHikeStore);
  private readonly transloco = inject(TranslocoService);
  readonly model = signal<AppSettings>({ ...this.store.settings() });
  readonly settingsForm = form(this.model, (schema) => {
    required(schema.appName);
    required(schema.ownerName);
  });
  readonly saved = signal(false);

  constructor() {
    effect(() => this.model.set({ ...this.store.settings() }));
  }

  async save(event: SubmitEvent): Promise<void> {
    event.preventDefault();
    await this.store.saveSettings(this.model());
    this.saved.set(true);
  }

  readonly importStatus = signal('');
  readonly confirmClear = signal(false);
  async download(): Promise<void> {
    const blob = new Blob([await this.store.exportHikes()], { type: 'application/json' }),
      url = URL.createObjectURL(blob),
      link = document.createElement('a');
    link.href = url;
    link.download = 'hike-log-backup-' + new Date().toISOString().slice(0, 10) + '.json';
    link.click();
    URL.revokeObjectURL(url);
  }
  async import(event: Event): Promise<void> {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file) return;
    try {
      this.importStatus.set(this.transloco.translate('settings.importing'));
      const result = await this.store.importHikes(file);
      this.importStatus.set(
        this.transloco.translate(
          result.skipped ? 'settings.importSuccessWithSkipped' : 'settings.importSuccess',
          result,
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
