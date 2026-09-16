import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { TranslocoPipe } from '@jsverse/transloco';

@Component({
  selector: 'app-footer',
  imports: [RouterLink, RouterLinkActive, TranslocoPipe],
  templateUrl: './app-footer.component.html',
  styleUrl: './app-footer.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AppFooterComponent {
  readonly showNavigation = input(false);
}
