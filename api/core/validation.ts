import { HttpError } from "./http-error.js";
import type {
  ActivityInput,
  ActivityType,
} from "../interface/activity.interface.js";
import { activityTypeNames, isActivityType } from "./activity-types.js";
import type { SettingsInput } from "../interface/settings.interface.js";
import type { WeightInput } from "../interface/weight.interface.js";
import type { ActivityLocationInput } from "../interface/activity-location.interface.js";

const datePattern = /^\d{4}-\d{2}-\d{2}$/;
const maximumActivityLocations = 20_000;

export function activityInput(value: unknown): ActivityInput {
  const body = record(value);
  const activityType = body["activityType"];
  const people = body["people"];
  if (!isActivityType(activityType)) invalid("Invalid activity type");
  if (
    !Array.isArray(people) ||
    !people.length ||
    people.some((person) => !text(person))
  )
    invalid("At least one person is required");
  const name = activityTypeNames[activityType] || text(body["name"]);
  const date = text(body["date"]);
  const minutes = finiteNumber(body["minutes"]);
  const metres =
    activityType === "hiking" ? finiteNumber(body["metres"]) : null;
  if (!name) invalid("Activity name is required");
  if (!datePattern.test(date)) invalid("Date must use YYYY-MM-DD format");
  if (minutes < 0 || (metres !== null && metres < 0))
    invalid("Values cannot be negative");
  return {
    activityType: activityType as ActivityType,
    name,
    date,
    minutes,
    metres,
    people,
  };
}

export function activityLocationsInput(
  value: unknown,
): ActivityLocationInput[] {
  const locations = record(value)["gpsLocations"];
  if (locations === undefined) return [];
  if (!Array.isArray(locations) || locations.length > maximumActivityLocations)
    invalid(
      `GPS locations must be an array with at most ${maximumActivityLocations} items`,
    );
  return locations.map((candidate) => {
    const location = record(candidate);
    const latitude = finiteNumber(location["latitude"]);
    const longitude = finiteNumber(location["longitude"]);
    const accuracy = finiteNumber(location["accuracy"]);
    const altitude = optionalFiniteNumber(location["altitude"]);
    const altitudeAccuracy = optionalFiniteNumber(location["altitudeAccuracy"]);
    const segment = finiteNumber(location["segment"]);
    const recordedAt = text(location["recordedAt"]);
    if (latitude < -90 || latitude > 90) invalid("GPS latitude is invalid");
    if (longitude < -180 || longitude > 180)
      invalid("GPS longitude is invalid");
    if (accuracy < 0) invalid("GPS accuracy is invalid");
    if (altitudeAccuracy !== null && altitudeAccuracy < 0)
      invalid("GPS altitude accuracy is invalid");
    if (!Number.isInteger(segment) || segment < 0)
      invalid("GPS segment is invalid");
    if (!recordedAt || !Number.isFinite(Date.parse(recordedAt)))
      invalid("GPS timestamp is invalid");
    return {
      latitude,
      longitude,
      accuracy,
      altitude,
      altitudeAccuracy,
      recordedAt,
      segment,
    };
  });
}

export function settingsInput(value: unknown): SettingsInput {
  const body = record(value);
  const appName = text(body["appName"]);
  const ownerName = text(body["ownerName"]);
  if (!appName || !ownerName) invalid("App name and owner name are required");
  return { appName, ownerName };
}

export function weightInput(value: unknown): WeightInput {
  const body = record(value);
  const weightKg = finiteNumber(body["weightKg"]);
  const recordedOn = text(body["recordedOn"]);
  if (weightKg < 20 || weightKg > 500)
    invalid("Weight must be between 20 and 500 kg");
  if (!datePattern.test(recordedOn)) invalid("Date must use YYYY-MM-DD format");
  return { weightKg, recordedOn };
}

function record(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value))
    invalid("A JSON object is required");
  return value as Record<string, unknown>;
}

function text(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function finiteNumber(value: unknown): number {
  const number = Number(value);
  if (!Number.isFinite(number)) invalid("A valid numeric value is required");
  return number;
}

function optionalFiniteNumber(value: unknown): number | null {
  if (value === undefined || value === null) return null;
  return finiteNumber(value);
}

function invalid(message: string): never {
  throw new HttpError(400, message);
}
