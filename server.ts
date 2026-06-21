import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { db } from "./src/server/db";
import { generateContentText, streamContentText, generateLessonPlan, generateLessonPacing, TEACHER_SYSTEM_INSTRUCTION } from "./src/server/ai";
import { fetchGmailEmails } from "./src/server/gmail";

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
Summarise my day.

Pull recent Gmail threads from the past 30 days (use the query
"newer_than:30d -in:draft") and
structure the brief with these sections:

- 🏫 School & Admin (meetings, substitutions, student issues, dispersal
  notes, class teacher items for 11A)
- 🧪 Teaching & Curriculum (Cambridge updates, lesson prep, resources shared)
- 🧠 Quiz & Competitions (quiz logistics, registrations, masterclass updates,
  inter-school events)
- 📮 Pending / To-Do (action items to follow up on, with checkboxes)

For any parent or staff email, include the sender's name, the student/class
it concerns, the nature of the message, and whether a reply is needed.

Skip noise: OTPs, security alerts, calendar invite notifications, Veracross
automated mails, newsletter/promotional emails.

Keep the tone warm and conversational — the way you'd brief a colleague.
Return the brief directly as your response.

Here is the current context data:

CURRENT PENDING TASKS:
${data.tasks || "No pending tasks."}

RECENT EMAILS:
${data.emails || "No recent emails matching."}

TODAY'S TIMETABLE / SCHEDULE:
${data.calendar || "No scheduled activities today."}

TEACHER BIOGRAPHY & PREFERENCES:
${data.memory || "No memory profile elements stored yet."}
`;

    try {
      const responseText = await generateContentText(prompt, TEACHER_SYSTEM_INSTRUCTION);
      res.json({ plan: { content: responseText } });
    } catch (err) {
      console.error("Failed to generate planner markdown:", err);
      res.json({ plan: { content: "Oops! Couldn't generate the daily brief. Please try again soon." } });
    }
  });

  // Chat/Assistant streaming endpoint
  app.get("/api/chat", (req, res) => {
    res.json(db.getChatHistory());
  });

  app.post("/api/chat/clear", (req, res) => {
    db.clearChatHistory();
    res.json({ success: true });
  });

  app.post("/api/chat", async (req, res) => {
    const { message, contextData } = req.body;
    if (!message) {
      return res.status(400).json({ error: "Message is required" });
    }

    // Set headers for SSE-like text streaming
    res.setHeader("Content-Type", "text/plain; charset=utf-8");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");

    const data = contextData || { tasks: "", calendar: "", memory: "" };

    const contextStr = `
TASKS LIST:
${data.tasks}

TODAY'S SCHEDULE:
${data.calendar}

TEACHER GENERAL MEMORIES:
${data.memory}
`;

    const fullPrompt = `
User message: "${message}"

Below is your database context as the Teacher Personal Assistant at Vasant Valley School. Leverage this context to address the teacher's questions.

CONTEXT CODES:
${contextStr}
`;

    let fullAnswer = "";

    try {
      const generator = streamContentText(fullPrompt);
      for await (const chunk of generator) {
        fullAnswer += chunk;
        res.write(chunk);
      }
    } catch (err) {
      console.error("Stream generation error:", err);
      const fallbackErr = " [I experienced a connection interruption in streaming the full response. Please check your setup.]";
      fullAnswer += fallbackErr;
      res.write(fallbackErr);
    } finally {
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
