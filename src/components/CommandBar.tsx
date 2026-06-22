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
  Plus
} from "lucide-react";
import { 
  useFirestoreTasks, 
  useFirestoreEvents, 
  useFirestoreMemory, 
  useFirestoreChat 
} from "../lib/hooks";
import { Email } from "../types";

interface CommandBarProps {
  userId?: string;
  isOpen: boolean;
  onClose: () => void;
  onNavigateTab: (tab: string) => void;
  onSendAssistantPrompt?: (prompt: string) => void;
}

export default function CommandBar({ 
  userId, 
  isOpen, 
  onClose, 
  onNavigateTab, 
  onSendAssistantPrompt 
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

  // Cached Emails from localStorage (polite cache alignment)
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

  // Group all results into a single flat array for keyboard selection index mapping
  interface SearchResultItem {
    type: "task" | "event" | "memory" | "email" | "chat" | "assistant_action";
    id: string;
    title: string;
    subtitle?: string;
    handler: () => void;
  }

  const resultItems: SearchResultItem[] = [];

  // 1. Tasks
  filteredTasks.forEach(t => {
    resultItems.push({
      type: "task",
      id: `task-${t.id}`,
      title: t.title,
      subtitle: `Status: ${t.status?.toUpperCase() || "PENDING"} · Priority: ${t.priority?.toUpperCase() || "MEDIUM"}`,
      handler: () => {
        onNavigateTab("tasks");
        onClose();
      }
    });
  });

  // 2. Calendar Event
  filteredEvents.forEach(e => {
    resultItems.push({
      type: "event",
      id: `event-${e.id || e.title}`,
      title: e.title,
      subtitle: `Start: ${new Date(e.start).toLocaleDateString("en-GB", { day: "numeric", month: "short" })} · Location: ${e.location || "School"}`,
      handler: () => {
        onNavigateTab("calendar");
        onClose();
      }
    });
  });

  // 3. Memory Core Bio Constants
  filteredMemories.forEach(m => {
    resultItems.push({
      type: "memory",
      id: `memory-${m.id}`,
      title: m.key,
      subtitle: `Category: ${m.category.toUpperCase().replace("_", " ")}`,
      handler: () => {
        onNavigateTab("memory");
        onClose();
      }
    });
  });

  // 4. Cached Emails
  filteredEmails.forEach(e => {
    resultItems.push({
      type: "email",
      id: `email-${e.id}`,
      title: e.subject || "(No Subject)",
      subtitle: `From: ${e.from} · ${new Date(e.date).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}`,
      handler: () => {
        onNavigateTab("email");
        onClose();
      }
    });
  });

  // 5. Chat History
  filteredChat.forEach(m => {
    resultItems.push({
      type: "chat",
      id: `chat-${m.id}`,
      title: m.content.substring(0, 100) + (m.content.length > 100 ? "..." : ""),
      subtitle: `Chat Msg · Role: ${m.role === "user" ? "You" : "Assistant"}`,
      handler: () => {
        onNavigateTab("chat");
        onClose();
      }
    });
  });

  // 6. Universal Action Builder
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
            className="w-full text-sm bg-transparent border-none text-ink-950 outline-none placeholder:text-[#8b857b]/65 font-serif italic"
          />
          <span className="text-[10px] font-mono font-bold text-[#8b857b] border border-[#e1d8c6] px-2 py-0.5 rounded-[5px] bg-[#f3ede2] tracking-wider select-none">
            ESC
          </span>
          <button 
            type="button" 
            onClick={onClose} 
            className="text-ink-300 hover:text-ink-600 focus:outline-none"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Results view */}
        <div className="max-h-[380px] overflow-y-auto p-2 space-y-2">
          {queryText.trim() === "" ? (
            <div className="py-8 px-4 text-center select-none space-y-3.5">
              <Sparkles className="w-6 h-6 text-[#2d5a4a] mx-auto animate-pulse" />
              <div className="space-y-1">
                <p className="text-xs font-serif italic text-ink-405">
                  Type to search. Need action? Try typing:
                </p>
                <div className="flex flex-wrap items-center justify-center gap-1.5 pt-1.5">
                  <span className="text-[10px] font-mono px-2 py-1 rounded bg-[#ece6db]/40 text-[#4a4540]">
                    &quot;Show pending Class 9 tasks&quot;
                  </span>
                  <span className="text-[10px] font-mono px-2 py-1 rounded bg-[#ece6db]/40 text-[#4a4540]">
                    &quot;Find grading style memory&quot;
                  </span>
                  <span className="text-[10px] font-mono px-2 py-1 rounded bg-[#ece6db]/40 text-[#4a4540]">
                    &quot;Add task to follow up with Anita&quot;
                  </span>
                </div>
              </div>
            </div>
          ) : resultItems.length === 0 ? (
            <div className="py-12 px-4 text-center select-none space-y-2 text-[#8b857b]/80">
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
                className="inline-flex items-center gap-1 bg-[#2d5a4a] text-white font-mono text-[10px] font-bold uppercase tracking-wider px-3.5 py-2 rounded-md hover:bg-[#3a7560] cursor-pointer"
              >
                <Sparkles className="w-3.5 h-3.5" />
                Ask Assistant Instantly
              </button>
            </div>
          ) : (
            <div className="space-y-1">
              <div className="px-2 text-[9px] font-mono font-bold text-[#8b857b] uppercase tracking-wider mb-1.5 select-none">
                Grouped Matches ({resultItems.length})
              </div>
              
              {resultItems.map((item, index) => {
                const isActive = index === selectedIndex;
                const IconComponent = {
                  task: ClipboardList,
                  event: Calendar,
                  memory: Brain,
                  email: Mail,
                  chat: MessageSquare,
                  assistant_action: Sparkles
                }[item.type];

                return (
                  <div
                    key={item.id}
                    onClick={() => {
                      setSelectedIndex(index);
                      item.handler();
                    }}
                    className={`flex items-start gap-3.5 p-3 rounded-lg transition-all cursor-pointer select-none ${
                      isActive 
                        ? "bg-[#2d5a4a]/10 text-ink-950 shadow-sm border-l-[3px] border-[#2d5a4a] pl-[9px]" 
                        : "hover:bg-[#ece6db]/40 text-ink-700"
                    }`}
                  >
                    <IconComponent className={`w-4 h-4 mt-0.5 flex-shrink-0 ${
                      isActive ? "text-[#2d5a4a]" : "text-ink-400"
                    }`} />
                    
                    <div className="flex-1 min-w-0 space-y-0.5">
                      <p className={`text-xs ${isActive ? "font-serif font-bold" : "font-serif font-normal"}`}>
                        {item.title}
                      </p>
                      {item.subtitle && (
                        <p className="text-[10px] font-mono text-[#8b857b] truncate uppercase tracking-tight">
                          {item.subtitle}
                        </p>
                      )}
                    </div>

                    {isActive && (
                      <span className="flex items-center gap-1 text-[8px] font-mono font-bold text-[#2d5a4a] tracking-wider uppercase select-none self-center bg-[#2d5a4a]/10 px-1.5 py-0.5 rounded">
                        <CornerDownLeft className="w-2.5 h-2.5" />
                        RUN
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Dynamic keyboard guidelines */}
        <div className="px-4.5 py-2.5 bg-[#f3ede2] text-[10px] font-mono text-[#8b857b] border-t border-[#ece6db] flex items-center justify-between select-none">
          <div className="flex items-center gap-3">
            <span>↑↓ ARROWS TO NAVIGATE</span>
            <span className="text-[#8b857b]/50">·</span>
            <span>ENTER TO RUN</span>
          </div>
          <span>CTRL+K TO TOGGLE</span>
        </div>
      </div>
    </div>
  );
}
