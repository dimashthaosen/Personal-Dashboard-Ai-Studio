import React, { useState } from "react";
import { CalendarEvent } from "../types";
import { 
  Calendar, 
  Plus, 
  Clock, 
  MapPin, 
  ChevronLeft, 
  ChevronRight, 
  CalendarDays, 
  Eye, 
  Info,
  Sparkles,
  AlertTriangle,
  ShieldCheck,
  Zap,
  Activity
} from "lucide-react";
import { useFirestoreEvents, useFirestoreTasks } from "../lib/hooks";
import { collection, addDoc } from "firebase/firestore";
import { db } from "../lib/firebase";
import { motion, AnimatePresence } from "motion/react";

export default function CalendarView({ userId }: { userId?: string }) {
  const { events, loading } = useFirestoreEvents(userId);
  const { tasks } = useFirestoreTasks(userId);

  // Calendar View Mode: 'month' | 'week' | 'day'
  const [viewMode, setViewMode] = useState<"month" | "week" | "day">("month");
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [activeSidebarTab, setActiveSidebarTab] = useState<"agenda" | "intelligence">("agenda");

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
      const year = selectedDate.getFullYear();
      const month = String(selectedDate.getMonth() + 1).padStart(2, "0");
      const day = String(selectedDate.getDate()).padStart(2, "0");
      
      const startTimeStr = `${year}-${month}-${day}T${eventStart}:00`;
      const endTimeStr = `${year}-${month}-${day}T${eventEnd}:00`;

      await addDoc(collection(db, `users/${userId}/calendarEvents`), {
          title: eventTitle,
          start: new Date(startTimeStr).toISOString(),
          end: new Date(endTimeStr).toISOString(),
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

  const adjustDate = (amount: number) => {
    const next = new Date(selectedDate);
    if (viewMode === "day") {
      next.setDate(next.getDate() + amount);
    } else if (viewMode === "week") {
      next.setDate(next.getDate() + amount * 7);
    } else if (viewMode === "month") {
      next.setMonth(next.getMonth() + amount);
    }
    setSelectedDate(next);
  };

  const handleChooseToday = () => {
    setSelectedDate(new Date());
  };

  const isSameDay = (d1: Date, d2: Date) => {
    return d1.toDateString() === d2.toDateString();
  };

  // Helper arrays & helper functions
  const weekdayLabels = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  const getDaysInMonthCalendar = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const startDay = firstDay.getDay(); // 0 is Sunday, 1 is Monday...
    const grid: Date[] = [];
    
    // Backfill previous month days
    const temp = new Date(firstDay);
    temp.setDate(temp.getDate() - startDay);
    
    for (let i = 0; i < 42; i++) {
      grid.push(new Date(temp));
      temp.setDate(temp.getDate() + 1);
    }
    
    return grid;
  };

  const getDaysOfWeek = (date: Date) => {
    const current = new Date(date);
    const day = current.getDay();
    // Monday as start of the school week
    const diff = current.getDate() - day + (day === 0 ? -6 : 1);
    const monday = new Date(current.setDate(diff));
    
    const days: Date[] = [];
    for (let i = 0; i < 7; i++) {
      const nextDay = new Date(monday);
      nextDay.setDate(monday.getDate() + i);
      days.push(nextDay);
    }
    return days;
  };

  // Filter events for the exact selected day
  const filteredEventsForDay = events.filter((evt) => {
    return isSameDay(new Date(evt.start), selectedDate);
  });

  // Dynamic header titles depending on view mode
  const getHeaderTitle = () => {
    if (viewMode === "month") {
      return selectedDate.toLocaleDateString("en-GB", { month: "long", year: "numeric" });
    } else if (viewMode === "week") {
      const days = getDaysOfWeek(selectedDate);
      const startDay = days[0].toLocaleDateString("en-GB", { day: "numeric" });
      const startMonth = days[0].toLocaleDateString("en-GB", { month: "short" });
      const endDay = days[6].toLocaleDateString("en-GB", { day: "numeric" });
      const endMonth = days[6].toLocaleDateString("en-GB", { month: "short" });
      const endYear = days[6].toLocaleDateString("en-GB", { year: "numeric" });
      return `Week of ${startDay} ${startMonth} – ${endDay} ${endMonth} ${endYear}`;
    } else {
      return selectedDate.toLocaleDateString("en-GB", {
        weekday: "long",
        day: "numeric",
        month: "long",
        year: "numeric",
      });
    }
  };

  return (
    <div className="animate-fade-up max-w-[1050px] mx-auto space-y-6">
      
      {/* Upper Control Bar */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between border-b border-[#e1d8c6] pb-5 gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h2 className="font-serif text-2xl font-normal text-[#1a1612]">
              {getHeaderTitle()}
            </h2>
            {isSameDay(selectedDate, new Date()) && viewMode === "day" && (
              <span className="font-mono text-[9px] font-bold text-[#2d5a4a] bg-[#e8f0ec] border border-[#d2e3da] rounded px-1.5 py-0.5 select-none uppercase">
                Today
              </span>
            )}
          </div>
          <p className="font-serif italic text-xs text-[#8b857b] mt-1 pl-0.5">
            Synchronized calendar for Vasant Valley school re-openings, academic cycle audits, and session coordination.
          </p>
        </div>

        {/* View Segment Switcher & Control Buttons */}
        <div className="flex flex-wrap items-center gap-3">
          
          {/* Custom segmented pill control */}
          <div className="flex bg-[#f5ece0] border border-[#e1d8c6] rounded-lg p-1" id="view-mode-selector">
            {["month", "week", "day"].map((mode) => (
              <button
                key={mode}
                id={`btn-view-${mode}`}
                type="button"
                onClick={() => setViewMode(mode as "month" | "week" | "day")}
                className={`px-4 py-1.5 font-mono text-[10px] font-bold uppercase tracking-wider rounded-md transition-all cursor-pointer ${
                  viewMode === mode
                    ? "bg-[#2d5a4a] text-white shadow-[0_2px_4px_rgba(26,22,18,0.1)]"
                    : "text-[#7a756f] hover:text-[#1a1612]"
                }`}
              >
                {mode}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              id="btn-calendar-prev"
              onClick={() => adjustDate(-1)}
              className="p-2 border border-[#e1d8c6] bg-[#fcf9f3] hover:bg-[#ece6db]/50 rounded-[6px] focus:outline-none transition-colors cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4 text-[#4a4540]" />
            </button>
            <button
              type="button"
              id="btn-calendar-today"
              onClick={handleChooseToday}
              className="font-mono text-[10px] font-bold uppercase tracking-wider border border-[#e1d8c6] bg-[#fcf9f3] hover:bg-[#ece6db]/50 px-3.5 py-2.2 rounded-[6px] focus:outline-none transition-colors cursor-pointer"
            >
              Today
            </button>
            <button
              type="button"
              id="btn-calendar-next"
              onClick={() => adjustDate(1)}
              className="p-2 border border-[#e1d8c6] bg-[#fcf9f3] hover:bg-[#ece6db]/50 rounded-[6px] focus:outline-none transition-colors cursor-pointer"
            >
              <ChevronRight className="w-4 h-4 text-[#4a4540]" />
            </button>
          </div>
        </div>
      </div>

      {/* Booking Dialog Panel */}
      {showCreateForm && (
        <form onSubmit={handleCreateEvent} className="bg-[#fcf9f3] border border-[#e1d8c6] rounded-[18px] p-6 shadow-[0_6px_24px_-10px_rgba(26,22,18,0.12),0_1px_2px_rgba(26,22,18,0.04)] space-y-4 animate-fade-up">
          <h3 className="font-serif font-bold text-sm text-[#1a1612] pb-2 border-b border-[#ece6db] flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-[#2d5a4a]" />
              <span>Book Activity on {selectedDate.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}</span>
            </div>
            <button 
              type="button" 
              onClick={() => setShowCreateForm(false)}
              className="font-mono text-[9px] font-bold uppercase text-[#b83232] hover:underline"
            >
              Cancel
            </button>
          </h3>

          <div className="space-y-4">
            <div>
              <label className="block text-[10px] font-mono font-bold text-[#7a756f] uppercase tracking-wider mb-1">Event Title *</label>
              <input
                type="text"
                required
                value={eventTitle}
                onChange={(e) => setEventTitle(e.target.value)}
                placeholder="e.g. Swadeshi Shark Tank presentation, Class 10 sociology lecture..."
                className="w-full text-xs px-3.5 py-2.5 rounded-md border border-[#e1d8c6] bg-[#f3ede2] text-ink-950 focus:outline-none focus:border-[#2d5a4a] placeholder:italic"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] font-mono font-bold text-[#7a756f] uppercase tracking-wider mb-1">Start Time *</label>
                <input
                  type="time"
                  required
                  value={eventStart}
                  onChange={(e) => setEventStart(e.target.value)}
                  className="w-full text-xs px-3.5 py-2 rounded-md border border-[#e1d8c6] bg-[#f3ede2] text-ink-950 focus:outline-none focus:border-[#2d5a4a]"
                />
              </div>

              <div>
                <label className="block text-[10px] font-mono font-bold text-[#7a756f] uppercase tracking-wider mb-1">End Time *</label>
                <input
                  type="time"
                  required
                  value={eventEnd}
                  onChange={(e) => setEventEnd(e.target.value)}
                  className="w-full text-xs px-3.5 py-2 rounded-md border border-[#e1d8c6] bg-[#f3ede2] text-ink-950 focus:outline-none focus:border-[#2d5a4a]"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] font-mono font-bold text-[#7a756f] uppercase tracking-wider mb-1">Location</label>
                <input
                  type="text"
                  value={eventLoc}
                  onChange={(e) => setEventLoc(e.target.value)}
                  placeholder="e.g. Activity Room, Gym Area, Senior Hall"
                  className="w-full text-xs px-3.5 py-2.5 rounded-md border border-[#e1d8c6] bg-[#f3ede2] text-ink-950 focus:outline-none focus:border-[#2d5a4a] placeholder:italic"
                />
              </div>

              <div>
                <label className="block text-[10px] font-mono font-bold text-[#7a756f] uppercase tracking-wider mb-1">Brief Description</label>
                <input
                  type="text"
                  value={eventDesc}
                  onChange={(e) => setEventDesc(e.target.value)}
                  placeholder="e.g. Conduct debate trials, mark performance outline..."
                  className="w-full text-xs px-3.5 py-2.5 rounded-md border border-[#e1d8c6] bg-[#f3ede2] text-ink-950 focus:outline-none focus:border-[#2d5a4a] placeholder:italic"
                />
              </div>
            </div>
          </div>

          <div className="pt-2 border-t border-[#ece6db]">
            <button
              type="submit"
              className="bg-[#2d5a4a] hover:bg-[#3a7560] text-white font-mono text-[10px] font-bold px-5 py-2.5 rounded-md uppercase tracking-wider shadow-sm focus:outline-none cursor-pointer"
            >
              Add Session to Schedule
            </button>
          </div>
        </form>
      )}

      {/* Main Grid Workdesk */}
      <AnimatePresence mode="wait">
        <motion.div
          key={viewMode}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.18 }}
          className="w-full"
        >

          {/* DAY VIEW - Classic chronological line list */}
          {viewMode === "day" && (
            <div className="bg-[#fcf9f3] border border-[#e1d8c6] rounded-[18px] p-6 shadow-[0_4px_16px_-6px_rgba(26,22,18,0.08)] space-y-5">
              <div className="flex items-center justify-between pb-3 border-b border-[#ece6db]">
                <h3 className="font-serif font-bold text-sm text-[#1a1612] uppercase tracking-wider flex items-center gap-2">
                  <Clock className="w-4 h-4 text-[#2d5a4a]" />
                  <span>Timeline Agenda</span>
                </h3>
                <button
                  type="button"
                  onClick={() => setShowCreateForm(true)}
                  className="text-[#2d5a4a] hover:text-[#3a7560] font-mono text-[9px] font-bold uppercase tracking-wider flex items-center gap-1"
                >
                  <Plus className="w-3.5 h-3.5" /> Book Session
                </button>
              </div>

              {loading ? (
                <div className="space-y-4 py-6">
                  <div className="h-14 bg-[#ece6db]/50 rounded-[8px] animate-pulse"></div>
                  <div className="h-14 bg-[#ece6db]/50 rounded-[8px] animate-pulse"></div>
                </div>
              ) : filteredEventsForDay.length === 0 ? (
                <div className="text-center py-16 text-[#8b857b] font-serif italic text-sm space-y-1 animate-fadeIn">
                  <p>Your calendar is clear for this date.</p>
                  <p className="text-xs font-sans not-italic text-[#a29c91]">Click &ldquo;Book Session&rdquo; above to schedule a lesson, meeting, or event.</p>
                </div>
              ) : (
                <div className="relative border-l border-[#e1d8c6] pl-6 ml-3 space-y-6">
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
                      <div key={event.id} className="relative group">
                        
                        {/* Circle node indicator */}
                        <span className="absolute -left-[32px] top-1.5 w-3 h-3 rounded-full border-2 border-[#f5f1e8] bg-[#2d5a4a]" />

                        <div className="space-y-1">
                          <div className="flex items-center gap-1.5 text-[9px] font-mono text-[#2d5a4a] font-bold uppercase tracking-wider">
                            <Clock className="w-3.5 h-3.5" />
                            <span>{startFormatted} – {endFormatted}</span>
                          </div>

                          <h4 className="font-serif font-bold text-sm text-[#1a1612]">
                            {event.title}
                          </h4>

                          {event.description && (
                            <p className="text-xs text-[#4a4540] leading-relaxed max-w-2xl font-serif">
                              {event.description}
                            </p>
                          )}

                          {event.location && (
                            <div className="flex items-center gap-1 text-[9px] font-mono text-[#8b857b] pt-0.5 uppercase tracking-wide">
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
          )}

          {/* MONTH & WEEK VIEW: Split layout (Grid on left, Active Day detailed agenda on right) */}
          {(viewMode === "month" || viewMode === "week") && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
              
              {/* Left Pane: Grid Canvas (takes col-span-2) */}
              <div className="lg:col-span-2 bg-[#fcf9f3] border border-[#e1d8c6] rounded-[18px] p-5 shadow-[0_4px_16px_-6px_rgba(26,22,18,0.08)]">
                
                {viewMode === "month" && (
                  <div className="space-y-4" id="monthly-calendar-container">
                    {/* Days of the week header labels */}
                    <div className="grid grid-cols-7 gap-1 text-center border-b border-[#e1d8c6] pb-2">
                      {weekdayLabels.map((lbl, idx) => (
                        <div key={lbl} className="font-mono text-[9px] font-bold text-[#7a756f] uppercase tracking-wider">
                          {lbl}
                        </div>
                      ))}
                    </div>

                    {/* Standard Gregorian Grid Cells */}
                    <div className="grid grid-cols-7 gap-1 bg-[#ece6db]/30 rounded-lg p-0.5" id="month-view-grid">
                      {getDaysInMonthCalendar(selectedDate).map((day, dIdx) => {
                        const dayEvents = events.filter((evt) => isSameDay(new Date(evt.start), day));
                        const isCurrentMonth = day.getMonth() === selectedDate.getMonth();
                        const isSelected = isSameDay(day, selectedDate);
                        const isToday = isSameDay(day, new Date());

                        return (
                          <div
                            key={day.toISOString() + "-" + dIdx}
                            id={`monthly-cell-${day.getDate()}-${day.getMonth()}`}
                            onClick={() => setSelectedDate(day)}
                            onDoubleClick={() => setViewMode("day")}
                            className={`min-h-[75px] sm:min-h-[85px] p-2 rounded-md relative cursor-pointer transition-all flex flex-col justify-between group ${
                              isSelected 
                                ? "bg-[#2d5a4a] text-white shadow-inner scale-[1.01] z-10" 
                                : "bg-[#fcf9f3] hover:bg-[#ece6db]/40 text-[#1a1612]"
                            } border border-[#e1d8c6]/40`}
                          >
                            <div className="flex items-center justify-between">
                              <span 
                                className={`text-xs font-mono font-bold ${
                                  isSelected 
                                    ? "text-white" 
                                  : isCurrentMonth 
                                    ? "text-[#1a1612]" 
                                    : "text-[#c2baa9]"
                                }`}
                              >
                                {day.getDate()}
                              </span>
                              
                              {isToday && (
                                <span className={`w-1.5 h-1.5 rounded-full ${isSelected ? "bg-white" : "bg-[#2d5a4a]"} ring-2 ring-offset-1 ring-emerald-500`} title="Today"/>
                              )}
                            </div>

                            {/* Responsive Event Indicators inside grid cells */}
                            <div className="mt-1 space-y-0.5 overflow-hidden">
                              {/* Desktop labels */}
                              <div className="hidden sm:block space-y-0.5">
                                {dayEvents.slice(0, 2).map((evt) => (
                                  <div
                                    key={evt.id}
                                    title={evt.title}
                                    className={`text-[8px] font-sans truncate px-1 py-0.5 rounded leading-none ${
                                      isSelected
                                        ? "bg-white/20 text-white"
                                        : "bg-[#e8f0ec] text-[#2d5a4a] border border-[#d2e3da]"
                                    }`}
                                  >
                                    {evt.title}
                                  </div>
                                ))}
                                {dayEvents.length > 2 && (
                                  <div className={`text-[7px] font-mono text-right font-bold ${isSelected ? "text-white/80" : "text-[#8b857b]"}`}>
                                    +{dayEvents.length - 2} more
                                  </div>
                                )}
                              </div>

                              {/* Mobile indicators (small badges) */}
                              <div className="flex sm:hidden flex-wrap gap-0.5 justify-start">
                                {dayEvents.map((evt) => (
                                  <span
                                    key={evt.id}
                                    className={`w-1 h-1 rounded-full ${isSelected ? "bg-white" : "bg-[#2d5a4a]"}`}
                                  />
                                ))}
                              </div>
                            </div>

                            {/* Hover tooltip showing events of the day */}
                            <div className={`absolute ${
                              dIdx < 14 ? "top-full mt-2" : "bottom-full mb-2"
                            } ${
                              dIdx % 7 === 0 ? "left-0" : dIdx % 7 === 6 ? "right-0" : "left-1/2 -translate-x-1/2"
                            } mb-2 z-50 w-56 bg-[#fcf9f3] border border-[#e1d8c6] rounded-xl shadow-xl p-3 text-[#1a1612] pointer-events-none hidden group-hover:block transition-all animate-fade-in`}>
                              <div className="border-b border-[#ece6db] pb-1.5 mb-2">
                                <span className="font-mono text-[8px] font-bold text-[#8b857b] uppercase tracking-wider block">
                                  {day.toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" })}
                                </span>
                                <span className="text-[10px] font-serif font-bold text-[#2d5a4a]">
                                  {dayEvents.length === 0 ? "Free Period" : `${dayEvents.length} ${dayEvents.length === 1 ? "Event" : "Events"}`}
                                </span>
                              </div>
                              {dayEvents.length === 0 ? (
                                <p className="text-[10px] font-serif italic text-[#8b857b] leading-tight">
                                  No sessions scheduled on this day.
                                </p>
                              ) : (
                                <div className="space-y-2 max-h-40 overflow-y-auto pristine-scrollbar">
                                  {dayEvents.map(evt => {
                                    const sStr = new Date(evt.start).toLocaleTimeString("en-GB", {
                                      hour: "2-digit",
                                      minute: "2-digit",
                                    });
                                    return (
                                      <div key={evt.id} className="space-y-1 text-left">
                                        <div className="flex items-center gap-1.5">
                                          <span className="font-mono text-[7px] font-bold text-[#2d5a4a] bg-[#e8f0ec] px-1 rounded uppercase tracking-wide">
                                            {sStr}
                                          </span>
                                        </div>
                                        <h5 className="font-sans font-semibold text-[10px] text-[#1a1612] leading-tight whitespace-normal">
                                          {evt.title}
                                        </h5>
                                        {evt.location && (
                                          <p className="font-mono text-[7px] text-[#8b857b] truncate">
                                            🏢 {evt.location}
                                          </p>
                                        )}
                                      </div>
                                    );
                                  })}
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* WEEK VIEW - 7 columns representing current week */}
                {viewMode === "week" && (
                  <div className="space-y-4" id="weekly-calendar-container">
                    <div className="grid grid-cols-1 md:grid-cols-7 gap-3" id="week-view-grid">
                      {getDaysOfWeek(selectedDate).map((day, wIdx) => {
                        const dayEvents = events.filter((evt) => isSameDay(new Date(evt.start), day));
                        const isSelected = isSameDay(day, selectedDate);
                        const isToday = isSameDay(day, new Date());

                        return (
                          <div
                            key={day.toISOString() + "-week-" + wIdx}
                            id={`weekly-day-${day.getDay()}`}
                            onClick={() => setSelectedDate(day)}
                            className={`min-h-[160px] md:min-h-[220px] p-3 rounded-xl border transition-all flex flex-col justify-between cursor-pointer ${
                              isSelected
                                ? "bg-[#2d5a4a] text-white border-[#2d5a4a] shadow-md scale-[1.01]"
                                : "bg-[#fcf9f3] hover:bg-[#ece6db]/40 border-[#e1d8c6] text-[#1a1612]"
                            }`}
                          >
                            <div className="space-y-1">
                              {/* Day Name & Date Text */}
                              <div className="flex items-center justify-between border-b pb-1.5 border-[#e1d8c6]/50">
                                <span className={`font-mono text-[10px] font-bold uppercase ${isSelected ? "text-white/80" : "text-[#7a756f]"}`}>
                                  {day.toLocaleDateString("en-GB", { weekday: "short" })}
                                </span>
                                {isToday && (
                                  <span className={`text-[8px] font-mono px-1 py-0.2 rounded-md ${isSelected ? "bg-white text-[#2d5a4a]" : "bg-[#e8f0ec] text-[#2d5a4a]"}`}>
                                    LIVE
                                  </span>
                                )}
                              </div>
                              <div className="pt-0.5">
                                <span className="font-serif text-lg font-bold block">{day.getDate()}</span>
                                <span className={`text-[9px] font-sans ${isSelected ? "text-white/80" : "text-[#8b857b]"}`}>
                                  {day.toLocaleDateString("en-GB", { month: "short" })}
                                </span>
                              </div>
                            </div>

                            {/* Weekly events list inside columns */}
                            <div className="space-y-1 mt-3 overflow-y-auto max-h-[140px] pristine-scrollbar">
                              {dayEvents.slice(0, 3).map((evt) => (
                                <div
                                  key={evt.id}
                                  title={evt.title}
                                  className={`p-1.5 rounded text-[9px] font-sans leading-snug truncate ${
                                    isSelected
                                      ? "bg-white/10 hover:bg-white/20 text-white"
                                      : "bg-[#f5efe4] hover:bg-[#ece6db] text-[#1a1612] border border-[#e1d8c6]/50"
                                  }`}
                                >
                                  {evt.title}
                                </div>
                              ))}
                              {dayEvents.length > 3 && (
                                <div className={`text-[8px] font-mono text-center font-bold pb-1 ${isSelected ? "text-white/90" : "text-[#8b857b]"}`}>
                                  + {dayEvents.length - 3} others
                                </div>
                              )}
                              {dayEvents.length === 0 && (
                                <p className={`text-[9px] font-serif italic ${isSelected ? "text-white/50" : "text-[#8b857b]"}`}>
                                  No plans
                                </p>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
                
                {/* Tip/Info box */}
                <div className="mt-4 p-3 bg-[#f3ede2] border border-[#e1d8c6] rounded-xl flex items-start gap-2">
                  <Info className="w-4 h-4 text-[#2d5a4a] mt-0.5 flex-shrink-0" />
                  <p className="text-[10px] sm:text-xs font-serif text-[#4a4540] leading-snug">
                    <span className="font-bold">Proplanner Tip:</span> Click on any date cell to show its scheduled events. Double click any day inside the calendar grid to jump directly into its full chronological <strong>Day Timeline agenda</strong>.
                  </p>
                </div>
              </div>

              {/* Right Pane: Day Planner details & Intelligence (takes col-span-1) */}
              <div className="lg:col-span-1 bg-[#fcf9f3] border border-[#e1d8c6] rounded-[18px] p-5 shadow-[0_4px_16px_-6px_rgba(26,22,18,0.08)] flex flex-col space-y-4">
                
                {/* Segmented Tab Selector */}
                <div className="flex bg-[#f3ede2] border border-[#e1d8c6] rounded-xl p-1 select-none">
                  <button
                    type="button"
                    onClick={() => setActiveSidebarTab("agenda")}
                    className={`flex-1 py-1.5 text-center font-mono text-[9px] font-bold uppercase tracking-wider rounded-lg transition-all cursor-pointer ${
                      activeSidebarTab === "agenda"
                        ? "bg-[#2d5a4a] text-white shadow-sm"
                        : "text-[#7a756f] hover:text-[#1a1612]"
                    }`}
                  >
                    Day Agenda
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveSidebarTab("intelligence")}
                    className={`flex-1 py-1.5 text-center font-mono text-[9px] font-bold uppercase tracking-wider rounded-lg transition-all cursor-pointer flex items-center justify-center gap-1 ${
                      activeSidebarTab === "intelligence"
                        ? "bg-[#2d5a4a] text-white shadow-sm"
                        : "text-[#7a756f] hover:text-[#1a1612]"
                    }`}
                  >
                    <Sparkles className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
                    Insights
                  </button>
                </div>

                {activeSidebarTab === "agenda" ? (
                  <div className="space-y-4 flex flex-col flex-1">
                    <div className="border-b border-[#ece6db] pb-2">
                      <span className="font-mono text-[9px] font-bold text-[#8b857b] uppercase tracking-widest block">
                        Focus Day Agenda
                      </span>
                      <h3 className="font-serif font-bold text-base text-[#1a1612] mt-0.5">
                        {selectedDate.toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "long" })}
                      </h3>
                    </div>

                    <div className="space-y-3 flex-1">
                      {filteredEventsForDay.length === 0 ? (
                        <div className="border border-dashed border-[#ece6db] rounded-xl p-6 text-center text-[#8b857b] font-serif italic text-xs space-y-1 animate-fadeIn">
                          <p>No classes or sessions scheduled.</p>
                          <p className="text-[10px] font-sans not-italic text-[#a29c91]">Click &ldquo;Book Event&rdquo; below to reserve a slot.</p>
                        </div>
                      ) : (
                        <div className="space-y-2 max-h-[320px] overflow-y-auto pristine-scrollbar pr-1">
                          {filteredEventsForDay.map((evt) => {
                            const startStr = new Date(evt.start).toLocaleTimeString("en-GB", {
                              hour: "2-digit",
                              minute: "2-digit",
                            });
                            const endStr = new Date(evt.end).toLocaleTimeString("en-GB", {
                              hour: "2-digit",
                              minute: "2-digit",
                            });

                            return (
                              <div
                                key={evt.id}
                                className="p-3 rounded-xl bg-[#f5efe4] border border-[#e1d8c6] hover:border-[#2d5a4a]/40 transition-all space-y-1.5"
                              >
                                <span className="font-mono text-[8px] font-bold text-[#2d5a4a] bg-[#e8f0ec] px-1.5 py-0.5 rounded uppercase tracking-wider block w-max">
                                  {startStr} – {endStr}
                                </span>
                                <h4 className="font-sans font-bold text-xs text-[#1a1612] leading-tight">
                                  {evt.title}
                                </h4>
                                {evt.location && (
                                  <span className="font-mono text-[8px] text-[#8b857b] flex items-center gap-0.5">
                                    <MapPin className="w-2.5 h-2.5" />
                                    {evt.location}
                                  </span>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      )}

                      {/* Booking Trigger Button Zones */}
                      <div className="pt-3 border-t border-[#ece6db] flex flex-col gap-2">
                        <button
                          type="button"
                          id="btn-trigger-booking"
                          onClick={() => {
                            setEventTitle("");
                            setEventStart("");
                            setEventEnd("");
                            setEventLoc("");
                            setEventDesc("");
                            setShowCreateForm(true);
                          }}
                          className="w-full bg-[#2d5a4a] hover:bg-[#3a7560] text-white font-mono text-[10px] font-bold py-2.5 rounded-lg transition-colors uppercase tracking-wider text-center flex items-center justify-center gap-1.5 cursor-pointer"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          Book Event
                        </button>

                        <button
                          type="button"
                          id="btn-goto-day-mode"
                          onClick={() => setViewMode("day")}
                          className="w-full border border-[#e1d8c6] bg-white hover:bg-[#faf7f2] text-ink-950 font-mono text-[10px] font-bold py-2.5 rounded-lg transition-colors uppercase tracking-wider text-center flex items-center justify-center gap-1.5 cursor-pointer"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          Detailed Timeline View
                        </button>
                      </div>
                    </div>
                  </div>
                ) : (
                  // CALENDAR INTELLIGENCE INSIGHTS LAYER
                  <div className="space-y-4 flex flex-col flex-1 animate-fadeIn">
                    <div className="border-b border-[#ece6db] pb-2">
                      <span className="font-mono text-[9px] font-bold text-[#2d5a4a] uppercase tracking-widest block">
                        Schedule intelligence
                      </span>
                      <h3 className="font-serif font-bold text-sm text-[#1a1612] mt-0.5 flex items-center gap-1">
                        <Activity className="w-4 h-4 text-[#2d5a4a]" />
                        <span>Workload & Gaps</span>
                      </h3>
                    </div>

                    <div className="space-y-4 max-h-[420px] overflow-y-auto pr-1 pristine-scrollbar">
                      
                      {/* Section 1: Conflict Detection */}
                      <div className="space-y-1.5">
                        <span className="text-[9px] font-mono font-bold text-[#8b857b] uppercase tracking-wider block">
                          Conflict analysis
                        </span>
                        {(() => {
                          const conflictsList: Array<{ eventA: CalendarEvent; eventB: CalendarEvent }> = [];
                          for (let i = 0; i < filteredEventsForDay.length; i++) {
                            for (let j = i + 1; j < filteredEventsForDay.length; j++) {
                              const evA = filteredEventsForDay[i];
                              const evB = filteredEventsForDay[j];
                              const startA = new Date(evA.start);
                              const endA = new Date(evA.end);
                              const startB = new Date(evB.start);
                              const endB = new Date(evB.end);
                              if (startA < endB && startB < endA) {
                                conflictsList.push({ eventA: evA, eventB: evB });
                              }
                            }
                          }

                          if (conflictsList.length === 0) {
                            return (
                              <div className="p-2.5 rounded-lg bg-[#e8f0ec] border border-[#d2e3da] flex items-center gap-2 text-[#2d5a4a] text-xs">
                                <ShieldCheck className="w-4 h-4 flex-shrink-0" />
                                <span className="font-serif italic text-[11px]">No timetable overlaps found today.</span>
                              </div>
                            );
                          }

                          return (
                            <div className="space-y-1.5">
                              {conflictsList.map((conflict, idx) => (
                                <div key={idx} className="p-2.5 rounded-lg bg-redpen/10 border border-redpen/20 flex flex-col gap-1 text-redpen text-xs">
                                  <div className="flex items-center gap-1.5 font-bold font-mono text-[9px] tracking-wide uppercase">
                                    <AlertTriangle className="w-3.5 h-3.5" />
                                    <span>Time Collision Detected</span>
                                  </div>
                                  <p className="font-serif text-[11px] leading-snug">
                                    &ldquo;{conflict.eventA.title}&rdquo; conflicts with &ldquo;{conflict.eventB.title}&rdquo;.
                                  </p>
                                </div>
                              ))}
                            </div>
                          );
                        })()}
                      </div>

                      {/* Section 2: Free Block Detection & Task Suggestion */}
                      <div className="space-y-2">
                        <span className="text-[9px] font-mono font-bold text-[#8b857b] uppercase tracking-wider block">
                          Today&rsquo;s Free Periods
                        </span>
                        {(() => {
                          const standardPeriods = [
                            { name: "L1", start: "08:30", end: "09:10" },
                            { name: "L2", start: "09:20", end: "10:00" },
                            { name: "L3", start: "10:10", end: "10:50" },
                            { name: "Break", start: "10:50", end: "11:10" },
                            { name: "L4", start: "11:10", end: "11:50" },
                            { name: "L5", start: "12:00", end: "12:40" },
                            { name: "L6", start: "12:50", end: "13:30" },
                          ];

                          const parseTimeOnDate = (date: Date, hhmm: string) => {
                            const result = new Date(date);
                            const [hh, mm] = hhmm.split(":");
                            result.setHours(parseInt(hh, 10), parseInt(mm, 10), 0, 0);
                            return result;
                          };

                          const freePeriods = standardPeriods.filter((period) => {
                            const pStart = parseTimeOnDate(selectedDate, period.start);
                            const pEnd = parseTimeOnDate(selectedDate, period.end);

                            const overlapping = filteredEventsForDay.filter((evt) => {
                              const evtStart = new Date(evt.start);
                              const evtEnd = new Date(evt.end);
                              return evtStart < pEnd && pStart < evtEnd;
                            });
                            return overlapping.length === 0;
                          });

                          if (freePeriods.length === 0) {
                            return (
                              <p className="text-[11px] font-serif italic text-[#8b857b] p-1">
                                Fully booked today. No free teaching slots.
                              </p>
                            );
                          }

                          // High priority non-done task suggestion
                          const highPrioritySuggest = tasks
                            .filter((t) => t.status !== "done" && t.priority === "high")
                            .slice(0, 1);

                          return (
                            <div className="space-y-2">
                              {/* Horizontal items */}
                              <div className="flex flex-wrap gap-1">
                                {freePeriods.map((fp) => (
                                  <span
                                    key={fp.name}
                                    title={`${fp.start} - ${fp.end}`}
                                    className="px-2 py-1 text-[9px] font-mono font-bold text-[#2d5a4a] bg-[#e8f0ec] rounded border border-[#d2e3da]"
                                  >
                                    {fp.name === "Break" ? "Break ☕" : `${fp.name} Period`}
                                  </span>
                                ))}
                              </div>

                              {highPrioritySuggest.map((task) => {
                                // Match task to first free period if available
                                const slot = freePeriods[0];
                                return (
                                  <div key={task.id} className="p-3 bg-amber-50 border border-amber-200 rounded-xl space-y-2">
                                    <div className="flex items-start gap-1.5">
                                      <Zap className="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0 animate-bounce" />
                                      <div className="space-y-0.5">
                                        <p className="font-mono text-[8px] font-bold text-amber-800 uppercase tracking-wide">
                                          Suggested Fit in {slot.name} ({slot.start} - {slot.end})
                                        </p>
                                        <p className="text-xs font-serif font-bold text-[#1a1612] leading-tight text-left">
                                          Allocate free time to complete: &ldquo;{task.title}&rdquo;
                                        </p>
                                      </div>
                                    </div>
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setEventTitle(`Focus Slot: ${task.title}`);
                                        setEventStart(slot.start);
                                        setEventEnd(slot.end);
                                        setEventLoc("Classroom / Staff Room");
                                        setEventDesc(`Block allocated to finish task: ${task.title}`);
                                        setShowCreateForm(true);
                                      }}
                                      className="w-full text-center py-1 bg-amber-600 hover:bg-amber-700 text-white font-mono text-[8px] font-bold uppercase tracking-wider rounded-md cursor-pointer transition-colors"
                                    >
                                      Pre-populate slot in booker
                                    </button>
                                  </div>
                                );
                              })}
                            </div>
                          );
                        })()}
                      </div>

                      {/* Section 3: Weekly Burden / Burnout Index */}
                      <div className="space-y-2 pt-1">
                        <span className="text-[9px] font-mono font-bold text-[#8b857b] uppercase tracking-wider block">
                          Weekly Workload Burden
                        </span>
                        {(() => {
                          const daysOfWeek = getDaysOfWeek(selectedDate);
                          const metrics = daysOfWeek.map((day) => {
                            const dayEvents = events.filter((evt) => isSameDay(new Date(evt.start), day));
                            let totalMinutes = 0;
                            dayEvents.forEach((evt) => {
                              const s = new Date(evt.start);
                              const e = new Date(evt.end);
                              const diff = (e.getTime() - s.getTime()) / (1000 * 60);
                              totalMinutes += Math.max(0, diff);
                            });
                            return {
                              dayName: day.toLocaleDateString("en-GB", { weekday: "short" }),
                              dateNum: day.getDate(),
                              hours: totalMinutes / 60,
                              isTarget: isSameDay(day, selectedDate),
                            };
                          });

                          return (
                            <div className="space-y-2 bg-[#f5efe4] border border-[#e1d8c6] rounded-xl p-3">
                              {metrics.slice(0, 5).map((m, mIdx) => {
                                const roundedHours = parseFloat(m.hours.toFixed(1));
                                // max hours scale representation: 6 hours
                                const percentage = Math.min(100, Math.max(4, (m.hours / 6) * 100));
                                const isHeavy = m.hours > 4;
                                const barColor = isHeavy ? "bg-redpen" : "bg-[#2d5a4a]";

                                return (
                                  <div key={mIdx} className="space-y-1">
                                    <div className="flex items-center justify-between text-[9px] font-mono select-none">
                                      <span className={`font-bold ${m.isTarget ? "text-[#2d5a4a] underline decoration-wavy pl-0.5" : "text-[#4a4540]"}`}>
                                        {m.dayName.toUpperCase()} {m.dateNum}
                                      </span>
                                      <span className={`font-bold uppercase ${isHeavy ? "text-redpen" : "text-[#2d5a4a]"}`}>
                                        {roundedHours} hrs {isHeavy ? "🔥 High" : "Balanced"}
                                      </span>
                                    </div>
                                    {/* Progress meter gutter */}
                                    <div className="w-full h-2 bg-[#ece6db] rounded-full overflow-hidden">
                                      <div 
                                        className={`h-full rounded-full transition-all duration-350 ${barColor}`}
                                        style={{ width: `${percentage}%` }}
                                      />
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          );
                        })()}
                      </div>

                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

        </motion.div>
      </AnimatePresence>

    </div>
  );
}
