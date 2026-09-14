import { TestBed } from '@angular/core/testing';
import { TranslocoService } from '@jsverse/transloco';
import { describe, expect, it } from 'vitest';
import { ActivityMonthListComponent } from '../activity-month-list/activity-month-list.component';
import { ActivityMonthListAdminComponent } from './activity-month-list-admin.component';

describe('ActivityMonthListAdminComponent', () => {
  it('inherits the shared month inputs and formatting behavior', () => {
    TestBed.configureTestingModule({
      imports: [ActivityMonthListAdminComponent],
      providers: [
        {
          provide: TranslocoService,
          useValue: { translate: (key: string) => key },
        },
      ],
    });
    TestBed.overrideComponent(ActivityMonthListAdminComponent, { set: { template: '' } });
    const fixture = TestBed.createComponent(ActivityMonthListAdminComponent);
    fixture.componentRef.setInput('title', 'September 2026');
    fixture.componentRef.setInput('days', []);
    fixture.componentRef.setInput('minutes', 90);
    fixture.componentRef.setInput('metres', 1500);
    fixture.detectChanges();

    expect(fixture.componentInstance).toBeInstanceOf(ActivityMonthListComponent);
    expect(fixture.componentInstance.title()).toBe('September 2026');
    expect(fixture.componentInstance.format(90)).toContain('1.5');
    expect(fixture.componentInstance.distance(1500)).toContain('1.5');
  });
});
