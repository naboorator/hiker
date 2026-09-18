import type { OnInit } from '@angular/core';
import { ChangeDetectionStrategy, Component, computed, input, output, signal } from '@angular/core';
import { FormField, form, min, required } from '@angular/forms/signals';
import { TranslocoPipe } from '@jsverse/transloco';
import type { ActivityType } from '../../../core/interface/activity-type.type';
import type { HikeDraft } from '../../../core/interface/hike-draft.interface';
import { activityTypeOption } from '../../../core/utils/activity-type.helpers';
import { ActivityTypeSelectComponent } from '../activity-type-select/activity-type-select.component';
import { PeopleSelectComponent } from '../people-select/people-select.component';
@Component({
  selector: 'app-hike-form',
  imports: [FormField, TranslocoPipe, PeopleSelectComponent, ActivityTypeSelectComponent],
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
  readonly submitting = input(false);
  readonly preserveHiddenMetres = input(false);
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
    required(s.minutes);
    min(s.minutes, 1);
    min(s.metres, 0);
  });
  readonly sortedNames = () => [...new Set(this.hikeNames())].sort((a, b) => a.localeCompare(b));
  readonly showsDistanceField = computed(
    () => activityTypeOption(this.model().activityType).hasDistance,
  );
  ngOnInit() {
    const d = this.draft();
    this.model.set(
      d
        ? {
            ...d,
            name: activityTypeOption(d.activityType).defaultName || d.name,
            people: [...d.people],
          }
        : {
            ...this.model(),
            activityType: this.defaultActivityType(),
            name:
              activityTypeOption(this.defaultActivityType()).defaultName ||
              this.defaultHikingName() ||
              this.hikeNames()[0] ||
              '',
            people: [this.ownerName()],
          },
    );
  }
  setPeople(people: string[]): void {
    this.model.update((draft) => ({ ...draft, people }));
  }
  selectActivityType(activityType: ActivityType): void {
    this.model.update((draft) => ({
      ...draft,
      activityType,
      name:
        activityTypeOption(activityType).defaultName ||
        (activityTypeOption(draft.activityType).hasCustomName
          ? draft.name
          : this.defaultHikingName() || this.hikeNames()[0] || ''),
      metres:
        activityTypeOption(activityType).hasDistance || this.preserveHiddenMetres()
          ? draft.metres
          : null,
    }));
  }
  submit(e: SubmitEvent) {
    e.preventDefault();
    this.hikeForm().markAsTouched();
    if (!this.submitting() && this.hikeForm().valid() && this.model().people.length) {
      const draft = this.model();
      this.saved.emit({
        ...draft,
        name: activityTypeOption(draft.activityType).defaultName || draft.name,
        metres:
          activityTypeOption(draft.activityType).hasDistance || this.preserveHiddenMetres()
            ? draft.metres
            : null,
      });
    }
  }
}
