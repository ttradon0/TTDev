import { formatInTimeZone, fromZonedTime } from "date-fns-tz";

export const TIME_ZONE = "Asia/Bangkok";
export const OPEN_MINUTE = 6 * 60;
export const CLOSE_MINUTE = 18 * 60;
export const SLOT_MINUTES = 30;
export const ALLOWED_DURATIONS = [30, 60, 90, 120] as const;

export function currentTimestamp() {
  return Date.now();
}

export type DaySlot = {
  time: string;
  startsAt: string;
};

export function bangkokDateKey(value: Date | string = new Date()) {
  return formatInTimeZone(value, TIME_ZONE, "yyyy-MM-dd");
}

export function bangkokTime(value: Date | string) {
  return formatInTimeZone(value, TIME_ZONE, "HH:mm");
}

export function bangkokDateLabel(value: Date | string) {
  return formatInTimeZone(value, TIME_ZONE, "EEEE, d MMMM yyyy");
}

export function toBangkokInstant(date: string, time: string) {
  return fromZonedTime(date + "T" + time + ":00", TIME_ZONE);
}

export function dayBounds(date: string) {
  const start = toBangkokInstant(date, "00:00");
  return {
    start: start.toISOString(),
    end: new Date(start.getTime() + 24 * 60 * 60 * 1000).toISOString(),
  };
}

export function makeDaySlots(date: string): DaySlot[] {
  const slots: DaySlot[] = [];
  for (let minute = OPEN_MINUTE; minute < CLOSE_MINUTE; minute += SLOT_MINUTES) {
    const hour = Math.floor(minute / 60).toString().padStart(2, "0");
    const mins = (minute % 60).toString().padStart(2, "0");
    const time = hour + ":" + mins;
    slots.push({ time, startsAt: toBangkokInstant(date, time).toISOString() });
  }
  return slots;
}

export function formatRange(startsAt: string, endsAt: string) {
  return bangkokTime(startsAt) + " – " + bangkokTime(endsAt);
}

export function formatDuration(minutes: number) {
  if (minutes === 60) return "1 hour";
  if (minutes === 90) return "1.5 hours";
  if (minutes === 120) return "2 hours";
  return "30 minutes";
}
