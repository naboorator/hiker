import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';
import { RouterLink } from '@angular/router';
import type { Hike } from '../../../core/interface/hike.interface';
@Component({
  selector: 'app-hike-list',
  imports: [RouterLink, TranslocoPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './hike-list.component.html',
  styleUrl: './hike-list.component.css',
})
export class HikeListComponent {
  readonly hikes = input.required<readonly Hike[]>();
  readonly remove = output<string>();
}
