import React, { useState, useEffect } from "react";
import { Email, DailyPlan } from "../types";
import { AlertCircle, Calendar, Clock, Sparkles } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { useFirestoreTasks, useFirestoreEvents, useFirestoreMemory } from "../lib/hooks";

interface DashboardViewProps {
  onNavigate: (tab: string) => void;
  googleToken?: string | null;
  userId?: string;
}

export default function DashboardView({ onNavigate, googleToken, userId }: DashboardViewProps) {
  const { tasks, loading: loadingTasks } = useFirestoreTasks(userId);
  const { events, loading: loadingEvents } = useFirestoreEvents(userId);
  const { memoryItems } = useFirestoreMemory(userId);

  const [emails, setEmails] = useState<Email[]>([]);
  const [dailyPlan, setDailyPlan] = useState<DailyPlan | null>(null);

  const [loadingEmails, setLoadingEmails] = useState(true);
  const [generatingPlan, setGeneratingPlan] = useState(false);

  useEffect(() => {
    fetchEmails();
  }, [googleToken]);

  const fetchEmails = async () => {
    try {
      setLoadingEmails(true);
      const headers: Record<string, string> = {};
      if (googleToken) {
        headers["Authorization"] = `Bearer ${googleToken}`;
      }
      const res = await fetch("/api/emails", { headers });
      const data = await res.json();
      setEmails(data);
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
      calendar: events.map((e) => `- ${e.title} at ${new Date(e.start).toLocaleTimeString()} - ${new Date(e.end).toLocaleTimeString()}`).join("\n"),
      memory: memoryItems.map((m) => `- ${m.key}: ${m.value}`).join("\n"),
    };

    try {
      const res = await fetch("/api/plan", { 
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contextData })
      });
      const data = await res.json();
      setDailyPlan(data.plan);
    } catch (err) {
      console.error(err);
    } finally {
      setGeneratingPlan(false);
    }
  };

  // Filter urgent & high tasks
  const pendingUrgent = tasks.filter(
    (t) => t.status !== "done" && (t.priority === "urgent" || t.priority === "high")
  );

  // Filter emails needing reply
  const unreadReplies = emails.filter((e) => e.needsReply);

  const todayStr = new Date().toLocaleDateString("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  return (
    <div className="animate-fade-up max-w-5xl mx-auto space-y-6">
      {/* Planner Header */}
      <div className="border-b border-paper-3 pb-4">
        <p className="font-mono text-xs tracking-wider text-ink-500 uppercase">Daily Journal</p>
        <h2 className="font-serif text-3xl font-semibold text-ink-950 mt-1">{todayStr}</h2>
        <p className="font-serif italic text-sm text-ink-700 mt-1">
          Welcome to your Vasant Valley school planner. Your lesson materials and agenda are synchronized.
        </p>
      </div>

      {/* Overview Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* Urgent Attention Panel */}
        <div className="bg-paper-1 border border-paper-2 rounded-lg p-5 shadow-sm space-y-3 relative overflow-hidden">
          <div className="absolute left-0 top-0 bottom-0 w-1 bg-redpen"></div>
          <div className="flex items-center justify-between">
            <h3 className="font-serif font-semibold text-sm text-ink-900 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-redpen" />
              Needs Attention
            </h3>
            <span className="font-mono text-xs text-redpen font-semibold uppercase tracking-wider bg-red-50 px-2 py-0.5 rounded">
              {pendingUrgent.length} Alert{pendingUrgent.length !== 1 && "s"}
            </span>
          </div>

          {loadingTasks ? (
            <div className="space-y-2 py-2">
              <div className="h-4 w-3/4 shimmer-skeleton rounded"></div>
              <div className="h-4 w-1/2 shimmer-skeleton rounded"></div>
            </div>
          ) : pendingUrgent.length === 0 ? (
            <p className="font-serif italic text-xs text-ink-500 py-3">All clear. Excellent work.</p>
          ) : (
            <ul className="space-y-3 pt-1">
              {pendingUrgent.slice(0, 3).map((task) => (
                <li key={task.id} className="text-xs space-y-0.5">
                  <div className="flex items-center gap-1.5 font-sans font-semibold text-ink-950">
                    <span className="priority-dot urgent"></span>
                    <span className="truncate">{task.title}</span>
                  </div>
                  {task.deadline && (
                    <div className="font-mono text-[10px] text-ink-500 pl-3.5">
                      Target: {new Date(task.deadline).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}
                    </div>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Gmail Awaiting Response */}
        <div className="bg-paper-1 border border-paper-2 rounded-lg p-5 shadow-sm space-y-3">
          <h3 className="font-serif font-semibold text-sm text-ink-900 flex items-center gap-2">
            <Clock className="w-4 h-4 text-woodamber" />
            Awaiting Action
          </h3>

          {loadingEmails ? (
            <div className="space-y-2 py-2">
              <div className="h-4 w-full shimmer-skeleton rounded"></div>
              <div className="h-4 w-5/6 shimmer-skeleton rounded"></div>
            </div>
          ) : unreadReplies.length === 0 ? (
            <p className="font-serif italic text-xs text-ink-500 py-3">Gmail queue parsed successfully.</p>
          ) : (
            <div className="space-y-3">
              <ul className="space-y-2">
                {unreadReplies.slice(0, 3).map((email) => (
                  <li key={email.id} className="text-xs">
                    <div className="font-sans font-semibold text-ink-950 truncate">{email.subject}</div>
                    <div className="font-mono text-[10px] text-ink-500">From: {email.fromName}</div>
                  </li>
                ))}
              </ul>
              <button
                onClick={() => onNavigate("email")}
                className="font-mono text-[11px] text-chalk-600 hover:text-chalk-500 hover:underline transition-all block focus:outline-none"
              >
                Inquire Inbox →
              </button>
            </div>
          )}
        </div>

        {/* Timetable/Calendar Snapshot */}
        <div className="bg-paper-1 border border-paper-2 rounded-lg p-5 shadow-sm space-y-3">
          <h3 className="font-serif font-semibold text-sm text-ink-900 flex items-center gap-2">
            <Calendar className="w-4 h-4 text-chalk-600" />
            Timetable Sessions
          </h3>

          {loadingEvents ? (
            <div className="space-y-2 py-2">
              <div className="h-4 w-full shimmer-skeleton rounded"></div>
              <div className="h-4 w-3/4 shimmer-skeleton rounded"></div>
            </div>
          ) : events.length === 0 ? (
            <p className="font-serif italic text-xs text-ink-500 py-3">No timed sessions today.</p>
          ) : (
            <ul className="space-y-2.5">
              {events.slice(0, 3).map((event) => {
                const startTime = new Date(event.start).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
                return (
                  <li key={event.id} className="text-xs flex items-start gap-2">
                    <span className="font-mono text-[10px] text-chalk-600 font-semibold mt-0.5 bg-chalk-100 px-1.5 py-0.5 rounded">
                      {startTime}
                    </span>
                    <span className="font-sans text-ink-950 font-semibold truncate leading-tight block mt-0.5">{event.title}</span>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>

      {/* Main Bottom Section: Daily Plan Generator + Pending Task Table */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 pt-2">
        
        {/* Pending Planner Tasks */}
        <div className="bg-paper-1 border border-paper-2 rounded-lg p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-paper-2 pb-2">
            <h3 className="font-serif font-semibold text-base text-ink-950">Active Task Syllabus</h3>
            <span className="font-mono text-xs text-ink-500">
              {tasks.filter((t) => t.status !== "done").length} Remain
            </span>
          </div>

          <div className="space-y-3 h-80 overflow-y-auto pr-1">
            {loadingTasks ? (
              <div className="space-y-3">
                <div className="h-6 shimmer-skeleton rounded"></div>
                <div className="h-6 shimmer-skeleton rounded"></div>
                <div className="h-6 shimmer-skeleton rounded"></div>
              </div>
            ) : tasks.filter((t) => t.status !== "done").length === 0 ? (
              <p className="font-serif italic text-sm text-ink-500 py-10 text-center">No active homework or syllabus tasks found.</p>
            ) : (
              tasks
                .filter((t) => t.status !== "done")
                .slice(0, 8)
                .map((task) => (
                  <div key={task.id} className="flex items-start gap-2.5 py-1">
                    <span className={`priority-dot mt-1.5 ${task.priority === "urgent" ? "urgent" : task.priority === "high" ? "high" : task.priority === "medium" ? "medium" : "low"}`} />
                    <div className="flex-1">
                      <span className="font-sans text-xs text-ink-900 font-medium block leading-snug">{task.title}</span>
                      <span className="font-mono text-[10px] text-ink-500 capitalize">{task.category}</span>
                    </div>
                  </div>
                ))
            )}
          </div>
        </div>

        {/* AI Daily Plan Generator */}
        <div className="bg-paper-1 border border-paper-2 rounded-lg p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-paper-2 pb-2">
            <h3 className="font-serif font-semibold text-base text-ink-950 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-chalk-500" />
              AI Personal Day-Plan
            </h3>
            <button
              onClick={generatePlan}
              disabled={generatingPlan}
              className="bg-chalk-600 hover:bg-chalk-500 active:bg-chalk-600 text-white font-mono text-[11px] px-3 py-1 rounded transition-all focus:outline-none disabled:opacity-50"
            >
              {generatingPlan ? "Structuring..." : "Generate Guidance"}
            </button>
          </div>

          {dailyPlan ? (
            <div className="space-y-2 pr-1 max-h-80 overflow-y-auto text-xs font-sans text-ink-900 leading-relaxed markdown-brief">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                {dailyPlan.content}
              </ReactMarkdown>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-12 text-center space-y-2">
              <Sparkles className="w-8 h-8 text-ink-300 stroke-[1.5]" />
              <p className="font-serif text-sm text-ink-700 font-medium">No active daily plan formulated yet.</p>
              <p className="font-serif italic text-xs text-ink-500 max-w-sm">
                Generate a point-wise list based on class lists, syllabus emails, and school calendar schedules.
              </p>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
