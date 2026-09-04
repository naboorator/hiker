import { ChangeDetectionStrategy, Component, inject, output, signal } from '@angular/core';
import { FormField, form, max, min, required } from '@angular/forms/signals';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';
import { MockHikeStore } from '../../../core/stores/mock-hike.store';

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
    const { weightKg, recordedOn } = this.model();
    if (weightKg === null || !recordedOn || weightKg < 20 || weightKg > 500) return;
    await this.store.addWeight(weightKg, recordedOn);
    this.model.set({ weightKg: null, recordedOn });
    this.saved.set(true);
    this.measurementSaved.emit();
  }

  formatDatePart(value: string, part: 'day' | 'month' | 'year'): string {
    const locale = this.transloco.getActiveLang() === 'si' ? 'sl' : 'en';
    const options: Intl.DateTimeFormatOptions =
      part === 'day'
        ? { day: 'numeric' }
        : part === 'month'
          ? { month: 'short' }
          : { year: 'numeric' };
    return new Intl.DateTimeFormat(locale, options).format(new Date(`${value}T12:00:00`));
  }
}
