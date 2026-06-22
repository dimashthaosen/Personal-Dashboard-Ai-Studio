import React, { useState } from "react";
import { MemoryItem } from "../types";
import { Brain, Plus, Trash2, Edit2, Check, X, Pin, MessageSquare, EyeOff } from "lucide-react";
import { useFirestoreMemory } from "../lib/hooks";
import { collection, addDoc, doc, updateDoc, deleteDoc } from "firebase/firestore";
import { db } from "../lib/firebase";

export default function MemoryView({ userId }: { userId?: string }) {
  const { memoryItems: memories, loading } = useFirestoreMemory(userId);

  // Category filter
  const [categoryFilter, setCategoryFilter] = useState("all");

  // Create memory state
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newKey, setNewKey] = useState("");
  const [newValue, setNewValue] = useState("");
  const [newCategory, setNewCategory] = useState("school_routines");

  // Edit memory state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");

  const handleCreateMemory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newKey.trim() || !newValue.trim() || !userId) return;

    try {
      await addDoc(collection(db, `users/${userId}/memoryItems`), {
        key: newKey,
        value: newValue,
        category: newCategory,
        updatedAt: new Date().toISOString(),
        createdAt: new Date().toISOString(),
        userId,
        isPinned: false,
        useInReplies: false,
        doNotUseAutomatically: false
      });

      setNewKey("");
      setNewValue("");
      setNewCategory("school_routines");
      setShowCreateForm(false);
    } catch (err) {
      console.error(err);
    }
  };

  const handleStartEditing = (id: string, value: string) => {
    setEditingId(id);
    setEditValue(value);
  };

  const handleSaveEdit = async (id: string) => {
    if (!editValue.trim() || !userId) return;
    try {
      await updateDoc(doc(db, `users/${userId}/memoryItems`, id), { value: editValue, updatedAt: new Date().toISOString() });
      setEditingId(null);
      setEditValue("");
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteMemory = async (id: string) => {
    if (!userId) return;
    try {
      await deleteDoc(doc(db, `users/${userId}/memoryItems`, id));
    } catch (err) {
      console.error(err);
    }
  };

  const handleTogglePin = async (item: MemoryItem) => {
    if (!userId || item.id.startsWith("system")) return;
    try {
      await updateDoc(doc(db, `users/${userId}/memoryItems`, item.id), {
        isPinned: !item.isPinned,
        updatedAt: new Date().toISOString()
      });
    } catch (err) {
      console.error("Failed to toggle pin:", err);
    }
  };

  const handleToggleUseInReplies = async (item: MemoryItem) => {
    if (!userId || item.id.startsWith("system")) return;
    try {
      await updateDoc(doc(db, `users/${userId}/memoryItems`, item.id), {
        useInReplies: !item.useInReplies,
        updatedAt: new Date().toISOString()
      });
    } catch (err) {
      console.error("Failed to toggle use in replies:", err);
    }
  };

  const handleToggleDoNotUseAutomatically = async (item: MemoryItem) => {
    if (!userId || item.id.startsWith("system")) return;
    try {
      await updateDoc(doc(db, `users/${userId}/memoryItems`, item.id), {
        doNotUseAutomatically: !item.doNotUseAutomatically,
        updatedAt: new Date().toISOString()
      });
    } catch (err) {
      console.error("Failed to toggle ignore flag:", err);
    }
  };

  const systemMemories: MemoryItem[] = [
    {
      id: "system-core-identity",
      key: "Identity & Role",
      value: "Role: Teacher at Vasant Valley School, Delhi (email: dimasht@vasantvalley.edu.in). Subjects: Sociology (Classes 11, 12), History/Social Science (Middleschool), Cambridge IGCSE Global Perspectives (Classes 8, 9). Admin: Veracross gradebook, 11 A Homeroom attendance, substitutions. Signs emails: 'Regards, Dimash Thaosen'. Prefers practical, direct, friendly help.",
      category: "school_routines",
      updatedAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      isPinned: true
    },
    {
      id: "system-background-interests",
      key: "Background & Interests",
      value: "Studied History (St. Stephen's) & Sociology (Delhi School of Economics). Interests: Indian society, media, AI tools, app-building, current affairs. Personal: Cars (Murciélago, LFA), Top Gear, gaming, anime. Tech projects: Dashboards, Gmail/Notion/Drive integrations, Firebase, Vercel, OCR workflows.",
      category: "personal_preferences",
      updatedAt: new Date().toISOString(),
      createdAt: new Date().toISOString()
    },
    {
      id: "system-communication-style",
      key: "Communication Style & Voice",
      value: "Tone: Polite, professional, warm, clear, school-appropriate. British English formatting (e.g., 'summarise', 'programme'). Style: Bullet points preferred. Email openings: 'Good morning/afternoon...', Sign-off: 'Regards, Dimash Thaosen'. Be encouraging but clear to students; respectful and concise to colleagues/admin.",
      category: "writing_preferences",
      updatedAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      useInReplies: true
    },
    {
      id: "system-formatting-preferences",
      key: "Answer & Formatting Preferences",
      value: "Prefers immediate, practical answers without vague caveats. Use bullet points for logistics. Document needs: Clean PDFs, polished question papers, landscape 16:9 slides, readable fonts. NO random bolding, NO excessive tables (use bullets). For 'grammar fixes', only fix text without overexplaining unless asked.",
      category: "writing_preferences",
      updatedAt: new Date().toISOString(),
      createdAt: new Date().toISOString()
    },
    {
      id: "system-people-contacts",
      key: "Colleagues & Contacts",
      value: "Frequent contacts: Mr. Trivedi, Mr. Bisht, Mudita Mubayi, Pragati Gupta, Anandita Dhawan, Avmeet Kaur Kohli, Saday Mahajan, Chandni Singh, Rashi Thakur, Drishti Nanda, Akshay Kumar, Ms. Thakur, Ms. Pattajoshi. Use 'Mr.' or 'Ms.' when known contextually. NEVER expose/invent student details without explicit context.",
      category: "class_context",
      updatedAt: new Date().toISOString(),
      createdAt: new Date().toISOString()
    },
    {
      id: "system-school-context",
      key: "Workplace Context & Workflows",
      value: "Tools: Veracross (attendance, gradebook, portals), Google Drive/Docs/Sheets/Gmail. Recurring workflows: Updating 11 A Homeroom attendance, checking student emails, creating project guidelines/rubrics, coordinating events (Inter-School Social Science Quiz, Laissez Faire quiz).",
      category: "school_routines",
      updatedAt: new Date().toISOString(),
      createdAt: new Date().toISOString()
    },
    {
      id: "system-teaching-subjects",
      key: "Teaching Subjects Context",
      value: "Sociology: Thinkers (Marx, Weber, Mead, Goffman), concepts (stratification, demography), exam-oriented, structured headings, Indian examples. History/SS: Student-friendly class notes, periodisation, revolutions. GP/IGCSE: Issues, perspectives, bias, evidence, credibility. Newsletters like 'Worldwatch' for 8 IGCSE.",
      category: "class_context",
      updatedAt: new Date().toISOString(),
      createdAt: new Date().toISOString()
    },
    {
      id: "system-assistant-patterns",
      key: "Assistant Optimization Patterns",
      value: "Provide ready-to-use drafts, accurate teaching materials, copy-pasteable tech prompts for app-building. When coding: give step-by-step instructions. Protect privacy (never invent student info/grades). Avoid system internal talk, corporate jargon, or self-praise. Deliver straight-to-the-point functional text.",
      category: "assistant_behaviour",
      updatedAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      useInReplies: true
    }
  ];

  const categories = [
    "all",
    "writing_preferences",
    "school_routines",
    "class_context",
    "recurring_tasks",
    "personal_preferences",
    "assistant_behaviour"
  ];

  const categoriesLabels: Record<string, string> = {
    all: "ALL MEMORIES",
    writing_preferences: "WRITING STYLE",
    school_routines: "SCHOOL ROUTINES",
    class_context: "CLASS CONTEXT",
    recurring_tasks: "RECURRING TASKS",
    personal_preferences: "PERSONAL PREFS",
    assistant_behaviour: "ASSISTANT COACHING"
  };

  const allMemories = [...systemMemories, ...memories];

  // Filter memories
  const matchedMemories = allMemories.filter(
    (m) => categoryFilter === "all" || m.category === categoryFilter
  );

  // Sort memories: Pinned first, then by last updated
  const filteredMemories = [...matchedMemories].sort((a, b) => {
    const aPin = a.isPinned ? 1 : 0;
    const bPin = b.isPinned ? 1 : 0;
    if (aPin !== bPin) return bPin - aPin;
    return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
  });

  return (
    <div className="animate-fade-up max-w-[1050px] mx-auto space-y-6">
      
      {/* Header bar */}
      <div className="flex items-center justify-between border-b border-paper-3 pb-4">
        <div>
          <h2 className="font-serif text-2xl font-normal text-[#1a1612]">Memory</h2>
          <p className="font-serif italic text-xs text-ink-405 mt-1 pl-0.5">
            Important details, study guides, school curriculum constraints, and workspace styles remembered for you.
          </p>
        </div>
        <button
          onClick={() => setShowCreateForm(!showCreateForm)}
          className="bg-[#2d5a4a] hover:bg-[#3a7560] font-mono text-[11px] font-bold text-[#fcf9f3] px-4 py-2.5 rounded-[8px] transition-all focus:outline-none cursor-pointer flex items-center gap-1.5 uppercase tracking-wider"
        >
          <Plus className="w-4 h-4 text-white" />
          {showCreateForm ? "Cancel" : "Add Memory"}
        </button>
      </div>

      {/* Log Memory Form panel */}
      {showCreateForm && (
        <form onSubmit={handleCreateMemory} className="bg-[#fcf9f3] border border-[#e1d8c6] rounded-[18px] p-6 shadow-[0_6px_24px_-10px_rgba(26,22,18,0.12),0_1px_2px_rgba(26,22,18,0.04)] space-y-4 animate-fade-up">
          <h3 className="font-serif font-bold text-sm text-[#1a1612] pb-2 border-b border-[#ece6db] flex items-center gap-2">
            <Brain className="w-4 h-4 text-[#2d5a4a]" />
            Declare Custom Grounding Constant
          </h3>

          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] font-mono font-bold text-[#7a756f] uppercase tracking-wider mb-1">Key Context Identifier *</label>
                <input
                  type="text"
                  required
                  value={newKey}
                  onChange={(e) => setNewKey(e.target.value)}
                  placeholder="e.g. Timetable Standard Periods or Writing Style..."
                  className="w-full text-xs px-3.5 py-2.5 rounded-md border border-[#e1d8c6] bg-[#f3ede2] text-ink-950 focus:outline-none focus:border-[#2d5a4a] placeholder:italic"
                />
              </div>

              <div>
                <label className="block text-[10px] font-mono font-bold text-[#7a756f] uppercase tracking-wider mb-1">Context Category</label>
                <select
                  value={newCategory}
                  onChange={(e) => setNewCategory(e.target.value)}
                  className="w-full text-xs px-3.5 py-2.5 rounded-md border border-[#e1d8c6] bg-[#f3ede2] text-[#1a1612] focus:outline-none uppercase"
                >
                  {categories.filter(c => c !== "all").map(cat => (
                    <option key={cat} value={cat}>
                      {categoriesLabels[cat]}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-mono font-bold text-[#7a756f] uppercase tracking-wider mb-1">Constant Value / Description *</label>
              <textarea
                required
                value={newValue}
                onChange={(e) => setNewValue(e.target.value)}
                placeholder="Declare standard pointers or biographies the assistant should use for all unread mails, worksheets, and schedule creations..."
                rows={3}
                className="w-full text-xs px-3.5 py-2.5 rounded-md border border-[#e1d8c6] bg-[#f3ede2] text-ink-950 focus:outline-none focus:border-[#2d5a4a] resize-none placeholder:italic"
              />
            </div>
          </div>

          <div className="pt-2 border-t border-[#ece6db]">
            <button
              type="submit"
              className="bg-[#2d5a4a] hover:bg-[#3a7560] text-white font-mono text-[10px] font-bold px-5 py-2.5 rounded-md uppercase tracking-wider shadow-sm focus:outline-none cursor-pointer"
            >
              Learn Biography Element
            </button>
          </div>
        </form>
      )}

      {/* Category Filter Pills */}
      <div className="flex flex-wrap gap-2">
        {categories.map((cat) => (
          <button
            key={cat}
            type="button"
            onClick={() => setCategoryFilter(cat)}
            className={`font-mono text-[9px] uppercase tracking-wider px-3.5 py-1.5 rounded-full border transition-all focus:outline-none cursor-pointer ${
              categoryFilter === cat
                ? "bg-[#2d5a4a] border-[#2d5a4a] text-white font-semibold"
                : "bg-[#fcf9f3] text-[#4a4540] border border-[#e1d8c6] hover:bg-[#ece6db]/50"
            }`}
          >
            {categoriesLabels[cat] || "ALL MEMORIES"}
          </button>
        ))}
      </div>

      {/* Memory items listing */}
      <div className="space-y-4">
        {loading ? (
          <div className="space-y-3">
            <div className="h-20 bg-[#ece6db]/50 animate-pulse rounded"></div>
            <div className="h-20 bg-[#ece6db]/50 animate-pulse rounded"></div>
          </div>
        ) : filteredMemories.length === 0 ? (
          <div className="bg-[#fcf9f3] border border-[#e1d8c6] rounded-[18px] p-10 text-center font-serif text-sm text-[#8b857b] italic space-y-1.5 animate-fadeIn">
            <p>Your memory bank is empty.</p>
            <p className="text-xs font-sans not-italic text-[#a29c91]">Click &ldquo;Add Memory&rdquo; above to store custom curriculum parameters, reminders, or formatting choices.</p>
          </div>
        ) : (
          filteredMemories.map((mem) => {
            const isEditing = editingId === mem.id;
            const isSystem = mem.id.startsWith("system");
            return (
              <div key={mem.id} className="bg-[#fcf9f3] border border-[#e1d8c6] rounded-[18px] p-5 shadow-[0_4px_16px_-6px_rgba(26,22,18,0.08)] group space-y-3 animate-fadeIn">
                <div className="flex justify-between items-center border-b border-[#ece6db] pb-2">
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      disabled={isSystem}
                      onClick={() => handleTogglePin(mem)}
                      className={`p-1 rounded hover:bg-paper-2 transition-colors ${
                        isSystem ? "cursor-default" : "cursor-pointer"
                      }`}
                      title={isSystem ? "System configurations are permanently pinned" : "Toggle Pin"}
                    >
                      <Pin className={`w-4 h-4 ${
                        mem.isPinned 
                          ? "fill-[#2d5a4a] text-[#2d5a4a]" 
                          : "text-[#8a857a] hover:text-[#2d5a4a]"
                      }`} />
                    </button>
                    <span className="font-serif font-bold text-sm text-[#1a1612]">{mem.key}</span>
                    <span className="font-mono text-[9px] text-[#2d5a4a] uppercase bg-[#e8f0ec] border border-[#d2e3da] px-2 py-0.5 rounded-md">
                      {categoriesLabels[mem.category] || mem.category}
                    </span>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity">
                    {!isSystem && (
                      !isEditing ? (
                        <>
                          <button
                            onClick={() => handleStartEditing(mem.id, mem.value)}
                            className="font-mono text-[10px] text-[#2d5a4a] hover:text-[#3a7560] p-1.5 focus:outline-none flex items-center gap-0.5 cursor-pointer"
                          >
                            <Edit2 className="w-3 h-3" />
                            EDIT
                          </button>
                          <button
                            onClick={() => handleDeleteMemory(mem.id)}
                            className="font-mono text-[10px] text-ink-500 hover:text-[#b83232] p-1.5 focus:outline-none flex items-center gap-0.5 cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            WIPE
                          </button>
                        </>
                      ) : (
                        <>
                          <button
                            onClick={() => handleSaveEdit(mem.id)}
                            className="font-mono text-[10px] text-chalk-600 p-1 focus:outline-none flex items-center gap-0.5 font-bold cursor-pointer"
                          >
                            <Check className="w-3.5 h-3.5 text-chalk-600" />
                            SAVE
                          </button>
                          <button
                            onClick={() => setEditingId(null)}
                            className="font-mono text-[10px] text-ink-500 p-1 focus:outline-none flex items-center gap-0.5 cursor-pointer"
                          >
                            <X className="w-3.5 h-3.5" />
                            CANCEL
                          </button>
                        </>
                      )
                    )}
                  </div>
                </div>

                {!isEditing ? (
                  <p className="font-serif italic text-xs text-[#4a4540] leading-relaxed pr-10 whitespace-pre-wrap">
                    &ldquo;{mem.value}&rdquo;
                  </p>
                ) : (
                  <textarea
                    value={editValue}
                    onChange={(e) => setEditValue(e.target.value)}
                    rows={2}
                    className="w-full text-xs p-2.5 rounded border border-[#e1d8c6] bg-[#f3ede2] text-ink-950 focus:outline-none focus:border-[#2d5a4a] resize-none font-serif italic"
                  />
                )}
                
                <div className="flex flex-wrap items-center justify-between gap-4 pt-2 border-t border-[#ece6db]/50">
                  {/* Status controls */}
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      disabled={isSystem}
                      onClick={() => handleToggleUseInReplies(mem)}
                      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-mono font-medium border transition-colors ${
                        mem.useInReplies 
                          ? "bg-[#e8f0ec] text-[#2d5a4a] border-[#d2e3da]" 
                          : "bg-white text-[#8b857b] border-[#e1d8c6] hover:bg-[#ece6db]/30"
                      } ${isSystem ? "cursor-default opacity-85" : "cursor-pointer"}`}
                    >
                      <MessageSquare className="w-3 h-3" />
                      Style in Replies
                    </button>

                    <button
                      type="button"
                      disabled={isSystem}
                      onClick={() => handleToggleDoNotUseAutomatically(mem)}
                      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-mono font-medium border transition-colors ${
                        mem.doNotUseAutomatically 
                          ? "bg-red-50 text-red-700 border-red-200" 
                          : "bg-white text-[#8b857b] border-[#e1d8c6] hover:bg-[#ece6db]/30"
                      } ${isSystem ? "cursor-default opacity-85" : "cursor-pointer"}`}
                    >
                      <EyeOff className="w-3 h-3" />
                      Do Not Auto-Use
                    </button>
                  </div>

                  <div className="text-[9px] font-mono text-[#8b857b] pr-1 pl-0.5">
                    <span>RECORD CREATION: {new Date(mem.createdAt || mem.updatedAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}</span>
                    <span className="mx-2">·</span>
                    <span>UPDATED: {new Date(mem.updatedAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}</span>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

    </div>
  );
}
