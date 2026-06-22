import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { db } from "./src/server/db";
import { generateContentText, streamContentText, generateLessonPlan, generateLessonPacing, TEACHER_SYSTEM_INSTRUCTION } from "./src/server/ai";
import { fetchGmailEmails } from "./src/server/gmail";
import { runAssistantAgent } from "./src/server/agentRunner";
import { executeTool } from "./src/server/agentTools";

async function startServer() {
  const app = express();
  const PORT = 3000;

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

    const memories = db.getMemoryItems();
    const writingStyle = memories.find((m) => m.key.toLowerCase().includes("style"))?.value || "Clear, friendly, British English, point-wise.";

    const prompt = `
You are drafting an email reply for the teacher.
Sender Name: ${email.fromName}
Sender Email: ${email.fromEmail}
Original Subject: ${email.subject}
Original Message: ${email.snippet}

Writing Style Guidelines:
${writingStyle}

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
    const { tool, args, userId, chatHistory, contextData } = req.body;
    if (!tool || !userId) {
      return res.status(400).json({ error: "Missing tool or userId parameters" });
    }

    const authHeader = req.headers.authorization;
    let accessToken: string | undefined = undefined;
    if (authHeader && authHeader.startsWith("Bearer ")) {
      accessToken = authHeader.substring(7);
    }

    try {
      // 1. Execute the write tool with client's parameters server-side
      const toolResult = await executeTool(userId, tool, args, accessToken);

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
