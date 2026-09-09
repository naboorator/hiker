import { ChangeDetectionStrategy, Component, inject, output, signal } from '@angular/core';
import { FormField, form, max, min, required } from '@angular/forms/signals';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';
import { MockHikeStore } from '../../../core/stores/mock-hike.store';
import { formatDatePart, type DatePart } from '../../../core/utils/date-format.helpers';

@Component({
  selector: 'app-my-weight',
  imports: [FormField, TranslocoPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './my-weight.component.html',
  styleUrl: './my-weight.component.css',
})
export class MyWeightComponent {
  readonly measurementSaved = output<void>();
  private readonly transloco = inject(TranslocoService);
  readonly store = inject(MockHikeStore);
  readonly model = signal({
    weightKg: null as number | null,
    recordedOn: new Date().toISOString().slice(0, 10),
  });
  readonly weightForm = form(this.model, (schema) => {
    required(schema.weightKg);
    min(schema.weightKg, 20);
    max(schema.weightKg, 500);
    required(schema.recordedOn);
  });
  readonly saved = signal(false);

  async save(event: SubmitEvent): Promise<void> {
    event.preventDefault();
    this.weightForm().markAsTouched();
    const { weightKg, recordedOn } = this.model();
    if (weightKg === null || !recordedOn || weightKg < 20 || weightKg > 500) return;
    await this.store.addWeight(weightKg, recordedOn);
    this.model.set({ weightKg: null, recordedOn });
    this.saved.set(true);
    this.measurementSaved.emit();
  }

  formatDatePart(value: string, part: DatePart): string {
    return formatDatePart(value, part, this.transloco.getActiveLang());
  }
}
