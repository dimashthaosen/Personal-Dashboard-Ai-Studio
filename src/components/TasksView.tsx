import React, { useState, useEffect } from "react";
import { Task } from "../types";
import { Plus, Trash2, Calendar, AlertCircle, Check } from "lucide-react";
import { useFirestoreTasks } from "../lib/hooks";
import { collection, addDoc, doc, updateDoc, deleteDoc } from "firebase/firestore";
import { db } from "../lib/firebase";

export default function TasksView({ userId }: { userId?: string }) {
  const { tasks: allTasks, loading } = useFirestoreTasks(userId);

  // Filters state
  const [statusFilter, setStatusFilter] = useState("");
  const [priorityFilter, setPriorityFilter] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");

  const tasks = allTasks.filter(t => {
    if (statusFilter && t.status !== statusFilter) return false;
    if (priorityFilter && t.priority !== priorityFilter) return false;
    if (categoryFilter && t.category !== categoryFilter) return false;
    return true;
  });

  // Create task state
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [taskTitle, setTaskTitle] = useState("");
  const [taskDesc, setTaskDesc] = useState("");
  const [taskDeadline, setTaskDeadline] = useState("");
  const [taskPriority, setTaskPriority] = useState<"urgent" | "high" | "medium" | "low">("medium");
  const [taskCategory, setTaskCategory] = useState<Task["category"]>("school");

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!taskTitle.trim() || !userId) return;

    try {
      await addDoc(collection(db, `users/${userId}/tasks`), {
        title: taskTitle,
        description: taskDesc,
        deadline: taskDeadline || "",
        priority: taskPriority,
        category: taskCategory,
        status: "pending",
        source: "manual",
        createdAt: new Date().toISOString(),
        userId
      });

      setTaskTitle("");
      setTaskDesc("");
      setTaskDeadline("");
      setTaskPriority("medium");
      setTaskCategory("school");
      setShowCreateForm(false);
    } catch (err) {
      console.error("Failed to create task", err);
    }
  };

  const handleToggleTaskStatus = async (task: Task) => {
    if (!userId) return;
    const nextStatus = task.status === "done" ? "pending" : "done";
    try {
      await updateDoc(doc(db, `users/${userId}/tasks`, task.id), { status: nextStatus });
    } catch (err) {
      console.error("Failed to update status", err);
    }
  };

  const handleDeleteTask = async (id: string) => {
    if (!userId) return;
    try {
      await deleteDoc(doc(db, `users/${userId}/tasks`, id));
    } catch (err) {
      console.error("Failed to delete task", err);
    }
  };

  const handleDropdownStatusChange = async (task: Task, newStatus: Task["status"]) => {
    if (!userId) return;
    try {
      await updateDoc(doc(db, `users/${userId}/tasks`, task.id), { status: newStatus });
    } catch (err) {
      console.error("Failed to update status", err);
    }
  };

  return (
    <div className="animate-fade-up max-w-[1050px] mx-auto space-y-6">
      
      {/* Header bar */}
      <div className="flex items-center justify-between border-b border-paper-3 pb-4">
        <div>
          <h2 className="font-serif text-2xl font-normal text-[#1a1612]">Syllabus & Task Ledger</h2>
          <p className="font-serif italic text-xs text-ink-405 mt-1 pl-0.5">
            Organise daily homework corrections, lesson drafts, and school syllabus files.
          </p>
        </div>
        <button
          onClick={() => setShowCreateForm(!showCreateForm)}
          className="bg-chalk-600 hover:bg-[#3a7560] font-mono text-[11px] font-bold text-[#fcf9f3] px-4 py-2.5 rounded-[8px] transition-all focus:outline-none cursor-pointer flex items-center gap-1.5 uppercase tracking-wider"
        >
          <Plus className="w-4 h-4 text-[#fcf9f3]" />
          {showCreateForm ? "Cancel Form" : "Log New Task"}
        </button>
      </div>

      {/* Task Creation Form Panel */}
      {showCreateForm && (
        <form onSubmit={handleCreateTask} className="bg-[#fcf9f3] border border-[#e1d8c6] rounded-[18px] p-6 shadow-[0_6px_24px_-10px_rgba(26,22,18,0.12),0_1px_2px_rgba(26,22,18,0.04)] space-y-4 animate-fade-up">
          <h3 className="font-serif font-bold text-sm text-[#1a1612] pb-2 border-b border-[#ece6db]">Record Activity Parameters</h3>
          
          <div className="space-y-4">
            <div>
              <label className="block text-[10px] font-mono font-bold text-[#7a756f] uppercase tracking-wider mb-1">Task Title *</label>
              <input
                type="text"
                required
                value={taskTitle}
                onChange={(e) => setTaskTitle(e.target.value)}
                placeholder="e.g. Prepare Chapter Review Notes on Nationalism..."
                className="w-full text-xs px-3.5 py-2.5 rounded-md border border-[#e1d8c6] bg-[#f3ede2] text-ink-950 focus:outline-none focus:border-chalk-600 placeholder:italic placeholder:font-light"
              />
            </div>

            <div>
              <label className="block text-[10px] font-mono font-bold text-[#7a756f] uppercase tracking-wider mb-1">Description Brief</label>
              <textarea
                value={taskDesc}
                onChange={(e) => setTaskDesc(e.target.value)}
                placeholder="Include key details, syllabus sub-topics, or materials to prepare..."
                rows={2}
                className="w-full text-xs px-3.5 py-2.5 rounded-md border border-[#e1d8c6] bg-[#f3ede2] text-ink-950 focus:outline-none focus:border-chalk-600 resize-none placeholder:italic placeholder:font-light"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-[10px] font-mono font-bold text-[#7a756f] uppercase tracking-wider mb-1">Deadline Target</label>
                <input
                  type="date"
                  value={taskDeadline}
                  onChange={(e) => setTaskDeadline(e.target.value)}
                  className="w-full text-xs px-3.5 py-2.5 rounded-md border border-[#e1d8c6] bg-[#f3ede2] text-[#1a1612] focus:outline-none focus:border-chalk-600"
                />
              </div>

              <div>
                <label className="block text-[10px] font-mono font-bold text-[#7a756f] uppercase tracking-wider mb-1">Priority Scale</label>
                <select
                  value={taskPriority}
                  onChange={(e) => setTaskPriority(e.target.value as any)}
                  className="w-full text-xs px-3.5 py-2.5 rounded-md border border-[#e1d8c6] bg-[#f3ede2] text-[#1a1612] focus:outline-none"
                >
                  <option value="low">Low Priority</option>
                  <option value="medium">Medium Priority</option>
                  <option value="high">High Priority</option>
                  <option value="urgent" className="font-semibold">Urgent Alert</option>
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-mono font-bold text-[#7a756f] uppercase tracking-wider mb-1">Category Code</label>
                <select
                  value={taskCategory}
                  onChange={(e) => setTaskCategory(e.target.value as any)}
                  className="w-full text-xs px-3.5 py-2.5 rounded-md border border-[#e1d8c6] bg-[#f3ede2] text-[#1a1612] focus:outline-none"
                >
                  <option value="school">School Work</option>
                  <option value="personal">Personal Routine</option>
                  <option value="followup">Student Follow-up</option>
                  <option value="project">Project Work</option>
                  <option value="email">Emails / Drafts</option>
                  <option value="admin">Administration</option>
                </select>
              </div>
            </div>
          </div>

          <div className="pt-2">
            <button
              type="submit"
              className="bg-[#2d5a4a] hover:bg-[#3a7560] text-white font-mono text-xs px-5 py-2.5 rounded shadow-sm focus:outline-none transition-all uppercase tracking-wider font-semibold"
            >
              Add Task to Planner
            </button>
          </div>
        </form>
      )}

      {/* Control Filters across the top */}
      <div className="bg-[#fcf9f3] border border-[#e1d8c6] rounded-[14px] p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 select-none">
        {/* Status filter pills in paper surface background, green check/uncheck indicators */}
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="font-mono text-[9px] text-[#7a756f] font-bold uppercase tracking-[0.14em] mr-2">LEDGER STATUS:</span>
          {[
            { tag: "", label: "All Lists" },
            { tag: "pending", label: "Pending" },
            { tag: "in_progress", label: "In Progress" },
            { tag: "waiting", label: "Waiting" },
            { tag: "done", label: "Completed" }
          ].map((item) => (
            <button
              key={item.tag}
              type="button"
              onClick={() => setStatusFilter(item.tag)}
              className={`font-sans text-xs px-3.5 py-1.5 rounded-full border transition-all flex items-center gap-1.5 focus:outline-none ${
                statusFilter === item.tag
                  ? "bg-[#e8f0ec] border-[#d2e3da] text-[#2d5a4a] font-bold"
                  : "bg-[#fcf9f3] border border-[#e1d8c6] text-[#4a4540] hover:bg-[#ece6db]/50 font-normal"
              }`}
            >
              {statusFilter === item.tag && <span className="w-1.5 h-1.5 rounded-full bg-[#2d5a4a]" />}
              {item.label}
            </button>
          ))}
        </div>

        {/* Categories / Priorities selectors */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="font-mono text-[9px] text-[#7a756f] uppercase font-bold tracking-wider">PRIORITY:</span>
            <select
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value)}
              className="font-sans text-xs bg-[#f3ede2] border border-[#e1d8c6] p-1.5 rounded-md text-[#1a1612] focus:outline-none"
            >
              <option value="">All Priorities</option>
              <option value="urgent">Urgent</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>
          </div>

          <div className="flex items-center gap-2">
            <span className="font-mono text-[9px] text-[#7a756f] uppercase font-bold tracking-wider">CATEGORY:</span>
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="font-sans text-xs bg-[#f3ede2] border border-[#e1d8c6] p-1.5 rounded-md text-[#1a1612] focus:outline-none"
            >
              <option value="">All Categories</option>
              <option value="school">School Work</option>
              <option value="personal">Personal Routine</option>
              <option value="followup">Student Follow-up</option>
              <option value="project">Project Work</option>
              <option value="email">Emails / Drafts</option>
              <option value="admin">Administration</option>
            </select>
          </div>
        </div>
      </div>

      {/* Main tasks list ledger table */}
      <div className="bg-[#fcf9f3] border border-[#e1d8c6] rounded-[18px] overflow-hidden shadow-[0_6px_24px_-10px_rgba(26,22,18,0.12),0_1px_2px_rgba(26,22,18,0.04)]">
        
        {loading ? (
          <div className="p-8 space-y-4">
            <div className="h-6 w-full shimmer-skeleton rounded" />
            <div className="h-6 w-5/6 shimmer-skeleton rounded" />
            <div className="h-6 w-4/5 shimmer-skeleton rounded" />
          </div>
        ) : tasks.length === 0 ? (
          <div className="p-12 text-center text-[#8b857b] font-serif italic text-sm">
            No active syllabus tasks found in ledger database.
          </div>
        ) : (
          <div className="divide-y divide-[#ece6db]">
            {tasks
              .filter((task) => {
                const matchesStatus = !statusFilter || task.status === statusFilter;
                const matchesPriority = !priorityFilter || task.priority === priorityFilter;
                const matchesCategory = !categoryFilter || task.category === categoryFilter;
                return matchesStatus && matchesPriority && matchesCategory;
              })
              .map((task) => {
                const isCompleted = task.status === "done";
                return (
                  <div
                    key={task.id}
                    className="p-4 flex items-start gap-3.5 hover:bg-[#ece6db]/20 transition-colors group"
                  >
                    {/* Done Checkbox */}
                    <button
                      type="button"
                      onClick={() => handleToggleTaskStatus(task)}
                      className={`w-4.5 h-4.5 rounded border flex items-center justify-center transition-all mt-0.5 ${
                        isCompleted
                          ? "bg-[#2d5a4a] border-[#2d5a4a] text-[#fcf9f3]"
                          : "border-[#e1d8c6] bg-[#f3ede2] hover:border-[#2d5a4a]"
                      }`}
                    >
                      {isCompleted && <Check className="w-3 h-3 stroke-[2.5]" />}
                    </button>

                    {/* Task details descriptions */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={`text-[8px] font-mono font-bold uppercase tracking-wider px-1.5 py-0.5 rounded ${
                          task.status === "in_progress" ? "bg-[#dbeafe] text-[#1e40af]" :
                          task.status === "waiting" ? "bg-[#fef3c7] text-[#92400e]" :
                          task.status === "done" ? "bg-[#d1fae5] text-[#065f46]" :
                          task.status === "cancelled" ? "bg-[#fee2e2] text-[#991b1b]" :
                          "bg-[#f1f5f9] text-[#475569]"
                        }`}>
                          {task.status.replace("_", " ")}
                        </span>
                        <span className={`priority-dot ${task.priority}`} title={`Priority: ${task.priority}`} />
                        <span className={`font-sans text-xs text-[#1a1612] ${isCompleted ? "line-through text-[#8b857b]/75 italic" : "font-medium"}`}>
                          {task.title}
                        </span>
                      </div>

                      {task.description && (
                        <p className={`text-xs text-[#4a4540] mt-1 pl-4 leading-relaxed ${isCompleted ? "text-[#8b857b]/65" : ""}`}>
                          {task.description}
                        </p>
                      )}

                      <div className="flex items-center gap-3 mt-1.5 pl-4 text-[10px] font-mono text-[#8b857b] whitespace-nowrap">
                        <span className="capitalize bg-[#ece6db]/50 px-2 py-0.5 rounded border border-[#ece6db]">
                          {task.category}
                        </span>
                        {task.deadline && (
                          <span className="flex items-center gap-1 text-[#8b857b]">
                            <Calendar className="w-3.5 h-3.5" />
                            {new Date(task.deadline).toLocaleDateString("en-GB", {
                              day: "numeric",
                              month: "short",
                              year: "numeric"
                            })}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Dropdown pick status & wipe */}
                    <div className="flex items-center gap-2.5 flex-shrink-0">
                      <select
                        value={task.status}
                        onChange={(e) => handleDropdownStatusChange(task, e.target.value as any)}
                        className="font-mono text-[10px] bg-[#f3ede2] border border-[#e1d8c6] rounded px-1.5 py-1 text-[#4a4540] opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity focus:outline-none"
                      >
                        <option value="pending">Pending</option>
                        <option value="in_progress">In Progress</option>
                        <option value="waiting">Waiting</option>
                        <option value="done">Completed</option>
                        <option value="cancelled">Cancelled</option>
                      </select>

                      <button
                        type="button"
                        onClick={() => handleDeleteTask(task.id)}
                        className="text-[#8b857b] hover:text-[#b83232] p-1 rounded opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity focus:outline-none"
                        title="Remove action item"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
          </div>
        )}
      </div>
    </div>
  );
}
