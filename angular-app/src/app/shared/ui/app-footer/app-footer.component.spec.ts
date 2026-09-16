import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { TranslocoTestingModule } from '@jsverse/transloco';
import { describe, expect, it } from 'vitest';
import { AppFooterComponent } from './app-footer.component';

describe('AppFooterComponent', () => {
  async function createFooter(showNavigation: boolean) {
    await TestBed.configureTestingModule({
      imports: [
        AppFooterComponent,
        TranslocoTestingModule.forRoot({
          langs: { en: {} },
          translocoConfig: { availableLangs: ['en'], defaultLang: 'en' },
        }),
      ],
      providers: [provideRouter([])],
    }).compileComponents();
    const fixture = TestBed.createComponent(AppFooterComponent);
    fixture.componentRef.setInput('showNavigation', showNavigation);
    fixture.detectChanges();
    return fixture;
  }

  it('shows four navigation links only when enabled', async () => {
    const fixture = await createFooter(false);
    expect(fixture.nativeElement.querySelector('nav')).toBeNull();
    fixture.componentRef.setInput('showNavigation', true);
    fixture.detectChanges();
    const links = fixture.nativeElement.querySelectorAll('nav a');
    expect(
      Array.from(links).map((link) => (link as HTMLAnchorElement).getAttribute('href')),
    ).toEqual(['/', '/my-activities', '/friends', '/settings']);
    expect(fixture.nativeElement.querySelectorAll('nav svg')).toHaveLength(4);
  });

  it('does not render the language switcher in the footer', async () => {
    const fixture = await createFooter(true);
    expect(fixture.nativeElement.querySelector('button')).toBeNull();
  });
});
