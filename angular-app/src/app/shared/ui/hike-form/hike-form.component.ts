import type { OnInit } from '@angular/core';
import { ChangeDetectionStrategy, Component, input, output, signal } from '@angular/core';
import { FormField, form, required } from '@angular/forms/signals';
import { TranslocoPipe } from '@jsverse/transloco';
import type { ActivityType } from '../../../core/interface/activity-type.type';
import type { HikeDraft } from '../../../core/interface/hike-draft.interface';
import { PeopleSelectComponent } from '../people-select/people-select.component';
@Component({
  selector: 'app-hike-form',
  imports: [FormField, TranslocoPipe, PeopleSelectComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './hike-form.component.html',
  styleUrl: './hike-form.component.css',
})
export class HikeFormComponent implements OnInit {
  readonly ownerName = input.required<string>();
  readonly hikeNames = input<readonly string[]>([]);
  readonly defaultHikingName = input('');
  readonly peopleSuggestions = input<readonly string[]>([]);
  readonly defaultActivityType = input<ActivityType>('hiking');
  readonly draft = input<HikeDraft | null>(null);
  readonly buttonText = input('Add activity');
  readonly saved = output<HikeDraft>();
  readonly cancelled = output<void>();
  readonly model = signal<HikeDraft>({
    activityType: 'hiking',
    name: '',
    date: new Date().toISOString().slice(0, 10),
    minutes: null,
    metres: null,
    people: [],
  });
  readonly hikeForm = form(this.model, (s) => {
    required(s.name);
    required(s.date);
  });
  readonly sortedNames = () => [...new Set(this.hikeNames())].sort((a, b) => a.localeCompare(b));
  ngOnInit() {
    const d = this.draft();
    this.model.set(
      d
        ? { ...d, name: d.activityType === 'fitness' ? 'Fitness' : d.name, people: [...d.people] }
        : {
            ...this.model(),
            activityType: this.defaultActivityType(),
            name:
              this.defaultActivityType() === 'fitness'
                ? 'Fitness'
                : this.defaultHikingName() || this.hikeNames()[0] || '',
            people: [this.ownerName()],
          },
    );
  }
  setPeople(people: string[]): void {
    this.model.update((draft) => ({ ...draft, people }));
  }
  selectActivityType(activityType: string): void {
    if (activityType !== 'hiking' && activityType !== 'fitness') return;
    this.model.update((draft) => ({
      ...draft,
      activityType: activityType as ActivityType,
      name:
        activityType === 'fitness'
          ? 'Fitness'
          : draft.name === 'Fitness'
            ? this.defaultHikingName() || this.hikeNames().find((name) => name !== 'Fitness') || ''
            : draft.name,
      metres: activityType === 'fitness' ? null : draft.metres,
    }));
  }
  submit(e: SubmitEvent) {
    e.preventDefault();
    if (this.model().people.length) {
      const draft = this.model();
      this.saved.emit({
        ...draft,
        name: draft.activityType === 'fitness' ? 'Fitness' : draft.name,
        metres: draft.activityType === 'fitness' ? null : draft.metres,
      });
    }
  }
}
