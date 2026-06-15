import React, { useState } from "react";
import { MemoryItem } from "../types";
import { Brain, Plus, Trash2, Edit2, Check, X } from "lucide-react";
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
  const [newCategory, setNewCategory] = useState("general");

  // Edit memory state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");

  const handleCreateMemory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newKey.trim() || !newValue.trim() || !userId) return;

    try {
      await addDoc(collection(db, `users/${userId}/memory`), {
        key: newKey,
        value: newValue,
        category: newCategory,
        updatedAt: new Date().toISOString(),
        userId
      });

      setNewKey("");
      setNewValue("");
      setNewCategory("general");
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
      await updateDoc(doc(db, `users/${userId}/memory`, id), { value: editValue, updatedAt: new Date().toISOString() });
      setEditingId(null);
      setEditValue("");
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteMemory = async (id: string) => {
    if (!userId) return;
    try {
      await deleteDoc(doc(db, `users/${userId}/memory`, id));
    } catch (err) {
      console.error(err);
    }
  };

  const categories = ["all", "general", "preferences", "people", "school", "patterns"];

  const filteredMemories = memories.filter(
    (m) => categoryFilter === "all" || m.category === categoryFilter
  );

  return (
    <div className="animate-fade-up max-w-[1050px] mx-auto space-y-6">
      
      {/* Header bar */}
      <div className="flex items-center justify-between border-b border-paper-3 pb-4">
        <div>
          <h2 className="font-serif text-2xl font-normal text-[#1a1612]">Assistant Core Memory</h2>
          <p className="font-serif italic text-xs text-ink-405 mt-1 pl-0.5">
            Static contextual constants, curriculum requirements, work preferences, and biographies.
          </p>
        </div>
        <button
          onClick={() => setShowCreateForm(!showCreateForm)}
          className="bg-[#2d5a4a] hover:bg-[#3a7560] font-mono text-[11px] font-bold text-[#fcf9f3] px-4 py-2.5 rounded-[8px] transition-all focus:outline-none cursor-pointer flex items-center gap-1.5 uppercase tracking-wider"
        >
          <Plus className="w-4 h-4 text-white" />
          {showCreateForm ? "Cancel Constant" : "Save Constant"}
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
                  className="w-full text-xs px-3.5 py-2.5 rounded-md border border-[#e1d8c6] bg-[#f3ede2] text-[#1a1612] focus:outline-none"
                >
                  <option value="general">GENERAL</option>
                  <option value="preferences">STYLE PREFERENCES</option>
                  <option value="people">STAFF / STUDENT NAMES</option>
                  <option value="school">CURRICULUM ASSIGNMENTS</option>
                  <option value="patterns">TIMETABLE SCHEME</option>
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
              className="bg-[#2d5a4a] hover:bg-[#3a7560] text-white font-mono text-[10px] font-bold px-5 py-2.5 rounded-md uppercase tracking-wider shadow-sm focus:outline-none"
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
            onClick={() => setCategoryFilter(cat)}
            className={`font-mono text-[9px] uppercase tracking-wider px-3.5 py-1.5 rounded-full border transition-all focus:outline-none ${
              categoryFilter === cat
                ? "bg-[#2d5a4a] border-[#2d5a4a] text-white font-semibold"
                : "bg-[#fcf9f3] text-[#4a4540] border border-[#e1d8c6] hover:bg-[#ece6db]/50"
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Memory items listing */}
      <div className="space-y-4">
        {loading ? (
          <div className="space-y-3">
            <div className="h-20 shimmer-skeleton rounded"></div>
            <div className="h-20 shimmer-skeleton rounded"></div>
          </div>
        ) : filteredMemories.length === 0 ? (
          <div className="bg-[#fcf9f3] border border-[#e1d8c6] rounded-[18px] p-10 text-center font-serif text-sm text-[#8b857b] italic">
            Memory stack clean. Click &quot;Save Constant&quot; to log custom context parameters.
          </div>
        ) : (
          filteredMemories.map((mem) => {
            const isEditing = editingId === mem.id;
            return (
              <div key={mem.id} className="bg-[#fcf9f3] border border-[#e1d8c6] rounded-[18px] p-5 shadow-[0_4px_16px_-6px_rgba(26,22,18,0.08)] group space-y-3 animate-fadeIn">
                <div className="flex justify-between items-center border-b border-[#ece6db] pb-2">
                  <div className="flex items-center gap-2">
                    <span className="font-serif font-bold text-sm text-[#1a1612]">{mem.key}</span>
                    <span className="font-mono text-[9px] text-[#2d5a4a] uppercase bg-[#e8f0ec] border border-[#d2e3da] px-2 py-0.5 rounded-md">
                      {mem.category}
                    </span>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity">
                    {!isEditing ? (
                      <>
                        <button
                          onClick={() => handleStartEditing(mem.id, mem.value)}
                          className="font-mono text-[10px] text-[#2d5a4a] hover:text-[#3a7560] p-1.5 focus:outline-none flex items-center gap-0.5"
                        >
                          <Edit2 className="w-3 h-3" />
                          EDIT
                        </button>
                        <button
                          onClick={() => handleDeleteMemory(mem.id)}
                          className="font-mono text-[10px] text-ink-500 hover:text-[#b83232] p-1.5 focus:outline-none flex items-center gap-0.5"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          WIPE
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          onClick={() => handleSaveEdit(mem.id)}
                          className="font-mono text-[10px] text-chalk-600 p-1 focus:outline-none flex items-center gap-0.5 font-bold"
                        >
                          <Check className="w-3.5 h-3.5 text-chalk-600" />
                          SAVE
                        </button>
                        <button
                          onClick={() => setEditingId(null)}
                          className="font-mono text-[10px] text-ink-500 p-1 focus:outline-none flex items-center gap-0.5"
                        >
                          <X className="w-3.5 h-3.5" />
                          CANCEL
                        </button>
                      </>
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
                
                <div className="text-[9px] font-mono text-[#8b857b] pr-1 pl-0.5 pt-1 flex justify-between items-center">
                  <span>LAST REFINED: {new Date(mem.updatedAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}</span>
                  <span className="uppercase text-[8px] tracking-wider text-[#8b857b]/70 font-bold">STATE: GUARANTEED PERSISTENT</span>
                </div>
              </div>
            );
          })
        )}
      </div>

    </div>
  );
}
