import React, { useState } from "react";
import { Task } from "../types";
import { Plus, Trash2, Folder, Calendar } from "lucide-react";
import { useFirestoreTasks } from "../lib/hooks";
import { collection, addDoc, doc, updateDoc, deleteDoc } from "firebase/firestore";
import { db } from "../lib/firebase";

export default function ProjectsView({ userId }: { userId?: string }) {
  const { tasks: allTasks, loading } = useFirestoreTasks(userId);
  const projects = allTasks.filter(t => t.category === "project");

  // Form State
  const [showCreate, setShowCreate] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [deadline, setDeadline] = useState("");
  const [projectCat, setProjectCat] = useState("school");

  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !userId) return;

    try {
      await addDoc(collection(db, `users/${userId}/tasks`), {
        title,
        description,
        deadline: deadline || "",
        category: "project", // locked category as project
        priority: "high",
        status: "in_progress",
        source: "manual",
        createdAt: new Date().toISOString(),
        userId
      });

      setTitle("");
      setDescription("");
      setDeadline("");
      setShowCreate(false);
    } catch (err) {
      console.error(err);
    }
  };

  const handleUpdateProjectStatus = async (id: string, currentStatus: string) => {
    if (!userId) return;
    const nextStatus = currentStatus === "done" ? "in_progress" : "done";
    
    try {
      await updateDoc(doc(db, `users/${userId}/tasks`, id), { status: nextStatus });
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteProject = async (id: string) => {
    if (!userId) return;
    try {
      await deleteDoc(doc(db, `users/${userId}/tasks`, id));
    } catch (err) {
      console.error(err);
    }
  };

  const activeProjects = projects.filter((p) => p.status !== "done");
  const completedProjects = projects.filter((p) => p.status === "done");

  return (
    <div className="animate-fade-up max-w-4xl mx-auto space-y-6">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between border-b border-paper-3 pb-4 gap-4">
        <div>
          <p className="font-mono text-xs tracking-wider text-ink-500 uppercase">Long-term Objectives</p>
          <h2 className="font-serif text-2xl font-semibold text-ink-950 mt-1">Syllabus Projects ({activeProjects.length} Active)</h2>
        </div>
        <button
          onClick={() => setShowCreate(!showCreate)}
          className="bg-chalk-600 hover:bg-chalk-500 text-white font-mono text-xs px-4 py-2 rounded shadow-sm transition-all flex items-center justify-center gap-1.5 focus:outline-none align-self-start sm:align-self-auto"
        >
          <Plus className="w-4 h-4" />
          {showCreate ? "Cancel Project" : "Log Project"}
        </button>
      </div>

      {/* Create Project Panel */}
      {showCreate && (
        <form onSubmit={handleCreateProject} className="bg-paper-1 border border-paper-2 rounded-lg p-5 shadow-sm space-y-4 animate-fade-up">
          <h3 className="font-serif font-semibold text-sm text-ink-950 flex items-center gap-1.5">
            <Folder className="w-4 h-4 text-chalk-600" />
            Launch Long-term Objective Project
          </h3>

          <div className="space-y-3">
            <div>
              <label className="block text-xs font-mono text-ink-700 uppercase tracking-wider mb-1">Project Objective *</label>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g., Cambridge Class 11 Syllabus Outline Prep"
                className="w-full text-sm px-3.5 py-2.5 rounded border border-paper-2 bg-paper-0 text-ink-900 focus:outline-none focus:border-chalk-600"
              />
            </div>

            <div>
              <label className="block text-xs font-mono text-ink-700 uppercase tracking-wider mb-1">Objective Milestones / Steps</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Define key milestone checkpoints or expected syllabus outputs..."
                rows={2.5}
                className="w-full text-sm px-3.5 py-2.5 rounded border border-paper-2 bg-paper-0 text-ink-900 focus:outline-none focus:border-chalk-600 resize-none font-serif"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-mono text-ink-700 uppercase tracking-wider mb-1">Target Assessment Date</label>
                <input
                  type="date"
                  value={deadline}
                  onChange={(e) => setDeadline(e.target.value)}
                  className="w-full text-sm px-3.5 py-2.5 rounded border border-paper-2 bg-paper-0 text-ink-900 focus:outline-none focus:border-chalk-600"
                />
              </div>

              <div>
                <label className="block text-xs font-mono text-ink-700 uppercase tracking-wider mb-1">Project Domain</label>
                <select
                  value={projectCat}
                  onChange={(e) => setProjectCat(e.target.value)}
                  className="w-full text-sm px-3.5 py-2.5 rounded border border-paper-2 bg-paper-0 text-ink-900 focus:outline-none"
                >
                  <option value="school">School Curricula</option>
                  <option value="personal">Teacher Leisure / Progress</option>
                  <option value="admin">Institutional Alignment</option>
                </select>
              </div>
            </div>
          </div>

          <div className="pt-2">
            <button
              type="submit"
              className="bg-chalk-600 hover:bg-chalk-500 text-white font-mono text-xs px-5 py-2.5 rounded shadow-sm focus:outline-none"
            >
              Log Project Objective
            </button>
          </div>
        </form>
      )}

      {/* Projects List Grid */}
      <div className="space-y-6">
        {loading ? (
          <div className="p-8 space-y-4">
            <div className="h-10 shimmer-skeleton rounded"></div>
            <div className="h-10 shimmer-skeleton rounded"></div>
          </div>
        ) : (
          <>
            {/* Active section */}
            <div className="space-y-4">
              <h3 className="font-mono text-[10px] text-chalk-600 font-bold uppercase tracking-wider pl-1">In progress & On hold</h3>
              {activeProjects.length === 0 ? (
                <div className="bg-paper-1 border border-paper-2 rounded-lg p-8 text-center font-serif text-sm italic text-ink-500">
                  No active long-term curriculum projects logged.
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {activeProjects.map((p) => (
                    <div key={p.id} className="bg-paper-1 border border-paper-2 p-5 rounded-lg shadow-none flex flex-col justify-between space-y-4 hover:border-paper-3 transition-colors group relative">
                      <div className="space-y-2">
                        <div className="flex items-start justify-between">
                          <h4 className="font-serif font-bold text-sm text-ink-950 flex-1 leading-snug">{p.title}</h4>
                          <button
                            onClick={() => handleDeleteProject(p.id)}
                            className="text-ink-300 hover:text-redpen hover:bg-paper-2 p-1 rounded opacity-0 group-hover:opacity-100 transition-opacity focus:outline-none"
                            title="Wipe project"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                        {p.description && (
                          <p className="text-xs text-ink-700 leading-relaxed font-serif pr-2 line-clamp-3">
                            {p.description}
                          </p>
                        )}
                      </div>

                      <div className="flex items-center justify-between pt-2 border-t border-paper-2 mt-auto">
                        <div className="flex items-center gap-1.5 font-mono text-[9px] text-ink-500">
                          <Calendar className="w-3.5 h-3.5" />
                          <span>
                            {p.deadline
                              ? new Date(p.deadline).toLocaleDateString("en-GB", { day: "numeric", month: "short" })
                              : "No dead-line"}
                          </span>
                        </div>
                        
                        <button
                          onClick={() => handleUpdateProjectStatus(p.id, p.status)}
                          className="font-mono text-[10px] text-chalk-600 bg-paper-2 hover:bg-chalk-100 border border-paper-3 px-2 py-1 rounded transition-colors focus:outline-none"
                        >
                          Complete →
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Completed section */}
            {completedProjects.length > 0 && (
              <div className="space-y-3 pt-2">
                <h3 className="font-mono text-[10px] text-pencil font-bold uppercase tracking-wider pl-1">Fulfilled Milestones</h3>
                <div className="bg-paper-1 border border-paper-2 rounded-lg divide-y divide-paper-2 shadow-sm">
                  {completedProjects.map((p) => (
                    <div key={p.id} className="p-4 flex items-center justify-between gap-4 group">
                      <div className="flex-1 min-w-0">
                        <h4 className="font-serif text-sm font-semibold text-ink-300 line-through truncate leading-normal">
                          {p.title}
                        </h4>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleUpdateProjectStatus(p.id, p.status)}
                          className="font-mono text-[9px] text-ink-500 hover:text-chalk-600 px-2 py-0.5"
                        >
                          Revive
                        </button>
                        <button
                          onClick={() => handleDeleteProject(p.id)}
                          className="text-ink-300 hover:text-redpen p-1 bg-paper-0 group-hover:opacity-100 transition-opacity"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>

    </div>
  );
}
