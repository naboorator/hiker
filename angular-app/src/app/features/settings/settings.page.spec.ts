import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { TranslocoService, TranslocoTestingModule } from '@jsverse/transloco';
import { describe, expect, it } from 'vitest';
import { HikeApiService } from '../../core/api/hike-api.service';
import { MockHikeStore } from '../../core/stores/mock-hike.store';
import { SettingsPage } from './settings.page';

describe('SettingsPage language selection', () => {
  it('changes the application language and stores the selection', async () => {
    await TestBed.configureTestingModule({
      imports: [
        SettingsPage,
        TranslocoTestingModule.forRoot({
          langs: { en: {}, si: {} },
          translocoConfig: { availableLangs: ['en', 'si'], defaultLang: 'en' },
        }),
      ],
      providers: [
        {
          provide: MockHikeStore,
          useValue: { settings: signal({ appName: 'My Hike', ownerName: 'Zoran' }) },
        },
        { provide: HikeApiService, useValue: {} },
      ],
    })
      .overrideComponent(SettingsPage, {
        set: {
          template:
            '<app-language-switcher [language]="activeLanguage()" (languageChange)="changeLanguage($event)" />',
        },
      })
      .compileComponents();
    const previous = localStorage.getItem('language');
    try {
      const fixture = TestBed.createComponent(SettingsPage);
      fixture.detectChanges();
      fixture.nativeElement.querySelector('app-language-switcher button').click();
      fixture.detectChanges();
      expect(TestBed.inject(TranslocoService).getActiveLang()).toBe('si');
      expect(fixture.componentInstance.activeLanguage()).toBe('si');
      expect(localStorage.getItem('language')).toBe('si');
    } finally {
      if (previous === null) localStorage.removeItem('language');
      else localStorage.setItem('language', previous);
    }
  });
});
