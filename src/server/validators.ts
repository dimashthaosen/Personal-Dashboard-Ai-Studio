import { Response } from "express";

export function normalisePriority(input: string | undefined): "low" | "medium" | "high" | "urgent" {
  const p = (input || "").toLowerCase();
  if (["low", "medium", "high", "urgent"].includes(p)) return p as "low" | "medium" | "high" | "urgent";
  return "medium";
}

export function normaliseCategory(input: string | undefined): "school" | "personal" | "followup" | "project" | "email" | "admin" {
  let c = (input || "school").toLowerCase();
  if (c === "emails" || c === "drafts") c = "email";
  if (c === "follow-up" || c === "student") c = "followup";
  if (c === "homework" || c === "syllabus" || c === "curriculum" || c === "lessons") c = "school";
  if (c === "administration") c = "admin";
  if (!["school", "personal", "followup", "project", "email", "admin"].includes(c)) {
    c = "school";
  }
  return c as "school" | "personal" | "followup" | "project" | "email" | "admin";
}

export function normaliseStatus(input: string | undefined): "pending" | "in_progress" | "done" | "waiting" | "cancelled" {
  let s = (input || "").toLowerCase();
  if (s === "in-progress" || s === "in_progress") {
    s = "in_progress";
  } else if (s === "completed") {
    s = "done";
  }
  if (!["pending", "in_progress", "done", "waiting", "cancelled"].includes(s)) {
    s = "pending";
  }
  return s as "pending" | "in_progress" | "done" | "waiting" | "cancelled";
}

export function normaliseMemoryCategory(input: string | undefined): "writing_preferences" | "school_routines" | "class_context" | "recurring_tasks" | "personal_preferences" | "assistant_behaviour" {
  let c = (input || "school_routines").toLowerCase();
  if (c === "general" || c === "patterns") c = "school_routines";
  if (c === "preferences" || c === "writing") c = "writing_preferences";
  if (c === "people" || c === "person") c = "class_context";
  if (c === "school") c = "school_routines";
  
  const validCategories = ["writing_preferences", "school_routines", "class_context", "recurring_tasks", "personal_preferences", "assistant_behaviour"];
  if (!validCategories.includes(c)) {
    c = "school_routines";
  }
  return c as "writing_preferences" | "school_routines" | "class_context" | "recurring_tasks" | "personal_preferences" | "assistant_behaviour";
}

export function requireFields(obj: any, keys: string[]): string[] {
  const missing: string[] = [];
  for (const key of keys) {
    if (obj[key] === undefined || obj[key] === null || obj[key] === "") {
      missing.push(key);
    }
  }
  return missing;
}

export function sendServerError(res: Response, err: any, context: string) {
  console.error(`[Error] ${context}:`, err);
  res.status(500).json({ error: "Internal server error" });
}

export function buildReplyPrompt(email: any, customKeyPoints: string, memories: any[]) {
  const replyMemories = memories.filter((m: any) => m.useInReplies === true).map(m => `- ${m.key}: ${m.value}`).join('\n');
  const contextMemories = replyMemories ? `\nActive Memory Context (Must use for this reply):\n${replyMemories}\n` : '';
  
  return `You are drafting a professional email reply for Dimash Thaosen (teacher at Vasant Valley School).
Dimash teaches Sociology and Global Perspectives and handles class 11 A.

Original Email context:
From: ${email.fromName || email.from || ""}
Subject: ${email.subject}
Snippet/Body: ${email.snippet || email.body}

Specific Key Points to Include:
${customKeyPoints}
${contextMemories}
Draft a pristine, professional email reply. Always use British English spellings (e.g., summarise, organisation). Ensure the tone is polite, direct, clear, and school-context appropriate. Keep it point-wise where appropriate, and do not use flowery corporate jargon. Return only the drafted reply body.`;
}
