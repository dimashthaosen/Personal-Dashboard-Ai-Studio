import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { db } from "./src/server/db";
import { generateContentText, streamContentText, generateLessonPlan, generateLessonPacing, TEACHER_SYSTEM_INSTRUCTION } from "./src/server/ai";
import { fetchGmailEmails, createGmailDraft } from "./src/server/gmail";
import { runAssistantAgent } from "./src/server/agentRunner";
import { executeTool, serverDb } from "./src/server/agentTools";

import { SEED_STUDENTS } from "./src/data/studentsData";
import { EXTRACTED_TIMETABLE } from "./src/data/extractedTimetable";
import { normalisePriority, normaliseCategory, normaliseStatus, normaliseMemoryCategory, requireFields, sendServerError, buildReplyPrompt } from "./src/server/validators";
import { docsToArray, getUserCollection } from "./src/server/firestoreHelpers";
import { Task, MemoryItem, StudentRecord, TimetableEntry, CalendarEvent, Email } from "./src/types";

async function startServer() {
  const app = express();
  const PORT = Number(process.env.PORT) || 3000;

  if (!process.env.GEMINI_API_KEY) {
    console.warn("WARNING: GEMINI_API_KEY is missing. AI features will run in demo/fallback mode.");
  }

  // Custom CORS middleware to support preflight requests and avoid "Failed to fetch" in cross-origin preview frames
  app.use((req, res, next) => {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
    if (req.method === "OPTIONS") {
      return res.sendStatus(200);
    }
    next();
  });

  app.use(express.json());

  // === 1. API ROUTES FIRST ===

  // Health and connection info
  app.get("/api/health", (req, res) => {
    res.json({
      status: "ok",
      mode: process.env.GEMINI_API_KEY ? "AI-Enabled" : "Demo-Fallback",
    });
  });

  // Tasks API
  app.get("/api/tasks", async (req, res) => {
    try {
      const userId = req.query.userId as string;
      if (!userId) return res.status(400).json({ error: "userId is required" });
      const snap = await getUserCollection(userId, "tasks").get();
      let list = docsToArray(snap);
      
      const { status, priority, category } = req.query;
      if (status) list = list.filter((t: Task) => t.status === status);
      if (priority) list = list.filter((t: Task) => t.priority === priority);
      if (category) list = list.filter((t: Task) => t.category === category);
      res.json(list);
    } catch (err: any) {
      sendServerError(res, err, "GET /api/tasks");
    }
  });

  app.post("/api/tasks", async (req, res) => {
    try {
      const missing = requireFields(req.body, ["title", "userId"]);
      if (missing.length > 0) return res.status(400).json({ error: `${missing[0]} is required` });
      
      const { userId, title, description, deadline, priority, category, status } = req.body;
      const newTask = {
        title,
        description: description || "",
        deadline: deadline || undefined,
        priority: normalisePriority(priority),
        category: normaliseCategory(category),
        status: normaliseStatus(status),
        source: "manual",
        createdAt: new Date().toISOString()
      };
      
      const docRef = await getUserCollection(userId, "tasks").add(newTask);
      res.json({ id: docRef.id, ...newTask });
    } catch (err: any) {
      sendServerError(res, err, "POST /api/tasks");
    }
  });

  app.put("/api/tasks/:id", async (req, res) => {
    try {
      const { userId } = req.body;
      if (!userId) return res.status(400).json({ error: "userId is required" });
      
      const docRef = getUserCollection(userId, "tasks").doc(req.params.id);
      const doc = await docRef.get();
      if (!doc.exists) return res.status(404).json({ error: "Task not found" });
      
      const updateData: any = { ...req.body };
      delete updateData.userId;
      if (updateData.priority !== undefined) updateData.priority = normalisePriority(updateData.priority);
      if (updateData.category !== undefined) updateData.category = normaliseCategory(updateData.category);
      if (updateData.status !== undefined) updateData.status = normaliseStatus(updateData.status);
      
      await docRef.update(updateData);
      res.json({ id: doc.id, ...doc.data(), ...updateData });
    } catch (err: any) {
      sendServerError(res, err, "PUT /api/tasks");
    }
  });

  app.delete("/api/tasks/:id", async (req, res) => {
    try {
      const { userId } = req.body;
      if (!userId) return res.status(400).json({ error: "userId is required" });
      await getUserCollection(userId, "tasks").doc(req.params.id).delete();
      res.json({ success: true });
    } catch (err: any) {
      sendServerError(res, err, "DELETE /api/tasks");
    }
  });

  // Emails API
  app.get("/api/emails", async (req, res) => {
    const type = (req.query.type as "inbox" | "sent") || "inbox";
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith("Bearer ")) {
      const token = authHeader.substring(7);
      if (token && token !== "undefined" && token !== "null") {
        try {
          const gmailEmails = await fetchGmailEmails(token, type);
          db.syncGmailEmails(gmailEmails, type);
        } catch (err) {
          console.error("Failed to fetch Google Gmail emails, using cached/mock fallback:", err);
        }
      }
    }
    res.json(db.getEmails(type));
  });

  app.post("/api/emails/draft", async (req, res) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ") || authHeader === "Bearer undefined" || authHeader === "Bearer null") {
      return res.status(401).json({ error: "Google sign-in required to compose mail" });
    }
    const token = authHeader.substring(7);

    const { to, subject, body, emailId, from } = req.body;
    if (!subject || !body) {
      return res.status(400).json({ error: "Missing required fields: subject or body" });
    }

    let threadId;
    let inReplyTo;
    let references;
    let finalTo = to;
    const finalFrom = from || "me";

    if (emailId) {
      const email = db.getEmailById(emailId);
      if (email) {
        if (!finalTo) finalTo = email.fromEmail || email.from || "";
        threadId = email.threadId;
        inReplyTo = email.messageId;
        references = email.messageId;
      }
    }

    if (!finalTo) {
      return res.status(400).json({ error: "Missing required fields: to" });
    }

    try {
      const result = await createGmailDraft(token, {
        to: finalTo,
        subject,
        body,
        threadId,
        inReplyTo,
        references,
        from: finalFrom
      });
      res.json({ success: true, ...result });
    } catch (err: any) {
      if (err.message && err.message.includes("403")) {
        return res.status(403).json({ error: "reauth_required" });
      }
      sendServerError(res, err, "POST /api/emails/draft");
    }
  });

  app.post("/api/emails/:id/summarise", async (req, res) => {
    const email = db.getEmailById(req.params.id);
    if (!email) {
      return res.status(404).json({ error: "Email not found" });
    }

    const prompt = `
Please summarise this email from ${email.fromName} (${email.fromEmail}).
Subject: ${email.subject}
Snippet/Body: ${email.snippet}

Provide a concise summary, highlight key deadlines/names/school events mentioned, and list actionable next items for the teacher. Use British English, be point-wise and professional.
`;

    const summaryResponse = await generateContentText(prompt);
    res.json({ summary: summaryResponse });
  });

  app.post("/api/emails/:id/reply", async (req, res) => {
    const email = db.getEmailById(req.params.id);
    if (!email) {
      return res.status(404).json({ error: "Email not found" });
    }

    const { userId } = req.body;
    let memories: MemoryItem[] = [];
    if (userId) {
      try {
        const { getUserCollection } = await import("./src/server/firestoreHelpers");
        const memSnap = await getUserCollection(userId, "memoryItems").get();
        memories = memSnap.docs.map(d => d.data() as MemoryItem);
      } catch (e) {
        console.error("Failed to fetch memories from Firestore", e);
        memories = db.getMemoryItems();
      }
    } else {
      memories = db.getMemoryItems();
    }

    const prompt = buildReplyPrompt(email, "", memories);

    const replyResponse = await generateContentText(prompt);
    res.json({ reply: replyResponse });
  });

  // Calendar API
  app.get("/api/calendar", async (req, res) => {
    try {
      const userId = req.query.userId as string;
      if (!userId) return res.status(400).json({ error: "userId is required" });
      const snap = await getUserCollection(userId, "calendarEvents").get();
      res.json(docsToArray(snap));
    } catch (err: any) {
      sendServerError(res, err, "GET /api/calendar");
    }
  });

  app.post("/api/calendar", async (req, res) => {
    try {
      const missing = requireFields(req.body, ["title", "start", "end", "userId"]);
      if (missing.length > 0) return res.status(400).json({ error: `${missing[0]} is required` });

      const { userId, title, start, end, location, description } = req.body;
      const newEvent = {
        title,
        start,
        end,
        location: location || "",
        description: description || "",
        createdAt: new Date().toISOString()
      };

      const docRef = await getUserCollection(userId, "calendarEvents").add(newEvent);
      res.json({ id: docRef.id, ...newEvent });
    } catch (err: any) {
      sendServerError(res, err, "POST /api/calendar");
    }
  });

  // Memory API
  app.get("/api/memory", async (req, res) => {
    try {
      const userId = req.query.userId as string;
      if (!userId) return res.status(400).json({ error: "userId is required" });
      const snap = await getUserCollection(userId, "memoryItems").get();
      res.json(docsToArray(snap));
    } catch (err: any) {
      sendServerError(res, err, "GET /api/memory");
    }
  });

  app.post("/api/memory", async (req, res) => {
    try {
      const missing = requireFields(req.body, ["key", "value", "userId"]);
      if (missing.length > 0) return res.status(400).json({ error: `${missing[0]} is required` });

      const { userId, key, value, category } = req.body;
      const newItem = {
        key,
        value,
        category: normaliseMemoryCategory(category),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      const docRef = await getUserCollection(userId, "memoryItems").add(newItem);
      res.json({ id: docRef.id, ...newItem });
    } catch (err: any) {
      sendServerError(res, err, "POST /api/memory");
    }
  });

  app.put("/api/memory/:id", async (req, res) => {
    try {
      const { userId } = req.body;
      if (!userId) return res.status(400).json({ error: "userId is required" });

      const docRef = getUserCollection(userId, "memoryItems").doc(req.params.id);
      const doc = await docRef.get();
      if (!doc.exists) return res.status(404).json({ error: "Memory item not found" });

      const updateData: any = { ...req.body, updatedAt: new Date().toISOString() };
      delete updateData.userId;
      if (updateData.category !== undefined) updateData.category = normaliseMemoryCategory(updateData.category);

      await docRef.update(updateData);
      res.json({ id: doc.id, ...doc.data(), ...updateData });
    } catch (err: any) {
      sendServerError(res, err, "PUT /api/memory");
    }
  });

  app.delete("/api/memory/:id", async (req, res) => {
    try {
      const { userId } = req.body;
      if (!userId) return res.status(400).json({ error: "userId is required" });
      await getUserCollection(userId, "memoryItems").doc(req.params.id).delete();
      res.json({ success: true });
    } catch (err: any) {
      sendServerError(res, err, "DELETE /api/memory");
    }
  });

  // Student Database API
  app.get("/api/students", async (req, res) => {
    try {
      const userId = req.query.userId as string;
      if (!userId) return res.status(400).json({ error: "userId is required for student database queries" });
      const snap = await getUserCollection(userId, "students").orderBy("fullName", "asc").get();
      res.json(docsToArray(snap));
    } catch (err: any) {
      sendServerError(res, err, "GET /api/students");
    }
  });

  app.get("/api/students/:id", async (req, res) => {
    try {
      const userId = req.query.userId as string;
      if (!userId) return res.status(400).json({ error: "userId is required" });
      const doc = await getUserCollection(userId, "students").doc(req.params.id).get();
      if (!doc.exists) return res.status(404).json({ error: "Student not found" });
      res.json({ id: doc.id, ...doc.data() });
    } catch (err: any) {
      sendServerError(res, err, "GET /api/students/:id");
    }
  });

  app.post("/api/students/import-preview", async (req, res) => {
    try {
      const currentRecords = req.body.currentRecords || [];
      const currentNames = new Set(currentRecords.map((r: StudentRecord) => r.fullName.toLowerCase()));

      const duplicates = SEED_STUDENTS.filter((r: StudentRecord) => currentNames.has(r.fullName.toLowerCase()));
      const preview = {
        records: SEED_STUDENTS,
        duplicates: duplicates,
        mergedCount: duplicates.length,
        newCount: SEED_STUDENTS.length - duplicates.length
      };

      res.json(preview);
    } catch (err: any) {
      sendServerError(res, err, "POST /api/students/import-preview");
    }
  });

  app.post("/api/students/import-confirm", async (req, res) => {
    try {
      const { userId, records } = req.body;
      if (!userId) return res.status(400).json({ error: "userId is required for writing records" });
      if (!records || !Array.isArray(records)) return res.status(400).json({ error: "No records list provided for import" });

      const batch = serverDb.batch();
      const collectionRef = getUserCollection(userId, "students");

      // Support safe re-import: merge or create documents keyed by normalized Name+Section
      const existingSnap = await collectionRef.get();
      const existingDocsMap = new Map(
        existingSnap.docs.map(doc => {
          const data = doc.data();
          const key = `${data.fullName.toLowerCase()}_${data.classSection.toLowerCase()}`;
          return [key, doc.id];
        })
      );

      const savedIds: string[] = [];

      for (const rec of records) {
        const key = `${rec.fullName.toLowerCase()}_${rec.classSection.toLowerCase()}`;
        const existingDocId = existingDocsMap.get(key);

        const recordData = {
          ...rec,
          userId,
          updatedAt: new Date().toISOString()
        };
        if (!recordData.createdAt) recordData.createdAt = new Date().toISOString();
        // Exclude UI temporary database ID if exists
        delete recordData.id;

        if (existingDocId) {
          const docRef = collectionRef.doc(existingDocId as string);
          batch.update(docRef, recordData);
          savedIds.push(existingDocId as string);
        } else {
          const docRef = collectionRef.doc();
          batch.set(docRef, recordData);
          savedIds.push(docRef.id);
        }
      }

      await batch.commit();
      res.json({ success: true, count: savedIds.length, ids: savedIds });
    } catch (err: any) {
      sendServerError(res, err, "POST /api/students/import-confirm");
    }
  });

  app.post("/api/students", async (req, res) => {
    try {
      const { userId, ...studentData } = req.body;
      if (!userId) return res.status(400).json({ error: "userId is required for creating a student" });
      
      const docRef = getUserCollection(userId, "students").doc();
      const record = {
        ...studentData,
        userId,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      await docRef.set(record);
      res.json({ success: true, id: docRef.id });
    } catch (err: any) {
      sendServerError(res, err, "POST /api/students");
    }
  });

  app.put("/api/students/:id", async (req, res) => {
    try {
      const { userId, ...updates } = req.body;
      if (!userId) return res.status(400).json({ error: "userId is required for updates" });
      
      const docRef = getUserCollection(userId, "students").doc(req.params.id);
      await docRef.update({
        ...updates,
        updatedAt: new Date().toISOString()
      });
      res.json({ success: true });
    } catch (err: any) {
      sendServerError(res, err, "PUT /api/students/:id");
    }
  });

  app.delete("/api/students/:id", async (req, res) => {
    try {
      const { userId } = req.body;
      if (!userId) return res.status(400).json({ error: "userId is required for deletion" });
      
      const docRef = getUserCollection(userId, "students").doc(req.params.id);
      await docRef.delete();
      res.json({ success: true });
    } catch (err: any) {
      sendServerError(res, err, "DELETE /api/students/:id");
    }
  });

  // === TIMETABLE API ENDPOINTS ===

  app.post("/api/timetable/import-preview", async (req, res) => {
    try {
      const currentRecords = req.body.currentRecords || [];
      const currentKeys = new Set(
        currentRecords.map((r: TimetableEntry) =>
          `${r.day.toLowerCase()}_${r.period.toLowerCase()}_${r.classSection.toLowerCase()}_${r.subject.toLowerCase()}`
        )
      );

      const duplicates = EXTRACTED_TIMETABLE.filter((r: TimetableEntry) => {
        const key = `${r.day.toLowerCase()}_${r.period.toLowerCase()}_${r.classSection.toLowerCase()}_${r.subject.toLowerCase()}`;
        return currentKeys.has(key);
      });

      const preview = {
        records: EXTRACTED_TIMETABLE,
        duplicates: duplicates,
        newCount: EXTRACTED_TIMETABLE.length - duplicates.length,
        duplicateCount: duplicates.length
      };

      res.json(preview);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post("/api/timetable/import-confirm", async (req, res) => {
    const { userId, records } = req.body;
    if (!userId) {
      return res.status(400).json({ error: "userId is required for writing records" });
    }
    if (!records || !Array.isArray(records)) {
      return res.status(400).json({ error: "No records list provided for import" });
    }

    try {
      const batch = serverDb.batch();
      const collectionRef = getUserCollection(userId, "timetableEntries");

      const existingSnap = await collectionRef.get();
      const existingDocsMap = new Map(
        existingSnap.docs.map(doc => {
          const data = doc.data();
          const key = `${data.day.toLowerCase()}_${data.period.toLowerCase()}_${data.classSection.toLowerCase()}_${data.subject.toLowerCase()}`;
          return [key, doc.id];
        })
      );

      const savedIds: string[] = [];

      for (const rec of records) {
        const key = `${rec.day.toLowerCase()}_${rec.period.toLowerCase()}_${rec.classSection.toLowerCase()}_${rec.subject.toLowerCase()}`;
        const existingDocId = existingDocsMap.get(key);

        const recordData = {
          ...rec,
          userId,
          updatedAt: new Date().toISOString()
        };
        if (!recordData.createdAt) {
          recordData.createdAt = new Date().toISOString();
        }
        delete recordData.id;

        if (existingDocId) {
          const docRef = collectionRef.doc(existingDocId);
          batch.update(docRef, recordData);
          savedIds.push(existingDocId);
        } else {
          const docRef = collectionRef.doc();
          batch.set(docRef, recordData);
          savedIds.push(docRef.id);
        }
      }

      await batch.commit();
      res.json({ success: true, count: savedIds.length, ids: savedIds });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.get("/api/timetable", async (req, res) => {
    try {
      const userId = req.query.userId as string;
      if (!userId) return res.status(400).json({ error: "userId is required" });
      const snap = await getUserCollection(userId, "timetableEntries").get();
      res.json(docsToArray(snap));
    } catch (err: any) {
      sendServerError(res, err, "GET /api/timetable");
    }
  });

  app.get("/api/timetable/today", async (req, res) => {
    try {
      const userId = req.query.userId as string;
      if (!userId) return res.status(400).json({ error: "userId is required" });
      const snap = await getUserCollection(userId, "timetableEntries").get();
      const list = docsToArray(snap);
      const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
      const todayName = days[new Date().getDay()];
      const todayEntries = list.filter((r: TimetableEntry) => r.day.toLowerCase() === todayName.toLowerCase());
      res.json(todayEntries);
    } catch (err: any) {
      sendServerError(res, err, "GET /api/timetable/today");
    }
  });

  app.get("/api/timetable/free-periods", async (req, res) => {
    try {
      const userId = req.query.userId as string;
      if (!userId) return res.status(400).json({ error: "userId is required" });
      const snap = await getUserCollection(userId, "timetableEntries").get();
      const list = docsToArray(snap);

      const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
      const todayName = days[new Date().getDay()];

      if (todayName === "Saturday" || todayName === "Sunday") return res.json([]);

      const todayEntries = list.filter((r: TimetableEntry) => r.day.toLowerCase() === todayName.toLowerCase());

      const standardPeriods = [
        { label: "LESSON 1", startTime: "8:10 am", endTime: "8:50 am" },
        { label: "LESSON 2", startTime: "8:50 am", endTime: "9:30 am" },
        { label: "LESSON 3", startTime: "9:45 am", endTime: "10:25 am" },
        { label: "LESSON 4", startTime: "10:25 am", endTime: "11:05 am" },
        { label: "LESSON 5", startTime: "11:15 am", endTime: "11:53 am" },
        { label: "LESSON 6", startTime: "11:53 am", endTime: "12:31 pm" },
        { label: "LESSON 7", startTime: "12:31 pm", endTime: "1:10 pm" },
        { label: "LESSON 8", startTime: "1:45 pm", endTime: "2:23 pm" },
        { label: "LESSON 9", startTime: "2:23 pm", endTime: "3:00 pm" },
      ];

      const freePeriods = standardPeriods.filter(std => {
        const hasTeaching = todayEntries.some((entry: TimetableEntry) => {
          const p = entry.period.toUpperCase();
          return p.includes(std.label);
        });
        return !hasTeaching;
      });

      res.json(freePeriods);
    } catch (err: any) {
      sendServerError(res, err, "GET /api/timetable/free-periods");
    }
  });

  app.get("/api/timetable/conflicts", async (req, res) => {
    try {
      const userId = req.query.userId as string;
      if (!userId) return res.status(400).json({ error: "userId is required" });
      const snap = await getUserCollection(userId, "timetableEntries").get();
      const list = docsToArray(snap);

      const conflicts: any[] = [];
      const grouped = new Map<string, TimetableEntry[]>();

      for (const entry of list) {
        const key = `${entry.day}_${entry.period}`;
        if (!grouped.has(key)) {
          grouped.set(key, []);
        }
        grouped.get(key)!.push(entry);
      }

      for (const [key, entries] of grouped.entries()) {
        if (entries.length > 1) {
          const [day, period] = key.split("_");
          conflicts.push({
            type: "clash",
            description: `Double booking detected on ${day} during ${period}`,
            entries
          });
        }
      }

      res.json(conflicts);
    } catch (err: any) {
      sendServerError(res, err, "GET /api/timetable/conflicts");
    }
  });


  // Daily Schedule & Planner Generator
  app.post("/api/plan", async (req, res) => {
    const { contextData } = req.body;

    const data = contextData || { tasks: "", emails: "", calendar: "", memory: "" };

    const prompt = `
Generate a highly practical and organised Today's Brief / Daily Brief for Teacher Dimash Thaosen using the actual context data provided below.

Strict Constraints:
1. Use clean, professional British English spelling (e.g., prioritise, schedule, organise, summarise).
2. NEVER invent meetings, emails, students, grades, or fake details. Only extract and reference items from the actual provided context data lists.
3. If specific data is missing (e.g., no calendar events or no emails), explicitly state "No active items scheduled for today" or "All caught up" format rather than inventing placeholder values.
4. Clearly state at the beginning that this brief is based solely on the live dashboard and email data available in the workspace.
5. Prefer useful bullet points over tables for event logs and schedules.

Structure the response with EXACTLY these 6 sections (use precise h3 markdown size e.g., ### 1. Today's Schedule):

### 1. Today's Schedule
- List today's timetable sessions/calendar entries in chronological order. Include respective start and end times.
- Conduct a gap analysis/free block analysis if possible (e.g. identify open windows of time between classes or meetings). If no gaps are detectable, say "Continuous schedule or standard preparation blocks".

### 2. Must Do
- Extract and list urgent/high-priority pending tasks from the context data that must be accomplished today.
- Include a practical reason or grounding note based on metadata.

### 3. Should Do
- Extract and list medium/low-priority tasks from the context data that are active but not critical for today.

### 4. Follow-ups
- Focus on pending email communications that need replies, or follow-up category tasks. List sender, concern topic, and what needs immediate reaction.

### 5. Suggested Work Order
- Synthesise a recommended sequential timeline or hour-by-hour order of work for the teacher. Map work items or grading tasks (from Must Do/Should Do) into specific gaps/free blocks in "Today's Schedule" for maximum productivity.

### 6. Can Move
- List tasks or activities that are non-urgent, lack immediate deadlines, or can be postponed guilt-free if teaching obligations run over.

Include a concluding short sentence incorporating any relevant Teacher Biography & Preferences if stored.

Here is the current real-time database context data:

[TODAY'S TIMETABLE / SCHEDULE]
${data.calendar || "No scheduled activities today."}

[CURRENT PENDING TASKS]
${data.tasks || "No active pending tasks stored."}

[RECENT EMAILS]
${data.emails || "No recent parent or colleague emails found."}

[TEACHER BIOGRAPHY & PREFERENCES]
${data.memory || "No memory preferences stored."}
`;

    try {
      const responseText = await generateContentText(prompt, TEACHER_SYSTEM_INSTRUCTION);
      res.json({ plan: { content: responseText } });
    } catch (err) {
      console.error("Failed to generate planner markdown:", err);
      res.json({ plan: { content: "### 1. Today's Schedule\n\nNo schedule periods loaded.\n\n### 2. Must Do\n\nNo critical tasks pending.\n\n### 3. Should Do\n\nNo pending tasks.\n\n### 4. Follow-ups\n\nNo pending follow-ups.\n\n### 5. Suggested Work Order\n\nNo sequential plan generated.\n\n### 6. Can Move\n\nNo items to postpone.\n\n---\n*Failed to generate the daily brief with AI. Please check your network and retry configuration.*" } });
    }
  });

  // Chat/Assistant endpoint using Agentic Assistant Runner
  app.get("/api/chat", (req, res) => {
    res.json(db.getChatHistory());
  });

  app.post("/api/chat/clear", async (req, res) => {
    db.clearChatHistory();
    res.json({ success: true });
  });

  app.post("/api/chat", async (req, res) => {
    const { message, contextData, userId, chatHistory, contents } = req.body;
    if (!message && !contents) {
      return res.status(400).json({ error: "Message or contents is required" });
    }

    const authHeader = req.headers.authorization;
    let accessToken: string | undefined = undefined;
    if (authHeader && authHeader.startsWith("Bearer ")) {
      accessToken = authHeader.substring(7);
    }

    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache, no-transform");
    res.setHeader("Connection", "keep-alive");
    res.setHeader("X-Accel-Buffering", "no");
    res.flushHeaders();

    const onEvent = (event: any) => {
      res.write(`data: ${JSON.stringify(event)}\n\n`);
      if (typeof (res as any).flush === "function") {
        (res as any).flush();
      }
    };

    const initialContents = contents || [];
    if (!contents && chatHistory) {
      for (const msg of chatHistory) {
        const role = msg.role === "assistant" ? "model" : "user";
        initialContents.push({ role, parts: [{ text: msg.content }] });
      }
    }

    try {
      await runAssistantAgent({
        message,
        contents: initialContents,
        contextData,
        userId: userId || "default_teacher",
        accessToken,
        onEvent
      });
      res.end();
    } catch (err: any) {
      console.error("Agent error in POST /api/chat:", err);
      onEvent({ type: "error", message: err.message || "Failed to run agent assistant" });
      res.end();
    }
  });

  app.post("/api/chat/approve", async (req, res) => {
    const { contents, batch, userId, contextData, clientResults } = req.body;
    if (!contents || !batch || !userId) {
      return res.status(400).json({ error: "Missing contents, batch, or userId parameters" });
    }

    const authHeader = req.headers.authorization;
    let accessToken: string | undefined = undefined;
    if (authHeader && authHeader.startsWith("Bearer ")) {
      accessToken = authHeader.substring(7);
    }

    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache, no-transform");
    res.setHeader("Connection", "keep-alive");
    res.setHeader("X-Accel-Buffering", "no");
    res.flushHeaders();

    const onEvent = (event: any) => {
      res.write(`data: ${JSON.stringify(event)}\n\n`);
      if (typeof (res as any).flush === "function") {
        (res as any).flush();
      }
    };

    try {
      // Execute each item in the batch sequentially
      const responseParts: any[] = [];
      for (const item of batch) {
        onEvent({ type: "tool", name: item.tool, status: "running" });
        
        let result: any;
        if (clientResults && clientResults[item.tool]) {
          result = clientResults[item.tool];
        } else {
          result = await executeTool(userId, item.tool, item.args, accessToken);
        }
        
        onEvent({ type: "tool", name: item.tool, status: "done", result });
        responseParts.push({
          functionResponse: {
            name: item.tool,
            response: { result }
          }
        });
      }

      // Feed the write tool execution results back to Gemini
      contents.push({ role: "user", parts: responseParts });

      await runAssistantAgent({
        contents,
        contextData,
        userId,
        accessToken,
        onEvent
      });

      res.end();
    } catch (err: any) {
      console.error("Agent error in POST /api/chat/approve:", err);
      onEvent({ type: "error", message: err.message || "Approval execution failed" });
      res.end();
    }
  });

  // Lesson Planner API
  app.post("/api/lessons/generate", async (req, res) => {
    const { prompt } = req.body;
    if (!prompt) return res.status(400).json({ error: "No prompt provided" });

    try {
      const markdown = await generateLessonPlan(prompt);
      res.json({ markdown });
    } catch (err: any) {
      console.error("Generate lesson failed:", err);
      res.status(500).json({ error: err.message });
    }
  });

  app.post("/api/lessons/pacing", async (req, res) => {
    const { prompt } = req.body;
    if (!prompt) return res.status(400).json({ error: "No prompt provided" });

    try {
      const pacing = await generateLessonPacing(prompt);
      res.json(pacing);
    } catch (err: any) {
      console.error("Generate pacing failed:", err);
      res.status(500).json({ error: err.message });
    }
  });

  // === 2. VITE MIDDLEWARE SETUP ===

  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`[Full Stack] Express Server listening on port ${PORT}`);
  });
}

startServer();
