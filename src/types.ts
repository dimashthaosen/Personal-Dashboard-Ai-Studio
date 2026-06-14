export interface Task {
  id: string;
  userId?: string;
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
  userId?: string;
  title: string;
  start: string;
  end: string;
  location?: string;
  description?: string;
}

export interface MemoryItem {
  id: string;
  userId?: string;
  key: string;
  value: string;
  category: string;
  updatedAt: string;
}

export interface ChatMessage {
  id: string;
  userId?: string;
  role: "user" | "assistant";
  content: string;
  timestamp: string;
}

export interface DailyPlan {
  content: string;
}

export interface TeacherUser {
  name: string;
  email: string;
  username: string;
  avatarUrl?: string;
  isGoogle?: boolean;
  userId?: string;
}
