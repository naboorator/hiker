import { TestBed } from '@angular/core/testing';
import { TranslocoTestingModule } from '@jsverse/transloco';
import { describe, expect, it } from 'vitest';
import { LanguageSwitcherComponent } from './language-switcher.component';

describe('LanguageSwitcherComponent', () => {
  it('reflects the supplied language and emits changes without changing its input', async () => {
    await TestBed.configureTestingModule({
      imports: [
        LanguageSwitcherComponent,
        TranslocoTestingModule.forRoot({
          langs: { en: { common: { slovenian: 'Slovenščina', english: 'English' } } },
          translocoConfig: { availableLangs: ['en'], defaultLang: 'en' },
        }),
      ],
    }).compileComponents();
    const fixture = TestBed.createComponent(LanguageSwitcherComponent);
    fixture.componentRef.setInput('language', 'si');
    fixture.detectChanges();
    const buttons = fixture.nativeElement.querySelectorAll('button');
    expect(buttons[0].textContent).toContain('🇸🇮');
    expect(buttons[0].textContent).toContain('Slovenščina');
    expect(buttons[1].textContent).toContain('🇬🇧');
    expect(buttons[1].textContent).toContain('English');
    expect(buttons[0].getAttribute('aria-pressed')).toBe('true');
    expect(buttons[1].getAttribute('aria-pressed')).toBe('false');
    const emitted: string[] = [];
    fixture.componentInstance.languageChange.subscribe((language) => emitted.push(language));
    buttons[1].click();
    buttons[0].click();
    expect(emitted).toEqual(['en', 'si']);
    expect(fixture.componentInstance.language()).toBe('si');
    fixture.componentRef.setInput('language', 'en');
    fixture.detectChanges();
    expect(buttons[1].getAttribute('aria-pressed')).toBe('true');
  });
});
