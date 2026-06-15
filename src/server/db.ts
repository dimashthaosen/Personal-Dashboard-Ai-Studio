import fs from "fs";
import path from "path";

export interface Task {
  id: string;
  title: string;
  description?: string;
  deadline?: string;
  priority: "urgent" | "high" | "medium" | "low";
  category: "school" | "personal" | "followup" | "project" | "email" | "admin";
  status: "pending" | "in_progress" | "done" | "waiting" | "cancelled";
  source: string;
  createdAt: string;
}

export interface Email {
  id: string;
  subject: string;
  from: string;
  fromName: string;
  fromEmail: string;
  snippet: string;
  date: string;
  needsReply: boolean;
  summary?: string;
  category: string;
}

export interface CalendarEvent {
  id: string;
  title: string;
  start: string;
  end: string;
  location?: string;
  description?: string;
}

export interface MemoryItem {
  id: string;
  key: string;
  value: string;
  category: string;
  updatedAt: string;
}

export interface NotionPage {
  id: string;
  notionId: string;
  title: string;
  lastEdited: string;
  category: string;
  content: string;
  synced: boolean;
}

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: string;
}

export interface DailyPlan {
  id: string;
  date: string;
  plan: {
    mustDo: string[];
    shouldDo: string[];
    canMove: string[];
    followUps: string[];
    suggestedSchedule: string;
  };
}

interface DatabaseSchema {
  tasks: Task[];
  emails: Email[];
  calendarEvents: CalendarEvent[];
  memoryItems: MemoryItem[];
  chatHistory: ChatMessage[];
  dailyPlans: DailyPlan[];
}

const DB_FILE = path.join(process.cwd(), "db.json");

class ServerDB {
  private data: DatabaseSchema;

  constructor() {
    this.data = this.load();
    if (this.data.tasks.length === 0 && this.data.emails.length === 0) {
      this.seed();
    }
  }

  private load(): DatabaseSchema {
    try {
      if (fs.existsSync(DB_FILE)) {
        const fileContent = fs.readFileSync(DB_FILE, "utf-8");
        return JSON.parse(fileContent);
      }
    } catch (err) {
      console.error("Error reading database file, using empty db:", err);
    }
    return {
      tasks: [],
      emails: [],
      calendarEvents: [],
      memoryItems: [],
      chatHistory: [],
      dailyPlans: [],
    };
  }

  private save() {
    try {
      // Ensure directory exists
      const dir = path.dirname(DB_FILE);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      fs.writeFileSync(DB_FILE, JSON.stringify(this.data, null, 2), "utf-8");
    } catch (err) {
      console.error("Error saving database file:", err);
    }
  }

  private seed() {
    const now = new Date();
    const todayAt = (hours: number, minutes = 0) => {
      const d = new Date(now);
      d.setHours(hours, minutes, 0, 0);
      return d.toISOString();
    };

    const tomorrowAt = (hours: number, minutes = 0) => {
      const d = new Date(now);
      d.setDate(d.getDate() + 1);
      d.setHours(hours, minutes, 0, 0);
      return d.toISOString();
    };

    const nextWeekAt = (hours: number, minutes = 0) => {
      const d = new Date(now);
      d.setDate(d.getDate() + 7);
      d.setHours(hours, minutes, 0, 0);
      return d.toISOString();
    };

    // Tasks Seed
    this.data.tasks = [
      {
        id: "task-1",
        title: "Prepare Class 9 review worksheet on nationalism",
        description: "Include 8 short-answer questions and 5 source-based MCQs.",
        deadline: tomorrowAt(16, 0),
        priority: "high",
        category: "school",
        status: "pending",
        source: "manual",
        createdAt: now.toISOString(),
      },
      {
        id: "task-2",
        title: "Follow up with Abhiveer about GP project sources",
        description: "Check whether he has added citations and balanced perspectives.",
        deadline: todayAt(16, 30),
        priority: "urgent",
        category: "followup",
        status: "pending",
        source: "manual",
        createdAt: now.toISOString(),
      },
      {
        id: "task-3",
        title: "Draft parent email about Sociology assessment schedule",
        deadline: tomorrowAt(12, 0),
        priority: "medium",
        category: "email",
        status: "pending",
        source: "manual",
        createdAt: now.toISOString(),
      },
      {
        id: "task-4",
        title: "Create Class 11 lesson plan on social stratification",
        description: "Use a short activity and one local example from Delhi.",
        deadline: nextWeekAt(9, 0),
        priority: "medium",
        category: "school",
        status: "pending",
        source: "manual",
        createdAt: now.toISOString(),
      },
      {
        id: "task-5",
        title: "Check personal electricity bill reminder",
        deadline: nextWeekAt(18, 0),
        priority: "low",
        category: "personal",
        status: "pending",
        source: "manual",
        createdAt: now.toISOString(),
      },
    ];

    // Emails Seed
    this.data.emails = [];

    // Calendar Events Seed
    this.data.calendarEvents = [
      {
        id: "event-1",
        title: "Class 9 History Recapitulation",
        start: todayAt(9, 0),
        end: todayAt(9, 45),
        location: "Room 204",
        description: "Nationalism recap and interactive worksheet review.",
      },
      {
        id: "event-2",
        title: "Class 11 Sociology Seminar",
        start: todayAt(11, 15),
        end: todayAt(12, 0),
        location: "Room 112",
        description: "Discussion on social stratification structures and dynamic mobility.",
      },
      {
        id: "event-3",
        title: "Vasant Valley Staff Council Meeting",
        start: todayAt(14, 30),
        end: todayAt(15, 15),
        location: "Staff Conference Room",
        description: "Administrative briefings, upcoming events calendar alignment, and mid-term updates.",
      },
    ];

    // Memory Seed
    this.data.memoryItems = [
      {
        id: "mem-1",
        key: "Role",
        value: "Teacher at Vasant Valley School, Delhi. Subjects: Social Science, Sociology, History, Cambridge IGCSE Global Perspectives.",
        category: "school",
        updatedAt: now.toISOString(),
      },
      {
        id: "mem-2",
        key: "Writing style",
        value: "Clear, friendly, professional, point-wise where useful, British English spelling structures, no unnecessary marketing jargon.",
        category: "preferences",
        updatedAt: now.toISOString(),
      },
      {
        id: "mem-3",
        key: "Common classes",
        value: "Classes 8, 9, 11, and 12. Prepares lesson plan worksheet reviews, syllabus tests and quizzes, high school recommendation letters, and custom report card feedback regularly.",
        category: "patterns",
        updatedAt: now.toISOString(),
      },
    ];

    // Chat History Seed
    this.data.chatHistory = [
      {
        id: "chat-1",
        role: "user",
        content: "Hello! Can you summarize what key priorities are on my planner for today?",
        timestamp: todayAt(8, 30),
      },
      {
        id: "chat-2",
        role: "assistant",
        content: "Good morning! Welcome back. Here are your main focal points for today:\n\n1. **Class 9 Recapitulation Class** starting at 9:00 AM (Room 204).\n2. **Urgent task**: Follow up with Abhiveer regarding GP citation sources by 4:30 PM today.\n3. **Pending emails**: Anita Sharma wants the updated Global Perspectives syllabus worksheet, and Riya Mehta requested a reference recommendation letter.\n\nWould you like me to draft a quick reply to Anita's email or review Abhiveer's source requirements?",
        timestamp: todayAt(8, 31),
      },
    ];

    this.save();
  }

  // Tasks Methods
  getTasks() {
    return this.data.tasks;
  }

  addTask(task: Omit<Task, "id" | "createdAt">) {
    const newTask: Task = {
      ...task,
      id: "task-" + Date.now(),
      createdAt: new Date().toISOString(),
    };
    this.data.tasks.push(newTask);
    this.save();
    return newTask;
  }

  updateTask(id: string, updates: Partial<Task>) {
    const idx = this.data.tasks.findIndex((t) => t.id === id);
    if (idx !== -1) {
      this.data.tasks[idx] = { ...this.data.tasks[idx], ...updates };
      this.save();
      return this.data.tasks[idx];
    }
    return null;
  }

  deleteTask(id: string) {
    this.data.tasks = this.data.tasks.filter((t) => t.id !== id);
    this.save();
    return true;
  }

  // Emails Methods
  getEmails() {
    return this.data.emails;
  }

  getEmailById(id: string) {
    return this.data.emails.find((e) => e.id === id) || null;
  }

  syncGmailEmails(gmailEmails: Email[]) {
    // Merge real fetched emails into the array while preserving local summaries if any
    const existingMap = new Map(this.data.emails.map(e => [e.id, e]));
    
    const merged = gmailEmails.map(ne => {
      const existing = existingMap.get(ne.id);
      return {
        ...ne,
        summary: existing?.summary || ne.summary,
      };
    });

    this.data.emails = merged;
    this.save();
  }

  // Calendar Methods
  getCalendarEvents() {
    return this.data.calendarEvents;
  }

  addCalendarEvent(event: Omit<CalendarEvent, "id">) {
    const newEvent: CalendarEvent = {
      ...event,
      id: "event-" + Date.now(),
    };
    this.data.calendarEvents.push(newEvent);
    this.save();
    return newEvent;
  }

  // Memory Methods
  getMemoryItems() {
    return this.data.memoryItems;
  }

  addMemoryItem(item: Omit<MemoryItem, "id" | "updatedAt">) {
    const newItem: MemoryItem = {
      ...item,
      id: "mem-" + Date.now(),
      updatedAt: new Date().toISOString(),
    };
    this.data.memoryItems.push(newItem);
    this.save();
    return newItem;
  }

  updateMemoryItem(id: string, updates: Partial<MemoryItem>) {
    const idx = this.data.memoryItems.findIndex((m) => m.id === id);
    if (idx !== -1) {
      this.data.memoryItems[idx] = {
        ...this.data.memoryItems[idx],
        ...updates,
        updatedAt: new Date().toISOString(),
      };
      this.save();
      return this.data.memoryItems[idx];
    }
    return null;
  }

  deleteMemoryItem(id: string) {
    this.data.memoryItems = this.data.memoryItems.filter((m) => m.id !== id);
    this.save();
    return true;
  }

  // Chat History
  getChatHistory() {
    return this.data.chatHistory;
  }

  addChatMessage(role: "user" | "assistant", content: string) {
    const msg: ChatMessage = {
      id: "msg-" + Date.now() + Math.random().toString(36).substring(2, 5),
      role,
      content,
      timestamp: new Date().toISOString(),
    };
    this.data.chatHistory.push(msg);
    // limit history size to 40 items
    if (this.data.chatHistory.length > 40) {
      this.data.chatHistory.shift();
    }
    this.save();
    return msg;
  }

  clearChatHistory() {
    this.data.chatHistory = [];
    this.save();
  }

  // Daily Plans
  getDailyPlans() {
    return this.data.dailyPlans;
  }

  addDailyPlan(plan: DailyPlan["plan"]) {
    const newPlan: DailyPlan = {
      id: "plan-" + Date.now(),
      date: new Date().toISOString(),
      plan,
    };
    this.data.dailyPlans.push(newPlan);
    this.save();
    return newPlan;
  }
}

export const db = new ServerDB();
