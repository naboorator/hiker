import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { TranslocoPipe } from '@jsverse/transloco';
import { MockHikeStore } from '../../core/stores/mock-hike.store';

@Component({
  imports: [TranslocoPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './service-unavailable.page.html',
  styleUrl: './service-unavailable.page.css',
})
export class ServiceUnavailablePage {
  private readonly store = inject(MockHikeStore);
  private readonly router = inject(Router);
  readonly checking = signal(false);

  async retry(): Promise<void> {
    this.checking.set(true);
    try {
      if (await this.store.load()) await this.router.navigate(['/']);
    } finally {
      this.checking.set(false);
    }
  }
}
