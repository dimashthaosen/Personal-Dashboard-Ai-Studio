import React, { useState, useEffect } from "react";
import { Email, DailyPlan } from "../types";
import { AlertCircle, Calendar, Clock, Sparkles, X } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { useFirestoreTasks, useFirestoreEvents, useFirestoreMemory } from "../lib/hooks";
import { getCachedEmails, saveCachedEmails } from "./EmailView";

interface DashboardViewProps {
  onNavigate: (tab: string) => void;
  googleToken?: string | null;
  userId?: string;
}

export default function DashboardView({ onNavigate, googleToken, userId }: DashboardViewProps) {
  const { tasks, loading: loadingTasks } = useFirestoreTasks(userId);
  const { events, loading: loadingEvents } = useFirestoreEvents(userId);
  const { memoryItems } = useFirestoreMemory(userId);

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

  const [loadingEmails, setLoadingEmails] = useState(true);
  const [generatingPlan, setGeneratingPlan] = useState(false);

  useEffect(() => {
    fetchEmails();
  }, [googleToken]);

  const fetchEmails = async () => {
    const cached = getCachedEmails("inbox");
    const now = Date.now();
    const REFRESH_COOLDOWN = 5 * 60 * 1000; // 5 minutes

    if (cached) {
      setEmails(cached.data);
      setLoadingEmails(false);
      
      // If still fresh, skip network call completely!
      if (now - cached.timestamp < REFRESH_COOLDOWN) {
        return;
      }
    } else {
      setLoadingEmails(true);
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
        throw new Error("Invalid format");
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingEmails(false);
    }
  };

  const generatePlan = async () => {
    setGeneratingPlan(true);

    const contextData = {
      tasks: tasks.filter(t => t.status !== "done").map((t) => `- [${t.priority.toUpperCase()}] ${t.title} (${t.category}, due: ${t.deadline || "none"})`).join("\n"),
      emails: emails.map((e) => `- From ${e.fromName} (${e.category}): "${e.subject}" (${e.snippet.substring(0, 100)}...) Needs reply? ${e.needsReply}`).join("\n"),
      calendar: events.map((e) => `- ${e.title} at ${new Date(e.start).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })} - ${new Date(e.end).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}`).join("\n"),
      memory: memoryItems.map((m) => `- ${m.key}: ${m.value}`).join("\n"),
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
        throw new Error("Invalid response");
      }
    } catch (err) {
      console.error(err);
    } finally {
      setGeneratingPlan(false);
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
      subtitle: `Task • ${t.category.toUpperCase()}`,
      badgeBg: t.priority === "urgent" ? "bg-[#f7e4e1] text-[#b83232] border-[#e3c4be]" : "bg-[#fcf3e8] text-[#b8860b] border-[#eed8b3]",
    })),
    ...unreadReplies.map((e) => ({
      id: `email-${e.id}`,
      originalId: e.id,
      type: "emails" as const,
      title: e.subject,
      badge: "REPLY NEEDED",
      subtitle: `Email from • ${e.fromName}`,
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
    } catch (err) {
      return "00:00";
    }
  };

  const displayDateStr = new Date().toLocaleDateString("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric"
  });

  return (
    <div className="animate-fade-up max-w-[1100px] mx-auto space-y-7">
      {/* Planner Header under a hairline */}
      <div className="border-b border-paper-3 pb-4">
        <p className="font-mono text-[10px] tracking-[0.16em] text-[#7a756f] uppercase font-bold">DAILY JOURNAL</p>
        <h2 className="font-serif text-3xl font-normal text-[#1a1612] mt-1.5">{displayDateStr}</h2>
        <p className="font-serif italic text-xs text-[#4a4540] mt-1 pl-0.5">
          “The silent half of teaching is planning the next day with quiet composure.”
        </p>
      </div>

      {/* Three overview cards (equal columns) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* Needs Attention Overview card */}
        <div className="bg-[#fcf9f3] border border-[#e1d8c6] rounded-[18px] p-6 shadow-[0_6px_24px_-10px_rgba(26,22,18,0.12),0_1px_2px_rgba(26,22,18,0.04)] space-y-4 relative overflow-hidden">
          {/* Vertical Chalk Green or Red Inset Accent Bar (3px vertical, inset 14px top and bottom) */}
          <div className="absolute left-0 top-3.5 bottom-3.5 w-[3px] bg-[#b83232] rounded-r-[3px]"></div>
          
          <div className="flex items-center justify-between">
            <h3 className="font-serif font-bold text-sm text-[#1a1612] flex items-center gap-2 pl-2">
              <AlertCircle className="w-4 h-4 text-[#b83232] stroke-[1.8]" />
              Needs Attention
            </h3>
            <span className="font-mono text-[9px] text-[#b83232] font-bold uppercase tracking-[0.12em] bg-[#f7e4e1] border border-[#e3c4be] px-2 py-0.5 rounded-full leading-none">
              {needsAttentionList.length} {needsAttentionList.length === 1 ? "Alert" : "Alerts"}
            </span>
          </div>

          <div className="space-y-3.5 pt-1 pl-2">
            {needsAttentionList.length === 0 ? (
              <p className="font-sans italic text-xs text-[#8b857b]">All caught up. No urgent items require attention.</p>
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
                        <span className={`font-mono text-[8px] px-1 py-0.2 rounded border uppercase font-bold leading-none ${item.badgeBg}`}>
                          {item.badge}
                        </span>
                        <span className="font-mono text-[9px] text-[#8b857b] uppercase tracking-wider truncate">
                          {item.subtitle}
                        </span>
                      </div>
                    </div>
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        setDismissedAlerts(prev => [...prev, item.id]);
                      }}
                      className="absolute right-0 top-0.5 opacity-0 group-hover:opacity-100 p-0.5 text-[#8b857b] hover:text-[#b83232] transition-opacity focus:outline-none"
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
        <div className="bg-[#fcf9f3] border border-[#e1d8c6] rounded-[18px] p-6 shadow-[0_6px_24px_-10px_rgba(26,22,18,0.12),0_1px_2px_rgba(26,22,18,0.04)] space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-serif font-bold text-sm text-[#1a1612] flex items-center gap-2">
              <Clock className="w-4 h-4 text-[#b8860b] stroke-[1.8]" />
              Awaiting Reply
            </h3>
            <span className="font-mono text-[9px] text-[#2d5a4a] font-bold uppercase tracking-[0.12em] bg-[#e8f0ec] border border-[#d2e3da] px-2 py-0.5 rounded-full leading-none">
              {unreadReplies.length} Awaiting
            </span>
          </div>

          <div className="space-y-3 pt-1">
            {unreadReplies.length === 0 ? (
              <p className="font-sans italic text-xs text-[#8b857b]">All clear! No current emails awaiting a reply.</p>
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
                  <p className="font-mono text-[9px] text-[#8b857b] uppercase tracking-wider truncate">
                    FROM: {e.fromName.toUpperCase()}
                  </p>
                  <button 
                    onClick={(evt) => {
                      evt.stopPropagation();
                      setDismissedAlerts(prev => [...prev, `email-${e.id}`]);
                    }}
                    className="absolute right-0 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 p-0.5 text-[#8b857b] hover:text-[#b83232] transition-opacity focus:outline-none"
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
                className="font-mono text-[10px] text-[#2d5a4a] hover:text-[#3a7560] font-bold tracking-wider uppercase flex items-center gap-1 focus:outline-none transition-colors"
              >
                Open inbox →
              </button>
            </div>
          </div>
        </div>

        {/* Timetable Overview Card */}
        <div className="bg-[#fcf9f3] border border-[#e1d8c6] rounded-[18px] p-6 shadow-[0_6px_24px_-10px_rgba(26,22,18,0.12),0_1px_2px_rgba(26,22,18,0.04)] space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-serif font-bold text-sm text-[#1a1612] flex items-center gap-2">
              <Calendar className="w-4 h-4 text-[#2d5a4a] stroke-[1.8]" />
              Timetable
            </h3>
            <span className="font-mono text-[9px] text-[#2d5a4a] font-bold uppercase tracking-[0.12em] bg-[#e8f0ec] border border-[#d2e3da] px-2 py-0.5 rounded-full leading-none">
              {todayEvents.length} {todayEvents.length === 1 ? "Slot" : "Slots"}
            </span>
          </div>

          <div className="space-y-3.5 pt-1">
            {loadingEvents ? (
              <p className="font-sans text-xs text-[#8b857b]">Loading periods...</p>
            ) : todayEvents.length === 0 ? (
              <p className="font-sans italic text-xs text-[#8b857b]">No active slots scheduled for today.</p>
            ) : (
              todayEvents.map((evt) => (
                <div key={evt.id} className="flex items-center gap-3.5 text-xs">
                  <span className="font-mono text-[9px] text-[#2d5a4a] font-bold tracking-wider uppercase bg-[#e8f0ec] border border-[#d2e3da] rounded px-2 py-0.5 whitespace-nowrap">
                    {formatTimeLabel(evt.start)}
                  </span>
                  <p className="font-sans text-ink-700 truncate leading-snug" title={evt.title}>
                    {evt.title}
                  </p>
                </div>
              ))
            )}
          </div>
        </div>

      </div>

      {/* Two lower cards (left ≈1fr, right ≈1.1fr) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 pt-1">
        
        {/* Active Tasks (left ≈1fr -> lg:col-span-5) */}
        <div className="lg:col-span-5 bg-[#fcf9f3] border border-[#e1d8c6] rounded-[18px] p-6 shadow-[0_6px_24px_-10px_rgba(26,22,18,0.12),0_1px_2px_rgba(26,22,18,0.04)] flex flex-col justify-between space-y-4">
          <div className="flex items-center justify-between border-b border-[#ece6db] pb-3">
            <h3 className="font-serif font-bold text-base text-[#1a1612]">Active Tasks</h3>
            <span className="font-mono text-[10px] text-[#8b857b] font-bold uppercase tracking-[0.12em]">
              {activeTasks.length} {activeTasks.length === 1 ? "remain" : "remain"}
            </span>
          </div>

          <div className="space-y-4 flex-1">
            {loadingTasks ? (
              <p className="font-sans text-xs text-[#8b857b]">Loading tasks...</p>
            ) : activeTasks.length === 0 ? (
              <p className="font-sans italic text-xs text-[#8b857b]">All clear! No current active tasks.</p>
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
                      <span className="font-mono text-[9px] text-[#8b857b] uppercase tracking-wider block mt-0.5">
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
        <div className="lg:col-span-7 bg-[#fcf9f3] border border-[#e1d8c6] rounded-[18px] p-6 shadow-[0_6px_24px_-10px_rgba(26,22,18,0.12),0_1px_2px_rgba(26,22,18,0.04)] flex flex-col justify-between space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-[#ece6db] pb-3 gap-2">
            <div className="space-y-0.5">
              <h3 className="font-serif font-bold text-base text-[#1a1612] flex items-center gap-2">
                <Sparkles className="w-4.5 h-4.5 text-[#2d5a4a] stroke-[1.8]" />
                Today's Brief
              </h3>
              {generatedAt && (
                <p className="text-[10px] font-mono text-[#8b857b] lowercase">
                  calculated at: {generatedAt}
                </p>
              )}
            </div>
            <div className="flex items-center gap-2">
              <span className="font-mono text-[9px] text-[#2d5a4a] font-bold uppercase tracking-[0.12em] bg-[#e8f0ec] border border-[#d2e3da] px-2.5 py-0.5 rounded-full leading-none whitespace-nowrap">
                {dailyPlan ? "Grounded" : "Not Built"}
              </span>
              <button
                onClick={generatePlan}
                disabled={generatingPlan}
                className="font-mono text-[10px] text-[#2d5a4a] hover:text-white bg-transparent hover:bg-[#2d5a4a] border border-[#d2e3da] px-2.5 py-1 rounded-[8px] transition-all focus:outline-none disabled:opacity-50 inline-block cursor-pointer select-none"
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
                  <p className="font-mono text-[9px] text-[#8b857b] uppercase tracking-widest leading-none mt-1">
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
                  <p className="font-serif italic text-[11px] text-[#8b857b]">
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
                  <p className="font-sans text-xs text-[#7a756f] max-w-[320px]">
                    Process your real-time emails, active task schedules, and calendar periods into a custom POINTWISE agenda.
                  </p>
                </div>
                <button
                  onClick={generatePlan}
                  disabled={generatingPlan}
                  className="font-mono text-[10px] text-[#fcf9f3] bg-[#2d5a4a] hover:bg-[#3a7560] border border-transparent px-4 py-2 rounded-lg transition-all font-bold uppercase tracking-wider disabled:opacity-50 inline-flex items-center gap-1.5 cursor-pointer shadow-sm hover:shadow"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  Create Daily Brief
                </button>
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
