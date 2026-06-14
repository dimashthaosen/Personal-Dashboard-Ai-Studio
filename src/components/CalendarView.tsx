import React, { useState } from "react";
import { CalendarEvent } from "../types";
import { Calendar, Plus, Clock, MapPin, ChevronLeft, ChevronRight } from "lucide-react";
import { useFirestoreEvents } from "../lib/hooks";
import { collection, addDoc } from "firebase/firestore";
import { db } from "../lib/firebase";

export default function CalendarView({ userId }: { userId?: string }) {
  const { events, loading } = useFirestoreEvents(userId);

  // Time navigation state
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [showCreateForm, setShowCreateForm] = useState(false);

  // Create event State
  const [eventTitle, setEventTitle] = useState("");
  const [eventStart, setEventStart] = useState("");
  const [eventEnd, setEventEnd] = useState("");
  const [eventLoc, setEventLoc] = useState("");
  const [eventDesc, setEventDesc] = useState("");

  const handleCreateEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!eventTitle.trim() || !eventStart || !eventEnd || !userId) return;

    try {
      await addDoc(collection(db, `users/${userId}/calendarEvents`), {
          title: eventTitle,
          start: new Date(`${selectedDate.toISOString().split("T")[0]}T${eventStart}`).toISOString(),
          end: new Date(`${selectedDate.toISOString().split("T")[0]}T${eventEnd}`).toISOString(),
          location: eventLoc,
          description: eventDesc,
          createdAt: new Date().toISOString(),
          userId
      });

      setEventTitle("");
      setEventStart("");
      setEventEnd("");
      setEventLoc("");
      setEventDesc("");
      setShowCreateForm(false);
    } catch (err) {
      console.error(err);
    }
  };

  const adjustDate = (days: number) => {
    const next = new Date(selectedDate);
    next.setDate(next.getDate() + days);
    setSelectedDate(next);
  };

  const handleChooseToday = () => {
    setSelectedDate(new Date());
  };

  // Compare events strictly against the currently selected simplified date structure
  const filteredEventsForDay = events.filter((evt) => {
    const eventDay = new Date(evt.start).toDateString();
    const activeDay = selectedDate.toDateString();
    return eventDay === activeDay;
  });

  const displayDateStr = selectedDate.toLocaleDateString("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  return (
    <div className="animate-fade-up max-w-4xl mx-auto space-y-6">
      
      {/* Header with Navigation */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between border-b border-paper-3 pb-4 gap-4">
        <div>
          <p className="font-mono text-xs tracking-wider text-ink-500 uppercase">Timetable Coordination</p>
          <div className="flex items-center gap-1.5 mt-1">
            <h2 className="font-serif text-2xl font-semibold text-ink-950">{displayDateStr}</h2>
            {selectedDate.toDateString() === new Date().toDateString() && (
              <span className="font-mono text-[9px] font-bold text-chalk-600 bg-chalk-100 rounded px-1.5 py-0.5 ml-1 select-none">
                TODAY
              </span>
            )}
          </div>
        </div>

        {/* Date Navigator Buttons */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => adjustDate(-1)}
            className="p-2 border border-paper-2 bg-paper-1 hover:bg-paper-2 rounded focus:outline-none transition-colors"
          >
            <ChevronLeft className="w-4 h-4 text-ink-700" />
          </button>
          <button
            onClick={handleChooseToday}
            className="font-mono text-xs border border-paper-2 bg-paper-1 hover:bg-paper-2 px-3 py-2 rounded focus:outline-none transition-colors"
          >
            Today
          </button>
          <button
            onClick={() => adjustDate(1)}
            className="p-2 border border-paper-2 bg-paper-1 hover:bg-paper-2 rounded focus:outline-none transition-colors"
          >
            <ChevronRight className="w-4 h-4 text-ink-700" />
          </button>
          
          <button
            onClick={() => setShowCreateForm(!showCreateForm)}
            className="bg-chalk-600 hover:bg-chalk-500 text-white font-mono text-xs px-4 py-2 rounded shadow-sm transition-all focus:outline-none flex items-center gap-1.5 ml-2"
          >
            <Plus className="w-4 h-4" />
            {showCreateForm ? "Cancel Event" : "Book Event"}
          </button>
        </div>
      </div>

      {/* Book Event Form Panel */}
      {showCreateForm && (
        <form onSubmit={handleCreateEvent} className="bg-paper-1 border border-paper-2 rounded-lg p-5 shadow-sm space-y-4 animate-fade-up">
          <h3 className="font-serif font-semibold text-sm text-ink-950 flex items-center gap-2">
            <Calendar className="w-4 h-4 text-chalk-600" />
            Plan School Activity on {selectedDate.toLocaleDateString("en-GB", { day: "numeric", month: "short" })}
          </h3>

          <div className="space-y-3">
            <div>
              <label className="block text-xs font-mono text-ink-700 uppercase tracking-wider mb-1">Event Title *</label>
              <input
                type="text"
                required
                value={eventTitle}
                onChange={(e) => setEventTitle(e.target.value)}
                placeholder="e.g., IGCSE Class 12 Seminar on Demographics"
                className="w-full text-sm px-3.5 py-2.5 rounded border border-paper-2 bg-paper-0 text-ink-900 focus:outline-none focus:border-chalk-600 transition-colors"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-mono text-ink-700 uppercase tracking-wider mb-1">Start Time *</label>
                <input
                  type="time"
                  required
                  value={eventStart}
                  onChange={(e) => setEventStart(e.target.value)}
                  className="w-full text-sm px-3.5 py-2.5 rounded border border-paper-2 bg-paper-0 text-ink-900 focus:outline-none focus:border-chalk-600 transition-colors"
                />
              </div>

              <div>
                <label className="block text-xs font-mono text-ink-700 uppercase tracking-wider mb-1">End Time *</label>
                <input
                  type="time"
                  required
                  value={eventEnd}
                  onChange={(e) => setEventEnd(e.target.value)}
                  className="w-full text-sm px-3.5 py-2.5 rounded border border-paper-2 bg-paper-0 text-ink-900 focus:outline-none focus:border-chalk-600 transition-colors"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-mono text-ink-700 uppercase tracking-wider mb-1">Location</label>
                <input
                  type="text"
                  value={eventLoc}
                  onChange={(e) => setEventLoc(e.target.value)}
                  placeholder="e.g., Room 102 or Senior Hall"
                  className="w-full text-sm px-3.5 py-2.5 rounded border border-paper-2 bg-paper-0 text-ink-900 focus:outline-none focus:border-chalk-600 transition-colors"
                />
              </div>

              <div>
                <label className="block text-xs font-mono text-ink-700 uppercase tracking-wider mb-1">Brief Description</label>
                <input
                  type="text"
                  value={eventDesc}
                  onChange={(e) => setEventDesc(e.target.value)}
                  placeholder="e.g., Recap homework feedback, cover research methods"
                  className="w-full text-sm px-3.5 py-2.5 rounded border border-paper-2 bg-paper-0 text-ink-900 focus:outline-none focus:border-chalk-600 transition-colors"
                />
              </div>
            </div>
          </div>

          <div className="pt-2">
            <button
              type="submit"
              className="bg-chalk-600 hover:bg-chalk-500 text-white font-mono text-xs px-5 py-2.5 rounded shadow-sm focus:outline-none transition-all"
            >
              Add Session to Schedule
            </button>
          </div>
        </form>
      )}

      {/* Synchronized Day Timetable */}
      <div className="bg-paper-1 border border-paper-2 rounded-lg p-5 shadow-sm space-y-4">
        <h3 className="font-serif font-bold text-sm text-ink-950 uppercase tracking-wide">Daily Timeline Agenda</h3>

        {loading ? (
          <div className="space-y-4 py-4">
            <div className="h-12 shimmer-skeleton rounded"></div>
            <div className="h-12 shimmer-skeleton rounded"></div>
          </div>
        ) : filteredEventsForDay.length === 0 ? (
          <div className="text-center py-14 text-ink-500 font-serif italic text-sm">
            No active periods scheduled for {selectedDate.toLocaleDateString("en-GB", { day: "numeric", month: "short" })}. Free day.
          </div>
        ) : (
          <div className="relative border-l border-paper-3 pl-5 ml-4.5 space-y-6">
            {filteredEventsForDay.map((event) => {
              const startFormatted = new Date(event.start).toLocaleTimeString("en-GB", {
                hour: "2-digit",
                minute: "2-digit",
              });
              const endFormatted = new Date(event.end).toLocaleTimeString("en-GB", {
                hour: "2-digit",
                minute: "2-digit",
              });

              return (
                <div key={event.id} className="relative group animate-fadeIn">
                  
                  {/* Timeline indicator node */}
                  <span className="absolute -left-[29px] top-1.5 w-4 h-4 rounded-full border-2 border-paper-1 bg-chalk-600 group-hover:bg-chalk-500 transition-colors" />

                  <div className="space-y-1">
                    <div className="flex items-center gap-1 text-[11px] font-mono text-chalk-600 font-semibold uppercase tracking-wider">
                      <Clock className="w-3 h-3" />
                      <span>{startFormatted} – {endFormatted}</span>
                    </div>

                    <h4 className="font-serif font-bold text-sm text-ink-950 group-hover:text-chalk-600 transition-colors">
                      {event.title}
                    </h4>

                    {event.description && (
                      <p className="text-xs text-ink-700 leading-normal max-w-2xl font-serif">
                        {event.description}
                      </p>
                    )}

                    {event.location && (
                      <div className="flex items-center gap-1 text-[10px] font-mono text-ink-500 pt-0.5">
                        <MapPin className="w-3.5 h-3.5" />
                        <span>{event.location}</span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

    </div>
  );
}
