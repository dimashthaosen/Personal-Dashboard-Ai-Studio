import React, { useState, useEffect } from "react";
import { Email, DailyPlan } from "../types";
import { AlertCircle, Clock, Sparkles, X, Mail } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { useFirestoreTasks, useFirestoreEvents, useFirestoreMemory, useFirestoreStudents, useFirestoreTimetable } from "../lib/hooks";
import { getCachedEmails, saveCachedEmails } from "./EmailView";

interface DashboardViewProps {
  onNavigate: (tab: string) => void;
  googleToken?: string | null;
  userId?: string;
}

export default function DashboardView({ onNavigate, googleToken, userId }: DashboardViewProps) {
  const { tasks, loading: loadingTasks } = useFirestoreTasks(userId);
  const { events } = useFirestoreEvents(userId);
  const { memoryItems } = useFirestoreMemory(userId);
  useFirestoreStudents(userId);
  const { timetable } = useFirestoreTimetable(userId);

  const [emails, setEmails] = useState<Email[]>(() => {
    try {
      const cached = getCachedEmails("inbox");
      return cached ? cached.data : [];
    } catch {
      return [];
    }
  });
  const [dailyPlan, setDailyPlan] = useState<DailyPlan | null>(() => {
    try {
      const saved = localStorage.getItem(`dailyPlan_${userId || "default"}`);
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });
  const [generatedAt, setGeneratedAt] = useState<string | null>(() => {
    return localStorage.getItem(`dailyPlan_timestamp_${userId || "default"}`);
  });

  const [generatingPlan, setGeneratingPlan] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    fetchEmails();
  }, [googleToken]);

  const fetchEmails = async () => {
    const cached = getCachedEmails("inbox");
    const now = Date.now();
    const REFRESH_COOLDOWN = 5 * 60 * 1000; // 5 minutes

    if (cached) {
      setEmails(cached.data);
      
      // If still fresh, skip network call completely!
      if (now - cached.timestamp < REFRESH_COOLDOWN) {
        return;
      }
    }

    try {
      const headers: Record<string, string> = {};
      if (googleToken) {
        headers["Authorization"] = `Bearer ${googleToken}`;
      }
      const res = await fetch("/api/emails?type=inbox", { headers });
      if (!res.ok) throw new Error("API failed");
      const text = await res.text();
      try {
        const data = JSON.parse(text);
        setEmails(data);
        saveCachedEmails("inbox", data);
      } catch (e) {
        throw new Error("Invalid format", { cause: e });
      }
    } catch (err) {
      console.error(err);
    }
  };

  const generatePlan = async () => {
    setGeneratingPlan(true);

    const contextData = {
      tasks: tasks.filter(t => t.status !== "done").map((t) => `- [${t.priority.toUpperCase()}] ${t.title} (${t.category}, due: ${t.deadline || "none"})`).join("\n"),
      emails: emails.map((e) => `- From ${e.fromName} (${e.category}): "${e.subject}" (${e.snippet.substring(0, 100)}...) Needs reply? ${e.needsReply}`).join("\n"),
      calendar: events.map((e) => `- ${e.title} at ${new Date(e.start).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })} - ${new Date(e.end).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}`).join("\n"),
      memory: memoryItems.filter(m => !m.doNotUseAutomatically).map((m) => `- ${m.key}: ${m.value}`).join("\n"),
    };

    try {
      const res = await fetch("/api/plan", { 
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contextData })
      });
      if (!res.ok) throw new Error("API failed");
      const text = await res.text();
      try {
        const data = JSON.parse(text);
        setDailyPlan(data.plan);
        const now = new Date();
        const timestampStr = now.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" }) + ", " + now.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
        setGeneratedAt(timestampStr);
        localStorage.setItem(`dailyPlan_${userId || "default"}`, JSON.stringify(data.plan));
        localStorage.setItem(`dailyPlan_timestamp_${userId || "default"}`, timestampStr);
      } catch (e) {
        throw new Error("Invalid response", { cause: e });
      }
    } catch (err) {
      console.error(err);
    } finally {
      setGeneratingPlan(false);
    }
  };

  const [sendingEmailBrief, setSendingEmailBrief] = useState(false);
  const [emailBriefStatus, setEmailBriefStatus] = useState<"idle" | "sending" | "success" | "error" | "reauth">("idle");

  const handleEmailBrief = async () => {
    if (!dailyPlan) return;
    if (!window.confirm("Are you sure you want to send this daily brief to your email?")) return;
    setSendingEmailBrief(true);
    setEmailBriefStatus("sending");
    try {
      const headers: Record<string, string> = {
        "Content-Type": "application/json"
      };
      if (googleToken) {
        headers["Authorization"] = `Bearer ${googleToken}`;
      }
      const res = await fetch("/api/emails/send", {
        method: "POST",
        headers,
        body: JSON.stringify({
          to: "me",
          subject: `Daily Brief & School Agenda - ${new Date().toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}`,
          body: `Good morning, Dimash.\n\nHere is your custom daily school agenda and task list:\n\n${dailyPlan.content}\n\nRegards,\nDimash Thaosen`
        })
      });

      if (res.status === 403) {
        setEmailBriefStatus("reauth");
        return;
      }

      if (res.ok) {
        setEmailBriefStatus("success");
        setTimeout(() => setEmailBriefStatus("idle"), 5000);
      } else {
        throw new Error("Failed to send");
      }
    } catch (err) {
      console.error(err);
      setEmailBriefStatus("error");
    } finally {
      setSendingEmailBrief(false);
    }
  };

  const [selectedFreeSlot, setSelectedFreeSlot] = useState<any | null>(null);
  const [slottingTask, setSlottingTask] = useState<boolean>(false);

  const handleSlotTask = async (task: any) => {
    if (!selectedFreeSlot) return;
    setSlottingTask(true);
    try {
      const today = new Date();
      const start = new Date(today.getFullYear(), today.getMonth(), today.getDate(), Math.floor(selectedFreeSlot.startMins / 60), selectedFreeSlot.startMins % 60, 0);
      const end = new Date(today.getFullYear(), today.getMonth(), today.getDate(), Math.floor(selectedFreeSlot.endMins / 60), selectedFreeSlot.endMins % 60, 0);

      const headers: Record<string, string> = {
        "Content-Type": "application/json"
      };
      if (googleToken) {
        headers["Authorization"] = `Bearer ${googleToken}`;
      }

      const res = await fetch("/api/calendar", {
        method: "POST",
        headers,
        body: JSON.stringify({
          title: `[Prep] ${task.title}`,
          start: start.toISOString(),
          end: end.toISOString(),
          category: "work",
          taskId: task.id,
          description: `Scheduled focus block slotted dynamically from Task List: ${task.title}`
        })
      });

      if (!res.ok) {
        throw new Error("Failed to create time-block");
      }

      // Close modal
      setSelectedFreeSlot(null);
    } catch (err) {
      console.error(err);
      alert("Failed to create time-block on Google Calendar/Firestore.");
    } finally {
      setSlottingTask(false);
    }
  };

  const [dismissedAlerts, setDismissedAlerts] = useState<string[]>([]);

  // Filter urgent & high tasks
  const pendingUrgent = tasks.filter(
    (t) => t.status !== "done" && (t.priority === "urgent" || t.priority === "high")
  );

  // Filter emails needing reply
  const unreadReplies = emails.filter((e) => e.needsReply && !dismissedAlerts.includes(`email-${e.id}`));

  // Hybrid Needs Attention list (up to 5 items: urgent/high tasks + reply-needed emails)
  const needsAttentionList = [
    ...pendingUrgent.map((t) => ({
      id: `task-${t.id}`,
      originalId: t.id,
      type: "tasks" as const,
      title: t.title,
      badge: t.priority.toUpperCase(),
      subtitle: `Task | ${t.category.toUpperCase()}`,
      badgeBg: t.priority === "urgent" ? "bg-[#f7e4e1] text-[#b83232] border-[#e3c4be]" : "bg-[#fcf3e8] text-[#b8860b] border-[#eed8b3]",
    })),
    ...unreadReplies.map((e) => ({
      id: `email-${e.id}`,
      originalId: e.id,
      type: "emails" as const,
      title: e.subject,
      badge: "REPLY NEEDED",
      subtitle: `Email from | ${e.fromName}`,
      badgeBg: "bg-[#e8f0ec] text-[#2d5a4a] border-[#d2e3da]",
    }))
  ].filter(item => !dismissedAlerts.includes(item.id)).slice(0, 5); // STRICTLY limit to 4-5 important ones

  // Active tasks (any task that is not done)
  const activeTasks = tasks.filter((t) => t.status !== "done");

  // Today's events sorted by start time
  const todayEvents = events
    .filter((evt) => {
      if (!evt.start) return false;
      return new Date(evt.start).toDateString() === new Date().toDateString();
    })
    .sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime());

  const formatTimeLabel = (isoStr: string) => {
    try {
      const d = new Date(isoStr);
      return d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
    } catch {
      return "00:00";
    }
  };
  const todayDayName = new Date().toLocaleDateString("en-US", { weekday: "long" });
  const todayTimetable = timetable.filter(
    (e) => e.day.toLowerCase() === todayDayName.toLowerCase()
  );

  const mappedTimetableToday = todayTimetable.map((t) => ({
    id: `tt-${t.day}-${t.period}`,
    title: `${t.subject} (Class ${t.classSection})`,
    start: t.startTime,
    end: t.endTime,
    isTimetable: true,
    venue: t.room || t.venue || "Classroom",
  }));

  const mappedCalendarToday = todayEvents.map((evt) => ({
    id: evt.id,
    title: evt.title,
    start: formatTimeLabel(evt.start),
    end: formatTimeLabel(evt.end),
    isTimetable: false,
    venue: evt.location || "",
  }));

const parseTime = (timeStr: string) => {
    if (!timeStr) return 0;
    const match = timeStr.match(/(\d+):(\d+)\s*(am|pm)?/i);
    if (!match) return 0;
    let hours = parseInt(match[1], 10);
    const minutes = parseInt(match[2], 10);
    const ampm = match[3] ? match[3].toLowerCase() : "";
    if (ampm === "pm" && hours < 12) hours += 12;
    if (ampm === "am" && hours === 12) hours = 0;
    if (!ampm && hours < 8) {
      hours += 12;
    }
    return hours * 60 + minutes;
  };

  const combinedTodaySlots = [
    ...mappedTimetableToday,
    ...mappedCalendarToday,
  ].sort((a, b) => {
    return parseTime(a.start) - parseTime(b.start);
  });

  const displayDateStr = new Date().toLocaleDateString("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric"
  });

  const formatMinsToTime = (mins: number) => {
    const hours = Math.floor(mins / 60);
    const m = mins % 60;
    const displayHours = hours > 12 ? hours - 12 : hours === 0 ? 12 : hours;
    return `${displayHours}:${m.toString().padStart(2, "0")}`;
  };

  const SCALE = 1.25; // px per minute
  const nowMins = currentTime.getHours() * 60 + currentTime.getMinutes();

  // Construct complete continuous slots including free periods and breaks
  const parsedSlots = combinedTodaySlots.map((s) => {
    const startMins = parseTime(s.start);
    const endMins = parseTime(s.end);
    return {
      ...s,
      startMins,
      endMins,
    };
  }).filter(s => s.startMins > 0 && s.endMins > s.startMins);

  parsedSlots.sort((a, b) => a.startMins - b.startMins);

  const finalSlots: any[] = [];
  let lastEnd = 480; // 8:00 AM

  parsedSlots.forEach((slot) => {
    const startMins = slot.startMins;
    
    if (startMins > lastEnd) {
      const gap = startMins - lastEnd;
      const isLunchTime = (lastEnd >= 720 && lastEnd <= 770) || (startMins >= 750 && startMins <= 810);
      
      if (gap >= 30) {
        if (isLunchTime) {
          finalSlots.push({
            id: `lunch-${lastEnd}-${startMins}`,
            title: "Lunch",
            startMins: lastEnd,
            endMins: startMins,
            isLunch: true,
          });
        } else {
          finalSlots.push({
            id: `free-${lastEnd}-${startMins}`,
            title: "Free period",
            subtitle: `${gap} min · good prep window`,
            startMins: lastEnd,
            endMins: startMins,
            isFree: true,
          });
        }
      } else {
        finalSlots.push({
          id: `break-${lastEnd}-${startMins}`,
          title: isLunchTime ? "Lunch break" : "Short break",
          gap: gap,
          startMins: lastEnd,
          endMins: startMins,
          isBreak: true,
        });
      }
    }
    
    finalSlots.push(slot);
    lastEnd = Math.max(lastEnd, slot.endMins);
  });

  // Fill end of day until 3:00 PM (900 mins)
  if (lastEnd < 900 && parsedSlots.length > 0) {
    const gap = 900 - lastEnd;
    if (gap >= 30) {
      finalSlots.push({
        id: `free-${lastEnd}-900`,
        title: "Free period",
        subtitle: `${gap} min · end of day prep`,
        startMins: lastEnd,
        endMins: 900,
        isFree: true,
      });
    }
  }

  return (
    <div className="animate-fade-up max-w-[1100px] mx-auto space-y-5">
      {/* Planner Header under a hairline */}
      <div className="border-b border-paper-3 pb-4">
        <p className="font-mono text-[11px] tracking-[0.16em] text-[#4a4540] uppercase font-bold">DAILY JOURNAL</p>
        <h2 className="font-serif text-3xl font-normal text-[#1a1612] mt-1.5">{displayDateStr}</h2>
        <p className="font-serif italic text-xs text-[#4a4540] mt-1 pl-0.5">
          "The silent half of teaching is planning the next day with quiet composure."
        </p>
      </div>

      {/* Two overview cards (equal columns) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        
        {/* Needs Attention Overview card */}
        <div className="bg-[#fcf9f3] border border-[#e1d8c6] rounded-[18px] p-5 shadow-[0_6px_24px_-10px_rgba(26,22,18,0.12),0_1px_2px_rgba(26,22,18,0.04)] space-y-4 relative overflow-hidden">
          {/* Vertical Chalk Green or Red Inset Accent Bar (3px vertical, inset 14px top and bottom) */}
          <div className="absolute left-0 top-3.5 bottom-3.5 w-[3px] bg-[#b83232] rounded-r-[3px]"></div>
          
          <div className="flex items-center justify-between">
            <h3 className="font-serif font-bold text-sm text-[#1a1612] flex items-center gap-2 pl-2">
              <AlertCircle className="w-4 h-4 text-[#b83232] stroke-[1.8]" />
              Needs Attention
            </h3>
            <span className="font-mono text-[11px] text-[#b83232] font-bold uppercase tracking-[0.12em] bg-[#f7e4e1] border border-[#e3c4be] px-2 py-0.5 rounded-full leading-none">
              {needsAttentionList.length} {needsAttentionList.length === 1 ? "Alert" : "Alerts"}
            </span>
          </div>

          <div className="space-y-3.5 pt-1 pl-2">
            {needsAttentionList.length === 0 ? (
              <p className="font-sans italic text-xs text-[#4a4540]">All caught up. No urgent items require attention.</p>
            ) : (
              needsAttentionList.map((item) => (
                <div 
                  key={item.id} 
                  className="space-y-0.5 group cursor-pointer"
                  onClick={() => onNavigate(item.type === "tasks" ? "tasks" : "email")}
                >
                  <div className="flex items-start gap-2 relative">
                    <span className={`w-1.5 h-1.5 rounded-full ${item.type === "tasks" ? "bg-[#b83232]" : "bg-[#2d5a4a]"} flex-shrink-0 mt-1.5`} />
                    <div className="flex-1 min-w-0 pr-6">
                      <span className="font-sans font-bold text-[#1a1612] text-xs leading-normal truncate block group-hover:text-[#2d5a4a] transition-colors" title={item.title}>
                        {item.title}
                      </span>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <span className={`font-mono text-[11px] px-1 py-0.2 rounded border uppercase font-bold leading-none ${item.badgeBg}`}>
                          {item.badge}
                        </span>
                        <span className="font-mono text-[11px] text-[#4a4540] uppercase tracking-wider truncate">
                          {item.subtitle}
                        </span>
                      </div>
                    </div>
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        setDismissedAlerts(prev => [...prev, item.id]);
                      }}
                      className="absolute right-0 top-0.5 opacity-0 group-hover:opacity-100 p-0.5 text-[#4a4540] hover:text-[#b83232] transition-opacity focus:outline-none focus-visible:ring-2 focus-visible:ring-[#2d5a4a]/40 "
                      title="Dismiss"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Awaiting Reply Overview Card */}
        <div className="bg-[#fcf9f3] border border-[#e1d8c6] rounded-[18px] p-5 shadow-[0_6px_24px_-10px_rgba(26,22,18,0.12),0_1px_2px_rgba(26,22,18,0.04)] space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-serif font-bold text-sm text-[#1a1612] flex items-center gap-2">
              <Clock className="w-4 h-4 text-[#b8860b] stroke-[1.8]" />
              Awaiting Reply
            </h3>
            <span className="font-mono text-[11px] text-[#2d5a4a] font-bold uppercase tracking-[0.12em] bg-[#e8f0ec] border border-[#d2e3da] px-2 py-0.5 rounded-full leading-none">
              {unreadReplies.length} Awaiting
            </span>
          </div>

          <div className="space-y-3 pt-1">
            {unreadReplies.length === 0 ? (
              <p className="font-sans italic text-xs text-[#4a4540]">All clear! No current emails awaiting a reply.</p>
            ) : (
              unreadReplies.slice(0, 5).map((e) => (
                <div 
                  key={e.id} 
                  className="space-y-0.5 group cursor-pointer relative pr-6"
                  onClick={() => onNavigate("email")}
                >
                  <p className="font-sans font-bold text-[#1a1612] text-xs leading-tight truncate group-hover:text-[#2d5a4a] transition-colors" title={e.subject}>
                    {e.subject}
                  </p>
                  <p className="font-mono text-[11px] text-[#4a4540] uppercase tracking-wider truncate">
                    FROM: {e.fromName.toUpperCase()}
                  </p>
                  <button 
                    onClick={(evt) => {
                      evt.stopPropagation();
                      setDismissedAlerts(prev => [...prev, `email-${e.id}`]);
                    }}
                    className="absolute right-0 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 p-0.5 text-[#4a4540] hover:text-[#b83232] transition-opacity focus:outline-none focus-visible:ring-2 focus-visible:ring-[#2d5a4a]/40 "
                    title="Dismiss"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))
            )}

            <div className="pt-1.5">
              <button
                onClick={() => onNavigate("email")}
                className="font-mono text-[11px] text-[#2d5a4a] hover:text-[#3a7560] font-bold tracking-wider uppercase flex items-center gap-1 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#2d5a4a]/40 transition-colors"
              >
                Open inbox →
              </button>
            </div>
          </div>
        </div>

      </div>

      {/* Today's Timetable Grid Row */}
      <div className="bg-[#fcf9f3] border border-[#e1d8c6] rounded-[18px] p-5 shadow-[0_6px_24px_-10px_rgba(26,22,18,0.12),0_1px_2px_rgba(26,22,18,0.04)] space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-[#ece6db] pb-3 gap-3">
          <div className="space-y-1 text-left">
            <h3 className="font-serif font-bold text-2xl text-[#1a1612]">
              Today's schedule
            </h3>
            <p className="font-sans text-xs text-[#4a4540]/85">
              {displayDateStr}
            </p>
          </div>
          <div className="flex items-center gap-3 self-start sm:self-center">
            {/* Realtime Live Pill */}
            <div className="flex items-center gap-1.5 px-3 py-1 bg-[#faebe8] border border-[#f3d3cb] text-[#b83232] rounded-full text-[11px] font-sans font-semibold">
              <span className="w-1.5 h-1.5 rounded-full bg-[#b83232] animate-pulse"></span>
              <span>now · {currentTime.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}</span>
            </div>
            <button
              onClick={() => onNavigate("timetable")}
              className="font-mono text-[11px] text-[#2d5a4a] hover:text-white bg-transparent hover:bg-[#2d5a4a] border border-[#d2e3da] px-3 py-1 rounded-[6px] transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-[#2d5a4a]/40 "
            >
              Manage Timetable →
            </button>
          </div>
        </div>

        {/* Legend row */}
        <div className="flex items-center gap-5 text-[11px] text-[#4a4540] font-sans font-medium py-1">
          <div className="flex items-center gap-2">
            <span className="w-3.5 h-3.5 rounded bg-[#e8f0ec] border border-[#cbe3d6] inline-block"></span>
            <span>Teaching</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3.5 h-3.5 rounded bg-[#e8eef7] border border-[#c1d4eb] inline-block"></span>
            <span>Meeting</span>
          </div>
          <div className="flex items-center gap-2 flex-nowrap">
            <span className="w-3.5 h-3.5 rounded border border-dashed border-[#e1d8c6] inline-block"></span>
            <span>Free / gap</span>
          </div>
        </div>

        {timetable.length === 0 ? (
          <div className="flex items-center justify-between py-2 text-xs text-[#4a4540] italic font-serif">
            <span>Your weekly school timetable has not been loaded yet.</span>
            <button
              onClick={() => onNavigate("timetable")}
              className="text-[#2d5a4a] font-mono text-[11px] font-bold uppercase tracking-wider focus:outline-none focus-visible:ring-2 focus-visible:ring-[#2d5a4a]/40"
            >
              Parse PDF Data →
            </button>
          </div>
        ) : todayDayName === "Saturday" || todayDayName === "Sunday" ? (
          <div className="py-8 text-center bg-white border border-[#e1d8c6] rounded-xl">
            <p className="font-serif italic text-xs text-[#4a4540]">
              It's the weekend! No teaching or periods are scheduled for today ({todayDayName}).
            </p>
            <button
              onClick={() => onNavigate("timetable")}
              className="mt-3 font-mono text-[11px] text-[#2d5a4a] border border-[#d2e3da] px-3 py-1 rounded-[6px] hover:bg-[#2d5a4a] hover:text-white transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-[#2d5a4a]/40"
            >
              View Full Weekly Timetable
            </button>
          </div>
        ) : (
          <div className="relative mt-2">
            {/* Desktop View (Time proportional) */}
            <div className="hidden md:block relative border-l border-[#e1d8c6] ml-16 pb-4">
              {/* Hour markers 8am to 3pm */}
              {[8, 9, 10, 11, 12, 13, 14, 15].map(hour => (
                <div key={hour} className="absolute w-full border-t border-[#ece6db]/60 z-0" style={{ top: `${(hour * 60 - 480) * SCALE}px` }}>
                  <span className="absolute -left-16 -top-2.5 w-12 text-right font-mono text-[11px] text-[#4a4540]">
                    {hour === 12 ? '12 pm' : hour > 12 ? `${hour - 12} pm` : `${hour} am`}
                  </span>
                </div>
              ))}
              
              {/* Current time marker line */}
              {(() => {
                if (nowMins >= 480 && nowMins <= 900) {
                  const nowTop = (nowMins - 480) * SCALE;
                  return (
                    <div className="absolute w-[calc(100%-1rem)] z-10 pointer-events-none ml-4" style={{ top: `${nowTop}px` }}>
                      {/* Red dot on the left axis */}
                      <div className="absolute -left-[21px] -top-[5px] w-2.5 h-2.5 rounded-full bg-[#b83232]"></div>
                      {/* Continuous red strike line */}
                      <div className="w-full border-t-2 border-[#b83232]"></div>
                    </div>
                  );
                }
                return null;
              })()}

              {/* Render slots and free periods */}
              <div className="relative w-full ml-4" style={{ height: `${(15 * 60 - 480) * SCALE}px` }}>
                {finalSlots.map((slot) => {
                  const top = (slot.startMins - 480) * SCALE;
                  const height = (slot.endMins - slot.startMins) * SCALE;
                  
                  if (slot.isLunch || slot.isBreak) {
                    return (
                      <div 
                        key={slot.id} 
                        className="absolute w-[calc(100%-1rem)] flex items-center justify-center text-[#4a4540]/60 italic font-serif text-[11px] select-none"
                        style={{ top: `${top}px`, height: `${height}px` }}
                      >
                        <span>
                          {slot.isLunch 
                            ? `Lunch · ${formatMinsToTime(slot.startMins)}–${formatMinsToTime(slot.endMins)}` 
                            : `Short break · ${slot.gap} min`}
                        </span>
                      </div>
                    );
                  }

                  const isPast = slot.endMins <= nowMins;
                  const isCurrent = nowMins >= slot.startMins && nowMins < slot.endMins;

                  const leftBarBg = slot.isFree 
                    ? "" 
                    : slot.isTimetable 
                      ? "bg-[#2d5a4a]" 
                      : "bg-[#2c4a7c]";

                  return (
                    <div 
                      key={slot.id} 
                      onClick={slot.isFree ? () => setSelectedFreeSlot(slot) : undefined}
                      title={slot.isFree ? "Click to slot a pending task into this free period" : undefined}
                      className={`absolute w-[calc(100%-1rem)] rounded-[8px] border transition-all duration-200 hover:shadow-sm overflow-hidden flex ${
                        slot.isFree 
                          ? "border-2 border-dashed border-[#e1d8c6] hover:bg-[#fcf9f3]/40 hover:border-[#2d5a4a] bg-transparent cursor-pointer" 
                          : isPast 
                            ? "bg-[#f5f1e8] border-[#ece6db] opacity-75" 
                            : isCurrent 
                              ? "bg-white border-[#2d5a4a] border-2 shadow-[0_4px_12px_-4px_rgba(45,90,74,0.15)] z-2" 
                              : slot.isTimetable 
                                ? "bg-[#e8f0ec]/40 border-[#cbe3d6]" 
                                : "bg-[#e8eef7]/40 border-[#c1d4eb]"
                      }`}
                      style={{ top: `${top}px`, height: `${height}px` }}
                    >
                      {/* Left thick accent bar */}
                      {!slot.isFree && (
                        <div className={`w-[3px] self-stretch ${leftBarBg} ${isPast ? "opacity-60" : ""}`} />
                      )}

                      {/* Inner layout (col-1: Time, col-2: divider, col-3: Info, col-4: status/badge) */}
                      <div className="flex-1 flex items-center justify-between px-3 py-0.5">
                        {/* Left Column: Time */}
                        <div className="w-[78px] flex-shrink-0 text-left">
                          <span className={`font-mono text-[11px] ${
                            isPast ? "text-[#4a4540]/65 line-through" : isCurrent ? "text-[#b83232] font-bold" : "text-[#4a4540]"
                          }`}>
                            {formatMinsToTime(slot.startMins)}–{formatMinsToTime(slot.endMins)}
                          </span>
                        </div>

                        {/* Divider Line */}
                        <div className={`h-6 w-[1px] ${slot.isFree ? "border-l border-dashed border-[#e1d8c6]" : "bg-[#e1d8c6]/60"} mx-1.5 flex-shrink-0`} />

                        {/* Middle Column: Title & Subtitle */}
                        <div className="flex-grow min-w-0 px-1 text-left">
                          {slot.isFree ? (
                            <>
                              <h4 className="font-serif italic text-xs text-[#4a4540] font-semibold leading-tight">Free period</h4>
                              <p className="font-sans text-[10px] text-[#4a4540]/70 truncate leading-tight">{slot.subtitle}</p>
                            </>
                          ) : (
                            <>
                              <h4 className={`font-sans font-bold text-xs leading-tight truncate ${
                                isPast ? "text-[#4a4540]/75 line-through italic" : slot.isTimetable ? "text-[#2d5a4a]" : "text-[#2c4a7c]"
                              }`}>
                                {slot.title}
                              </h4>
                              <p className="font-sans text-[10px] text-[#4a4540]/80 mt-0.5 truncate leading-tight">
                                {slot.isTimetable 
                                  ? `${slot.title.includes("Class") ? "" : "Class "}${slot.classSection || ""} · Room ${slot.venue || "Room"}`
                                  : slot.venue || "No location"}
                              </p>
                            </>
                          )}
                        </div>

                        {/* Right Column: Status / Action Badge */}
                        <div className="flex-shrink-0 pl-1.5">
                          {isPast ? (
                            <span className="font-serif italic text-[11px] text-[#4a4540]/60 select-none">done</span>
                          ) : isCurrent ? (
                            <span className="font-mono text-[9px] bg-[#2d5a4a] text-white px-2 py-0.5 rounded-full tracking-wider font-bold uppercase leading-none">
                              NOW
                            </span>
                          ) : slot.isFree ? (
                            <span 
                              onClick={() => onNavigate("tasks")}
                              className="font-mono text-[9px] text-[#2d5a4a] hover:text-[#1f4236] font-bold uppercase tracking-wider flex items-center gap-1 cursor-pointer select-none"
                            >
                              ↳ slot a task
                            </span>
                          ) : null}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Mobile View (Stacked Agenda) */}
            <div className="md:hidden space-y-3">
              {finalSlots.length === 0 ? (
                <div className="text-center py-6 border border-dashed border-[#e1d8c6] rounded-xl">
                  <span className="font-sans italic text-[11px] text-[#4a4540]">No events or periods scheduled.</span>
                </div>
              ) : (
                finalSlots.map((slot) => {
                  if (slot.isLunch || slot.isBreak) {
                    return (
                      <div key={slot.id} className="text-center py-2 text-[#4a4540]/60 italic font-serif text-xs">
                        {slot.isLunch 
                          ? `Lunch · ${formatMinsToTime(slot.startMins)}–${formatMinsToTime(slot.endMins)}` 
                          : `Short break · ${slot.gap} min`}
                      </div>
                    );
                  }

                  const isPast = slot.endMins <= nowMins;
                  const isCurrent = nowMins >= slot.startMins && nowMins < slot.endMins;

                  let bgClass = slot.isTimetable ? "bg-[#e8f0ec] border-[#cbe3d6]" : "bg-[#e8eef7] border-[#c1d4eb]";
                  let textClass = slot.isTimetable ? "text-[#2d5a4a]" : "text-[#2c4a7c]";
                  
                  if (slot.isFree) {
                    bgClass = "border-2 border-dashed border-[#e1d8c6] bg-transparent";
                    textClass = "text-[#4a4540]";
                  } else if (isPast) {
                    bgClass = "bg-[#f5f1e8] border-[#ece6db] opacity-75";
                    textClass = "text-[#4a4540]";
                  } else if (isCurrent) {
                    bgClass = "bg-white border-[#2d5a4a] border-2 shadow-sm";
                  }

                  const leftBarBg = slot.isFree 
                    ? "" 
                    : slot.isTimetable 
                      ? "bg-[#2d5a4a]" 
                      : "bg-[#2c4a7c]";

                  return (
                    <div 
                      key={slot.id} 
                      className={`border rounded-xl overflow-hidden flex transition-all ${bgClass} ${isCurrent ? "ring-2 ring-[#2d5a4a] ring-offset-1" : ""}`}
                    >
                      {!slot.isFree && (
                        <div className={`w-[4px] self-stretch ${leftBarBg} ${isPast ? "opacity-60" : ""}`} />
                      )}
                      <div className="flex-1 p-3 flex justify-between items-center gap-2">
                        <div className="text-left">
                          {slot.isFree ? (
                            <>
                              <h4 className="font-serif italic text-xs text-[#4a4540] font-semibold">Free period</h4>
                              <p className="font-mono text-[11px] text-[#4a4540]/70 mt-0.5">{formatMinsToTime(slot.startMins)} – {formatMinsToTime(slot.endMins)}</p>
                            </>
                          ) : (
                            <>
                              <h4 className={`font-sans font-bold text-xs ${textClass} ${isPast ? "line-through italic text-[#4a4540]/60" : ""}`}>
                                {slot.title}
                              </h4>
                              <p className="font-mono text-[11px] text-[#4a4540] mt-0.5">
                                {formatMinsToTime(slot.startMins)} – {formatMinsToTime(slot.endMins)}
                                {slot.venue && ` · ${slot.venue}`}
                              </p>
                            </>
                          )}
                        </div>
                        <div className="text-right flex flex-col items-end gap-1.5 flex-shrink-0">
                          {isPast ? (
                            <span className="font-serif italic text-[11px] text-[#4a4540]/60">done</span>
                          ) : isCurrent ? (
                            <span className="font-mono text-[10px] bg-[#2d5a4a] text-white px-2 py-0.5 rounded font-bold uppercase tracking-wider">
                              NOW
                            </span>
                          ) : slot.isFree ? (
                            <span 
                              onClick={() => onNavigate("tasks")}
                              className="font-mono text-[10px] text-[#2d5a4a] font-bold uppercase tracking-wider cursor-pointer"
                            >
                              ↳ slot a task
                            </span>
                          ) : null}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}

      </div>

      {/* Two lower cards (left ≈1fr, right ≈1.1fr) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 pt-1">
        
        {/* Active Tasks (left ≈1fr -> lg:col-span-5) */}
        <div className="lg:col-span-5 bg-[#fcf9f3] border border-[#e1d8c6] rounded-[18px] p-5 shadow-[0_6px_24px_-10px_rgba(26,22,18,0.12),0_1px_2px_rgba(26,22,18,0.04)] flex flex-col justify-between space-y-4">
          <div className="flex items-center justify-between border-b border-[#ece6db] pb-3">
            <h3 className="font-serif font-bold text-base text-[#1a1612]">Active Tasks</h3>
            <span className="font-mono text-[11px] text-[#4a4540] font-bold uppercase tracking-[0.12em]">
              {activeTasks.length} {activeTasks.length === 1 ? "remain" : "remain"}
            </span>
          </div>

          <div className="space-y-4 flex-1">
            {loadingTasks ? (
              <p className="font-sans text-xs text-[#4a4540]">Loading tasks...</p>
            ) : activeTasks.length === 0 ? (
              <p className="font-sans italic text-xs text-[#4a4540]">All clear! No current active tasks.</p>
            ) : (
              activeTasks.slice(0, 5).map((t) => {
                let priorityColor = "#2d5a4a"; // neutral
                if (t.priority === "urgent" || t.priority === "high") {
                  priorityColor = "#b83232";
                } else if (t.priority === "medium") {
                  priorityColor = "#b8860b";
                }
                return (
                  <div key={t.id} className="flex items-start gap-2.5 animate-fade-in">
                    <span 
                      className="w-[7px] h-[7px] rounded-full mt-1.5 flex-shrink-0 animate-pulse" 
                      style={{ backgroundColor: priorityColor }}
                    />
                    <div className="min-w-0">
                      <span className="font-sans text-xs text-[#1a1612] font-semibold block leading-snug truncate" title={t.title}>
                        {t.title}
                      </span>
                      <span className="font-mono text-[11px] text-[#4a4540] uppercase tracking-wider block mt-0.5">
                        {t.category}
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Today's Brief / Daily Brief (right ≈1.1fr -> lg:col-span-7) */}
        <div className="lg:col-span-7 bg-[#fcf9f3] border border-[#e1d8c6] rounded-[18px] p-5 shadow-[0_6px_24px_-10px_rgba(26,22,18,0.12),0_1px_2px_rgba(26,22,18,0.04)] flex flex-col justify-between space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-[#ece6db] pb-3 gap-2">
            <div className="space-y-0.5">
              <h3 className="font-serif font-bold text-base text-[#1a1612] flex items-center gap-2">
                <Sparkles className="w-4.5 h-4.5 text-[#2d5a4a] stroke-[1.8]" />
                Today's Brief
              </h3>
              {generatedAt && (
                <p className="text-[11px] font-mono text-[#4a4540] lowercase">
                  calculated at: {generatedAt}
                </p>
              )}
            </div>
            <div className="flex items-center gap-2">
              {dailyPlan && (
                <button
                  onClick={handleEmailBrief}
                  disabled={sendingEmailBrief || !googleToken}
                  className="font-mono text-[11px] text-[#2d5a4a] hover:text-white bg-transparent hover:bg-[#2d5a4a] border border-[#d2e3da] px-2.5 py-1 rounded-[8px] transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-[#2d5a4a]/40 disabled:opacity-50 inline-flex items-center gap-1 cursor-pointer select-none"
                  title={googleToken ? "Sends this Pointwise Daily Brief directly to your Gmail account" : "Google sign-in required to email brief"}
                >
                  <Mail className="w-3.5 h-3.5" />
                  {emailBriefStatus === "sending" ? "Sending..." : emailBriefStatus === "success" ? "Sent Brief!" : emailBriefStatus === "reauth" ? "Needs Auth" : emailBriefStatus === "error" ? "Error!" : "Email Me"}
                </button>
              )}
              <span className="font-mono text-[11px] text-[#2d5a4a] font-bold uppercase tracking-[0.12em] bg-[#e8f0ec] border border-[#d2e3da] px-2.5 py-0.5 rounded-full leading-none whitespace-nowrap">
                {dailyPlan ? "Grounded" : "Not Built"}
              </span>
              <button
                onClick={generatePlan}
                disabled={generatingPlan}
                className="font-mono text-[11px] text-[#2d5a4a] hover:text-white bg-transparent hover:bg-[#2d5a4a] border border-[#d2e3da] px-2.5 py-1 rounded-[8px] transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-[#2d5a4a]/40 disabled:opacity-50 inline-block cursor-pointer select-none"
                title="Regenerates Today's Brief based on current live context data"
              >
                {generatingPlan ? "Structuring..." : dailyPlan ? "Refresh Brief" : "Generate Brief"}
              </button>
            </div>
          </div>

          <div className="flex-1 space-y-4.5">
            {generatingPlan ? (
              <div className="flex flex-col items-center justify-center py-12 px-4 text-center space-y-4 animate-fade-in min-h-[220px]">
                <div className="w-10 h-10 rounded-full bg-[#e8f0ec] flex items-center justify-center text-[#2d5a4a] animate-spin">
                  <Sparkles className="w-5 h-5 stroke-[1.8]" />
                </div>
                <div className="space-y-1">
                  <h4 className="font-serif font-bold text-sm text-[#1a1612] animate-pulse">
                    Structuring Pointwise Daily Brief...
                  </h4>
                  <p className="font-mono text-[11px] text-[#4a4540] uppercase tracking-widest leading-none mt-1">
                    Processing inbox, active tasks, & scheduled periods
                  </p>
                </div>
              </div>
            ) : dailyPlan ? (
              <div className="space-y-2 text-xs font-sans text-ink-900 leading-relaxed markdown-brief pr-1 max-h-72 overflow-y-auto">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                  {dailyPlan.content}
                </ReactMarkdown>
                <div className="pt-3 border-t border-[#ece6db] mt-4">
                  <p className="font-serif italic text-[11px] text-[#4a4540]">
                     Grounded dynamically in active parent communications and scheduled periods. Listed items are sorted chronologically where scheduled.
                  </p>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-10 px-4 text-center border border-dashed border-[#e1d8c6] rounded-xl bg-[#faf7f0]/40 space-y-4 min-h-[220px]">
                <div className="w-10 h-10 rounded-full bg-[#fcf9f3] border border-[#e1d8c6] flex items-center justify-center text-[#2d5a4a]">
                  <Sparkles className="w-5 h-5 stroke-[1.8]" />
                </div>
                <div className="space-y-1">
                  <h4 className="font-serif font-bold text-sm text-[#1a1612]">
                    No Active Daily Brief Built Yet
                  </h4>
                  <p className="font-sans text-xs text-[#4a4540] max-w-[320px]">
                    Process your real-time emails, active task schedules, and calendar periods into a custom POINTWISE agenda.
                  </p>
                </div>
                <button
                  onClick={generatePlan}
                  disabled={generatingPlan}
                  className="font-mono text-[11px] text-[#fcf9f3] bg-[#2d5a4a] hover:bg-[#3a7560] border border-transparent px-4 py-2 rounded-lg transition-all font-bold uppercase tracking-wider disabled:opacity-50 inline-flex items-center gap-1.5 cursor-pointer shadow-sm hover:shadow"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  Create Daily Brief
                </button>
              </div>
            )}
          </div>
        </div>

      </div>

      {/* Time-Blocking Task Selection Modal */}
      {selectedFreeSlot && (
        <div className="fixed inset-0 bg-[#1a1612]/30 backdrop-blur-[1.5px] z-50 flex items-center justify-center p-4">
          <div className="bg-[#fcf9f3] border-2 border-[#e1d8c6] rounded-xl max-w-md w-full p-5 space-y-4 shadow-xl text-left">
            <div className="flex items-center justify-between border-b border-[#ece6db] pb-2">
              <div>
                <h3 className="font-serif font-bold text-sm text-[#1a1612]">
                  Slot Task into Free Period
                </h3>
                <p className="font-mono text-[10px] text-[#4a4540]/80">
                  {formatMinsToTime(selectedFreeSlot.startMins)} – {formatMinsToTime(selectedFreeSlot.endMins)} ({selectedFreeSlot.endMins - selectedFreeSlot.startMins} mins)
                </p>
              </div>
              <button
                onClick={() => setSelectedFreeSlot(null)}
                className="text-[#4a4540]/60 hover:text-[#1a1612] p-1 hover:bg-[#faf7f0] rounded-full transition-all"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3">
              <p className="font-sans text-xs text-[#4a4540]">
                Select a pending task from your organizer to schedule as a dedicated focus preparation block:
              </p>

              <div className="max-h-60 overflow-y-auto space-y-2 pr-1">
                {tasks.filter(t => t.status !== "done").length === 0 ? (
                  <p className="text-xs font-serif italic text-[#4a4540]/60 py-4 text-center">
                    No active pending tasks found in organizer.
                  </p>
                ) : (
                  tasks.filter(t => t.status !== "done").map((task) => (
                    <button
                      key={task.id}
                      onClick={() => handleSlotTask(task)}
                      disabled={slottingTask}
                      className="w-full text-left p-3 rounded-lg border border-[#ece6db] bg-[#faf7f0]/50 hover:bg-[#e8f0ec]/40 hover:border-[#cbe3d6] transition-all flex items-start justify-between gap-3 group disabled:opacity-50 cursor-pointer"
                    >
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className={`text-[9px] font-mono font-bold uppercase tracking-wider px-1.5 py-0.5 rounded ${
                            task.priority === "urgent" 
                              ? "bg-[#fbe8e8] text-[#a82525]" 
                              : task.priority === "high"
                                ? "bg-[#fdf0d5] text-[#b07d22]"
                                : "bg-[#e8f0ec] text-[#2d5a4a]"
                          }`}>
                            {task.priority}
                          </span>
                          <span className="text-[9px] font-mono text-[#4a4540]/60 uppercase tracking-wider">
                            {task.category}
                          </span>
                        </div>
                        <h4 className="font-sans font-medium text-xs text-[#1a1612] mt-1.5 group-hover:text-[#2d5a4a] transition-all truncate">
                          {task.title}
                        </h4>
                      </div>
                      <span className="text-[10px] font-mono text-[#2d5a4a] opacity-0 group-hover:opacity-100 transition-all font-bold self-center whitespace-nowrap">
                        Assign →
                      </span>
                    </button>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
