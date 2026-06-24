import { getApps, initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import fs from "fs";
import path from "path";
import { schoolEvents } from "../data/schoolEvents.js";
import { SEED_STUDENTS } from "../data/studentsData.js";
import { generateContentText, generateLessonPlan as aiGenerateLessonPlan } from "./ai.js";
import { db } from "./db.js";
import { fetchGmailEmails } from "./gmail.js";
import { normalisePriority, normaliseCategory, normaliseStatus, normaliseMemoryCategory, buildReplyPrompt } from "./validators.js";
import { Task, CalendarEvent, MemoryItem, StudentRecord, TimetableEntry, Email } from "../types.js";

// Load Firebase configuration
const configPath = path.join(process.cwd(), "firebase-applet-config.json");
let firebaseConfig: any = {};
try {
  firebaseConfig = JSON.parse(fs.readFileSync(configPath, "utf-8"));
} catch (err: any) {
  console.error("FATAL: Failed to read or parse firebase-applet-config.json. Ensure it exists and is valid JSON.", err.message);
  process.exit(1);
}

// Initialize firebase-admin only once
const app = getApps().length === 0
  ? initializeApp({
      projectId: firebaseConfig.projectId
    })
  : getApps()[0];

export const serverDb = firebaseConfig.firestoreDatabaseId
  ? getFirestore(app, firebaseConfig.firestoreDatabaseId)
  : getFirestore();

// Helper to check if a tool is a write action that requires approval
export function isWriteTool(name: string): boolean {
  const writeTools = ["createTask", "updateTask", "createCalendarEvent", "saveMemory", "generateLessonPlan"];
  return writeTools.includes(name);
}

// Declarations of all 10 tools mapping to standard Gemini 2.x/3.x tool definitions
export const TOOL_DECLARATIONS = [
  {
    name: "createTask",
    description: "Drafts a new task to organize middle/senior school sociology, history, or social science assignments, assemblies, or administrative duties.",
    parameters: {
      type: "OBJECT",
      properties: {
        title: { type: "STRING", description: "Title of the task to be created" },
        description: { type: "STRING", description: "Detailed description of the task requirements, references, or links" },
        category: { 
          type: "STRING", 
          description: "Task category. Must be one of: school, personal, followup, project, email, admin",
          enum: ["school", "personal", "followup", "project", "email", "admin"]
        },
        priority: { 
          type: "STRING", 
          description: "Task priority level. Must be one of: low, medium, high, urgent",
          enum: ["low", "medium", "high", "urgent"]
        },
        deadline: { type: "STRING", description: "Deadline for completion formatted as YYYY-MM-DD (or empty string)" }
      },
      required: ["title"]
    }
  },
  {
    name: "updateTask",
    description: "Updates an existing task's title, description, category, priority, deadline, or completion status.",
    parameters: {
      type: "OBJECT",
      properties: {
        taskId: { type: "STRING", description: "The unique ID (Firestore document id) of the task to update" },
        title: { type: "STRING", description: "Updated title of the task" },
        description: { type: "STRING", description: "Updated description of the task" },
        category: { 
          type: "STRING", 
          description: "Category. Must be one of: school, personal, followup, project, email, admin",
          enum: ["school", "personal", "followup", "project", "email", "admin"]
        },
        priority: { 
          type: "STRING", 
          description: "Priority. Must be one of: low, medium, high, urgent",
          enum: ["low", "medium", "high", "urgent"]
        },
        deadline: { type: "STRING", description: "Deadline formatted as YYYY-MM-DD" },
        status: { 
          type: "STRING", 
          description: "Updated completion status. Must be one of: pending, in_progress, done, waiting, cancelled",
          enum: ["pending", "in_progress", "done", "waiting", "cancelled"]
        }
      },
      required: ["taskId"]
    }
  },
  {
    name: "searchTasks",
    description: "Searches or filters tasks based on search terms, status, category, or priority. (Read-only, executes automatically)",
    parameters: {
      type: "OBJECT",
      properties: {
        query: { type: "STRING", description: "Case-insensitive substring search for task title or description" },
        status: { type: "STRING", description: "Filter by status: pending, in_progress, done, waiting, cancelled" },
        category: { type: "STRING", description: "Filter by category: school, personal, followup, project, email, admin" },
        priority: { type: "STRING", description: "Filter by priority: low, medium, high, urgent" }
      }
    }
  },
  {
    name: "createCalendarEvent",
    description: "Drafts a new calendar event (meetings, parent-teacher briefings, quizzes, lessons).",
    parameters: {
      type: "OBJECT",
      properties: {
        title: { type: "STRING", description: "Title of the calendar event" },
        description: { type: "STRING", description: "Detailed description of the meeting or planning agenda" },
        location: { type: "STRING", description: "Location where the event takes place, e.g. Vasant Valley School" },
        start: { type: "STRING", description: "Start date and time in ISO format YYYY-MM-DDTHH:MM:SS" },
        end: { type: "STRING", description: "End date and time in ISO format YYYY-MM-DDTHH:MM:SS" }
      },
      required: ["title", "start", "end"]
    }
  },
  {
    name: "searchCalendar",
    description: "Searches or filters school and custom calendar events for specific topics, dates, or staff meetings. (Read-only, executes automatically)",
    parameters: {
      type: "OBJECT",
      properties: {
        query: { type: "STRING", description: "Case-insensitive keyword to match against event title or location" },
        startDate: { type: "STRING", description: "Start bound for filtered events formatted as YYYY-MM-DD" },
        endDate: { type: "STRING", description: "End bound for filtered events formatted as YYYY-MM-DD" }
      }
    }
  },
  {
    name: "saveMemory",
    description: "Saves reference memories or teacher preferences (e.g., student name associations, draft writing styles, class sections, repeating workflows). Explain what you want to remember and ask for approval first.",
    parameters: {
      type: "OBJECT",
      properties: {
        key: { type: "STRING", description: "The memory key, e.g. 11A Homeroom students or Writing Style" },
        value: { type: "STRING", description: "Detailed description or textual facts to remember. Never include sensitive student/private information." },
        category: { 
          type: "STRING", 
          description: "Optional categorization: writing_preferences, school_routines, class_context, recurring_tasks, personal_preferences, assistant_behaviour",
          enum: ["writing_preferences", "school_routines", "class_context", "recurring_tasks", "personal_preferences", "assistant_behaviour"]
        }
      },
      required: ["key", "value"]
    }
  },
  {
    name: "searchMemory",
    description: "Searches the stored reference memory items or bio data for teacher preferences. (Read-only, executes automatically)",
    parameters: {
      type: "OBJECT",
      properties: {
        query: { type: "STRING", description: "Search term to match memory key or value (case-insensitive)" }
      }
    }
  },
  {
    name: "summariseEmails",
    description: "Fetches and summarises recent email threads for specific topics, parent enquiries, or school communications. Needs valid token context. (Read-only, executes automatically)",
    parameters: {
      type: "OBJECT",
      properties: {
        type: { type: "STRING", description: "Email box to search: inbox or sent", enum: ["inbox", "sent"] },
        limit: { type: "INTEGER", description: "Max number of emails to retrieve from inbox (default is 10)" }
      }
    }
  },
  {
    name: "draftEmailReply",
    description: "Drafts a polished reply for standard parent/colleague emails using Dimash's writing profile & school guidelines.",
    parameters: {
      type: "OBJECT",
      properties: {
        emailId: { type: "STRING", description: "The unique ID (Firestore document ID) of the target email" },
        customKeyPoints: { type: "STRING", description: "Specific facts, inputs, dates, or custom terms to incorporate in reply" }
      },
      required: ["emailId"]
    }
  },
  {
    name: "generateLessonPlan",
    description: "Generates a comprehensive weekly lesson plan following Vasant Valley's progressive sequence and writes it to Firestore.",
    parameters: {
      type: "OBJECT",
      properties: {
        courseId: { type: "STRING", description: "Subject / Course identifier: 'asLevel' for Sociology Class 11/12, 'soc11' for Middle School, or 'gp8' for Global Perspectives Class 8", enum: ["asLevel", "soc11", "gp8"] },
        week: { type: "INTEGER", description: "Syllabus week identifier (between 1 and 40)" },
        lessonsPerWeek: { type: "INTEGER", description: "Number of lessons to compile for the week, between 2 and 6" },
        pedagogicalMix: { type: "STRING", description: "Pedagogical strategy to prioritize: progressive, discussion, research, or exam", enum: ["progressive", "discussion", "research", "exam"] },
        languageTone: { type: "STRING", description: "Style of delivery: accessible or scholarly", enum: ["accessible", "scholarly"] },
        topic: { type: "STRING", description: "Subject topic or title of the chapter" },
        customSourceMaterial: { type: "STRING", description: "Any custom source text, document excerpts, or references to align with" }
      },
      required: ["courseId", "week", "lessonsPerWeek", "pedagogicalMix", "languageTone", "topic"]
    }
  },
  {
    name: "searchStudents",
    description: "Searches or filters students in the Class Student Database. (Read-only, executes automatically)",
    parameters: {
      type: "OBJECT",
      properties: {
        query: { type: "STRING", description: "Search keyword matching name or subjects" },
        classSection: { type: "STRING", description: "Filter by specific class section, e.g. '11A', '11B', '11C'" },
        sociologyOnly: { type: "BOOLEAN", description: "Filter to only sociology students" },
        needsReviewOnly: { type: "BOOLEAN", description: "Filter to only records flagged as needing review" }
      }
    }
  },
  {
    name: "getStudentProfile",
    description: "Retrieves a specific student's detailed dashboard profile including contact, electives, sources, and conflicts.",
    parameters: {
      type: "OBJECT",
      properties: {
        fullName: { type: "STRING", description: "Full name of the student" }
      },
      required: ["fullName"]
    }
  },
  {
    name: "summariseClassProfile",
    description: "Retrieves statistical summaries and breakdowns of Class 11A or Class 11ABC student enrollment, streams, and electives. (Read-only)",
    parameters: {
      type: "OBJECT",
      properties: {
        classSection: { type: "STRING", description: "The class section to break down: e.g. '11A' or empty for all Class 11" }
      }
    }
  },
  {
    name: "getTimetable",
    description: "Retrieves the teacher's current teaching schedule / timetable. You can query by specific day (e.g., 'Monday', 'Tuesday'), or list all entries. (Read-only, executes automatically)",
    parameters: {
      type: "OBJECT",
      properties: {
        day: { type: "STRING", description: "Optional day of the week to filter, e.g. 'Monday', 'Tuesday', etc." }
      }
    }
  }
];

// Core tool executors
async function safeGetCollection(path: string) {
  try {
    const snap = await serverDb.collection(path).get();
    return snap.docs;
  } catch (err: any) {
    console.warn(`Server-side DB read failed for ${path}, falling back to empty. Error:`, err.message);
    return [];
  }
}

export async function executeTool(userId: string, name: string, args: any, accessToken?: string): Promise<any> {
  console.log(`Executing tool server-side: ${name} for user ${userId} with args:`, args);

  try {
    switch (name) {
      case "createTask": {
        const priority = normalisePriority(args.priority);
        const category = normaliseCategory(args.category);

        const title = String(args.title || "Untitled Task").substring(0, 200);

        const docRef = await serverDb.collection(`users/${userId}/tasks`).add({
          title,
          description: args.description || "",
          deadline: args.deadline || "",
          priority,
          category,
          status: "pending",
          source: "assistant",
          createdAt: new Date().toISOString(),
          userId
        });
        return { success: true, taskId: docRef.id, message: `Task "${title}" created successfully in Firestore.` };
      }

      case "updateTask": {
        const docRef = serverDb.doc(`users/${userId}/tasks/${args.taskId}`);
        const taskSnap = await docRef.get();
        if (!taskSnap.exists) {
          throw new Error(`Task with ID ${args.taskId} not found.`);
        }
        
        // Build filtered update data to avoid overwriting variables with undefined
        const updateData: any = {};
        if (args.title !== undefined) updateData.title = String(args.title).substring(0, 200);
        if (args.description !== undefined) updateData.description = String(args.description);
        if (args.deadline !== undefined) updateData.deadline = String(args.deadline);
        
        if (args.priority !== undefined) {
          updateData.priority = normalisePriority(String(args.priority));
        }

        if (args.category !== undefined) {
          updateData.category = normaliseCategory(String(args.category));
        }

        if (args.status !== undefined) {
          updateData.status = normaliseStatus(String(args.status));
        }

        await docRef.update(updateData);
        return { success: true, taskId: args.taskId, message: `Task successfully updated: ${JSON.stringify(updateData)}` };
      }

      case "searchTasks": {
        // Query tasks from Firestore
        const docs = await safeGetCollection(`users/${userId}/tasks`);
        let tasksList = docs.map(d => ({ id: d.id, ...d.data() } as Task));

        // Filter on server side for robustness and to avoid complex composite index requirement
        if (args.status) {
          const mapStatus = args.status === "in-progress" ? "in_progress" : args.status;
          tasksList = tasksList.filter(t => t.status === mapStatus);
        }
        if (args.priority) {
          tasksList = tasksList.filter(t => t.priority === args.priority);
        }
        if (args.category) {
          tasksList = tasksList.filter(t => t.category === args.category);
        }
        if (args.query) {
          const s = args.query.toLowerCase();
          tasksList = tasksList.filter(t => 
            (t.title && t.title.toLowerCase().includes(s)) || 
            (t.description && t.description.toLowerCase().includes(s))
          );
        }

        // Return truncated attributes to keep token bounds neat
        const results = tasksList.map(t => ({
          id: t.id,
          title: t.title,
          description: t.description || "",
          status: t.status,
          priority: t.priority,
          category: t.category,
          deadline: t.deadline || "None"
        }));

        return { count: results.length, tasks: results.slice(0, 15) };
      }

      case "createCalendarEvent": {
        const title = String(args.title || "Untitled Event").substring(0, 200);
        const start = String(args.start || new Date().toISOString()).substring(0, 100);
        const end = String(args.end || new Date().toISOString()).substring(0, 100);
        const description = String(args.description || "");
        
        const docRef = await serverDb.collection(`users/${userId}/calendarEvents`).add({
          title,
          description,
          location: args.location || "Vasant Valley School",
          start,
          end,
          createdAt: new Date().toISOString(),
          userId
        });
        return { success: true, eventId: docRef.id, message: `Calendar event "${title}" created successfully in Firestore.` };
      }

      case "searchCalendar": {
        // Fetch custom user calendar events from Firestore
        const docs = await safeGetCollection(`users/${userId}/calendarEvents`);
        const selectCustom = docs.map(d => ({ id: d.id, ...d.data() } as CalendarEvent));

        // Combine with official static schoolEvents list
        const allEvents = [...selectCustom, ...schoolEvents];
        let filtered = allEvents;

        // Apply filters
        if (args.startDate) {
          filtered = filtered.filter(e => e.start >= args.startDate);
        }
        if (args.endDate) {
          filtered = filtered.filter(e => e.start <= args.endDate);
        }
        if (args.query) {
          const s = args.query.toLowerCase();
          filtered = filtered.filter(e => 
            (e.title && e.title.toLowerCase().includes(s)) ||
            (e.description && e.description.toLowerCase().includes(s)) ||
            (e.location && e.location.toLowerCase().includes(s))
          );
        }

        // Format neatly to restrict context size bloating
        const summary = filtered.map(e => ({
          title: e.title,
          start: e.start,
          end: e.end,
          location: e.location || "Vasant Valley School",
          description: e.description || ""
        }));

        return { count: summary.length, events: summary.slice(0, 15) };
      }

      case "saveMemory": {
        const memoriesRef = serverDb.collection(`users/${userId}/memoryItems`);
        
        const key = String(args.key || "general").substring(0, 100);
        const value = String(args.value || "").substring(0, 1000);
        const category = normaliseMemoryCategory(args.category);

        // Deduplicate: check if a memory with same key already exists to prevent duplicate noise
        const memSnap = await memoriesRef.where("key", "==", key).get();
        
        if (!memSnap.empty) {
          const targetId = memSnap.docs[0].id;
          await memoriesRef.doc(targetId).update({
            value,
            category,
            updatedAt: new Date().toISOString()
          });
          return { success: true, memoryId: targetId, message: `Updated existing memory element for "${key}".` };
        } else {
          const docRef = await memoriesRef.add({
            key,
            value,
            category,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            userId,
            isPinned: false,
            useInReplies: false,
            doNotUseAutomatically: false
          });
          return { success: true, memoryId: docRef.id, message: `Memory element "${key}" saved successfully in Firestore.` };
        }
      }

      case "searchMemory": {
        const docs = await safeGetCollection(`users/${userId}/memoryItems`);
        let items = docs.map(d => ({ id: d.id, ...d.data() } as MemoryItem));

        if (args.query) {
          const s = args.query.toLowerCase();
          items = items.filter(m => 
            (m.key && m.key.toLowerCase().includes(s)) || 
            (m.value && m.value.toLowerCase().includes(s))
          );
        }

        const results = items.map(m => ({ key: m.key, value: m.value, category: m.category }));
        return { count: results.length, memories: results };
      }

      case "summariseEmails": {
        const type = args.type || "inbox";
        const emailLimit = args.limit || 10;
        let emails: any[] = [];

        if (accessToken) {
          try {
            const fetched = await fetchGmailEmails(accessToken, type);
            db.syncGmailEmails(fetched, type);
            emails = fetched;
            console.log(`Fetched ${emails.length} real Gmail emails for summarisation.`);
          } catch (err) {
            console.error("Failed to fetch Google Gmail emails during agent tool execution, falling back to local cached store:", err);
            emails = db.getEmails(type);
          }
        } else {
          emails = db.getEmails(type);
        }

        // Chunk emails to fit within context nicely
        const targetList = emails.slice(0, emailLimit);
        if (targetList.length === 0) {
          return { message: "No recent emails found in this category." };
        }

        const emailSummaries = targetList.map((e, index) => 
          `[Email ${index + 1}] ID: ${e.id} | From: ${e.fromName} (${e.fromEmail}) | Subject: ${e.subject} | Date: ${e.date}\nSnippet: ${e.snippet}`
        ).join("\n\n");

        const prompt = `You are a professional assistant helping Teacher Dimash Thaosen. Carefully summarise the following emails. Focus on actionable items, deadlines/meetings, student issues, parent inquiries, and school administrative notices. Highlight who needs a reply and which emails represent critical action items. Style with clear, British English headings and short bullet points.
        
=== EMAILS ===
${emailSummaries}
=== END ===`;

        const summaryText = await generateContentText(prompt);
        return { count: targetList.length, summary: summaryText };
      }

      case "draftEmailReply": {
        let email = null;
        if (accessToken) {
          const fetched = await import("./gmail.js").then(m => m.fetchGmailEmailById(accessToken, args.emailId));
          if (fetched) {
            email = fetched;
            // Also sync it to DB so we have it for future reference
            db.syncGmailEmails([fetched], "inbox");
          }
        }
        
        if (!email) {
          email = db.getEmailById(args.emailId);
        }

        if (!email) {
          throw new Error(`Email with ID ${args.emailId} not found in localized database or via API.`);
        }

        // Fetch writing style from memory database
        const docs = await safeGetCollection(`users/${userId}/memoryItems`);
        const memories = docs.map(d => d.data());
        
        const prompt = buildReplyPrompt(email, args.customKeyPoints || "", memories);

        const replyDraft = await generateContentText(prompt);
        return { success: true, emailId: args.emailId, recipient: (email as any).fromStr || email.fromEmail || (email as any).from || "", subject: `Re: ${email.subject}`, draft: replyDraft };
      }

      case "generateLessonPlan": {
        const prompt = `Generate a lesson plan:
Course ID: ${args.courseId}
Week: ${args.week}
Lessons per week: ${args.lessonsPerWeek}
Pedagogical Mix: ${args.pedagogicalMix}
Language Tone: ${args.languageTone}
Topic: ${args.topic}
${args.customSourceMaterial ? `Custom Source material details:\n${args.customSourceMaterial}` : ""}`;

        // Generate the lesson plan text
        const planMarkdown = await aiGenerateLessonPlan(prompt);

        return {
          success: true,
          planId: "pending-save",
          message: `Lesson plan for "${args.topic}" (Week ${args.week}) generated successfully.`,
          markdown: planMarkdown,
          args // Pass args back so the client has them
        };
      }

      case "searchStudents": {
        const docs = await safeGetCollection(`users/${userId}/students`);
        let list: StudentRecord[] = [];
        let isFallback = false;
        
        if (docs.length > 0) {
          list = docs.map(doc => ({ id: doc.id, ...doc.data() } as StudentRecord));
        } else {
          list = SEED_STUDENTS;
          isFallback = true;
        }

        if (args.classSection) {
          list = list.filter(s => String(s.classSection).toLowerCase() === args.classSection.toLowerCase());
        }
        if (args.sociologyOnly) {
          list = list.filter(s => s.sociologyStudent === true);
        }
        if (args.needsReviewOnly) {
          list = list.filter(s => s.needsReview === true);
        }
        if (args.query) {
          const q = args.query.toLowerCase();
          list = list.filter(s => 
            s.fullName.toLowerCase().includes(q) || 
            (s.subjects && s.subjects.some((sub: string) => sub.toLowerCase().includes(q))) ||
            (s.reviewReason && s.reviewReason.toLowerCase().includes(q))
          );
        }

        return {
          count: list.length,
          students: list.map(s => ({
            id: s.id || "temp-id",
            fullName: s.fullName,
            classSection: s.classSection,
            rollNumber: s.rollNumber || "",
            subjects: s.subjects,
            sociologyStudent: s.sociologyStudent,
            needsReview: s.needsReview,
            reviewReason: s.reviewReason || "",
            confidence: s.confidence
          })),
          isPreImportDraft: isFallback
        };
      }

      case "getStudentProfile": {
        const docs = await safeGetCollection(`users/${userId}/students`);
        let list: StudentRecord[] = [];
        
        if (docs.length > 0) {
          list = docs.map(doc => ({ id: doc.id, ...doc.data() } as StudentRecord));
        } else {
          list = SEED_STUDENTS;
        }

        const student = list.find(s => s.fullName.toLowerCase() === args.fullName.toLowerCase());
        if (!student) {
          return { success: false, error: `Student with name "${args.fullName}" not found.` };
        }

        return {
          success: true,
          studentDetails: student
        };
      }

      case "summariseClassProfile": {
        const docs = await safeGetCollection(`users/${userId}/students`);
        let list: StudentRecord[] = [];
        
        if (docs.length > 0) {
          list = docs.map(doc => ({ id: doc.id, ...doc.data() } as StudentRecord));
        } else {
          list = SEED_STUDENTS;
        }

        const stats = {
          totalStudents: list.length,
          class11A: list.filter(s => s.classSection === "11A").length,
          class11B: list.filter(s => s.classSection === "11B").length,
          class11C: list.filter(s => s.classSection === "11C").length,
          sociologyStudents: list.filter(s => s.sociologyStudent).length,
          needsReview: list.filter(s => s.needsReview).length,
          subjectCounts: {} as Record<string, number>
        };

        list.forEach(s => {
          if (s.subjects) {
            s.subjects.forEach((sub: string) => {
              stats.subjectCounts[sub] = (stats.subjectCounts[sub] || 0) + 1;
            });
          }
        });

        return {
          success: true,
          summary: stats
        };
      }

      case "getTimetable": {
        const docs = await safeGetCollection(`users/${userId}/timetableEntries`);
        let list = docs.map(doc => ({ id: doc.id, ...doc.data() })) as TimetableEntry[];

        if (list.length === 0) {
          const { EXTRACTED_TIMETABLE } = await import("../data/extractedTimetable.js");
          list = EXTRACTED_TIMETABLE as TimetableEntry[];
        }

        if (args.day) {
          const targetDay = args.day.toLowerCase();
          list = list.filter(e => e.day.toLowerCase() === targetDay);
        }

        list.sort((a, b) => {
          const getPeriodNum = (p: string) => {
            if (p.toLowerCase().includes("dispersal")) return 10;
            const match = p.match(/\d+/);
            return match ? parseInt(match[0], 10) : 99;
          };
          return getPeriodNum(a.period) - getPeriodNum(b.period);
        });

        return {
          count: list.length,
          timetable: list.map(e => ({
            day: e.day,
            period: e.period,
            startTime: e.startTime,
            endTime: e.endTime,
            subject: e.subject,
            classSection: e.classSection,
            room: e.room || e.venue || "",
            originalText: e.originalText,
            needsReview: e.needsReview,
            reviewReason: e.reviewReason || ""
          }))
        };
      }

      default:
        throw new Error(`Unknown tool execution name: ${name}`);
    }
  } catch (err: any) {
    console.error(`Error executing tool ${name}:`, err);
    return { success: false, error: err.message || String(err) };
  }
}
