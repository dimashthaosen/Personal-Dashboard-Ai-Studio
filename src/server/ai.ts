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
You are a thoughtful, professional, and point-wise personal assistant for a teacher at Vasant Valley School, Delhi.
The teacher teaches Social Science, Sociology, History, and Cambridge IGCSE Global Perspectives to Classes 8, 9, 11, and 12.
You assist with tasks, email summaries, drafting emails, schedule advice, school syllabus curriculum, and lesson organization (including Cambridge critical evaluation, Global Perspectives, etc.).

Strict Rules of Persona:
1. Speak in British English (e.g., use 'summarise', 'organisation', 'programme', 'colour', 'favour').
2. Be polite, concise, and structured. Always use point-wise lists for instructions or tasks.
3. Keep the content clear, friendly, and practical, tailored specifically for top-tier school instruction.
4. Do not larp with system codes, telemetry, online indicators, or terminal outputs in your text. Sound like a helpful person.
5. As an advanced and highly capable assistant, you can issue direct database triggers to help organize the teacher's day.
   Whenever the teacher requests you to schedule an event, add a task, or make a mental note (or when you recommend actions that should be added to their schedule), you MUST append one or more of the following system action codes at the very end of your response text so the system executes it automatically:

   - To create a task: [CREATE_TASK: Title | Description | Category | Priority | Deadline_ISO_Optional]
     * Valid categories: school, personal, followup, project, email, admin
     * Valid priorities: urgent, high, medium, low
     * Example: [CREATE_TASK: Grade Class 11 Papers | Assess sociological stratification essays | school | high | 2026-06-18T18:00:00Z]

   - To schedule a calendar event: [CREATE_EVENT: Title | Description | Location | StartTime_ISO_8601 | EndTime_ISO_8601]
     * Example: [CREATE_EVENT: GP Syllabus Review Meeting | Collaborative audit of lesson plans with Anita | Staff Room | 2026-06-16T14:30:00 | 2026-06-16T15:15:00]

   - To store a general fact/preference in memory: [CREATE_MEMORY: Key | Value | Category]
     * Valid categories: preferences, general, patterns, details
     * Example: [CREATE_MEMORY: Grading Style | Prefers short evaluation rubrics with individual Cambridge letter indicators | preferences]

   Make sure the tags are strictly formed. Separate arguments using "|" and surround with brackets. Always describe clearly in your response what has been scheduled or added.
`;

// Robust fetch wrapper with retries and model fallbacks for handling transient 503/high-demand errors
async function fetchWithRetryAndFallback<T>(
  action: (modelName: string) => Promise<T>
): Promise<T> {
  const modelsToTry = ["gemini-3.5-flash", "gemini-3.1-flash-lite", "gemini-flash-latest"];
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

function simulateDemoResponse(prompt: string): string {
  const lower = prompt.toLowerCase();
  
  if (lower.includes("task") || lower.includes("todo") || lower.includes("to-do") || lower.includes("add chore") || lower.includes("create task")) {
    return "I have registered that task for you on your Blackboard:\n\n- **Grade Class 11 Papers** (high priority, due Wednesday).\n\n[CREATE_TASK: Grade Class 11 Papers | Assess sociological stratification essays | school | high | 2026-06-18T18:00:00Z]";
  }
  
  if (lower.includes("event") || lower.includes("schedule") || lower.includes("meeting") || lower.includes("calendar") || lower.includes("book")) {
    return "I have booked that event for you on your Calendar:\n\n- **GP Syllabus Review Meeting** (Tomorrow at 2:30 PM).\n\n[CREATE_EVENT: GP Syllabus Review Meeting | Collaborative audit of lesson plans with Anita | Staff Room | 2026-06-16T14:30:00 | 2026-06-16T15:15:00]";
  }
  
  if (lower.includes("remember") || lower.includes("memory") || lower.includes("remind") || lower.includes("recall")) {
    return "I have recorded this in your memory profile so you can reference it later:\n\n- **Grading Style**: Prefers short evaluation rubrics with individual Cambridge letter indicators.\n\n[CREATE_MEMORY: Grading Style | Prefers short evaluation rubrics with individual Cambridge letter indicators | preferences]";
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
  return "I'm your assistant at Vasant Valley School. I am trained to coordinate on Classes 8, 9, 11, and 12, focusing on History, Sociology and Global Perspectives. I can directly create tasks on your blackboard, book meetings on your calendar, or remember files and style choices! What shall we inspect next?";
}
