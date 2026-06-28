import { apiFetch } from "../lib/api";
import React, { useState, useEffect } from "react";
import { Email, TeacherUser } from "../types";
import { Mail, Sparkles, Send, Copy, Check, ChevronRight, Settings, Search, RefreshCw, ClipboardList, X, HardDrive } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

// Shared memory cache to persist emails across tab switches / component unmounts
interface CacheEntry {
  data: Email[];
  timestamp: number;
}
export const emailCache: Record<string, CacheEntry> = {};

export const getCachedEmails = (key: string): CacheEntry | null => {
  if (emailCache[key]) return emailCache[key];
  try {
    const saved = localStorage.getItem(`faculty_planner_emails_${key}`);
    if (saved) {
      const parsed = JSON.parse(saved);
      emailCache[key] = parsed; // Sync memory cache
      return parsed;
    }
  } catch (e) {
    console.warn("Error reading email cache from localStorage", e);
  }
  return null;
};

export const saveCachedEmails = (key: string, data: Email[]) => {
  const entry = { data, timestamp: Date.now() };
  emailCache[key] = entry;
  try {
    localStorage.setItem(`faculty_planner_emails_${key}`, JSON.stringify(entry));
  } catch (e) {
    console.warn("Error writing email cache to localStorage", e);
  }
};

function formatEmailBody(text: string | undefined): string {
  if (!text) return "";
  
  // Normalize carriage returns
  const normalized = text.replace(/\r\n/g, '\n');
  
  // Split by double newlines to get paragraphs
  const paragraphs = normalized.split(/\n\s*\n/);
  
  return paragraphs.map(p => {
    const lines = p.split('\n');
    let formatted = lines[0] || "";
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i];
      const prevLine = lines[i - 1] || "";
      
      // Keep newline if:
      // 1. Current line starts with a list indicator
      // 2. Previous line ended with a colon
      // 3. Previous line was short (likely a signature or a naturally short line, not a hard-wrapped paragraph)
      if (/^\s*[-•*]/.test(line) || /^\s*\d+\./.test(line) || prevLine.trim().endsWith(':') || prevLine.length < 60) {
        formatted += '\n' + line;
      } else {
        // Otherwise, unwrap the hard break by replacing it with a space
        formatted += ' ' + line.trim();
      }
    }
    return formatted;
  }).join('\n\n');
}

export default function EmailView({ 
  googleToken, 
  currentUser, 
  userId, 
  onSwitchAccount,
  initialSelectedEmailId,
  onClearInitialEmailId
}: { 
  googleToken?: string | null;
  currentUser?: TeacherUser | null;
  userId?: string;
  onSwitchAccount?: () => void;
  initialSelectedEmailId?: string | null;
  onClearInitialEmailId?: () => void;
}) {
  const [emails, setEmails] = useState<Email[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSyncingBackground, setIsSyncingBackground] = useState(false);
  const [selectedEmail, setSelectedEmail] = useState<Email | null>(null);
  const [activeTab, setActiveTab] = useState<"inbox" | "sent">("inbox");
  const [searchQuery, setSearchQuery] = useState("");

  // Handle deep-linked email selection
  useEffect(() => {
    if (initialSelectedEmailId && emails.length > 0) {
      const found = emails.find(e => e.id === initialSelectedEmailId);
      if (found) {
        setSelectedEmail(found);
        if (onClearInitialEmailId) {
          setTimeout(onClearInitialEmailId, 1000);
        }
      }
    }
  }, [initialSelectedEmailId, emails, onClearInitialEmailId]);

  // AI tools states
  const [summarising, setSummarising] = useState(false);
  const [summaryOutput, setSummaryOutput] = useState("");
  const [draftingReply, setDraftingReply] = useState(false);
  const [replyDraft, setReplyDraft] = useState("");
  const [copiedDraft, setCopiedDraft] = useState(false);
  const [savingDraft, setSavingDraft] = useState(false);
  const [draftSuccess, setDraftSuccess] = useState(false);

  // Email to Task states
  const [taskCreating, setTaskCreating] = useState<string | null>(null);
  const [taskCreatedMap, setTaskCreatedMap] = useState<Record<string, boolean>>({});
  
  const [suggestedTasks, setSuggestedTasks] = useState<any[]>([]);
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [suggestingTasks, setSuggestingTasks] = useState(false);

  const handleCreateTaskFromEmail = async (email: Email) => {
    if (!userId) return;
    setSuggestingTasks(true);
    setShowTaskModal(true);
    setSuggestedTasks([]);
    try {
      const res = await apiFetch("/api/emails/suggest-tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email })
      });
      if (!res.ok) throw new Error("Failed to suggest tasks");
      const data = await res.json();
      setSuggestedTasks(data.tasks || []);
    } catch (err) {
      console.error(err);
    } finally {
      setSuggestingTasks(false);
    }
  };

  const handleCreateIndividualTask = async (task: any, index: number) => {
    if (!userId) return;
    setTaskCreating(index.toString());
    try {
      const { db } = await import("../lib/firebase");
      const { collection, addDoc } = await import("firebase/firestore");
      await addDoc(collection(db, `users/${userId}/tasks`), {
        title: task.title,
        description: task.description,
        priority: task.priority,
        category: task.category,
        deadline: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        status: "todo",
        createdAt: new Date().toISOString()
      });

      setTaskCreatedMap(prev => ({ ...prev, [`${selectedEmail?.id}-${index}`]: true }));
    } catch (err) {
      console.error("Failed to create task from email:", err);
      alert("Error creating task.");
    } finally {
      setTaskCreating(null);
    }
  };

  useEffect(() => {
    setSearchQuery("");
    fetchEmails();
  }, [googleToken, activeTab]);

  // Filtered emails based on search query
  const filteredEmails = emails.filter((email) => {
    const query = searchQuery.toLowerCase().trim();
    if (!query) return true;
    return (
      email.subject?.toLowerCase().includes(query) ||
      email.fromName?.toLowerCase().includes(query) ||
      email.fromEmail?.toLowerCase().includes(query) ||
      email.snippet?.toLowerCase().includes(query)
    );
  });

  useEffect(() => {
    if (filteredEmails.length > 0) {
      if (!selectedEmail || !filteredEmails.find(e => e.id === selectedEmail.id)) {
        setSelectedEmail(filteredEmails[0]);
      }
    } else {
      setSelectedEmail(null);
    }
  }, [searchQuery, emails]);

  const fetchEmails = async (force = false) => {
    const cacheKey = `${activeTab}`;
    const cached = getCachedEmails(cacheKey);
    const now = Date.now();
    const REFRESH_COOLDOWN = 5 * 60 * 1000; // 5 minutes cooldown for background refresh

    let triggerSyncInBg = false;

    if (force) {
      delete emailCache[cacheKey];
      try {
        localStorage.removeItem(`faculty_planner_emails_${cacheKey}`);
      } catch {
        // Ignored
      }
      setLoading(true);
    } else if (cached) {
      setEmails(cached.data);
      setLoading(false);

      if (cached.data.length > 0) {
        if (!selectedEmail || !cached.data.find(e => e.id === selectedEmail.id)) {
          setSelectedEmail(cached.data[0]);
        }
      } else {
        setSelectedEmail(null);
      }

      if (now - cached.timestamp > REFRESH_COOLDOWN) {
        triggerSyncInBg = true;
      } else {
        // Cooldown period not finished. Skip API request entirely.
        return;
      }
    } else {
      setLoading(true);
    }

    if (triggerSyncInBg) {
      setIsSyncingBackground(true);
    }

    try {
      const headers: Record<string, string> = {};
      if (googleToken) {
        headers["Authorization"] = `Bearer ${googleToken}`;
      }
      const res = await apiFetch(`/api/emails?type=${activeTab}`, { headers });
      if (!res.ok) throw new Error("API failed");
      const text = await res.text();
      let data = [];
      try {
        data = JSON.parse(text);
      } catch(e: any) {
        throw new Error("Invalid response", { cause: e });
      }

      // Save to shared memory and localStorage cache
      saveCachedEmails(cacheKey, data);

      setEmails(data);
      if (data.length > 0) {
        if (!selectedEmail || !data.find(e => e.id === selectedEmail.id)) {
          setSelectedEmail(data[0]);
        }
      } else {
        setSelectedEmail(null);
      }
    } catch (err) {
      console.error("Failed to load/sync emails:", err);
    } finally {
      setLoading(false);
      setIsSyncingBackground(false);
    }
  };

  const handleSummariseEmail = async (id: string) => {
    setSummarising(true);
    setSummaryOutput("");
    try {
      const res = await apiFetch(`/api/emails/${id}/summarise`, { method: "POST" });
      if (!res.ok) throw new Error("API failed");
      const text = await res.text();
      const data = JSON.parse(text);
      setSummaryOutput(data.summary);
    } catch (err) {
      console.error(err);
      setSummaryOutput("Failed to compile summary. Check connection.");
    } finally {
      setSummarising(false);
    }
  };

  const handleDraftReply = async (id: string) => {
    setDraftingReply(true);
    setReplyDraft("");
    try {
      const res = await apiFetch(`/api/emails/${id}/reply`, { 
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId })
      });
      if (!res.ok) throw new Error("API failed");
      const text = await res.text();
      const data = JSON.parse(text);
      setReplyDraft(data.reply);
    } catch (err) {
      console.error(err);
      setReplyDraft("Failed to draft automatic responder.");
    } finally {
      setDraftingReply(false);
    }
  };

  const handleCopyDraft = () => {
    navigator.clipboard.writeText(replyDraft);
    setCopiedDraft(true);
    setTimeout(() => setCopiedDraft(false), 2000);
  };

  const handleSaveDraft = async () => {
    if (!selectedEmail || !replyDraft.trim()) return;
    setSavingDraft(true);
    setDraftSuccess(false);
    
    try {
      const res = await apiFetch("/api/emails/draft", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(googleToken ? { "Authorization": `Bearer ${googleToken}` } : {})
        },
        body: JSON.stringify({
          to: selectedEmail.fromEmail || selectedEmail.from,
          subject: selectedEmail.subject.toLowerCase().startsWith("re:") ? selectedEmail.subject : `Re: ${selectedEmail.subject}`,
          body: replyDraft,
          emailId: selectedEmail.id
        })
      });

      if (!res.ok) {
        const errorData = await res.json();
        if (errorData.error === "reauth_required" && onSwitchAccount) {
          alert("Please sign in again to grant compose permission.");
          onSwitchAccount();
          return;
        }
        throw new Error(errorData.error || "Failed to save draft");
      }

      setDraftSuccess(true);
      setTimeout(() => setDraftSuccess(false), 3000);
    } catch (err: any) {
      alert(`Error saving draft: ${err.message}`);
    } finally {
      setSavingDraft(false);
    }
  };

  const handleSaveToDrive = async () => {
    if (!replyDraft.trim()) return;
    const token = googleToken;
    if (!token) {
      alert("Please connect Google Account from Settings to use Drive.");
      return;
    }
    try {
      const name = `Email Draft - ${selectedEmail?.subject || "Reply"}.txt`;
      const res = await apiFetch("/api/drive/upload-text", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({ name, content: replyDraft, mimeType: "text/plain" })
      });
      if (res.ok) alert("Draft saved to Google Drive!");
      else throw new Error("Failed to save to Drive");
    } catch (err) {
      alert("Could not save to Drive. Check permissions.");
      console.error(err);
    }
  };

  return (
    <div className="animate-fade-up max-w-[1050px] mx-auto space-y-5">
      
      {/* Header bar */}
      <div className="border-b border-paper-3 pb-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-4">
            <h2 className="font-serif text-2xl font-normal text-[#1a1612]">Syllabus Mail</h2>
            <div className="flex bg-[#ece6db]/50 p-1 rounded-lg">
              <button
                onClick={() => setActiveTab("inbox")}
                className={`px-3 py-1 font-mono text-[11px] font-bold uppercase tracking-wider rounded-md transition-colors ${activeTab === 'inbox' ? 'bg-white text-[#2d5a4a] shadow-sm' : 'text-[#4a4540] hover:text-[#4a4540]'}`}
              >
                Inbox
              </button>
              <button
                onClick={() => setActiveTab("sent")}
                className={`px-3 py-1 font-mono text-[11px] font-bold uppercase tracking-wider rounded-md transition-colors ${activeTab === 'sent' ? 'bg-white text-[#2d5a4a] shadow-sm' : 'text-[#4a4540] hover:text-[#4a4540]'}`}
              >
                Sent
              </button>
            </div>
          </div>
          <p className="font-serif italic text-xs text-ink-405 mt-1 pl-0.5">
            Synchronised school messages, student briefs, and pointwise AI-drafted replies.
          </p>
        </div>
        <div className="flex items-center gap-3">
          {isSyncingBackground && (
            <span className="flex items-center gap-1.5 text-[11px] font-mono font-medium text-[#2d5a4a] bg-[#e8f0ec] px-2.5 py-1.5 rounded-lg border border-[#d2e3da]/60 animate-pulse">
              <RefreshCw className="w-3 h-3 animate-spin" />
              Syncing...
            </span>
          )}

          {googleToken ? (
            <div className="flex items-center gap-2 border border-[#d2e3da] bg-[#e8f0ec] rounded-lg pl-3 pr-1.5 py-1 hover:shadow-[0_1px_3px_rgba(26,22,18,0.06)] transition-all">
              <div className="flex items-center gap-1.5 pr-1">
                <span className="w-1.5 h-1.5 rounded-full bg-[#10b981] animate-pulse" />
                <span className="text-[11px] font-mono font-bold text-[#2d5a4a] uppercase tracking-wider">
                  {currentUser?.email || "Gmail"}
                </span>
              </div>
              
              <button 
                type="button"
                onClick={() => fetchEmails(true)}
                disabled={loading || isSyncingBackground}
                className="text-[11px] font-mono tracking-wider font-bold text-[#2d5a4a] bg-[#fcf9f3]/90 hover:bg-[#ece6db]/50 border border-[#d2e3da] px-2.5 py-1 rounded-md transition-colors flex items-center gap-1 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#2d5a4a]/40 uppercase disabled:opacity-50"
                title="Force refresh"
              >
                <RefreshCw className={`w-3 h-3 ${loading ? "animate-spin" : ""}`} />
                REFRESH
              </button>

              <button 
                type="button"
                onClick={onSwitchAccount}
                className="text-[11px] font-mono tracking-wider font-bold text-[#8a3324] hover:bg-[#faebe8] border border-[#f3d3cb] px-2.5 py-1 rounded-md transition-colors flex items-center gap-1 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#2d5a4a]/40 uppercase"
              >
                <Settings className="w-3.5 h-3.5" />
                CHANGE
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-mono font-bold tracking-wider uppercase bg-[#ece6db] text-[#4a4540] border border-[#e1d8c6]">
                <span className="w-1.5 h-1.5 rounded-full bg-[#8b857b]" />
                STANDALONE Inbox
              </span>
              <button 
                type="button"
                onClick={() => fetchEmails(true)}
                disabled={loading || isSyncingBackground}
                className="text-[11px] font-mono tracking-wider font-bold text-[#4a4540] bg-[#fcf9f3]/90 hover:bg-[#ece6db]/50 border border-[#e1d8c6] px-2.5 py-1.5 rounded-lg transition-colors flex items-center gap-1 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#2d5a4a]/40 uppercase"
              >
                <RefreshCw className={`w-3 h-3 ${loading ? "animate-spin" : ""}`} />
                REFRESH
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        
        {/* Left column: List of Emails */}
        <div className="lg:col-span-5 bg-[#fcf9f3] border border-[#e1d8c6] rounded-[18px] overflow-hidden shadow-[0_4px_16px_-6px_rgba(26,22,18,0.08)] divide-y divide-[#ece6db]">
          
          {/* Email Search Bar */}
          <div className="p-3.5 bg-[#fcf9f3]">
            <div className="relative">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[#4a4540]/70" />
              <input
                type="text"
                placeholder="Search sender or keyword..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-white border border-[#e1d8c6] rounded-xl text-xs font-serif text-[#1a1612] placeholder-[#8b857b]/50 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#2d5a4a]/40 focus:ring-1 focus:ring-[#2d5a4a] focus:border-[#2d5a4a] transition-all shadow-[inset_0_1px_2px_rgba(0,0,0,0.02)]"
              />
            </div>
          </div>

          {loading ? (
            <div className="p-5 space-y-4">
              <div className="h-10 shimmer-skeleton rounded"></div>
              <div className="h-10 shimmer-skeleton rounded"></div>
              <div className="h-10 shimmer-skeleton rounded"></div>
            </div>
          ) : emails.length === 0 ? (
            <div className="p-10 text-center text-[#4a4540] font-serif italic text-sm space-y-1.5 animate-fadeIn">
              <p>Your inbox is empty.</p>
              <p className="text-xs font-sans not-italic text-[#a29c91]">No synchronized teacher or school emails are loaded.</p>
            </div>
          ) : filteredEmails.length === 0 ? (
            <div className="p-10 text-center text-[#4a4540] font-serif italic text-sm space-y-1.5 animate-fadeIn">
              <p>No matching emails found.</p>
              <p className="text-xs font-sans not-italic text-[#a29c91]">Try adjusting your key phrase query or reset the search input.</p>
            </div>
          ) : (
            filteredEmails.map((email) => {
              const formattedDate = new Date(email.date).toLocaleDateString("en-GB", {
                day: "numeric",
                month: "short",
              });
              const isSelected = selectedEmail?.id === email.id;
              return (
                <button
                  type="button"
                  key={email.id}
                  onClick={() => {
                    setSelectedEmail(email);
                    setSummaryOutput("");
                    setReplyDraft("");
                    setDraftSuccess(false);
                    setCopiedDraft(false);
                  }}
                  className={`w-full text-left p-4.5 flex gap-3.5 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#2d5a4a]/40 transition-colors relative ${
                    isSelected ? "bg-[#f5f1e8]" : "hover:bg-[#ece6db]/30"
                  }`}
                >
                  {email.needsReply && (
                    <span className="absolute top-4.5 right-4.5 w-1.5 h-1.5 rounded-full bg-[#baa794]" />
                  )}

                  <Mail className={`w-4 h-4 mt-0.5 flex-shrink-0 ${email.needsReply ? "text-[#baa794]" : "text-[#2d5a4a]"}`} />
                  
                  <div className="flex-1 min-w-0 space-y-1">
                    <div className="flex justify-between items-baseline gap-2">
                      <span className="font-mono text-[11px] text-[#4a4540] font-bold tracking-wide uppercase truncate">
                        {email.fromName}
                      </span>
                      <span className="font-mono text-[11px] text-[#4a4540] uppercase flex-shrink-0">{formattedDate}</span>
                    </div>
                    <h4 className={`font-serif text-xs font-bold text-[#1a1612] truncate ${email.needsReply ? "text-[#8a3324] font-bold" : ""}`}>
                      {email.subject}
                    </h4>
                    <p className="text-xs text-[#4a4540] truncate leading-normal italic font-serif">{email.snippet}</p>
                  </div>
                  <ChevronRight className="w-4 h-4 text-[#4a4540]/50 self-center hidden sm:block" />
                </button>
              );
            })
          )}
        </div>

        {/* Right column: Preview & AI Summaries panel */}
        <div className="lg:col-span-7 bg-[#fcf9f3] border border-[#e1d8c6] rounded-[18px] p-5 shadow-[0_4px_16px_-6px_rgba(26,22,18,0.08)] space-y-5">
          {selectedEmail ? (
            <div className="space-y-5">
              
              {/* AI Suggested Tasks Inline output (Moved to top per user request) */}
              {showTaskModal && (
                <div className="bg-white border-2 border-[#2d5a4a] rounded-[14px] p-4 shadow-md animate-fade-up flex flex-col">
                  <div className="flex items-center justify-between border-b border-[#ece6db] pb-2 mb-3">
                    <h4 className="font-mono text-[13px] text-[#2d5a4a] font-bold uppercase tracking-wider flex items-center gap-1.5">
                      <Sparkles className="w-4 h-4 text-[#2d5a4a]" />
                      Suggested Tasks
                    </h4>
                    <button 
                      onClick={() => setShowTaskModal(false)}
                      className="font-mono text-[10px] text-[#8c8273] uppercase tracking-wider hover:text-[#4a4540]"
                    >
                      Close
                    </button>
                  </div>
                  
                  <div className="overflow-y-auto max-h-[40vh]">
                    {suggestedTasks.length === 0 ? (
                      <div className="flex flex-col items-center justify-center py-6 text-[#8c8273]">
                        <div className="w-6 h-6 rounded-full border-2 border-[#2d5a4a]/20 border-t-[#2d5a4a] animate-spin mb-3"></div>
                        <p className="font-sans text-xs">Analyzing email...</p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        <p className="text-[11px] font-sans text-[#4a4540] pb-1">
                          Select tasks to add to your dashboard:
                        </p>
                        {suggestedTasks.map((task, idx) => (
                          <div key={idx} className="bg-[#fcf9f3] border border-[#e1d8c6] p-3 rounded-lg flex flex-col gap-2">
                            <div>
                              <h4 className="font-sans text-sm font-semibold text-[#1a1612]">{task.title}</h4>
                              <p className="font-sans text-xs text-[#8c8273] mt-1">{task.description}</p>
                            </div>
                            <div className="flex items-center justify-between mt-1">
                              <div className="flex items-center gap-2">
                                <span className={`text-[9px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full ${
                                  task.priority === "urgent" || task.priority === "high" ? "bg-red-100 text-red-700" :
                                  task.priority === "medium" ? "bg-amber-100 text-amber-700" :
                                  "bg-green-100 text-green-700"
                                }`}>
                                  {task.priority || "Normal"}
                                </span>
                                <span className="text-[9px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-blue-100 text-blue-700">
                                  {task.category || "General"}
                                </span>
                              </div>
                              <button
                                onClick={() => handleCreateIndividualTask(task, idx)}
                                disabled={taskCreating === idx.toString() || taskCreatedMap[`${selectedEmail?.id}-${idx}`]}
                                className={`font-mono text-[9px] font-bold uppercase tracking-wider px-3 py-1.5 rounded transition-colors ${
                                  taskCreatedMap[`${selectedEmail?.id}-${idx}`]
                                  ? "bg-[#e8f0ec] text-[#2d5a4a] border border-[#d2e3da]"
                                  : "bg-[#2d5a4a] text-white hover:bg-[#1f4236]"
                                } disabled:opacity-50`}
                              >
                                {taskCreatedMap[`${selectedEmail?.id}-${idx}`] ? (
                                  <span className="flex items-center gap-1"><Check className="w-3 h-3" /> Added</span>
                                ) : taskCreating === idx.toString() ? (
                                  "Adding..."
                                ) : (
                                  "Add Task"
                                )}
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Mail Info */}
              <div className="border-b border-[#ece6db] pb-3">
                <div className="flex justify-between items-start gap-4">
                  <h3 className="font-serif font-semibold text-lg text-[#1a1612] leading-tight pr-4">
                    {selectedEmail.subject}
                  </h3>
                  {selectedEmail.needsReply && (
                    <span className="font-mono text-[11px] font-bold text-[#8a3324] border border-[#f3d3cb] bg-[#faebe8] uppercase tracking-wider px-2.5 py-1 rounded-md flex-shrink-0 mt-0.5">
                      ACTION REQUIRED
                    </span>
                  )}
                </div>
                <div className="flex justify-between items-center text-[11px] text-[#4a4540] font-mono mt-3 uppercase tracking-wider">
                  <span>{activeTab === 'sent' ? 'TO' : 'FROM'}: {selectedEmail.from}</span>
                  <span>{new Date(selectedEmail.date).toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "long" })}</span>
                </div>
              </div>

              {/* AI Actions Row */}
              <div className="flex flex-wrap gap-2.5 pt-1">
                <button
                  type="button"
                  onClick={() => handleSummariseEmail(selectedEmail.id)}
                  disabled={summarising}
                  className="font-mono text-[11px] font-bold uppercase tracking-wider text-[#2d5a4a] bg-[#e8f0ec] hover:bg-[#d2e3da] border border-[#d2e3da] px-3.5 py-2 rounded-md transition-all cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-[#2d5a4a]/40 flex items-center gap-1.5 disabled:opacity-50"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  {summarising ? "Summarising..." : "AI Analyse Message"}
                </button>

                <button
                  type="button"
                  onClick={() => handleDraftReply(selectedEmail.id)}
                  disabled={draftingReply}
                  className="font-mono text-[11px] font-bold uppercase tracking-wider text-[#1d2d5a] bg-[#e0eaf5] hover:bg-[#c7daf0] border border-[#b8cfe8] px-3.5 py-2 rounded-md transition-all cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-[#2d5a4a]/40 flex items-center gap-1.5 disabled:opacity-50"
                >
                  <Send className="w-3.5 h-3.5" />
                  {draftingReply ? "Formulating Draft..." : "AI Compose Reply"}
                </button>

                <button
                  type="button"
                  onClick={() => handleCreateTaskFromEmail(selectedEmail)}
                  disabled={suggestingTasks}
                  className="font-mono text-[11px] font-bold uppercase tracking-wider px-3.5 py-2 rounded-md transition-all cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-[#2d5a4a]/40 flex items-center gap-1.5 text-[#4a4540] bg-[#faf7f2] hover:bg-[#ece6db]/50 border border-[#e1d8c6] disabled:opacity-50"
                >
                  <ClipboardList className="w-3.5 h-3.5" />
                  {suggestingTasks ? "Analyzing..." : "Create Task"}
                </button>
              </div>

              {/* Mail Body */}
              <div className="bg-[#f3ede2] p-5 rounded-[12px] border border-[#e1d8c6] text-xs text-[#4a4540] leading-relaxed font-sans whitespace-pre-wrap max-h-96 overflow-y-auto shadow-[inset_0_1px_2px_rgba(0,0,0,0.03)] selection:bg-[#2d5a4a]/10">
                {formatEmailBody(selectedEmail.body || selectedEmail.snippet)}
              </div>

              {/* AI Summary result */}
              {summaryOutput && (
                <div className="bg-[#fcf9f3] border border-[#e1d8c6] rounded-[14px] p-4 shadow-sm space-y-2.5 animate-fade-up">
                  <h4 className="font-mono text-[11px] text-[#2d5a4a] font-bold uppercase tracking-wider flex items-center gap-1.5 border-b border-[#ece6db] pb-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-[#2d5a4a]" />
                    Interactive Bullet Analysis
                  </h4>
                  <div className="text-xs text-[#4a4540] leading-relaxed font-serif pl-1 border-l-2 border-[#2d5a4a]/40">
                    <ReactMarkdown 
                      remarkPlugins={[remarkGfm]}
                      components={{
                        p: ({ node: _n, ...props }: any) => { void _n; return <p className="mb-2 last:mb-0" {...props} />; },
                        ul: ({ node: _n, ...props }: any) => { void _n; return <ul className="list-disc pl-4 mb-2 space-y-1" {...props} />; },
                        ol: ({ node: _n, ...props }: any) => { void _n; return <ol className="list-decimal pl-4 mb-2 space-y-1" {...props} />; },
                        li: ({ node: _n, ...props }: any) => { void _n; return <li className="pl-0.5" {...props} />; },
                        strong: ({ node: _n, ...props }: any) => { void _n; return <strong className="font-bold text-[#1a1612] not-italic" {...props} />; },
                        em: ({ node: _n, ...props }: any) => { void _n; return <em className="italic" {...props} />; },
                      }}
                    >
                      {summaryOutput}
                    </ReactMarkdown>
                  </div>
                </div>
              )}

              {/* AI Reply result */}
              {replyDraft && (
                <div className="bg-[#fcf9f3] border border-[#e1d8c6] rounded-[14px] p-4.5 shadow-sm space-y-3 animate-fade-up">
                  <div className="flex justify-between items-center border-b border-[#ece6db] pb-2">
                    <h4 className="font-mono text-[11px] text-[#1d2d5a] font-bold uppercase tracking-wider flex items-center gap-1.5">
                      <Send className="w-3.5 h-3.5" />
                      Suggested Reply Draft
                    </h4>
                    <button
                      type="button"
                      onClick={handleCopyDraft}
                      className="font-mono text-[11px] font-bold uppercase text-[#4a4540] hover:text-[#2d5a4a] flex items-center gap-1 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#2d5a4a]/40 cursor-pointer"
                    >
                      {copiedDraft ? (
                        <>
                          <Check className="w-3 h-3 text-chalk-600 font-bold" />
                          COPIED!
                        </>
                      ) : (
                        <>
                          <Copy className="w-3 h-3" />
                          COPY DRAFT
                        </>
                      )}
                    </button>
                  </div>
                  <textarea
                    className="w-full text-xs text-[#2c2724] leading-relaxed font-sans bg-[#f3ede2] p-4 rounded-md border border-[#e1d8c6] h-60 resize-y focus:outline-none focus-visible:ring-2 focus-visible:ring-[#2d5a4a]/40 focus:ring-1 focus:ring-[#8b857b]"
                    value={replyDraft}
                    onChange={(e) => setReplyDraft(e.target.value)}
                  />
                  <div className="flex justify-between items-center mt-2">
                    <p className="font-serif italic text-[11px] text-[#4a4540] pl-1 h-auto leading-normal">
                      Approved standard guidelines apply. This response uses your personal biography style preference from Assistant Core Memory.
                    </p>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={handleSaveToDrive}
                        disabled={savingDraft || !replyDraft.trim()}
                        className="font-mono text-[11px] font-bold uppercase tracking-wider text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-600 px-4 py-2 rounded-md transition-all cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-600/40 flex items-center gap-1.5 disabled:opacity-50"
                      >
                        <HardDrive className="w-3.5 h-3.5" /> Save to Drive
                      </button>
                      <button
                        type="button"
                        onClick={handleSaveDraft}
                        disabled={savingDraft || !replyDraft.trim()}
                        className="font-mono text-[11px] font-bold uppercase tracking-wider text-white bg-[#2d5a4a] hover:bg-[#1f4236] border border-[#1f4236] px-4 py-2 rounded-md transition-all cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-[#2d5a4a]/40 flex items-center gap-1.5 disabled:opacity-50"
                      >
                        {savingDraft ? (
                           "Saving..."
                        ) : draftSuccess ? (
                           <><Check className="w-3.5 h-3.5" /> Saved to Drafts ✓</>
                        ) : (
                           <><Send className="w-3.5 h-3.5" /> Save as Draft</>
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              )}

            </div>
          ) : (
            <div className="p-16 text-center text-[#4a4540] font-serif italic text-sm">
              Please select a syllabus message to begin academic parsing.
            </div>
          )}
        </div>

      </div>



    </div>
  );
}
