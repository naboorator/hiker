import { Component, inject, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';
import { MockHikeStore } from './core/stores/mock-hike.store';

@Component({
  imports: [RouterOutlet, TranslocoPipe],
  selector: 'app-root',
  styleUrl: './app.css',
  templateUrl: './app.html',
})
export class App {
  private readonly transloco = inject(TranslocoService);
  readonly store = inject(MockHikeStore);
  readonly activeLanguage = signal<'si' | 'en'>('en');

  constructor() {
    const savedLanguage = localStorage.getItem('language');
    const browserLanguage = navigator.language.toLowerCase().startsWith('sl') ? 'si' : 'en';
    const language =
      savedLanguage === 'si' || savedLanguage === 'en' ? savedLanguage : browserLanguage;
    this.changeLanguage(language);
  }

  changeLanguage(language: 'si' | 'en'): void {
    this.transloco.setActiveLang(language);
    this.activeLanguage.set(language);
    localStorage.setItem('language', language);
  }
}
