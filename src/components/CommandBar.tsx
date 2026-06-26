import React, { useState, useEffect, useRef } from "react";
import { 
  Search, 
  Sparkles, 
  ClipboardList, 
  Calendar, 
  Brain, 
  Mail, 
  MessageSquare, 
  CornerDownLeft,
  X,
  Plus,
  Users
} from "lucide-react";
import { 
  useFirestoreTasks, 
  useFirestoreEvents, 
  useFirestoreMemory, 
  useFirestoreChat,
  useFirestoreStudents,
  useFirestoreTimetable
} from "../lib/hooks";
import { Email } from "../types";

interface CommandBarProps {
  userId?: string;
  isOpen: boolean;
  onClose: () => void;
  onNavigateTab: (tab: string) => void;
  onSendAssistantPrompt?: (prompt: string) => void;
  onSelectStudent?: (studentId: string) => void;
  onSelectTask?: (taskId: string) => void;
  onSelectEvent?: (eventId: string) => void;
  onSelectMemory?: (memoryId: string) => void;
  onSelectEmail?: (emailId: string) => void;
  onSelectChatMessage?: (messageId: string) => void;
}

export default function CommandBar({ 
  userId, 
  isOpen, 
  onClose, 
  onNavigateTab, 
  onSendAssistantPrompt,
  onSelectStudent,
  onSelectTask,
  onSelectEvent,
  onSelectMemory,
  onSelectEmail,
  onSelectChatMessage
}: CommandBarProps) {
  const [queryText, setQueryText] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);

  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Core real-time sources
  const { tasks } = useFirestoreTasks(userId);
  const { events } = useFirestoreEvents(userId);
  const { memoryItems } = useFirestoreMemory(userId);
  const { messages } = useFirestoreChat(userId);
  const { students } = useFirestoreStudents(userId);
  const { timetable } = useFirestoreTimetable(userId);

  // Cached Emails from localStorage
  const [cachedEmails, setCachedEmails] = useState<Email[]>([]);

  useEffect(() => {
    if (isOpen) {
      const saved = localStorage.getItem(`email_cache_${userId || "default"}`);
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          if (parsed && Array.isArray(parsed.emails)) {
            setCachedEmails(parsed.emails);
          }
        } catch (e) {
          console.error("Failed to parse cached emails in CommandBar", e);
        }
      }
      // Auto-focus input
      setTimeout(() => {
        inputRef.current?.focus();
      }, 50);
      setSelectedIndex(0);
      setQueryText("");
    }
  }, [isOpen, userId]);

  // Click outside listener
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        onClose();
      }
    }
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  // Filter sources based on query
  const term = queryText.toLowerCase().trim();

  const filteredTasks = term
    ? tasks.filter(t => 
        (t.title && t.title.toLowerCase().includes(term)) || 
        (t.description && t.description.toLowerCase().includes(term))
      ).slice(0, 3)
    : [];

  const filteredEvents = term
    ? events.filter(e => 
        (e.title && e.title.toLowerCase().includes(term)) || 
        (e.description && e.description.toLowerCase().includes(term)) ||
        (e.location && e.location.toLowerCase().includes(term))
      ).slice(0, 3)
    : [];

  const filteredMemories = term
    ? memoryItems.filter(m => 
        (m.key && m.key.toLowerCase().includes(term)) || 
        (m.value && m.value.toLowerCase().includes(term))
      ).slice(0, 3)
    : [];

  const filteredEmails = term
    ? cachedEmails.filter(e => 
        (e.subject && e.subject.toLowerCase().includes(term)) || 
        (e.from && e.from.toLowerCase().includes(term)) ||
        (e.snippet && e.snippet.toLowerCase().includes(term))
      ).slice(0, 3)
    : [];

  const filteredChat = term
    ? messages.filter(m => 
        m.content && m.content.toLowerCase().includes(term)
      ).slice(0, 2)
    : [];

  const filteredStudents = term
    ? students.filter(s => 
        (s.fullName && s.fullName.toLowerCase().includes(term)) ||
        (s.classSection && s.classSection.toLowerCase().includes(term)) ||
        (s.subjectCombination && s.subjectCombination.toLowerCase().includes(term))
      ).slice(0, 4)
    : [];

  const filteredTimetable = term
    ? timetable.filter(t => 
        (t.subject && t.subject.toLowerCase().includes(term)) ||
        (t.classSection && t.classSection.toLowerCase().includes(term)) ||
        (t.day && t.day.toLowerCase().includes(term)) ||
        (t.room && t.room.toLowerCase().includes(term)) ||
        (t.venue && t.venue.toLowerCase().includes(term))
      ).slice(0, 3)
    : [];

  // Group all results into a single flat array for keyboard selection index mapping
  interface SearchResultItem {
    type: "task" | "event" | "memory" | "email" | "chat" | "assistant_action" | "student" | "timetable";
    id: string;
    title: string;
    subtitle?: string;
    handler: () => void;
  }

  const resultItems: SearchResultItem[] = [];

  if (term === "") {
    // 1. Interactive Quick Actions Group when empty query
    resultItems.push({
      type: "task",
      id: "quick-new-task",
      title: "New task",
      subtitle: "Navigate to Tasks view to create a checklist or action item",
      handler: () => {
        onNavigateTab("tasks");
        onClose();
      }
    });
    resultItems.push({
      type: "event",
      id: "quick-new-event",
      title: "New event",
      subtitle: "Navigate to Calendar view to book a custom slot or lesson",
      handler: () => {
        onNavigateTab("calendar");
        onClose();
      }
    });
    resultItems.push({
      type: "assistant_action",
      id: "action-add-task",
      title: "Add task with AI...",
      subtitle: "Draft a new planner action item using the Assistant",
      handler: () => {
        setQueryText("Add task: ");
        setTimeout(() => inputRef.current?.focus(), 50);
      }
    });
    resultItems.push({
      type: "event",
      id: "action-create-event",
      title: "Create event with AI...",
      subtitle: "Schedule a school activity or meeting with the Assistant",
      handler: () => {
        setQueryText("Create calendar event: ");
        setTimeout(() => inputRef.current?.focus(), 50);
      }
    });
    resultItems.push({
      type: "email",
      id: "action-draft-reply",
      title: "Draft reply...",
      subtitle: "AI drafts a polite school email response to a student/colleague",
      handler: () => {
        setQueryText("Draft reply regarding: ");
        setTimeout(() => inputRef.current?.focus(), 50);
      }
    });
    resultItems.push({
      type: "assistant_action",
      id: "action-plan-day",
      title: "Plan my school day",
      subtitle: "Route to Assistant to synthesize pending tasks and calendar agenda",
      handler: () => {
        if (onSendAssistantPrompt) {
          onSendAssistantPrompt("Plan my day based on my calendar and pending tasks");
        } else {
          onNavigateTab("chat");
        }
        onClose();
      }
    });
    resultItems.push({
      type: "task",
      id: "action-show-pending",
      title: "Show pending tasks",
      subtitle: "Pass instruction to Assistant to display all outstanding activities",
      handler: () => {
        if (onSendAssistantPrompt) {
          onSendAssistantPrompt("Show my pending tasks");
        } else {
          onNavigateTab("chat");
        }
        onClose();
      }
    });
  } else {
    // 2. Populated Search matches

    // A. Tasks
    filteredTasks.forEach(t => {
      resultItems.push({
        type: "task",
        id: `task-${t.id}`,
        title: t.title,
        subtitle: `Status: ${t.status?.toUpperCase() || "PENDING"} | Priority: ${t.priority?.toUpperCase() || "MEDIUM"}`,
        handler: () => {
          if (onSelectTask) {
            onSelectTask(t.id);
          }
          onNavigateTab("tasks");
          onClose();
        }
      });
    });

    // B. Calendar Events
    filteredEvents.forEach(e => {
      resultItems.push({
        type: "event",
        id: `event-${e.id || e.title}`,
        title: e.title,
        subtitle: `Start: ${new Date(e.start).toLocaleDateString("en-GB", { day: "numeric", month: "short" })} | Location: ${e.location || "School"}`,
        handler: () => {
          if (onSelectEvent) {
            onSelectEvent(e.id || e.title);
          }
          onNavigateTab("calendar");
          onClose();
        }
      });
    });

    // C. Timetable Entries (deep links to Calendar)
    filteredTimetable.forEach(t => {
      resultItems.push({
        type: "timetable",
        id: `timetable-${t.id || (t.day + t.period + t.classSection)}`,
        title: `${t.subject} (Class ${t.classSection}) - Period ${t.period}`,
        subtitle: `Timetable | ${t.day} | ${t.startTime} - ${t.endTime} | Room: ${t.room || t.venue || "N/A"}`,
        handler: () => {
          if (onSelectEvent) {
            // Trigger calendar to find day of week for this timetable entry
            onSelectEvent(`tt-virt-${t.day}`);
          }
          onNavigateTab("calendar");
          onClose();
        }
      });
    });

    // D. Memories
    filteredMemories.forEach(m => {
      resultItems.push({
        type: "memory",
        id: `memory-${m.id}`,
        title: m.key,
        subtitle: `Category: ${m.category.toUpperCase().replace("_", " ")}`,
        handler: () => {
          if (onSelectMemory) {
            onSelectMemory(m.id);
          }
          onNavigateTab("memory");
          onClose();
        }
      });
    });

    // E. Emails
    filteredEmails.forEach(e => {
      resultItems.push({
        type: "email",
        id: `email-${e.id}`,
        title: e.subject || "(No Subject)",
        subtitle: `From: ${e.from} | ${new Date(e.date).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}`,
        handler: () => {
          if (onSelectEmail) {
            onSelectEmail(e.id);
          }
          onNavigateTab("email");
          onClose();
        }
      });
    });

    // F. Chat Messages
    filteredChat.forEach(m => {
      resultItems.push({
        type: "chat",
        id: `chat-${m.id}`,
        title: m.content.substring(0, 100) + (m.content.length > 100 ? "..." : ""),
        subtitle: `Chat Msg | Role: ${m.role === "user" ? "You" : "Assistant"}`,
        handler: () => {
          if (onSelectChatMessage) {
            onSelectChatMessage(m.id);
          }
          onNavigateTab("chat");
          onClose();
        }
      });
    });

    // G. Students
    filteredStudents.forEach(s => {
      resultItems.push({
        type: "student",
        id: `student-${s.id}`,
        title: s.fullName,
        subtitle: `Class ${s.classSection} Student | Roll No: ${s.rollNumber || "N/A"}`,
        handler: () => {
          if (onSelectStudent && s.id) {
            onSelectStudent(s.id);
          }
          onNavigateTab("students");
          onClose();
        }
      });
    });

    // H. Universal AI Assistant Action Builder
    if (term.length > 2) {
      resultItems.push({
        type: "assistant_action",
        id: "assistant-trigger-action",
        title: `Prompt Assistant: "${queryText}"`,
        subtitle: "Pass query to AI to draft tasks, emails, calendar events, or check syllabus with approvals.",
        handler: () => {
          if (onSendAssistantPrompt) {
            onSendAssistantPrompt(queryText);
          } else {
            onNavigateTab("chat");
          }
          onClose();
        }
      });
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      onClose();
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex(prev => (prev + 1) % Math.max(resultItems.length, 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex(prev => (prev - 1 + resultItems.length) % Math.max(resultItems.length, 1));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (resultItems[selectedIndex]) {
        resultItems[selectedIndex].handler();
      }
    }
  };

  // Render results list grouped visually
  const renderResults = () => {
    if (queryText.trim() === "") {
      // Show interactive quick actions list
      return (
        <div className="space-y-3 p-1">
          <div className="px-2 pb-1.5 pt-1 text-[11px] font-mono font-bold text-[#2d5a4a] border-b border-[#ece6db] uppercase tracking-wider flex items-center gap-1.5 select-none">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Interactive Quick Actions</span>
          </div>

          <div className="space-y-0.5">
            {resultItems.map((item, index) => {
              const isActive = index === selectedIndex;
              const IconComponent = {
                task: ClipboardList,
                event: Calendar,
                timetable: Calendar,
                memory: Brain,
                email: Mail,
                chat: MessageSquare,
                assistant_action: Sparkles,
                student: Users
              }[item.type] || Sparkles;

              return (
                <div
                  key={item.id}
                  onClick={() => {
                    setSelectedIndex(index);
                    item.handler();
                  }}
                  className={`flex items-start gap-3.5 p-3 rounded-[12px] transition-all cursor-pointer select-none ${
                    isActive 
                      ? "bg-[#2d5a4a]/10 text-ink-950 shadow-sm border-l-[4px] border-[#2d5a4a] pl-[10px]" 
                      : "hover:bg-[#ece6db]/40 text-ink-700"
                  }`}
                >
                  <IconComponent className={`w-4.5 h-4.5 mt-0.5 flex-shrink-0 ${
                    isActive ? "text-[#2d5a4a]" : "text-ink-400"
                  }`} />
                  
                  <div className="flex-1 min-w-0 space-y-0.5">
                    <p className={`text-xs ${isActive ? "font-serif font-bold text-[#2d5a4a]" : "font-serif font-normal"}`}>
                      {item.title}
                    </p>
                    {item.subtitle && (
                      <p className="text-[11px] font-mono text-[#4a4540] truncate uppercase tracking-tight">
                        {item.subtitle}
                      </p>
                    )}
                  </div>

                  {isActive && (
                    <span className="flex items-center gap-1 text-[11px] font-mono font-bold text-[#2d5a4a] tracking-wider uppercase select-none self-center bg-[#2d5a4a]/10 px-1.5 py-0.5 rounded">
                      <CornerDownLeft className="w-2.5 h-2.5" />
                      RUN
                    </span>
                  )}
                </div>
              );
            })}
          </div>

          <div className="pt-4 pb-2 px-2 text-center select-none space-y-2">
            <p className="text-[11px] font-serif italic text-[#4a4540]">
              Need help? Search the database or let the Assistant do the heavy lifting!
            </p>
            <div className="flex flex-wrap items-center justify-center gap-1.5 pt-1">
              <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-[#ece6db]/55 text-[#4a4540]">
                "Show pending Class 9 tasks"
              </span>
              <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-[#ece6db]/55 text-[#4a4540]">
                "Find grading style memory"
              </span>
            </div>
          </div>
        </div>
      );
    }

    if (resultItems.length === 0) {
      return (
        <div className="py-12 px-4 text-center select-none space-y-2 text-[#4a4540]/80">
          <p className="font-serif italic text-xs">No local records match &ldquo;{queryText}&rdquo;.</p>
          <button
            type="button"
            onClick={() => {
              if (onSendAssistantPrompt) {
                onSendAssistantPrompt(queryText);
              } else {
                onNavigateTab("chat");
              }
              onClose();
            }}
            className="inline-flex items-center gap-1 bg-[#2d5a4a] text-white font-mono text-[11px] font-bold uppercase tracking-wider px-3.5 py-2 rounded-md hover:bg-[#3a7560] cursor-pointer animate-fadeIn"
          >
            <Sparkles className="w-3.5 h-3.5" />
            Ask Assistant Instantly
          </button>
        </div>
      );
    }

    // Explicit group configurations
    const categories = [
      { id: "tasks", label: "Tasks", types: ["task"] },
      { id: "calendar", label: "Calendar & Timetable", types: ["event", "timetable"] },
      { id: "memory", label: "Memory Bio", types: ["memory"] },
      { id: "emails", label: "Faculty Email Cache", types: ["email"] },
      { id: "chat", label: "Assistant Chat History", types: ["chat"] },
      { id: "students", label: "Student Registry", types: ["student"] },
      { id: "assistant_action", label: "Assistant Intelligent Action", types: ["assistant_action"] },
    ];

    return (
      <div className="space-y-4 animate-fadeIn">
        {categories.map((cat) => {
          const catItems = resultItems.filter(item => cat.types.includes(item.type));
          if (catItems.length === 0) return null;

          return (
            <div key={cat.id} className="space-y-1">
              <div className="px-2 text-[11px] font-mono font-bold text-[#4a4540] uppercase tracking-wider mb-1.5 select-none border-b border-[#ece6db]/60 pb-1 flex items-center justify-between">
                <span>{cat.label}</span>
                <span className="text-[11px] font-normal text-[#4a4540]/65 lowercase">
                  ({catItems.length} match{catItems.length > 1 ? "es" : ""})
                </span>
              </div>

              <div className="space-y-0.5">
                {catItems.map((item) => {
                  const globalIndex = resultItems.findIndex(x => x.id === item.id);
                  const isActive = globalIndex === selectedIndex;
                  const IconComponent = {
                    task: ClipboardList,
                    event: Calendar,
                    timetable: Calendar,
                    memory: Brain,
                    email: Mail,
                    chat: MessageSquare,
                    assistant_action: Sparkles,
                    student: Users
                  }[item.type] || Sparkles;

                  return (
                    <div
                      key={item.id}
                      onClick={() => {
                        setSelectedIndex(globalIndex);
                        item.handler();
                      }}
                      className={`flex items-start gap-3.5 p-2.5 rounded-lg transition-all cursor-pointer select-none ${
                        isActive 
                          ? "bg-[#2d5a4a]/10 text-ink-950 shadow-sm border-l-[3px] border-[#2d5a4a] pl-[9px]" 
                          : "hover:bg-[#ece6db]/40 text-ink-700"
                      }`}
                    >
                      <IconComponent className={`w-4 h-4 mt-0.5 flex-shrink-0 ${
                        isActive ? "text-[#2d5a4a]" : "text-ink-400"
                      }`} />
                      
                      <div className="flex-1 min-w-0 space-y-0.5">
                        <p className={`text-xs ${isActive ? "font-serif font-bold text-[#2d5a4a]" : "font-serif font-normal"}`}>
                          {item.title}
                        </p>
                        {item.subtitle && (
                          <p className="text-[11px] font-mono text-[#4a4540] truncate uppercase tracking-tight">
                            {item.subtitle}
                          </p>
                        )}
                      </div>

                      {isActive && (
                        <span className="flex items-center gap-1 text-[11px] font-mono font-bold text-[#2d5a4a] tracking-wider uppercase select-none self-center bg-[#2d5a4a]/10 px-1.5 py-0.5 rounded">
                          <CornerDownLeft className="w-2.5 h-2.5" />
                          RUN
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-[12vh] px-4 bg-ink-950/40 backdrop-blur-[2px] animate-fadeIn">
      <div 
        ref={containerRef}
        className="w-full max-w-[620px] bg-[#fcf9f3] border border-[#e1d8c6] rounded-[18px] shadow-[0_24px_48px_-12px_rgba(26,22,18,0.18),0_1px_3px_rgba(26,22,18,0.05)] overflow-hidden flex flex-col font-sans"
        onKeyDown={handleKeyDown}
      >
        {/* Input area */}
        <div className="flex items-center gap-3.5 px-4.5 py-4 border-b border-[#ece6db]">
          <Search className="w-5 h-5 text-ink-300 flex-shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={queryText}
            onChange={(e) => {
              setQueryText(e.target.value);
              setSelectedIndex(0);
            }}
            placeholder="Search tasks, calendar, memory, unread mail details..."
            className="w-full text-sm bg-transparent border-none text-ink-950 outline-none placeholder:text-[#4a4540]/90 font-serif italic"
          />
          <span className="text-[11px] font-mono font-bold text-[#4a4540] border border-[#e1d8c6] px-2 py-0.5 rounded-[5px] bg-[#f3ede2] tracking-wider select-none">
            ESC
          </span>
          <button 
            type="button" 
            onClick={onClose} 
            className="text-ink-300 hover:text-ink-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#2d5a4a]/40 "
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Results view */}
        <div className="max-h-[380px] overflow-y-auto p-2 space-y-2 pristine-scrollbar">
          {renderResults()}
        </div>

        {/* Dynamic keyboard guidelines */}
        <div className="px-4.5 py-2.5 bg-[#f3ede2] text-[11px] font-mono text-[#4a4540] border-t border-[#ece6db] flex items-center justify-between select-none">
          <div className="flex items-center gap-3">
            <span>UP/DOWN TO NAVIGATE</span>
            <span className="text-[#4a4540]/50">|</span>
            <span>ENTER TO RUN</span>
          </div>
          <span>CTRL+K TO TOGGLE</span>
        </div>
      </div>
    </div>
  );
}
