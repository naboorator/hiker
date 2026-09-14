import { activityTypeOption, isActivityType } from './activity-type.helpers';

describe('activity type helpers', () => {
  it('finds configuration for supported activity types', () => {
    expect(activityTypeOption('table_tennis').defaultName).toBe('Table tennis');
    expect(activityTypeOption('hiking').hasCustomName).toBe(true);
  });

  it('validates activity types', () => {
    expect(isActivityType('construction')).toBe(true);
    expect(isActivityType('unknown')).toBe(false);
  });
});
