import { TestBed } from '@angular/core/testing';
import { describe, expect, it } from 'vitest';
import { ActivityTypeIconComponent } from './activity-type-icon.component';

describe('ActivityTypeIconComponent', () => {
  it('renders the configured activity icon and size', () => {
    TestBed.configureTestingModule({ imports: [ActivityTypeIconComponent] });
    const fixture = TestBed.createComponent(ActivityTypeIconComponent);
    fixture.componentRef.setInput('type', 'cycling');
    fixture.componentRef.setInput('size', 'large');
    fixture.detectChanges();

    const icon = fixture.nativeElement.querySelector('.activity-icon');
    expect(icon.classList.contains('cycling')).toBe(true);
    expect(icon.classList.contains('large')).toBe(true);
    expect(icon.querySelector('svg')).not.toBeNull();
  });
});
