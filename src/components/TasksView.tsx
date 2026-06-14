import React, { useState, useEffect } from "react";
import { Task } from "../types";
import { Plus, Trash2, Calendar, AlertCircle } from "lucide-react";
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
    <div className="animate-fade-up max-w-4xl mx-auto space-y-6">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between border-b border-paper-3 pb-4 gap-4">
        <div>
          <p className="font-mono text-xs tracking-wider text-ink-500 uppercase">Focal Action Items</p>
          <h2 className="font-serif text-2xl font-semibold text-ink-950 mt-1">Syllabus & Admin Tasks</h2>
        </div>
        <button
          onClick={() => setShowCreateForm(!showCreateForm)}
          className="bg-chalk-600 hover:bg-chalk-500 text-white font-mono text-xs px-4 py-2 rounded shadow-sm transition-all flex items-center justify-center gap-1.5 focus:outline-none align-self-start sm:align-self-auto"
        >
          <Plus className="w-4 h-4" />
          {showCreateForm ? "Cancel Task" : "Log New Task"}
        </button>
      </div>

      {/* Task Creation Form Panel */}
      {showCreateForm && (
        <form onSubmit={handleCreateTask} className="bg-paper-1 border border-paper-2 rounded-lg p-5 shadow-sm space-y-4 animate-fade-up">
          <h3 className="font-serif font-semibold text-sm text-ink-950">Add Teacher Assignment</h3>
          
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-mono text-ink-700 uppercase tracking-wider mb-1">Task Title *</label>
              <input
                type="text"
                required
                value={taskTitle}
                onChange={(e) => setTaskTitle(e.target.value)}
                placeholder="e.g., Prepare Chapter Review Notes on Nationalism"
                className="w-full text-sm px-3.5 py-2.5 rounded border border-paper-2 bg-paper-0 text-ink-900 focus:outline-none focus:border-chalk-600 transition-colors"
              />
            </div>

            <div>
              <label className="block text-xs font-mono text-ink-700 uppercase tracking-wider mb-1">Description</label>
              <textarea
                value={taskDesc}
                onChange={(e) => setTaskDesc(e.target.value)}
                placeholder="Include key details, syllabus sub-topics, or materials to prepare..."
                rows={2}
                className="w-full text-sm px-3.5 py-2.5 rounded border border-paper-2 bg-paper-0 text-ink-900 focus:outline-none focus:border-chalk-600 transition-colors resize-none"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-mono text-ink-700 uppercase tracking-wider mb-1">Deadline</label>
                <input
                  type="date"
                  value={taskDeadline}
                  onChange={(e) => setTaskDeadline(e.target.value)}
                  className="w-full text-sm px-3.5 py-2.5 rounded border border-paper-2 bg-paper-0 text-ink-900 focus:outline-none focus:border-chalk-600 transition-all"
                />
              </div>

              <div>
                <label className="block text-xs font-mono text-ink-700 uppercase tracking-wider mb-1">Priority</label>
                <select
                  value={taskPriority}
                  onChange={(e) => setTaskPriority(e.target.value as any)}
                  className="w-full text-sm px-3.5 py-2.5 rounded border border-paper-2 bg-paper-0 text-ink-900 focus:outline-none"
                >
                  <option value="low">Low Priority</option>
                  <option value="medium">Medium Priority</option>
                  <option value="high">High Priority</option>
                  <option value="urgent">Urgent</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-mono text-ink-700 uppercase tracking-wider mb-1">Category</label>
                <select
                  value={taskCategory}
                  onChange={(e) => setTaskCategory(e.target.value as any)}
                  className="w-full text-sm px-3.5 py-2.5 rounded border border-paper-2 bg-paper-0 text-ink-900 focus:outline-none"
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
              className="bg-chalk-600 hover:bg-chalk-500 text-white font-mono text-xs px-5 py-2.5 rounded shadow-sm focus:outline-none transition-all"
            >
              Add Task to Planner
            </button>
          </div>
        </form>
      )}

      {/* Filter and Sorting Row */}
      <div className="flex flex-wrap gap-3 p-4 bg-paper-1 border border-paper-2 rounded-lg">
        
        {/* Status select */}
        <div className="flex flex-col">
          <span className="font-mono text-[9px] text-ink-500 uppercase tracking-wider mb-1 pl-1">Status</span>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="font-mono text-xs bg-paper-0 border border-paper-2 rounded px-2 py-1.5 focus:outline-none text-ink-700"
          >
            <option value="">All Statuses</option>
            <option value="pending">Pending</option>
            <option value="in_progress">In Progress</option>
            <option value="waiting">Waiting / Blocked</option>
            <option value="done">Completed</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>

        {/* Priority Filter */}
        <div className="flex flex-col">
          <span className="font-mono text-[9px] text-ink-500 uppercase tracking-wider mb-1 pl-1">Importance</span>
          <select
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value)}
            className="font-mono text-xs bg-paper-0 border border-paper-2 rounded px-2 py-1.5 focus:outline-none text-ink-700"
          >
            <option value="">All Priorities</option>
            <option value="urgent">Urgent Alert</option>
            <option value="high">High priority</option>
            <option value="medium">Medium priority</option>
            <option value="low">Low priority</option>
          </select>
        </div>

        {/* Category Filter */}
        <div className="flex flex-col">
          <span className="font-mono text-[9px] text-ink-500 uppercase tracking-wider mb-1 pl-1">Category</span>
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="font-mono text-xs bg-paper-0 border border-paper-2 rounded px-2 py-1.5 focus:outline-none text-ink-700"
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

      {/* Main Tasks List */}
      <div className="bg-paper-1 border border-paper-2 rounded-lg overflow-hidden shadow-sm">
        {loading ? (
          <div className="p-8 space-y-3">
            <div className="h-4 shimmer-skeleton rounded w-full"></div>
            <div className="h-4 shimmer-skeleton rounded w-5/6"></div>
            <div className="h-4 shimmer-skeleton rounded w-4/5"></div>
          </div>
        ) : tasks.length === 0 ? (
          <div className="p-12 text-center text-ink-500">
            <AlertCircle className="w-8 h-8 mx-auto stroke-[1.5] text-ink-300 mb-2" />
            <p className="font-serif text-sm">No tasks tracked in this planner section.</p>
          </div>
        ) : (
          <div className="divide-y divide-paper-2">
            {tasks.map((task) => (
              <div key={task.id} className="p-4 flex items-start gap-3 hover:bg-paper-0 transition-colors group">
                <input
                  type="checkbox"
                  checked={task.status === "done"}
                  onChange={() => handleToggleTaskStatus(task)}
                  className="mt-1 flex-shrink-0"
                />
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`priority-dot ${task.priority === "urgent" ? "urgent" : task.priority === "high" ? "high" : task.priority === "medium" ? "medium" : "low"}`} />
                    <span className={`font-serif text-sm leading-snug font-medium text-ink-950 ${task.status === "done" ? "line-through text-ink-300" : ""}`}>
                      {task.title}
                    </span>
                  </div>

                  {task.description && (
                    <p className={`text-xs text-ink-700 mt-1 pl-4 leading-relaxed ${task.status === "done" ? "text-ink-300" : ""}`}>
                      {task.description}
                    </p>
                  )}

                  <div className="flex items-center gap-3 mt-1.5 pl-4 text-[10px] font-mono text-ink-500 whitespace-nowrap">
                    <span className="capitalize bg-paper-2 px-1.5 py-0.5 rounded text-ink-700">{task.category}</span>
                    {task.deadline && (
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {new Date(task.deadline).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}
                      </span>
                    )}
                  </div>
                </div>

                {/* Dropdown status selector */}
                <div className="flex items-center gap-2 flex-shrink-0">
                  <select
                    value={task.status}
                    onChange={(e) => handleDropdownStatusChange(task, e.target.value as any)}
                    className="font-mono text-[10px] bg-paper-2 border border-paper-3 rounded px-1.5 py-1 text-ink-500 opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity focus:outline-none"
                  >
                    <option value="pending">Pending</option>
                    <option value="in_progress">In Progress</option>
                    <option value="waiting">Waiting / Blocked</option>
                    <option value="done">Completed</option>
                    <option value="cancelled">Cancelled</option>
                  </select>

                  <button
                    onClick={() => handleDeleteTask(task.id)}
                    className="text-ink-300 hover:text-redpen p-1 rounded opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity"
                    title="Remove action item"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
