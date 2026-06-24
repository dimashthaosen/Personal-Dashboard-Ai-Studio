import { CalendarEvent } from "../types";

export interface StandardPeriod {
  name: string;
  start: string; // "HH:MM" (24-hour format)
  end: string;   // "HH:MM" (24-hour format)
  isBreak?: boolean;
}

// Centralised standard school day period definitions (VVS)
export const STANDARD_SCHOOL_DAY_PERIODS: StandardPeriod[] = [
  { name: "L1", start: "08:30", end: "09:10" },
  { name: "L2", start: "09:20", end: "10:00" },
  { name: "L3", start: "10:10", end: "10:50" },
  { name: "Break", start: "10:50", end: "11:10", isBreak: true },
  { name: "L4", start: "11:10", end: "11:50" },
  { name: "L5", start: "12:00", end: "12:40" },
  { name: "L6", start: "12:50", end: "13:30" },
];

/**
 * Parses an HH:MM 24-hour time string onto a specific Date object.
 */
export function parseTimeOnDate(date: Date, hhmm: string): Date {
  const result = new Date(date);
  const [hh, mm] = hhmm.split(":");
  result.setHours(parseInt(hh, 10), parseInt(mm, 10), 0, 0);
  return result;
}

/**
 * Checks if a calendar event is an all-day event.
 * Spans at least 20 hours.
 */
export function isAllDayEvent(event: CalendarEvent): boolean {
  const start = new Date(event.start);
  const end = new Date(event.end);
  if (isNaN(start.getTime()) || isNaN(end.getTime())) return false;
  
  const diffHours = (end.getTime() - start.getTime()) / (1000 * 60 * 60);
  return diffHours >= 20;
}

/**
 * Checks if a calendar event has invalid times (non-dates, or end <= start).
 */
export function isInvalidEvent(event: CalendarEvent): boolean {
  const start = new Date(event.start);
  const end = new Date(event.end);
  return isNaN(start.getTime()) || isNaN(end.getTime()) || start >= end;
}

export interface Conflict {
  eventA: CalendarEvent;
  eventB: CalendarEvent;
  overlapStr: string;
}

/**
 * Detects overlapping events on a specific day, distinguishing standard timed events,
 * invalid events, and all-day events gracefully.
 */
export function detectConflicts(dayEvents: CalendarEvent[]) {
  const validEvents: CalendarEvent[] = [];
  const invalidEvents: CalendarEvent[] = [];
  const allDayEvents: CalendarEvent[] = [];

  dayEvents.forEach((evt) => {
    if (isInvalidEvent(evt)) {
      invalidEvents.push(evt);
    } else if (isAllDayEvent(evt)) {
      allDayEvents.push(evt);
    } else {
      validEvents.push(evt);
    }
  });

  const conflicts: Conflict[] = [];

  for (let i = 0; i < validEvents.length; i++) {
    for (let j = i + 1; j < validEvents.length; j++) {
      const evA = validEvents[i];
      const evB = validEvents[j];
      const startA = new Date(evA.start);
      const endA = new Date(evA.end);
      const startB = new Date(evB.start);
      const endB = new Date(evB.end);

      if (startA < endB && startB < endA) {
        // Find intersection
        const overlapStart = new Date(Math.max(startA.getTime(), startB.getTime()));
        const overlapEnd = new Date(Math.min(endA.getTime(), endB.getTime()));
        const formatTime = (d: Date) => d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
        const overlapStr = `${formatTime(overlapStart)} - ${formatTime(overlapEnd)}`;

        conflicts.push({
          eventA: evA,
          eventB: evB,
          overlapStr,
        });
      }
    }
  }

  return { conflicts, invalidEvents, allDayEvents };
}

/**
 * Calculates free periods for a specific date given the day's scheduled events.
 * By default, skips breaks unless explicitly requested.
 * Real timetable data or standard period configurations can replace/be loaded here in the future.
 */
export function calculateFreePeriods(
  selectedDate: Date,
  dayEvents: CalendarEvent[],
  includeBreaks: boolean = false,
  periodsDefinition: StandardPeriod[] = STANDARD_SCHOOL_DAY_PERIODS
): StandardPeriod[] {
  // Exclude invalid/all-day events from standard free period blocking
  const blockingEvents = dayEvents.filter(evt => !isInvalidEvent(evt) && !isAllDayEvent(evt));

  return periodsDefinition.filter((period) => {
    // If it's a break, and we do NOT allow suggestions in breaks, skip it
    if (period.isBreak && !includeBreaks) {
      return false;
    }

    const pStart = parseTimeOnDate(selectedDate, period.start);
    const pEnd = parseTimeOnDate(selectedDate, period.end);

    // Check if any scheduled event overlaps with this period
    const isOverlapping = blockingEvents.some((evt) => {
      const evtStart = new Date(evt.start);
      const evtEnd = new Date(evt.end);
      return evtStart < pEnd && pStart < evtEnd;
    });

    return !isOverlapping;
  });
}
