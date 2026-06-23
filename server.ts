import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { db } from "./src/server/db";
import { generateContentText, streamContentText, generateLessonPlan, generateLessonPacing, TEACHER_SYSTEM_INSTRUCTION } from "./src/server/ai";
import { fetchGmailEmails } from "./src/server/gmail";
import { runAssistantAgent } from "./src/server/agentRunner";
import { executeTool, serverDb } from "./src/server/agentTools";

import { SEED_STUDENTS } from "./src/data/studentsData";
import { EXTRACTED_TIMETABLE } from "./src/data/extractedTimetable";

async function startServer() {
  const app = express();
  const PORT = 3000;

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
  app.get("/api/tasks", (req, res) => {
    const { status, priority, category } = req.query;
    let list = db.getTasks();

    if (status) {
      list = list.filter((t) => t.status === status);
    }
    if (priority) {
      list = list.filter((t) => t.priority === priority);
    }
    if (category) {
      list = list.filter((t) => t.category === category);
    }

    res.json(list);
  });

  app.post("/api/tasks", (req, res) => {
    const { title, description, deadline, priority, category, status } = req.body;
    if (!title) {
      return res.status(400).json({ error: "Title is required" });
    }

    const newTask = db.addTask({
      title,
      description: description || "",
      deadline: deadline || undefined,
      priority: priority || "medium",
      category: category || "school",
      status: status || "pending",
      source: "manual",
    });

    res.json(newTask);
  });

  app.put("/api/tasks/:id", (req, res) => {
    const updated = db.updateTask(req.params.id, req.body);
    if (!updated) {
      return res.status(404).json({ error: "Task not found" });
    }
    res.json(updated);
  });

  app.delete("/api/tasks/:id", (req, res) => {
    const success = db.deleteTask(req.params.id);
    res.json({ success });
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
    let memories: any[] = [];
    if (userId) {
      try {
        const { serverDb } = await import("./src/server/agentTools");
        const memSnap = await serverDb.collection(`users/${userId}/memoryItems`).get();
        memories = memSnap.docs.map(d => d.data());
      } catch (e) {
        console.error("Failed to fetch memories from Firestore", e);
        memories = db.getMemoryItems();
      }
    } else {
      memories = db.getMemoryItems();
    }

    const replyMemories = memories.filter((m: any) => m.useInReplies === true).map(m => `- ${m.key}: ${m.value}`).join('\n');
    const baseStyle = memories.find((m: any) => m.key.toLowerCase().includes("style"))?.value || "Clear, friendly, British English, point-wise.";
    const contextMemories = replyMemories ? `\nActive Memory Context (Must use for this reply):\n${replyMemories}\n` : '';

    const prompt = `
You are drafting an email reply for the teacher.
Sender Name: ${email.fromName}
Sender Email: ${email.fromEmail}
Original Subject: ${email.subject}
Original Message: ${email.snippet}

Writing Style Guidelines:
${baseStyle}
${contextMemories}

Draft a clear, professional, warm, and helpful response. Keep it point-wise where appropriate, and always use British English spelling and syntax. Avoid flowery corporate jargon. Just output the draft email body.
`;

    const replyResponse = await generateContentText(prompt);
    res.json({ reply: replyResponse });
  });

  // Calendar API
  app.get("/api/calendar", (req, res) => {
    res.json(db.getCalendarEvents());
  });

  app.post("/api/calendar", (req, res) => {
    const { title, start, end, location, description } = req.body;
    if (!title || !start || !end) {
      return res.status(400).json({ error: "Title, start time, and end time are required" });
    }

    const newEvent = db.addCalendarEvent({
      title,
      start,
      end,
      location: location || "",
      description: description || "",
    });

    res.json(newEvent);
  });

  // Memory API
  app.get("/api/memory", (req, res) => {
    res.json(db.getMemoryItems());
  });

  app.post("/api/memory", (req, res) => {
    const { key, value, category } = req.body;
    if (!key || !value) {
      return res.status(400).json({ error: "Key and value are required" });
    }

    const newItem = db.addMemoryItem({
      key,
      value,
      category: category || "general",
    });

    res.json(newItem);
  });

  app.put("/api/memory/:id", (req, res) => {
    const updated = db.updateMemoryItem(req.params.id, req.body);
    if (!updated) {
      return res.status(404).json({ error: "Memory item not found" });
    }
    res.json(updated);
  });

  app.delete("/api/memory/:id", (req, res) => {
    const success = db.deleteMemoryItem(req.params.id);
    res.json({ success });
  });

  // Student Database API
  app.get("/api/students", async (req, res) => {
    const userId = req.query.userId as string;
    if (!userId) {
      return res.status(400).json({ error: "userId is required for student database queries" });
    }
    try {
      const snap = await serverDb.collection(`users/${userId}/students`).orderBy("fullName", "asc").get();
      const students = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      res.json(students);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.get("/api/students/:id", async (req, res) => {
    const userId = req.query.userId as string;
    if (!userId) {
      return res.status(400).json({ error: "userId is required" });
    }
    try {
      const doc = await serverDb.doc(`users/${userId}/students/${req.params.id}`).get();
      if (!doc.exists) {
        return res.status(404).json({ error: "Student not found" });
      }
      res.json({ id: doc.id, ...doc.data() });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post("/api/students/import-preview", async (req, res) => {
    try {
      const currentRecords = req.body.currentRecords || [];
      const currentNames = new Set(currentRecords.map((r: any) => r.fullName.toLowerCase()));

      const duplicates = SEED_STUDENTS.filter((r: any) => currentNames.has(r.fullName.toLowerCase()));
      const preview = {
        records: SEED_STUDENTS,
        duplicates: duplicates,
        mergedCount: duplicates.length,
        newCount: SEED_STUDENTS.length - duplicates.length
      };

      res.json(preview);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post("/api/students/import-confirm", async (req, res) => {
    const { userId, records } = req.body;
    if (!userId) {
      return res.status(400).json({ error: "userId is required for writing records" });
    }
    if (!records || !Array.isArray(records)) {
      return res.status(400).json({ error: "No records list provided for import" });
    }

    try {
      const batch = serverDb.batch();
      const collectionRef = serverDb.collection(`users/${userId}/students`);

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
        if (!recordData.createdAt) {
          recordData.createdAt = new Date().toISOString();
        }
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
      res.status(500).json({ error: err.message });
    }
  });

  app.post("/api/students", async (req, res) => {
    const { userId, ...studentData } = req.body;
    if (!userId) {
      return res.status(400).json({ error: "userId is required for creating a student" });
    }
    try {
      const docRef = serverDb.collection(`users/${userId}/students`).doc();
      const record = {
        ...studentData,
        userId,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      await docRef.set(record);
      res.json({ success: true, id: docRef.id });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.put("/api/students/:id", async (req, res) => {
    const { userId, ...updates } = req.body;
    if (!userId) {
      return res.status(400).json({ error: "userId is required for updates" });
    }
    try {
      const docRef = serverDb.doc(`users/${userId}/students/${req.params.id}`);
      await docRef.update({
        ...updates,
        updatedAt: new Date().toISOString()
      });
      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.delete("/api/students/:id", async (req, res) => {
    const { userId } = req.body;
    if (!userId) {
      return res.status(400).json({ error: "userId is required for deletion" });
    }
    try {
      const docRef = serverDb.doc(`users/${userId}/students/${req.params.id}`);
      await docRef.delete();
      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // === TIMETABLE API ENDPOINTS ===

  app.post("/api/timetable/import-preview", async (req, res) => {
    try {
      const currentRecords = req.body.currentRecords || [];
      const currentKeys = new Set(
        currentRecords.map((r: any) =>
          `${r.day.toLowerCase()}_${r.period.toLowerCase()}_${r.classSection.toLowerCase()}_${r.subject.toLowerCase()}`
        )
      );

      const duplicates = EXTRACTED_TIMETABLE.filter((r: any) => {
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
      const collectionRef = serverDb.collection(`users/${userId}/timetableEntries`);

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
    const userId = req.query.userId as string;
    if (!userId) {
      return res.status(400).json({ error: "userId is required" });
    }
    try {
      const snap = await serverDb.collection(`users/${userId}/timetableEntries`).get();
      const list = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      res.json(list);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.get("/api/timetable/today", async (req, res) => {
    const userId = req.query.userId as string;
    if (!userId) {
      return res.status(400).json({ error: "userId is required" });
    }
    try {
      const snap = await serverDb.collection(`users/${userId}/timetableEntries`).get();
      const list = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
      const todayName = days[new Date().getDay()];
      const todayEntries = list.filter((r: any) => r.day.toLowerCase() === todayName.toLowerCase());
      res.json(todayEntries);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.get("/api/timetable/free-periods", async (req, res) => {
    const userId = req.query.userId as string;
    if (!userId) {
      return res.status(400).json({ error: "userId is required" });
    }
    try {
      const snap = await serverDb.collection(`users/${userId}/timetableEntries`).get();
      const list = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));

      const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
      const todayName = days[new Date().getDay()];

      if (todayName === "Saturday" || todayName === "Sunday") {
        return res.json([]);
      }

      const todayEntries = list.filter((r: any) => r.day.toLowerCase() === todayName.toLowerCase());

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
        const hasTeaching = todayEntries.some((entry: any) => {
          const p = entry.period.toUpperCase();
          return p.includes(std.label);
        });
        return !hasTeaching;
      });

      res.json(freePeriods);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.get("/api/timetable/conflicts", async (req, res) => {
    const userId = req.query.userId as string;
    if (!userId) {
      return res.status(400).json({ error: "userId is required" });
    }
    try {
      const snap = await serverDb.collection(`users/${userId}/timetableEntries`).get();
      const list = snap.docs.map(doc => ({ id: doc.id, ...doc.data() })) as any[];

      const conflicts: any[] = [];
      const grouped = new Map<string, any[]>();

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
      res.status(500).json({ error: err.message });
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
    const { message, contextData, userId, chatHistory } = req.body;
    if (!message) {
      return res.status(400).json({ error: "Message is required" });
    }

    const authHeader = req.headers.authorization;
    let accessToken: string | undefined = undefined;
    if (authHeader && authHeader.startsWith("Bearer ")) {
      accessToken = authHeader.substring(7);
    }

    try {
      const agentResult = await runAssistantAgent({
        message,
        contextData,
        userId: userId || "default_teacher",
        accessToken,
        chatHistory: chatHistory || []
      });
      res.json(agentResult);
    } catch (err: any) {
      console.error("Agent error in POST /api/chat:", err);
      res.status(500).json({ error: err.message || "Failed to run agent assistant" });
    }
  });

  app.post("/api/chat/approve", async (req, res) => {
    const { tool, args, userId, chatHistory, contextData, clientResult } = req.body;
    if (!tool || !userId) {
      return res.status(400).json({ error: "Missing tool or userId parameters" });
    }

    const authHeader = req.headers.authorization;
    let accessToken: string | undefined = undefined;
    if (authHeader && authHeader.startsWith("Bearer ")) {
      accessToken = authHeader.substring(7);
    }

    try {
      // 1. If client executed write client-side, use that outcome directly. Otherwise execute server-side.
      let toolResult: any;
      if (clientResult) {
        toolResult = clientResult;
      } else {
        toolResult = await executeTool(userId, tool, args, accessToken);
      }

      // 2. Feed the write tool execution results back to Gemini for the concluding confirmation response
      const resumeMessage = `[SYSTEM: Agent executed write action "${tool}" successfully. Result outcome: ${JSON.stringify(toolResult)}]`;
      
      const agentResult = await runAssistantAgent({
        message: resumeMessage,
        contextData,
        userId,
        accessToken,
        chatHistory: chatHistory || []
      });

      res.json(agentResult);
    } catch (err: any) {
      console.error("Agent error in POST /api/chat/approve:", err);
      res.status(500).json({ error: err.message || "Approval execution failed" });
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
