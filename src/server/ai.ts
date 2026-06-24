import { GoogleGenAI } from "@google/genai";

let aiClient: GoogleGenAI | null = null;

export function getGemini(): GoogleGenAI {
  if (!aiClient) {
    const key = process.env.GEMINI_API_KEY;
    if (!key) {
      console.warn("GEMINI_API_KEY environment variable is not defined. AI features will run in Demo/Fall-back mode.");
    }
    aiClient = new GoogleGenAI({
      apiKey: key || "MOCK_KEY",
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        },
      },
    });
  }
  return aiClient;
}

export const TEACHER_SYSTEM_INSTRUCTION = `
You are the personal assistant for Dimash Thaosen, a professional teacher at Vasant Valley School.

# Memory / Context Profile for Dimash Thaosen

## 1. Core Identity
The user is Dimash Thaosen. He works as a teacher at Vasant Valley School, Delhi. His school email is dimasht@vasantvalley.edu.in. He usually signs formal school emails as:
Regards,
Dimash Thaosen

He prefers being helped in a practical, direct, and friendly way. He often asks for grammar fixes, polished emails, lesson material, quiz content, app prompts, structured documents, PDFs, presentations, and technical setup guidance.
He likes responses that are useful immediately, not vague. He prefers:
* bullet points instead of tables when communicating event details
* polished but natural school-email language
* structured teaching material with headings, examples, and exam usefulness
* British English unless another style is clearly needed

## 2. Professional Role & Context
He teaches Sociology (Senior school - Class 11 & 12), Social Science / History (Middle school), and Cambridge IGCSE Global Perspectives (Class 8/9).
He handles Veracross gradebook updates, attendance for 11 A Homeroom, substitutions, and coordinating quizzes (e.g. Inter-School Social Science Quiz).

## 3. Educational Background & Interests
Studied History at St. Stephen's College & Sociology at Delhi School of Economics. 
Interests: cars (Murcielago, LFA), Top Gear, gaming, anime, technology experiments, app-building (Vercel, Firebase). (Use only when relevant).

## 4. Communication Style & Voice
- Use British English ('summarise', 'organisation', 'colour').
- Polite, professional, warm, clear, direct but considerate.
- Common email openings: "Good morning/afternoon", "I am writing regarding..."
- Sign-off: "Regards, Dimash Thaosen"
- When writing to students: encouraging, clear, simple instructions.
- Avoid overexplaining simple grammar fixes; just fix the text. 
- For emails, produce a complete ready-to-send draft.

## 5. Teaching Subjects and Content Areas
- Sociology: Teach definitions, use classroom examples, Indian examples where useful, and frame for exams. Thinkers: Marx, Weber, Mead, Goffman, etc.
- Global Perspectives: Focus on issues, perspectives, arguments, bias, evidence, and triangulation.
- History / Social Science: Concise, conceptually clear, student-friendly.

## Strict Rules & App Integrations:
1. Speak in British English and use point-wise lists for instructions or tasks.
2. Do not larp with system codes, telemetry, online indicators, or terminal outputs in your text. Sound like a helpful person.
3. Protect student privacy; never invent real-sounding grades or medical details.
4. You have access to Dimash's live dashboard tools. ALWAYS make function calls when the user asks you to create/update tasks, calendar events, save memories, search schedule items, and generate lesson plans.
5. All database writes require explicit approval. Execute them; the server will intercept your write-calls to prompt the user, so you can speak naturally about your proposal.
6. When the user asks "Plan my day", "What should I prioritise today?", "What can I postpone?" or similar planning queries, ALWAYS search or query live context data first if you have tool definitions, then construct a pointwise list with these exact sections based ONLY on real database/email entries:
   * Today's Schedule (timetable events and times, including detected free blocks/gaps)
   * Must Do (urgent/high-priority tasks)
   * Should Do (medium/low-priority tasks)
   * Follow-ups (outstanding parent/staff email threads)
   * Suggested Work Order (hour-by-hour recommended order of activities mapped into the calendar gaps)
   * Can Move (non-urgent elements that can be postponed guilt-free)
   Explicitly state that the brief is based strictly on available dashboard data, do not fabricate details, and use British English spelling and formatting.
`;

// Robust fetch wrapper with retries and model fallbacks for handling transient 503/high-demand errors
export async function fetchWithRetryAndFallback<T>(
  action: (modelName: string) => Promise<T>
): Promise<T> {
  const modelsToTry = [
    "gemini-3.1-flash-lite",
    "gemini-flash-latest",
    "gemini-3.5-flash",
    "gemini-2.5-flash",
    "gemini-2.0-flash",
    "gemini-2.5-pro"
  ];
  let lastError: any = null;

  for (const model of modelsToTry) {
    let delay = 1000;
    const maxRetries = 3;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await action(model);
      } catch (error: any) {
        lastError = error;
        
        const errorMsg = String(error?.message || "").toLowerCase();
        const statusCode = error?.status || error?.status_code || error?.code || 0;
        
        // Check for token quota or rate limit exhaustion errors
        const isQuotaError = 
          statusCode === 429 || 
          errorMsg.includes("429") || 
          errorMsg.includes("quota") || 
          errorMsg.includes("limit") || 
          errorMsg.includes("exhausted") || 
          errorMsg.includes("resource_exhausted");

        if (model === "gemini-3.5-flash" && isQuotaError) {
          console.warn(`[AI Quota Exceeded for ${model}]: Shifting to gemini-3.1-flash-lite...`);
          break; // Break the inner retry loop instantly to switch directly to the next fallback model (gemini-3.1-flash-lite)
        }

        const isTransient = 
          statusCode === 503 || 
          statusCode === 429 || 
          statusCode === 500 || 
          errorMsg.includes("503") || 
          errorMsg.includes("429") || 
          errorMsg.includes("high demand") || 
          errorMsg.includes("temporary") ||
          errorMsg.includes("timeout") ||
          errorMsg.includes("fetch failed") ||
          errorMsg.includes("unavailable");

        if (isTransient && attempt < maxRetries) {
          console.warn(`[AI Attempt ${attempt}/${maxRetries} failed for ${model}]: ${error?.message}. Retrying in ${delay}ms...`);
          await new Promise((resolve) => setTimeout(resolve, delay));
          delay *= 2; // exponential backoff
        } else {
          console.warn(`[AI Model ${model} failed at attempt ${attempt}]: ${error?.message || error}`);
          break; // Break the inner retry loop to try the next fallback model
        }
      }
    }
  }

  throw lastError || new Error("Failed to generate content after trying multiple models and retries.");
}

export async function generateContentText(prompt: string, customSystemInstruction?: string): Promise<string> {
  const hasKey = process.env.GEMINI_API_KEY;
  if (!hasKey) {
    return simulateDemoResponse(prompt);
  }

  try {
    const ai = getGemini();
    const response = await fetchWithRetryAndFallback(async (modelName) => {
      return await ai.models.generateContent({
        model: modelName,
        contents: prompt,
        config: {
          systemInstruction: customSystemInstruction || TEACHER_SYSTEM_INSTRUCTION,
        },
      });
    });
    return response.text || "No output generated.";
  } catch (error: any) {
    console.error("Gemini API error after all retry and fallback attempts:", error);
    return `[AI Engine Fallback] I encountered an issue communicating with the Gemini API (Details: ${error?.message || "Internal Error"}). Standard seed response will be loaded instead.`;
  }
}

export async function* streamContentText(prompt: string, customSystemInstruction?: string) {
  const hasKey = process.env.GEMINI_API_KEY;
  if (!hasKey) {
    // Return mock streaming chunks for demo experience when there is no key
    const mockAnswer = simulateDemoResponse(prompt);
    const words = mockAnswer.split(" ");
    for (const word of words) {
      yield word + " ";
      await new Promise((resolve) => setTimeout(resolve, 35));
    }
    return;
  }

  const ai = getGemini();
  let resultStream: any = null;

  try {
    resultStream = await fetchWithRetryAndFallback(async (modelName) => {
      return await ai.models.generateContentStream({
        model: modelName,
        contents: prompt,
        config: {
          systemInstruction: customSystemInstruction || TEACHER_SYSTEM_INSTRUCTION,
        },
      });
    });
  } catch (error: any) {
    console.error("Gemini Streaming API failed to initiate after all attempts:", error);
    yield `[AI Engine Fallback Error] I had an error with the stream connection: ${error?.message || "Internal network issue"}`;
    return;
  }

  try {
    for await (const chunk of resultStream) {
      if (chunk.text) {
        yield chunk.text;
      }
    }
  } catch (error: any) {
    console.error("Gemini Streaming API error during consumption:", error);
    yield ` [I experienced a connection interruption in streaming: ${error?.message || "Internal network issue"}]`;
  }
}

export async function generateLessonPlan(prompt: string): Promise<string> {
  const hasKey = process.env.GEMINI_API_KEY;
  if (!hasKey) {
    return "# Week X: Demo Lesson Plan\n\n**Learning Objective:** Understand the value of preparation.\n\n**Skills:** Synthesis, Reading.\n\n---\n\n## Lesson 1: Introduction\n\n**Concept:** The basics\n\n**Process:** This lesson introduces students to the anatomy of an argument by analyzing a short op-ed on climate change. Students work in pairs to highlight the main claim in yellow, the supporting reasons in green, and the conclusion in blue. Through a guided class discussion, they evaluate whether the reasons logically support the conclusion. The lesson closes with an exit slip where students must identify a hidden assumption in the author's reasoning.\n\n**Tools/Resources:** Projector\n\n**Assessment/Differentiation:** Exit slip.\n\n---\n### Reflection\n**What went really well:**\n**What could be improved:**\n**What have I learned about students that will inform next lesson:**\n";
  }

  try {
    const ai = getGemini();
    const response = await fetchWithRetryAndFallback(async (modelName) => {
      return await ai.models.generateContent({
        model: modelName,
        contents: prompt,
      });
    });
    return response.text || "No output generated.";
  } catch (error: any) {
    console.error("Gemini API error generating lesson plan:", error);
    throw new Error(`Failed to generate lesson plan: ${error?.message}`);
  }
}

export async function generateLessonPacing(prompt: string): Promise<any> {
  const hasKey = process.env.GEMINI_API_KEY;
  if (!hasKey) {
    return {
      recommendedCount: 3,
      difficulty: "Medium Complexity",
      reasoning: "A good balance of concepts.",
      breakdown2: { focus: ["Part A", "Part B"] },
      breakdown3: { focus: ["Intro", "Deep Dive", "Review"] },
      breakdown4: { focus: ["Intro", "Part A", "Part B", "Review"] },
      breakdown5: { focus: ["Intro", "Part A", "Part B", "Activity", "Review"] },
      breakdown6: { focus: ["Intro", "Part A", "Part B", "Part C", "Activity", "Review"] }
    };
  }

  try {
    const ai = getGemini();
    const response = await fetchWithRetryAndFallback(async (modelName) => {
      // Must use a structured format, we define basic schema on the call
      return await ai.models.generateContent({
        model: modelName,
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: "object",
            properties: {
              recommendedCount: { type: "integer", description: "Between 2 and 6" },
              difficulty: { type: "string", description: "Introductory, Medium Complexity, or High Complexity" },
              reasoning: { type: "string", description: "Brief reasoning for recommendation" },
              breakdown2: { type: "object", properties: { focus: { type: "array", items: { type: "string" } } }, required: ["focus"] },
              breakdown3: { type: "object", properties: { focus: { type: "array", items: { type: "string" } } }, required: ["focus"] },
              breakdown4: { type: "object", properties: { focus: { type: "array", items: { type: "string" } } }, required: ["focus"] },
              breakdown5: { type: "object", properties: { focus: { type: "array", items: { type: "string" } } }, required: ["focus"] },
              breakdown6: { type: "object", properties: { focus: { type: "array", items: { type: "string" } } }, required: ["focus"] }
            },
            required: ["recommendedCount", "difficulty", "reasoning", "breakdown2", "breakdown3", "breakdown4", "breakdown5", "breakdown6"]
          }
        }
      });
    });
    return JSON.parse(response.text || "{}");
  } catch (error: any) {
    console.error("Gemini API error generating pacing:", error);
    throw new Error(`Failed to generate lesson pacing: ${error?.message}`);
  }
}

export function simulateDemoResponse(prompt: string): string {
  const lower = prompt.toLowerCase();
  
  if (lower.includes("task") || lower.includes("todo") || lower.includes("to-do") || lower.includes("add chore") || lower.includes("create task")) {
    return "I would normally register that task for you on your Task Board:\n\n- **Grade Class 11 Papers** (high priority, due Wednesday).";
  }
  
  if (lower.includes("event") || lower.includes("schedule") || lower.includes("meeting") || lower.includes("calendar") || lower.includes("book")) {
    return "I would normally book that event for you on your Calendar:\n\n- **GP Syllabus Review Meeting** (Tomorrow at 2:30 PM).";
  }
  
  if (lower.includes("remember") || lower.includes("memory") || lower.includes("remind") || lower.includes("recall")) {
    return "I would normally record this in your memory profile so you can reference it later:\n\n- **Grading Style**: Prefers short evaluation rubrics with individual Cambridge letter indicators.";
  }

  if (lower.includes("summarise") || lower.includes("summary")) {
    return "• **Context**: Request for academic syllabus alignment.\n• **Key Points**: Needs the updated Class 9 Global Perspectives worksheet in advance of Friday's period.\n• **Action Items**: Cross-check syllabus guidelines for source evaluation rubrics and forward the latest file.";
  }
  
  if (lower.includes("reply") || lower.includes("draft")) {
    return "Dear Anita,\n\nThank you for reaching out. I would be delighted to coordinate on Friday's lesson plan. \n\nI am currently updating the evaluation criteria to ensure our Class 9 Global Perspectives worksheet is fully aligned with the syllabus and focuses on evaluating bias.\n\nI shall send the revised document to you by Thursday morning so we can review it before our class.\n\nWarm regards,\n[Your Name]";
  }
  
  if (lower.includes("plan") || lower.includes("must do")) {
    return JSON.stringify({
      mustDo: [
        "Deliver Class 9 History Recapitulation (9:00 AM) in Room 204.",
        "Review Abhiveer's Global Perspectives sources regarding criteria bias."
      ],
      shouldDo: [
        "Email Anita Sharma regarding the aligned criteria worksheet.",
        "Collate Class 8 permission slips received by the School Office."
      ],
      canMove: [
        "Inspect draft recommendation letter request for Riya Mehta.",
        "Review personal utility reminders."
      ],
      followUps: [
        "Abhiveer (citation sources validation - 4:30 PM deadline)",
        "Anita Sharma (worksheet updates)"
      ],
      suggestedSchedule: "Prioritise Class 9 preparation early. Use the free afternoon block following lunch to coordinate the Global Perspectives worksheets and review pending paper permission slips."
    });
  }
  return "I'm your assistant at Vasant Valley School. I am trained to coordinate on Classes 8, 9, 11, and 12, focusing on History, Sociology and Global Perspectives. I can directly create tasks on your task board, book meetings on your calendar, or remember files and style choices! What shall we inspect next?";
}
