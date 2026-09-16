import { Component, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';
import { MockHikeStore } from './core/stores/mock-hike.store';
import { LiveActivityStore } from './core/stores/live-activity.store';
import { AuthService } from './core/auth/auth.service';
import { AppFooterComponent } from './shared/ui/app-footer/app-footer.component';

@Component({
  imports: [RouterOutlet, TranslocoPipe, AppFooterComponent],
  selector: 'app-root',
  styleUrl: './app.css',
  templateUrl: './app.html',
})
export class App {
  readonly auth = inject(AuthService);
  private readonly transloco = inject(TranslocoService);
  readonly store = inject(MockHikeStore);
  readonly liveActivity = inject(LiveActivityStore);

  constructor() {
    const savedLanguage = localStorage.getItem('language');
    const browserLanguage = navigator.language.toLowerCase().startsWith('sl') ? 'si' : 'en';
    const language =
      savedLanguage === 'si' || savedLanguage === 'en' ? savedLanguage : browserLanguage;
    this.transloco.setActiveLang(language);
    localStorage.setItem('language', language);
  }
}
