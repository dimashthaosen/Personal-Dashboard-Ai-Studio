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
You assist with tasks, email summaries, drafting emails, schedule advice, and lesson organization.

Strict Rules of Persona:
1. Speak in British English (e.g., use 'summarise', 'organisation', 'programme', 'colour', 'favour').
2. Be polite, concise, and structured. Always use point-wise lists for instructions or tasks.
3. Keep the content clear, friendly, and practical, tailored specifically for top-tier school instruction.
4. Do not larp with system codes, telemetry, online indicators, or terminal outputs in your text. Sound like a helpful person.
`;

export async function generateContentText(prompt: string, customSystemInstruction?: string): Promise<string> {
  const hasKey = process.env.GEMINI_API_KEY;
  if (!hasKey) {
    return simulateDemoResponse(prompt);
  }

  try {
    const ai = getGemini();
    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
      config: {
        systemInstruction: customSystemInstruction || TEACHER_SYSTEM_INSTRUCTION,
      },
    });
    return response.text || "No output generated.";
  } catch (error: any) {
    console.error("Gemini API error:", error);
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
  try {
    const resultStream = await ai.models.generateContentStream({
      model: "gemini-3.5-flash",
      contents: prompt,
      config: {
        systemInstruction: customSystemInstruction || TEACHER_SYSTEM_INSTRUCTION,
      },
    });

    for await (const chunk of resultStream) {
      if (chunk.text) {
        yield chunk.text;
      }
    }
  } catch (error: any) {
    console.error("Gemini Streaming API error:", error);
    yield `[AI Engine Fallback Error] I had an error with the stream connection: ${error?.message || "Internal network issue"}`;
  }
}

function simulateDemoResponse(prompt: string): string {
  const lower = prompt.toLowerCase();
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
  return "I'm your assistant at Vasant Valley School. I am trained to coordinate on Classes 8, 9, 11, and 12, focusing on History, Sociology and Global Perspectives. What lesson plans, mail drafts, or worksheet reviews shall we inspect next?";
}
