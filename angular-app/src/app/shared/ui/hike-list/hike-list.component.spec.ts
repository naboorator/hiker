import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { TranslocoTestingModule } from '@jsverse/transloco';
import { describe, expect, it } from 'vitest';
import { HikeListComponent } from './hike-list.component';

describe('HikeListComponent', () => {
  it('links an activity name to its detail page', async () => {
    await TestBed.configureTestingModule({
      imports: [
        HikeListComponent,
        TranslocoTestingModule.forRoot({
          langs: { en: { common: { minuteShort: 'min', metreShort: 'm', delete: 'Delete' } } },
          translocoConfig: { availableLangs: ['en'], defaultLang: 'en' },
        }),
      ],
      providers: [provideRouter([])],
    }).compileComponents();
    const fixture = TestBed.createComponent(HikeListComponent);
    fixture.componentRef.setInput('hikes', [
      {
        id: 'activity-1',
        activityType: 'hiking',
        name: 'Forest trail',
        date: '2026-09-17',
        minutes: 45,
        metres: 3200,
        people: [],
        createdAt: 1,
      },
    ]);
    fixture.detectChanges();
    await fixture.whenStable();

    expect(fixture.nativeElement.querySelector('a').getAttribute('href')).toBe(
      '/activities/activity-1',
    );
  });
});
