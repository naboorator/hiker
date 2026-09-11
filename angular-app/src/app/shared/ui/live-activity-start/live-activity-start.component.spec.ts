import { TestBed } from '@angular/core/testing';
import { describe, expect, it, vi } from 'vitest';
import { LiveActivityStartComponent } from './live-activity-start.component';

describe('LiveActivityStartComponent', () => {
  it('initializes and emits the chosen activity type', () => {
    TestBed.configureTestingModule({ imports: [LiveActivityStartComponent] });
    TestBed.overrideComponent(LiveActivityStartComponent, { set: { template: '' } });
    const fixture = TestBed.createComponent(LiveActivityStartComponent);
    fixture.componentRef.setInput('defaultActivityType', 'fitness');
    fixture.detectChanges();
    expect(fixture.componentInstance.activityType()).toBe('fitness');
    const started = vi.fn();
    fixture.componentInstance.started.subscribe(started);
    fixture.componentInstance.started.emit(fixture.componentInstance.activityType());
    expect(started).toHaveBeenCalledWith('fitness');
  });
});
