import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormField, form, max, min, required } from '@angular/forms/signals';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';
import type { WeightEntry } from '../../core/interface/weight-entry.interface';
import { MockHikeStore } from '../../core/stores/mock-hike.store';
import { AppHeaderComponent } from '../../shared/ui/app-header/app-header.component';
import { ModalDialogComponent } from '../../shared/ui/modal-dialog/modal-dialog.component';
import { formatDatePart, type DatePart } from '../../core/utils/date-format.helpers';

@Component({
  imports: [AppHeaderComponent, FormField, ModalDialogComponent, TranslocoPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './my-weight.page.html',
  styleUrl: './my-weight.page.css',
})
export class MyWeightPage {
  readonly store = inject(MockHikeStore);
  private readonly transloco = inject(TranslocoService);
  readonly editing = signal<WeightEntry | null>(null);
  readonly deleting = signal<WeightEntry | null>(null);
  readonly editModel = signal({ weightKg: 0, recordedOn: '' });
  readonly editForm = form(this.editModel, (schema) => {
    required(schema.weightKg);
    min(schema.weightKg, 20);
    max(schema.weightKg, 500);
    required(schema.recordedOn);
  });

  openEdit(entry: WeightEntry): void {
    this.editModel.set({ weightKg: entry.weightKg, recordedOn: entry.recordedOn });
    this.editing.set(entry);
  }

  async saveEdit(event: SubmitEvent): Promise<void> {
    event.preventDefault();
    this.editForm().markAsTouched();
    const entry = this.editing();
    const { weightKg, recordedOn } = this.editModel();
    if (!entry || !recordedOn || weightKg < 20 || weightKg > 500) return;
    await this.store.updateWeight(entry.id, weightKg, recordedOn);
    this.editing.set(null);
  }

  async confirmDelete(): Promise<void> {
    const entry = this.deleting();
    if (!entry) return;
    await this.store.removeWeight(entry.id);
    this.deleting.set(null);
  }

  formatDatePart(value: string, part: DatePart): string {
    return formatDatePart(value, part, this.transloco.getActiveLang());
  }
}
