import { TestBed } from '@angular/core/testing';
import { describe, expect, it, vi } from 'vitest';
import { HikeFormComponent } from './hike-form.component';

describe('HikeFormComponent', () => {
  it('keeps hiking defaults when switching back from fitness', () => {
    TestBed.configureTestingModule({ imports: [HikeFormComponent] });
    TestBed.overrideComponent(HikeFormComponent, { set: { template: '' } });
    const fixture = TestBed.createComponent(HikeFormComponent);
    fixture.componentRef.setInput('ownerName', 'Zoran');
    fixture.componentRef.setInput('defaultHikingName', 'Šmarna gora');
    fixture.detectChanges();
    fixture.componentInstance.selectActivityType('fitness');
    expect(fixture.componentInstance.model().name).toBe('Fitness');
    fixture.componentInstance.selectActivityType('hiking');
    expect(fixture.componentInstance.model().name).toBe('Šmarna gora');
  });

  it('emits a valid prefilled fitness activity without metres', () => {
    TestBed.configureTestingModule({ imports: [HikeFormComponent] });
    TestBed.overrideComponent(HikeFormComponent, { set: { template: '' } });
    const fixture = TestBed.createComponent(HikeFormComponent);
    fixture.componentRef.setInput('ownerName', 'Zoran');
    fixture.componentRef.setInput('draft', {
      activityType: 'fitness',
      name: 'Fitness',
      date: '2026-09-10',
      minutes: 30,
      metres: 500,
      people: ['Zoran'],
    });
    fixture.detectChanges();
    const saved = vi.fn();
    fixture.componentInstance.saved.subscribe(saved);
    fixture.componentInstance.submit({ preventDefault: vi.fn() } as unknown as SubmitEvent);
    expect(saved).toHaveBeenCalledWith(expect.objectContaining({ name: 'Fitness', metres: null }));
  });

  it('uses the canonical name and removes metres for a newly selected type', () => {
    TestBed.configureTestingModule({ imports: [HikeFormComponent] });
    TestBed.overrideComponent(HikeFormComponent, { set: { template: '' } });
    const fixture = TestBed.createComponent(HikeFormComponent);
    fixture.componentRef.setInput('ownerName', 'Zoran');
    fixture.detectChanges();
    fixture.componentInstance.model.update((draft) => ({ ...draft, metres: 500 }));
    fixture.componentInstance.selectActivityType('table_tennis');
    expect(fixture.componentInstance.model()).toEqual(
      expect.objectContaining({ activityType: 'table_tennis', name: 'Table tennis', metres: null }),
    );
  });

  it('does not emit while a save is already in progress', () => {
    TestBed.configureTestingModule({ imports: [HikeFormComponent] });
    TestBed.overrideComponent(HikeFormComponent, { set: { template: '' } });
    const fixture = TestBed.createComponent(HikeFormComponent);
    fixture.componentRef.setInput('ownerName', 'Zoran');
    fixture.componentRef.setInput('submitting', true);
    fixture.componentRef.setInput('draft', {
      activityType: 'fitness',
      name: 'Fitness',
      date: '2026-09-10',
      minutes: 30,
      metres: null,
      people: ['Zoran'],
    });
    fixture.detectChanges();
    const saved = vi.fn();
    fixture.componentInstance.saved.subscribe(saved);
    fixture.componentInstance.submit({ preventDefault: vi.fn() } as unknown as SubmitEvent);
    expect(saved).not.toHaveBeenCalled();
  });
});
