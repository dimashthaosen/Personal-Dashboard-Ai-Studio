import { fetchWithTimeout } from "./gmail";
import { CalendarEvent } from "../types";

export interface GoogleCalendarEventInput {
  title: string;
  start: string;
  end: string;
  location?: string;
  description?: string;
  taskId?: string;
}

// Map Google API Event to CalendarEvent shape
function mapGoogleEventToAppEvent(gEvent: any, userId?: string): CalendarEvent {
  const start = gEvent.start?.dateTime || gEvent.start?.date || "";
  const end = gEvent.end?.dateTime || gEvent.end?.date || "";
  const taskId = gEvent.extendedProperties?.private?.taskId;

  return {
    id: gEvent.id, // Keep the Google event ID as the ID or googleEventId
    googleEventId: gEvent.id,
    userId,
    title: gEvent.summary || "(No Title)",
    start,
    end,
    location: gEvent.location || "",
    description: gEvent.description || "",
    taskId
  };
}

async function handleResponse(res: Response, contextMessage: string): Promise<any> {
  if (!res.ok) {
    const text = await res.text();
    console.error(`Google Calendar API Error [${contextMessage}]: status=${res.status}, body=${text}`);
    throw new Error(`Google Calendar API Error [${res.status}]: ${text}`);
  }
  return res.json();
}

export async function fetchCalendarEvents(
  accessToken: string,
  timeMin: string,
  timeMax: string,
  userId?: string
): Promise<CalendarEvent[]> {
  const url = `https://www.googleapis.com/calendar/v3/calendars/primary/events?timeMin=${encodeURIComponent(
    timeMin
  )}&timeMax=${encodeURIComponent(timeMax)}&singleEvents=true&orderBy=startTime`;

  const res = await fetchWithTimeout(url, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: "application/json",
    },
  }, 5000);

  const data = await handleResponse(res, "fetchCalendarEvents");
  const items = data.items || [];
  return items.map((item: any) => mapGoogleEventToAppEvent(item, userId));
}

export async function createCalendarEvent(
  accessToken: string,
  event: GoogleCalendarEventInput
): Promise<any> {
  const url = "https://www.googleapis.com/calendar/v3/calendars/primary/events";

  const body: any = {
    summary: event.title,
    description: event.description || "",
    location: event.location || "",
    start: {
      dateTime: new Date(event.start).toISOString(),
    },
    end: {
      dateTime: new Date(event.end).toISOString(),
    },
  };

  if (event.taskId) {
    body.extendedProperties = {
      private: {
        taskId: event.taskId,
      },
    };
  }

  const res = await fetchWithTimeout(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  }, 5000);

  return handleResponse(res, "createCalendarEvent");
}

export async function updateCalendarEvent(
  accessToken: string,
  googleEventId: string,
  eventPatch: Partial<GoogleCalendarEventInput>
): Promise<any> {
  const url = `https://www.googleapis.com/calendar/v3/calendars/primary/events/${googleEventId}`;

  const body: any = {};
  if (eventPatch.title !== undefined) body.summary = eventPatch.title;
  if (eventPatch.description !== undefined) body.description = eventPatch.description;
  if (eventPatch.location !== undefined) body.location = eventPatch.location;
  if (eventPatch.start !== undefined) {
    body.start = { dateTime: new Date(eventPatch.start).toISOString() };
  }
  if (eventPatch.end !== undefined) {
    body.end = { dateTime: new Date(eventPatch.end).toISOString() };
  }
  if (eventPatch.taskId !== undefined) {
    body.extendedProperties = {
      private: {
        taskId: eventPatch.taskId || "",
      },
    };
  }

  const res = await fetchWithTimeout(url, {
    method: "PATCH",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  }, 5000);

  return handleResponse(res, "updateCalendarEvent");
}

export async function deleteCalendarEvent(
  accessToken: string,
  googleEventId: string
): Promise<void> {
  const url = `https://www.googleapis.com/calendar/v3/calendars/primary/events/${googleEventId}`;

  const res = await fetchWithTimeout(url, {
    method: "DELETE",
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  }, 5000);

  if (!res.ok) {
    const text = await res.text();
    console.error(`Google Calendar API Error [deleteCalendarEvent]: status=${res.status}, body=${text}`);
    throw new Error(`Google Calendar API Error [${res.status}]: ${text}`);
  }
}
