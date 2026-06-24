import { getGemini, TEACHER_SYSTEM_INSTRUCTION, fetchWithRetryAndFallback, streamContentText } from "./ai.js";
import { executeTool, isWriteTool, TOOL_DECLARATIONS } from "./agentTools.js";

export interface AgentEvent {
  type: "tool" | "token" | "approval" | "done" | "error";
  name?: string;
  status?: "running" | "done";
  text?: string;
  contents?: any[];
  batch?: any[];
  message?: string;
  result?: any;
}

export async function runAssistantAgent({
  message,
  contents,
  contextData,
  userId,
  accessToken,
  onEvent
}: {
  message?: string;
  contents?: any[];
  contextData?: any;
  userId: string;
  accessToken?: string;
  onEvent: (event: AgentEvent) => void | Promise<void>;
}): Promise<void> {
  const currentContents: any[] = contents ? [...contents] : [];

  // 1. Build a shortened context details string to avoid redundant grounding
  const now = new Date();
  
  // Format dates or take counts rather than dumping everything
  const numTasks = contextData?.tasks ? contextData.tasks.split('\n').length : 0;
  const numEvents = contextData?.calendar ? contextData.calendar.split('\n').length : 0;
  
  const contextStr = `
CURRENT DATE & TIME: ${now.toISOString()}
USER EMAIL/SCHOOL: dimasht@vasantvalley.edu.in
SCHOOL NAME: Vasant Valley School, New Delhi

SNAPSHOT METRICS:
- Pending Tasks: ~${numTasks} items
- Today's Events: ~${numEvents} items
(Use tools like searchTasks, searchCalendar, getTimetable for full details)

TEACHER BIOGRAPHY & REFERENCE FACT MEMORIES:
${contextData?.memory || "No stored general memories or bio preferences."}
`.trim();

  const finalSystemInstruction = `${TEACHER_SYSTEM_INSTRUCTION}

=== LIVE ENVIRONMENT GROUNDING CONTEXT ===
${contextStr}
`;

  if (message && currentContents.length === 0) {
    currentContents.push({ role: "user", parts: [{ text: message }] });
  } else if (message) {
    // If it's a resume message (e.g. SYSTEM: Agent executed...), append it
    currentContents.push({ role: "user", parts: [{ text: message }] });
  }

  const hasKey = !!process.env.GEMINI_API_KEY;

  if (!hasKey) {
    // Demo/Fallback mode (no GEMINI_API_KEY)
    let promptToSimulate = message || "Hello";
    if (currentContents.length > 0) {
      const lastUserMsg = currentContents[currentContents.length - 1];
      if (lastUserMsg.role === "user" && lastUserMsg.parts?.[0]?.text) {
        promptToSimulate = lastUserMsg.parts[0].text;
      }
    }
    
    const { simulateDemoResponse } = await import("./ai.js");
    const mockAnswer = simulateDemoResponse(promptToSimulate);
    
    const words = mockAnswer.split(" ");
    let fullText = "";
    for (const word of words) {
      const chunkText = word + " ";
      fullText += chunkText;
      await onEvent({ type: "token", text: chunkText });
      await new Promise((resolve) => setTimeout(resolve, 35));
    }
    await onEvent({ type: "done", text: fullText });
    return;
  }

  const ai = getGemini();
  const maxSteps = 5;

  for (let step = 0; step < maxSteps; step++) {
    console.log(`Agent loop step ${step + 1} of ${maxSteps}...`);
    try {
      const response = await fetchWithRetryAndFallback(async (modelName) => {
        return await ai.models.generateContent({
          model: modelName,
          contents: currentContents,
          config: {
            systemInstruction: finalSystemInstruction,
            tools: [{ functionDeclarations: TOOL_DECLARATIONS as any }],
            temperature: 0.2
          }
        });
      });

      const functionCalls = response.functionCalls;
      const responseText = response.text || "";

      // Case A: No tool calls were returned - this is the final model turn
      if (!functionCalls || functionCalls.length === 0) {
        // Stream the final answer instead of just returning
        const stream = await fetchWithRetryAndFallback(async (modelName) => {
          return await ai.models.generateContentStream({
            model: modelName,
            contents: currentContents,
            config: {
              systemInstruction: finalSystemInstruction,
              temperature: 0.2
            }
          });
        });

        let fullText = "";
        for await (const chunk of stream) {
          if (chunk.text) {
            fullText += chunk.text;
            await onEvent({ type: "token", text: chunk.text });
          }
        }
        await onEvent({ type: "done", text: fullText });
        return;
      }

      // Case B: Model returned function call(s)
      console.log(`Gemini returned function calls:`, functionCalls);

      // Append Model's turn to conversation history
      if (response.candidates && response.candidates[0] && response.candidates[0].content) {
        currentContents.push(response.candidates[0].content);
      } else {
        const modelParts = functionCalls.map(fc => ({ functionCall: fc }));
        if (responseText) {
          modelParts.unshift({ text: responseText } as any);
        }
        currentContents.push({
          role: "model",
          parts: modelParts
        });
      }

      const writeBatch = [];
      const readCalls = [];

      for (const fc of functionCalls) {
        if (isWriteTool(fc.name)) {
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
          } else if (fc.name === "createEmailDraft") {
            explanation = `Saving email draft to "${fc.args.to || 'sender'}" — subject "${fc.args.subject || 'Re: original'}"`;
          }
          writeBatch.push({ tool: fc.name, args: fc.args, explanation });
        } else {
          readCalls.push(fc);
        }
      }

      // If we intercepted any write tools, yield the batch immediately for approval
      if (writeBatch.length > 0) {
        await onEvent({
          type: "approval",
          contents: currentContents,
          batch: writeBatch
        });
        return;
      }

      // If none are write actions, we run safe read-only tools and feed responses back for next turn
      const responseParts: any[] = [];
      for (const fc of readCalls) {
        await onEvent({ type: "tool", name: fc.name, status: "running" });
        const result = await executeTool(userId, fc.name, fc.args, accessToken);
        await onEvent({ type: "tool", name: fc.name, status: "done", result });

        responseParts.push({
          functionResponse: {
            name: fc.name,
            response: { result }
          }
        });
      }

      currentContents.push({
        role: "user",
        parts: responseParts
      });

    } catch (err: any) {
      console.error("Error in agentic assistant loop:", err);
      await onEvent({ type: "error", message: `Errors occurred: ${err.message || String(err)}` });
      return;
    }
  }

  // Catch-all if loop runs over maxSteps
  await onEvent({ type: "done", text: "I finished reviewing my scheduled resources. Let me help you with anything else." });
}

