import { TestBed } from '@angular/core/testing';
import { describe, expect, it, vi } from 'vitest';
import { ActivityTypeSelectComponent } from './activity-type-select.component';

describe('ActivityTypeSelectComponent', () => {
  it('emits the selected activity type', () => {
    TestBed.configureTestingModule({ imports: [ActivityTypeSelectComponent] });
    TestBed.overrideComponent(ActivityTypeSelectComponent, { set: { template: '' } });
    const fixture = TestBed.createComponent(ActivityTypeSelectComponent);
    fixture.componentRef.setInput('value', 'hiking');
    const selected = vi.fn();
    fixture.componentInstance.valueChange.subscribe(selected);
    fixture.componentInstance.valueChange.emit('fitness');
    expect(selected).toHaveBeenCalledWith('fitness');
  });

  it('offers every configured activity type and resolves the selected option', () => {
    TestBed.configureTestingModule({ imports: [ActivityTypeSelectComponent] });
    TestBed.overrideComponent(ActivityTypeSelectComponent, { set: { template: '' } });
    const fixture = TestBed.createComponent(ActivityTypeSelectComponent);
    fixture.componentRef.setInput('value', 'badminton');
    fixture.detectChanges();
    expect(fixture.componentInstance.options).toHaveLength(8);
    expect(fixture.componentInstance.selectedOption().type).toBe('badminton');
  });
});
