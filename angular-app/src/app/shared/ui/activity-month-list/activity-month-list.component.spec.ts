import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { TranslocoTestingModule } from '@jsverse/transloco';
import { describe, expect, it } from 'vitest';
import { ActivityMonthListComponent } from './activity-month-list.component';

describe('ActivityMonthListComponent', () => {
  it('shows the GPS route icon only for activities with stored locations', async () => {
    await TestBed.configureTestingModule({
      imports: [
        ActivityMonthListComponent,
        TranslocoTestingModule.forRoot({
          langs: {
            en: {
              common: { minuteShort: 'min', metreShort: 'm', kilometreShort: 'km' },
              activityMonthList: {
                activityCount: '{{ count }} activities',
                empty: 'No activities recorded.',
                gpsTracked: 'GPS route recorded',
              },
            },
          },
          translocoConfig: { availableLangs: ['en'], defaultLang: 'en' },
        }),
      ],
      providers: [provideRouter([])],
    }).compileComponents();
    const fixture = TestBed.createComponent(ActivityMonthListComponent);
    fixture.componentRef.setInput('title', 'September');
    fixture.componentRef.setInput('minutes', 30);
    fixture.componentRef.setInput('metres', 500);
    fixture.componentRef.setInput('detailsEnabled', true);
    fixture.componentRef.setInput('days', [
      {
        date: '2026-09-17',
        day: '17',
        month: 'Sep',
        minutes: 30,
        metres: 500,
        hikes: [
          {
            id: 'gps-activity',
            activityType: 'hiking',
            name: 'Tracked hike',
            date: '2026-09-17',
            minutes: 30,
            metres: 500,
            people: [],
            createdAt: 1,
            hasGpsLocations: true,
          },
          {
            id: 'manual-activity',
            activityType: 'hiking',
            name: 'Manual hike',
            date: '2026-09-17',
            minutes: 30,
            metres: 500,
            people: [],
            createdAt: 2,
            hasGpsLocations: false,
          },
        ],
      },
    ]);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    const icons = fixture.nativeElement.querySelectorAll('.gps-route');
    expect(icons).toHaveLength(1);
    expect(icons[0].getAttribute('aria-label')).toBe('GPS route recorded');
    expect(fixture.nativeElement.querySelector('.activity-link').getAttribute('href')).toBe(
      '/activities/gps-activity',
    );
  });
});
