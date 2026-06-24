import { getGemini, TEACHER_SYSTEM_INSTRUCTION, fetchWithRetryAndFallback } from "./ai.js";
import { executeTool, isWriteTool, TOOL_DECLARATIONS, pendingApprovalsStore, PendingApproval } from "./agentTools.js";

export interface ToolCallExecuted {
  name: string;
  args: any;
  result: any;
}

export interface AgentResult {
  text: string;
  toolCallsExecuted: ToolCallExecuted[];
  pendingApproval?: PendingApproval;
}

export async function runAssistantAgent({
  message,
  contextData,
  userId,
  accessToken,
  chatHistory = []
}: {
  message: string;
  contextData?: any;
  userId: string;
  accessToken?: string;
  chatHistory?: { role: "user" | "assistant"; content: string }[];
}): Promise<AgentResult> {
  const toolCallsExecuted: ToolCallExecuted[] = [];
  const contents: any[] = [];

  // 1. Build context details to ground the Gemini assistant
  const now = new Date();
  const contextStr = `
CURRENT DATE & TIME: ${now.toISOString()}
USER EMAIL/SCHOOL: dimasht@vasantvalley.edu.in
SCHOOL NAME: Vasant Valley School, New Delhi

COURSES & CLASSES:
- gp8: Class 8 Cambridge IGCSE Global Perspectives (Newsletter: Worldwatch)
- soc11: Class 8 Social Science / History / Geography NCERT
- asLevel: Class 11 and Class 12 Sociology Cambridge Syllabus

CURRENT PENDING TASKS (DASHBOARD):
${contextData?.tasks || "No currently pending tasks."}

TODAY'S SCHEDULE (CALENDAR):
${contextData?.calendar || "No meetings, lessons, or staff assemblies today."}

TEACHER BIOGRAPHY & REFERENCE FACT MEMORIES:
${contextData?.memory || "No stored general memories or bio preferences."}

TIMETABLE (TEACHING SCHEDULE):
${contextData?.timetable || "No active teaching timetable loaded. Suggest calling 'getTimetable' or using the timetable import view to load schedule."}
`.trim();

  const finalSystemInstruction = `${TEACHER_SYSTEM_INSTRUCTION}

=== LIVE ENVIRONMENT GROUNDING CONTEXT ===
${contextStr}
`;

  // 2. Map chat history to standard Google GenAI Roles (user / model)
  for (const msg of chatHistory) {
    const role = msg.role === "assistant" ? "model" : "user";
    // Sanitize any existing bracketted tags just in case
    const purified = msg.content;
    contents.push({ role, parts: [{ text: purified }] });
  }

  // Add the latest user prompt
  contents.push({ role: "user", parts: [{ text: message }] });

  const ai = getGemini();
  const maxSteps = 5;

  for (let step = 0; step < maxSteps; step++) {
    console.log(`Agent loop step ${step + 1} of ${maxSteps}...`);
    try {
      const response = await fetchWithRetryAndFallback(async (modelName) => {
        return await ai.models.generateContent({
          model: modelName,
          contents,
          config: {
            systemInstruction: finalSystemInstruction,
            tools: [{ functionDeclarations: TOOL_DECLARATIONS as any }],
            temperature: 0.2 // Lower temp for precise function calling & logic
          }
        });
      });

      const functionCalls = response.functionCalls;
      const responseText = response.text || "";

      // Case A: No tool calls were returned - this is the final final model turn
      if (!functionCalls || functionCalls.length === 0) {
        return {
          text: responseText,
          toolCallsExecuted
        };
      }

      // Case B: Model returned function call(s)
      console.log(`Gemini returned function calls:`, functionCalls);

      // We append the Model's turn to conversation history so it knows we acknowledged it
      const modelParts = functionCalls.map(fc => ({ functionCall: fc }));
      if (responseText) {
        modelParts.unshift({ text: responseText } as any);
      }
      contents.push({
        role: "model",
        parts: modelParts
      });

      // We handle each function call (usually it yields only one, or multiple parallel)
      let containsWriteAction = false;
      let pendingApprovalObj: PendingApproval | undefined = undefined;

      for (const fc of functionCalls) {
        if (isWriteTool(fc.name)) {
          containsWriteAction = true;
          const approvalId = `appr_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
          
          // Generate a user-friendly explanation of the write proposal
          let explanation = `I need your confirmation to execute ${fc.name}.`;
          if (fc.name === "createTask") {
            explanation = `Drafting new task list item: "${fc.args.title}"`;
          } else if (fc.name === "updateTask") {
            explanation = `Updating values of task: "${fc.args.title || fc.args.taskId}"`;
          } else if (fc.name === "createCalendarEvent") {
            explanation = `Scheduling new calendar event: "${fc.args.title}" on ${fc.args.start}`;
          } else if (fc.name === "saveMemory") {
            explanation = `Saving a new preference memory element: "${fc.args?.key || ""}"`;
          } else if (fc.name === "generateLessonPlan") {
            explanation = `Generating and saving weekly lesson plan for "${fc.args.topic}" (Week ${fc.args.week})`;
          }

          pendingApprovalObj = {
            id: approvalId,
            tool: fc.name,
            args: fc.args,
            userId,
            explanation
          };

          pendingApprovalsStore.set(approvalId, pendingApprovalObj);
          break; // Stop execution on write tools
        }
      }

      // If we intercepted a write tool, yield the current execution step immediately with pending approval
      if (containsWriteAction && pendingApprovalObj) {
        let text = responseText || `I've prepared a draft request that requires your confirmation: ${pendingApprovalObj.explanation}.`;
        
        // Append a polite, clear notice to instruct the teacher to select 'Confirm and Save'
        const noticeSuffix = `\n\n*(Note: Please click **Confirm and Save** below to commit this draft and save it permanently.)*`;
        if (!text.includes("Confirm and Save") && !text.includes("confirm this draft")) {
          text += noticeSuffix;
        }

        return {
          text,
          toolCallsExecuted,
          pendingApproval: pendingApprovalObj
        };
      }

      // If none are write actions, we run safe read-only tools and feed responses back for next turn
      const responseParts: any[] = [];
      for (const fc of functionCalls) {
        const result = await executeTool(userId, fc.name, fc.args, accessToken);
        
        toolCallsExecuted.push({
          name: fc.name,
          args: fc.args,
          result
        });

        responseParts.push({
          functionResponse: {
            name: fc.name,
            response: { result }
          }
        });
      }

      contents.push({
        role: "user",
        parts: responseParts
      });

    } catch (err: any) {
      console.error("Error in agentic assistant loop:", err);
      return {
        text: `Errors occurred during assistant actions: ${err.message || String(err)}. Let me know what I should do next.`,
        toolCallsExecuted
      };
    }
  }

  // Catch-all if loop runs over 5 layers
  return {
    text: "I finished reviewing my scheduled resources. Let me help you with anything else.",
    toolCallsExecuted
  };
}
