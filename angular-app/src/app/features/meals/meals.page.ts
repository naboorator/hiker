import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';
import { AppHeaderComponent } from '../../shared/ui/app-header/app-header.component';
import { MockHikeStore } from '../../core/stores/mock-hike.store';
@Component({
  imports: [AppHeaderComponent, TranslocoPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './meals.page.html',
  styleUrl: './meals.page.css',
})
export class MealsPage {
  readonly store = inject(MockHikeStore);
}
