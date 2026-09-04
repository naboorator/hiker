import { HttpError } from './http-error.js';
const datePattern = /^\d{4}-\d{2}-\d{2}$/;
export function activityInput(value) {
    const body = record(value);
    const activityType = body['activityType'];
    const people = body['people'];
    if (activityType !== 'hiking' && activityType !== 'fitness')
        invalid('Invalid activity type');
    if (!Array.isArray(people) || !people.length || people.some((person) => !text(person)))
        invalid('At least one person is required');
    const name = activityType === 'fitness' ? 'Fitness' : text(body['name']);
    const date = text(body['date']);
    const minutes = finiteNumber(body['minutes']);
    const metres = activityType === 'hiking' ? finiteNumber(body['metres']) : null;
    if (!name)
        invalid('Activity name is required');
    if (!datePattern.test(date))
        invalid('Date must use YYYY-MM-DD format');
    if (minutes < 0 || (metres !== null && metres < 0))
        invalid('Values cannot be negative');
    return { activityType: activityType, name, date, minutes, metres, people };
}
export function settingsInput(value) {
    const body = record(value);
    const appName = text(body['appName']);
    const ownerName = text(body['ownerName']);
    if (!appName || !ownerName)
        invalid('App name and owner name are required');
    return { appName, ownerName };
}
export function weightInput(value) {
    const body = record(value);
    const weightKg = finiteNumber(body['weightKg']);
    const recordedOn = text(body['recordedOn']);
    if (weightKg < 20 || weightKg > 500)
        invalid('Weight must be between 20 and 500 kg');
    if (!datePattern.test(recordedOn))
        invalid('Date must use YYYY-MM-DD format');
    return { weightKg, recordedOn };
}
function record(value) {
    if (!value || typeof value !== 'object' || Array.isArray(value))
        invalid('A JSON object is required');
    return value;
}
function text(value) {
    return typeof value === 'string' ? value.trim() : '';
}
function finiteNumber(value) {
    const number = Number(value);
    if (!Number.isFinite(number))
        invalid('A valid numeric value is required');
    return number;
}
function invalid(message) {
    throw new HttpError(400, message);
}
