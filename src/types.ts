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
  recurrence?: "none" | "daily" | "weekly" | "monthly";
}

export interface Email {
  id: string;
  subject: string;
  from: string;
  fromName: string;
  fromEmail: string;
  snippet: string;
  body?: string;
  date: string;
  needsReply: boolean;
  summary?: string;
  category: string;
  threadId?: string;
  messageId?: string;
}

export interface CalendarEvent {
  id: string;
  userId?: string;
  title: string;
  start: string;
  end: string;
  location?: string;
  description?: string;
  googleEventId?: string;
  taskId?: string;
  isTimetableVirtual?: boolean;
}

export interface MemoryItem {
  id: string;
  userId?: string;
  key: string;
  value: string;
  category: string;
  updatedAt: string;
  createdAt?: string;
  isPinned?: boolean;
  useInReplies?: boolean;
  doNotUseAutomatically?: boolean;
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

export interface StudentSourceEvidence {
  fileName: string;
  snippet: string;
  field?: string;
}

export interface StudentRecord {
  id?: string;
  fullName: string;
  firstName: string;
  lastName: string;
  classSection: string;
  rollNumber?: string;
  admissionNumber?: string;
  subjects: string[];
  subjectCombination?: string;
  stream?: string;
  sociologyStudent: boolean;
  orientationGroup?: string;
  house?: string;
  email?: string;
  phone?: string;
  parentName?: string;
  parentContact?: string;
  notes?: string;
  specialisation?: string;
  comments?: string;
  sourceFiles: string[];
  sourceEvidence: string[]; // Keep as string[] as per requested fields, or string represented snippets
  confidence: "high" | "medium" | "low";
  needsReview: boolean;
  reviewReason?: string;
  createdAt: string;
  updatedAt: string;
  userId?: string;
}

export interface StudentConflict {
  field: string;
  valueStored: any;
  valueIncoming: any;
  resolved: boolean;
}

export interface StudentImportPreview {
  records: StudentRecord[];
  duplicates: StudentRecord[];
  mergedCount: number;
  newCount: number;
}

export interface TimetableEntry {
  id?: string;
  teacherName: string;
  teacherCode: string;
  department?: string;
  subject: string;
  classSection: string;
  day: string; // Monday - Friday
  period: string; // LESSON 1 - 9, Dispersal, etc.
  startTime: string;
  endTime: string;
  venue?: string;
  room?: string;
  sourceFile: string;
  sourcePage?: number;
  originalText?: string;
  confidence: "high" | "medium" | "low";
  needsReview: boolean;
  reviewReason?: string;
  createdAt: string;
  updatedAt: string;
  userId?: string;
}

export interface TimetableImportPreview {
  records: TimetableEntry[];
  duplicates: TimetableEntry[];
  newCount: number;
  duplicateCount: number;
}

export interface TimetableConflict {
  type: "overlap" | "duplicate" | "clash";
  description: string;
  entries: TimetableEntry[];
}


