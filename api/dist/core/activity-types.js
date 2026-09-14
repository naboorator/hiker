export const activityTypeNames = {
    hiking: '',
    fitness: 'Fitness',
    cycling: 'Cycling',
    tennis: 'Tennis',
    badminton: 'Badminton',
    table_tennis: 'Table tennis',
    construction: 'Construction work',
    housework: 'Housework',
};
export function isActivityType(value) {
    return typeof value === 'string' && Object.hasOwn(activityTypeNames, value);
}
