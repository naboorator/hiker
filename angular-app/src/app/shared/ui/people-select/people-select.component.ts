import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  HostListener,
  computed,
  inject,
  input,
  output,
  viewChild,
} from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';

@Component({
  selector: 'app-people-select',
  imports: [TranslocoPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './people-select.component.html',
  styleUrl: './people-select.component.css',
})
export class PeopleSelectComponent {
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly menu = viewChild<ElementRef<HTMLDetailsElement>>('menu');
  readonly ownerName = input.required<string>();
  readonly suggestions = input<readonly string[]>([]);
  readonly selectedPeople = input.required<readonly string[]>();
  readonly selectionChange = output<string[]>();

  readonly options = computed(() => {
    const names = [this.ownerName(), ...this.suggestions()]
      .map((name) => name.trim())
      .filter(Boolean);
    return names.filter(
      (name, index) =>
        names.findIndex(
          (candidate) => candidate.toLocaleLowerCase() === name.toLocaleLowerCase(),
        ) === index,
    );
  });

  isSelected(name: string): boolean {
    return this.selectedPeople().some(
      (selected) => selected.toLocaleLowerCase() === name.toLocaleLowerCase(),
    );
  }

  toggle(name: string): void {
    const selected = this.selectedPeople();
    this.selectionChange.emit(
      this.isSelected(name)
        ? selected.filter((person) => person.toLocaleLowerCase() !== name.toLocaleLowerCase())
        : [...selected, name],
    );
  }

  @HostListener('document:click', ['$event'])
  closeOnOutsideClick(event: MouseEvent): void {
    if (!this.host.nativeElement.contains(event.target as Node))
      this.menu()?.nativeElement.removeAttribute('open');
  }
}
