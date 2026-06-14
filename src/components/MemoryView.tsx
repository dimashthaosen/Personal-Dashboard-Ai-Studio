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
    <div className="animate-fade-up max-w-4xl mx-auto space-y-6">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between border-b border-paper-3 pb-4 gap-4">
        <div>
          <p className="font-mono text-xs tracking-wider text-ink-500 uppercase">Grounded Biography</p>
          <h2 className="font-serif text-2xl font-semibold text-ink-950 mt-1">Assistant Core Memory</h2>
        </div>
        <button
          onClick={() => setShowCreateForm(!showCreateForm)}
          className="bg-chalk-600 hover:bg-chalk-500 text-white font-mono text-xs px-4 py-2 rounded shadow-sm transition-all flex items-center justify-center gap-1.5 focus:outline-none align-self-start sm:align-self-auto"
        >
          <Plus className="w-4 h-4" />
          {showCreateForm ? "Cancel Memory" : "Save Constant"}
        </button>
      </div>

      {/* Log Memory Form panel */}
      {showCreateForm && (
        <form onSubmit={handleCreateMemory} className="bg-paper-1 border border-paper-2 rounded-lg p-5 shadow-sm space-y-4 animate-fade-up">
          <h3 className="font-serif font-semibold text-sm text-ink-950 flex items-center gap-1.5">
            <Brain className="w-4 h-4 text-chalk-600" />
            Add Constant to Biography Context
          </h3>

          <div className="space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-mono text-ink-700 uppercase tracking-wider mb-1">Key Context Identifier *</label>
                <input
                  type="text"
                  required
                  value={newKey}
                  onChange={(e) => setNewKey(e.target.value)}
                  placeholder="e.g., Writing Style or Class 9 Periods"
                  className="w-full text-sm px-3.5 py-2.5 rounded border border-paper-2 bg-paper-0 text-ink-900 focus:outline-none focus:border-chalk-600 transition-colors"
                />
              </div>

              <div>
                <label className="block text-xs font-mono text-ink-700 uppercase tracking-wider mb-1">Context Category</label>
                <select
                  value={newCategory}
                  onChange={(e) => setNewCategory(e.target.value)}
                  className="w-full text-sm px-3.5 py-2.5 rounded border border-paper-2 bg-paper-0 text-ink-900 focus:outline-none"
                >
                  <option value="general">General</option>
                  <option value="preferences">Style Preferences</option>
                  <option value="people">Staff / Student Names</option>
                  <option value="school">Curriculum Requirements</option>
                  <option value="patterns">Timetable Patterns</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-mono text-ink-700 uppercase tracking-wider mb-1">Constant Value / Description *</label>
              <textarea
                required
                value={newValue}
                onChange={(e) => setNewValue(e.target.value)}
                placeholder="Declare standard pointers or biographies the assistant should use for all unread mails, daily schedules, and worksheet plans..."
                rows={3}
                className="w-full text-sm px-3.5 py-2.5 rounded border border-paper-2 bg-paper-0 text-ink-900 focus:outline-none focus:border-chalk-600 transition-colors resize-none"
              />
            </div>
          </div>

          <div className="pt-2">
            <button
              type="submit"
              className="bg-chalk-600 hover:bg-chalk-500 text-white font-mono text-xs px-5 py-2.5 rounded shadow-sm focus:outline-none transition-all"
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
            className={`font-mono text-[10px] uppercase tracking-wider px-3 py-1.5 rounded transition-all focus:outline-none ${
              categoryFilter === cat
                ? "bg-chalk-600 text-white font-semibold"
                : "bg-paper-1 hover:bg-paper-2 text-ink-700 border border-paper-2"
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
          <div className="bg-paper-1 border border-paper-2 rounded-lg p-10 text-center font-serif text-sm text-ink-500 italic">
            Memory stack clean. Click &quot;Save Constant&quot; to log custom context parameters.
          </div>
        ) : (
          filteredMemories.map((mem) => {
            const isEditing = editingId === mem.id;
            return (
              <div key={mem.id} className="bg-paper-1 border border-paper-2 rounded-lg p-4 group animate-fadeIn space-y-2">
                <div className="flex justify-between items-center border-b border-paper-2 pb-1.5">
                  <div className="flex items-center gap-2">
                    <span className="font-serif font-bold text-sm text-ink-950">{mem.key}</span>
                    <span className="font-mono text-[9px] text-ink-500 uppercase bg-paper-2 px-1.5 py-0.5 rounded">
                      {mem.category}
                    </span>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity">
                    {!isEditing ? (
                      <>
                        <button
                          onClick={() => handleStartEditing(mem.id, mem.value)}
                          className="font-mono text-[10px] text-chalk-500 hover:text-chalk-600 p-1.5 focus:outline-none flex items-center gap-0.5"
                        >
                          <Edit2 className="w-3 h-3" />
                          Edit
                        </button>
                        <button
                          onClick={() => handleDeleteMemory(mem.id)}
                          className="font-mono text-[10px] text-ink-500 hover:text-redpen p-1.5 focus:outline-none flex items-center gap-0.5"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          Wipe
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          onClick={() => handleSaveEdit(mem.id)}
                          className="font-mono text-[10px] text-chalk-600 p-1 focus:outline-none flex items-center gap-0.5 font-bold"
                        >
                          <Check className="w-3.5 h-3.5 text-chalk-600" />
                          Save
                        </button>
                        <button
                          onClick={() => setEditingId(null)}
                          className="font-mono text-[10px] text-redpen p-1 focus:outline-none flex items-center gap-0.5"
                        >
                          <X className="w-3.5 h-3.5" />
                          Cancel
                        </button>
                      </>
                    )}
                  </div>
                </div>

                {!isEditing ? (
                  <p className="font-serif italic text-xs text-ink-700 leading-relaxed pr-10 whitespace-pre-wrap">
                    &ldquo;{mem.value}&quot;
                  </p>
                ) : (
                  <textarea
                    value={editValue}
                    onChange={(e) => setEditValue(e.target.value)}
                    rows={2}
                    className="w-full text-xs p-2 rounded border border-paper-3 bg-paper-0 text-ink-950 focus:outline-none focus:border-chalk-600 resize-none font-serif italic"
                  />
                )}
                
                <div className="text-[9px] font-mono text-ink-300 pr-1 pl-0.5">
                  Synchronised: {new Date(mem.updatedAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                </div>
              </div>
            );
          })
        )}
      </div>

    </div>
  );
}
