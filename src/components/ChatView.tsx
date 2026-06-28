import React, { useState, useEffect, useRef } from "react";
import { ChatMessage } from "../types";
import { Sparkles, Trash2, ArrowUpCircle, Check, AlertTriangle, XCircle } from "lucide-react";
import { useFirestoreTasks, useFirestoreEvents, useFirestoreMemory, useFirestoreChat } from "../lib/hooks";
import { collection, addDoc, query, getDocs, writeBatch, doc, updateDoc, where } from "firebase/firestore";
import { db } from "../lib/firebase";
import ReactMarkdown from "react-markdown";

function cleanContentForDisplay(content: string) {
  if (!content) return "";
  return content.trim();
}

const renderers = {
  p: ({ children }: any) => <p className="mb-2 last:mb-0 leading-relaxed font-serif text-sm text-[#2c2724]">{children}</p>,
  strong: ({ children }: any) => <strong className="font-serif font-bold text-[#1a1612] bg-[#ece6db]/45 px-1 py-0.2 rounded-sm">{children}</strong>,
  ul: ({ children }: any) => <ul className="list-disc pl-5 mb-2.5 space-y-1 text-[#2c2724]">{children}</ul>,
  ol: ({ children }: any) => <ol className="list-decimal pl-5 mb-2.5 space-y-1 text-[#2c2724]">{children}</ol>,
  li: ({ children }: any) => <li className="text-sm font-serif text-[#2c2724] leading-relaxed mb-0.5">{children}</li>,
  h1: ({ children }: any) => <h1 className="text-base font-serif font-bold text-[#1a1612] mt-2.5 mb-1">{children}</h1>,
  h2: ({ children }: any) => <h2 className="text-sm font-serif font-bold text-[#1a1612] mt-2 mb-1">{children}</h2>,
  h3: ({ children }: any) => <h3 className="text-xs font-sans font-bold uppercase tracking-wider text-[#4a4540] mt-2 mb-1">{children}</h3>,
  a: ({ href, children }: any) => <a href={href} target="_blank" rel="noopener noreferrer" className="text-[#2d5a4a] hover:underline font-mono text-xs font-bold">{children}</a>,
  em: ({ children }: any) => <em className="italic text-[#4a4540]">{children}</em>,
  code: ({ children }: any) => <code className="bg-[#ece6db]/60 px-1 py-0.5 rounded font-mono text-[11px] font-medium text-[#2d5a4a]">{children}</code>
};

export default function ChatView({ 
  userId, 
  googleToken, 
  initialCommandPrompt, 
  onClearCommandPrompt,
  initialSelectedChatMessageId,
  onClearInitialChatMessageId
}: { 
  userId?: string; 
  googleToken?: string | null;
  initialCommandPrompt?: string | null;
  onClearCommandPrompt?: () => void;
  initialSelectedChatMessageId?: string | null;
  onClearInitialChatMessageId?: () => void;
}) {
  const { messages: firestoreMessages } = useFirestoreChat(userId);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [userInput, setUserInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [activeStreamingReply, setActiveStreamingReply] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Trigger command prompt automatically from general spot bar
  useEffect(() => {
    if (initialCommandPrompt && userId) {
      const promptText = initialCommandPrompt;
      if (onClearCommandPrompt) {
        onClearCommandPrompt();
      }
      // Delayed slightly to ensure component state is settled
      setTimeout(() => {
        handleSendMessage(promptText);
      }, 150);
    }
  }, [initialCommandPrompt, userId]);

  // Handle deep-linked message scrolling
  useEffect(() => {
    if (initialSelectedChatMessageId) {
      setTimeout(() => {
        const element = document.getElementById(`chat-msg-${initialSelectedChatMessageId}`);
        if (element) {
          element.scrollIntoView({ behavior: "smooth", block: "center" });
        }
      }, 300);

      if (onClearInitialChatMessageId) {
        setTimeout(onClearInitialChatMessageId, 1000);
      }
    }
  }, [initialSelectedChatMessageId, onClearInitialChatMessageId]);

  // Guards against duplicate execution during async state frames
  const sendingRef = useRef(false);
  const approvingRef = useRef(false);

  const { tasks } = useFirestoreTasks(userId);
  const { events } = useFirestoreEvents(userId);
  const { memoryItems } = useFirestoreMemory(userId);

  const suggestionChips = [
    "Summarise my unread emails",
    "Prepare Class 9 history recapitulation lesson starter ideas",
    "Draft a reply to Anita about Global Perspectives criteria",
    "What tasks are currently flagged pending?",
  ];

  useEffect(() => {
    setMessages(firestoreMessages);
  }, [firestoreMessages]);

  useEffect(() => {
    scrollToBottom();
  }, [messages, activeStreamingReply]);

  const [executedTools, setExecutedTools] = useState<Array<{ name: string; args: any; result: any }>>([]);
  const [pendingApproval, setPendingApproval] = useState<any | null>(null);

  const handleClearHistory = async () => {
    if (!userId) return;
    try {
      setMessages([]);
      setActiveStreamingReply("");
      setPendingApproval(null);
      setExecutedTools([]);
      
      // Clear user chat messages in Firestore directly from the authenticated client
      const q = query(collection(db, `users/${userId}/chatMessages`));
      const snap = await getDocs(q);
      if (!snap.empty) {
        const batch = writeBatch(db);
        snap.docs.forEach((d) => {
          batch.delete(doc(db, `users/${userId}/chatMessages`, d.id));
        });
        await batch.commit();
      }

      // Tell the server-side runtime to clear its local in-memory logs
      await fetch("/api/chat/clear", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId })
      });
    } catch (err) {
      console.error("Failed to clear chat history database:", err);
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const handleSendMessage = async (textToSend: string) => {
    if (!textToSend.trim() || loading || !userId) return;
    if (sendingRef.current) return;
    sendingRef.current = true;

    const userMessageText = textToSend;
    setUserInput("");
    setLoading(true);
    setPendingApproval(null);
    setExecutedTools([]);
    setActiveStreamingReply("");

    try {
      await addDoc(collection(db, `users/${userId}/chatMessages`), {
        role: "user",
        content: userMessageText,
        timestamp: new Date().toISOString(),
        userId
      });

      const contextData = {
        tasks: tasks.filter((t) => t.status !== "done").map((t) => `- [${t.priority.toUpperCase()}] ${t.title} (${t.category}, due: ${t.deadline || "none"}, ID: ${t.id})`).join("\n"),
        calendar: events.map((e) => `- ${e.title} at ${e.start} - ${e.end}`).join("\n"),
        memory: memoryItems.filter(m => !m.doNotUseAutomatically).map((m) => `- ${m.key}: ${m.value}`).join("\n"),
      };

      const history = messages.slice(-15).map(m => ({
        role: m.role,
        content: m.content
      }));

      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (googleToken) {
        headers["Authorization"] = `Bearer ${googleToken}`;
      }

      const response = await fetch("/api/chat", {
        method: "POST",
        headers,
        body: JSON.stringify({
          message: userMessageText,
          contextData,
          userId,
          chatHistory: history
        }),
      });

      if (!response.ok || !response.body) {
        throw new Error("Terminal agent processor reported an issue.");
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let finalStreamedText = "";

      const processPart = (part: string) => {
        if (part.startsWith("data: ")) {
          try {
            const data = JSON.parse(part.slice(6));
            
            if (data.type === "token") {
              setActiveStreamingReply(prev => prev + data.text);
              finalStreamedText += data.text;
            } else if (data.type === "tool") {
              if (data.status === "done") {
                setExecutedTools(prev => [...prev, { name: data.name, args: {}, result: data.result }]);
                // If the tool generated a lesson plan, save it to the DB on the client side
                if (data.name === "generateLessonPlan" && data.result?.markdown) {
                  const planArgs = data.result.args || {};
                  addDoc(collection(db, `users/${userId}/lessonPlans`), {
                    courseId: planArgs.courseId || "unknown",
                    week: planArgs.week || "unknown",
                    lessonsPerWeek: planArgs.lessonsPerWeek || 1,
                    pedagogicalMix: planArgs.pedagogicalMix || "",
                    languageTone: planArgs.languageTone || "",
                    markdown: data.result.markdown,
                    createdAt: new Date().toISOString(),
                    userId
                  }).catch(e => console.warn("Failed to save generated lesson plan:", e));
                }
              }
            } else if (data.type === "approval") {
              setPendingApproval({ batch: data.batch, contents: data.contents });
            } else if (data.type === "done") {
              finalStreamedText = data.text;
              setActiveStreamingReply(data.text);
            } else if (data.type === "error") {
              throw new Error(data.message);
            }
          } catch (e) {
            console.error("Stream parse error:", e);
          }
        }
      };

      while (true) {
        const { value, done } = await reader.read();
        if (value) {
          buffer += decoder.decode(value, { stream: true });
          const parts = buffer.split("\n\n");
          buffer = parts.pop() || "";
          
          for (const part of parts) {
            processPart(part);
          }
        }
        if (done) {
          if (buffer.trim()) {
            processPart(buffer.trim());
          }
          break;
        }
      }

      if (finalStreamedText) {
        await addDoc(collection(db, `users/${userId}/chatMessages`), {
          role: "assistant",
          content: finalStreamedText,
          timestamp: new Date().toISOString(),
          userId
        });
      }

    } catch (err: any) {
      console.error("Agent chat failure:", err);
      setMessages((prev) => [
        ...prev,
        {
          id: "err-msg-" + Date.now(),
          role: "assistant",
          content: `Apologies, I encountered an issue: ${err.message || "Failed to sync"}. Please retry.`,
          timestamp: new Date().toISOString(),
        },
      ]);
    } finally {
      setActiveStreamingReply("");
      setLoading(false);
      sendingRef.current = false;
    }
  };

  const handleApproveAction = async () => {
    if (!pendingApproval || loading || !userId) return;
    if (approvingRef.current) return;
    approvingRef.current = true;

    setLoading(true);
    setActiveStreamingReply("");
    const { batch, contents } = pendingApproval;
    setPendingApproval(null);

    try {
      // 1. Execute direct client-side Firestore writes to completely circumvent server container permission scopes
      const clientResults: Record<string, any> = {};
      
      try {
        for (const item of batch) {
          const { tool, args } = item;
          if (tool === "createTask") {
            const title = String(args.title || "").trim().substring(0, 200);
            if (!title) {
              clientResults[tool] = { success: false, error: "Task title cannot be empty." };
              continue;
            }
            const priority = ["low", "medium", "high", "urgent"].includes((args.priority || "").toLowerCase()) ? args.priority.toLowerCase() : "medium";
            const category = ["school", "personal", "admin"].includes((args.category || "").toLowerCase()) ? args.category.toLowerCase() : "school";

            const docRef = await addDoc(collection(db, `users/${userId}/tasks`), {
              title,
              description: args.description || "",
              deadline: args.deadline || "",
              priority,
              category,
              status: "pending",
              source: "assistant",
              createdAt: new Date().toISOString(),
              userId
            });
            clientResults[tool] = { success: true, taskId: docRef.id, message: `Task "${title}" created successfully in Firestore.` };
          } else if (tool === "updateTask") {
            const { taskId } = args;
            if (taskId) {
              const updateData: any = {};
              if (args.title !== undefined) {
                const trimmed = String(args.title).trim();
                if (!trimmed) {
                  clientResults[tool] = { success: false, error: "Task title cannot be empty." };
                  continue;
                }
                updateData.title = trimmed.substring(0, 200);
              }
              if (args.description !== undefined) updateData.description = String(args.description);
              if (args.deadline !== undefined) updateData.deadline = String(args.deadline);
              if (args.priority !== undefined) {
                 updateData.priority = ["low", "medium", "high", "urgent"].includes(String(args.priority).toLowerCase()) ? String(args.priority).toLowerCase() : "medium";
              }
              if (args.category !== undefined) {
                 updateData.category = ["school", "personal", "admin"].includes(String(args.category).toLowerCase()) ? String(args.category).toLowerCase() : "school";
              }
              if (args.status !== undefined) {
                 updateData.status = ["pending", "in-progress", "done"].includes(String(args.status).toLowerCase()) ? String(args.status).toLowerCase() : "pending";
              }
              
              await updateDoc(doc(db, `users/${userId}/tasks`, taskId), updateData);
              clientResults[tool] = { success: true, taskId, message: `Task successfully updated.` };
            } else {
              clientResults[tool] = { success: false, error: "Task ID is missing." };
            }
          } else if (tool === "createCalendarEvent") {
            const title = String(args.title || "").trim().substring(0, 200);
            if (!title) {
              clientResults[tool] = { success: false, error: "Event title cannot be empty." };
              continue;
            }
            const start = String(args.start || new Date().toISOString()).substring(0, 100);
            const end = String(args.end || new Date().toISOString()).substring(0, 100);
            if (new Date(end) <= new Date(start)) {
               clientResults[tool] = { success: false, error: "Event end time must be after start time." };
               continue;
            }

            const docRef = await addDoc(collection(db, `users/${userId}/calendarEvents`), {
              title,
              description: String(args.description || ""),
              location: args.location || "Vasant Valley School",
              start,
              end,
              createdAt: new Date().toISOString(),
              userId
            });
            clientResults[tool] = { success: true, eventId: docRef.id, message: `Calendar event "${title}" created successfully in Firestore.` };
          } else if (tool === "saveMemory") {
            const key = String(args.key || "").trim().substring(0, 100);
            const value = String(args.value || "").trim().substring(0, 1000);
            if (!key || !value) {
              clientResults[tool] = { success: false, error: "Memory key and value cannot be empty." };
              continue;
            }

            const memoriesRef = collection(db, `users/${userId}/memoryItems`);
            const qMatches = query(memoriesRef, where("key", "==", key));
            const memSnap = await getDocs(qMatches);
            
            if (!memSnap.empty) {
              const targetId = memSnap.docs[0].id;
              await updateDoc(doc(db, `users/${userId}/memoryItems`, targetId), {
                value,
                category: String(args.category || "general").toLowerCase(),
                updatedAt: new Date().toISOString()
              });
              clientResults[tool] = { success: true, memoryId: targetId, message: `Updated existing memory element for "${key}".` };
            } else {
              const docRef = await addDoc(memoriesRef, {
                key,
                value,
                category: String(args.category || "general").toLowerCase(),
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
                userId
              });
              clientResults[tool] = { success: true, memoryId: docRef.id, message: `Memory element "${key}" saved successfully in Firestore.` };
            }
          }
        }
      } catch (dbErr: any) {
        console.warn("Client-side direct Firestore write fallback warning:", dbErr);
      }

      const contextData = {
        tasks: tasks.filter((t) => t.status !== "done").map((t) => `- [${t.priority.toUpperCase()}] ${t.title} (${t.category}, due: ${t.deadline || "none"}, ID: ${t.id})`).join("\n"),
        calendar: events.map((e) => `- ${e.title} at ${e.start} - ${e.end}`).join("\n"),
        memory: memoryItems.filter(m => !m.doNotUseAutomatically).map((m) => `- ${m.key}: ${m.value}`).join("\n"),
      };

      const approveHeaders: Record<string, string> = { "Content-Type": "application/json" };
      if (googleToken) {
        approveHeaders["Authorization"] = `Bearer ${googleToken}`;
      }

      const response = await fetch("/api/chat/approve", {
        method: "POST",
        headers: approveHeaders,
        body: JSON.stringify({
          batch,
          contents,
          userId,
          contextData,
          clientResults
        })
      });

      if (!response.ok || !response.body) {
        throw new Error("Verification execution resulted in an error.");
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let finalStreamedText = "";

      const processPart = (part: string) => {
        if (part.startsWith("data: ")) {
          try {
            const data = JSON.parse(part.slice(6));
            
            if (data.type === "token") {
              setActiveStreamingReply(prev => prev + data.text);
              finalStreamedText += data.text;
            } else if (data.type === "tool") {
              if (data.status === "done") {
                setExecutedTools(prev => [...prev, { name: data.name, args: {}, result: data.result }]);
                if (data.name === "generateLessonPlan" && data.result?.markdown) {
                  const planArgs = data.result.args || {};
                  addDoc(collection(db, `users/${userId}/lessonPlans`), {
                    courseId: planArgs.courseId || "unknown",
                    week: planArgs.week || "unknown",
                    lessonsPerWeek: planArgs.lessonsPerWeek || 1,
                    pedagogicalMix: planArgs.pedagogicalMix || "",
                    languageTone: planArgs.languageTone || "",
                    markdown: data.result.markdown,
                    createdAt: new Date().toISOString(),
                    userId
                  }).catch(e => console.warn("Failed to save generated lesson plan:", e));
                }
              }
            } else if (data.type === "done") {
              finalStreamedText = data.text;
              setActiveStreamingReply(data.text);
            } else if (data.type === "error") {
              throw new Error(data.message);
            }
          } catch (e) {
            console.error("Stream parse error:", e);
          }
        }
      };

      while (true) {
        const { value, done } = await reader.read();
        if (value) {
          buffer += decoder.decode(value, { stream: true });
          const parts = buffer.split("\n\n");
          buffer = parts.pop() || "";
          
          for (const part of parts) {
            processPart(part);
          }
        }
        if (done) {
          if (buffer.trim()) {
            processPart(buffer.trim());
          }
          break;
        }
      }

      if (finalStreamedText) {
        await addDoc(collection(db, `users/${userId}/chatMessages`), {
          role: "assistant",
          content: finalStreamedText,
          timestamp: new Date().toISOString(),
          userId
        });
      }

    } catch (err: any) {
      console.error("Verification execution issue:", err);
      setMessages((prev) => [
        ...prev,
        {
          id: "err-approve-" + Date.now(),
          role: "assistant",
          content: `I initiated the database modifications, but had a follow-up responder problem: ${err.message}. Please refresh the relevant planner page.`,
          timestamp: new Date().toISOString()
        }
      ]);
    } finally {
      setActiveStreamingReply("");
      setLoading(false);
      approvingRef.current = false;
    }
  };

  const handleCancelAction = () => {
    setPendingApproval(null);
    setMessages((prev) => [
      ...prev,
      {
        id: "cancel-" + Date.now(),
        role: "assistant",
        content: "Draft request cancelled. No database changes were saved.",
        timestamp: new Date().toISOString()
      }
    ]);
  };

  return (
    <div className="animate-fade-up max-w-[1050px] mx-auto h-[78vh] flex flex-col bg-[#fcf9f3] border border-[#e1d8c6] rounded-[20px] shadow-[0_4px_24px_-10px_rgba(26,22,18,0.1)] relative overflow-hidden">
      
      {/* Header bar */}
      <div className="p-4 border-b border-[#ece6db] bg-[#fcf9f3] flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <Sparkles className="w-5 h-5 text-[#2d5a4a]" />
          <div>
            <h3 className="font-serif font-bold text-sm text-[#1a1612]">Assistant</h3>
            <p className="font-sans text-[11px] text-[#2d5a4a] font-medium">Using your dashboard context</p>
          </div>
        </div>
        
        {messages.length > 0 && (
          <button
            type="button"
            onClick={handleClearHistory}
            className="text-[#4a4540] hover:text-[#b83232] hover:bg-[#f5f1e8] p-2 rounded-lg transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-[#2d5a4a]/40 cursor-pointer"
            title="Clear Chat History"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Suggested chips if log is empty */}
      {messages.length === 0 && !activeStreamingReply && (
        <div className="flex-1 overflow-y-auto p-6 flex flex-col justify-center items-center text-center space-y-6">
          <div className="w-12 h-12 bg-[#e8f0ec] rounded-full border border-[#d2e3da] flex items-center justify-center text-[#2d5a4a]">
            <Sparkles className="w-6 h-6" />
          </div>
          <div>
            <h4 className="font-serif font-semibold text-base text-[#1a1612]">How can I help?</h4>
            <p className="font-serif italic text-xs text-[#4a4540] max-w-sm mt-1 leading-relaxed">
              Find files, draft lesson materials, reference class structures, and organize tasks securely using your dashboard context.
            </p>
          </div>

          <div className="w-full max-w-lg grid grid-cols-1 md:grid-cols-2 gap-2 text-left">
            {suggestionChips.map((chip, idx) => (
              <button
                type="button"
                key={idx}
                onClick={() => handleSendMessage(chip)}
                className="p-3.5 bg-[#fcf9f3] border border-[#e1d8c6] hover:border-[#2d5a4a] rounded-lg text-xs text-[#4a4540] font-serif italic text-left leading-normal hover:bg-[#f3ede2] hover:text-[#2d5a4a] transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-[#2d5a4a]/40 cursor-pointer"
              >
                {chip}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Chat scroll box */}
      {(messages.length > 0 || activeStreamingReply) && (
        <div className="flex-1 overflow-y-auto p-5 space-y-5 bg-[#fcf9f3]/40">
          {messages.map((msg) => {
            const isError = msg.id?.toString().startsWith("err-");
            const isCancel = msg.id?.toString().startsWith("cancel-");

            const isSelected = msg.id === initialSelectedChatMessageId;
            return (
              <div
                key={msg.id}
                id={`chat-msg-${msg.id}`}
                className={`flex ${
                  msg.role === "user" ? "justify-end" : "justify-start animate-fadeIn"
                } ${
                  isSelected ? "ring-2 ring-amber-400 rounded-2xl p-2 bg-amber-50/20 shadow-sm" : ""
                }`}
              >
                <div
                  className={`max-w-[85%] rounded-[14px] px-4 py-3 shadow-[0_1px_2px_rgba(26,22,18,0.02)] border ${
                    msg.role === "user"
                      ? "bg-[#2d5a4a] border-[#2d5a4a] text-[#fcf9f3] font-sans text-xs"
                      : isError
                      ? "bg-[#fdf3f2] border-[#f5c6cb] text-[#842029] font-serif text-sm leading-relaxed"
                      : isCancel
                      ? "bg-[#f8f9fa] border-[#e9ecef] text-[#495057] font-serif text-sm leading-relaxed"
                      : "bg-[#f3ede2] border-[#e1d8c6] text-[#2c2724] font-serif text-sm leading-relaxed"
                  }`}
                >
                  {msg.role === "user" ? (
                    <p className="whitespace-pre-wrap leading-relaxed">
                      {msg.content}
                    </p>
                  ) : (
                    <div className="flex items-start gap-2.5">
                      {isError && <AlertTriangle className="w-4.5 h-4.5 text-rose-600 flex-shrink-0 mt-0.5" />}
                      {isCancel && <XCircle className="w-4.5 h-4.5 text-[#4a4540] flex-shrink-0 mt-0.5" />}
                      <div className="markdown-body flex-1 min-w-0">
                        <ReactMarkdown components={renderers}>
                          {cleanContentForDisplay(msg.content)}
                        </ReactMarkdown>
                      </div>
                    </div>
                  )}

                  <div
                    className={`text-[11px] font-mono mt-1.5 uppercase ${
                      msg.role === "user" ? "text-[#e8f0ec]" : "text-[#4a4540]"
                    }`}
                  >
                    {new Date(msg.timestamp).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}
                  </div>
                </div>
              </div>
            );
          })}

          {/* Active Streaming Chunk Display */}
          {activeStreamingReply && (
            <div className="flex justify-start">
              <div className="max-w-[85%] rounded-[14px] px-4 py-3 shadow-sm border bg-[#f3ede2] border-[#e1d8c6] text-[#2c2724] font-serif text-sm leading-relaxed">
                <div className="markdown-body">
                  <ReactMarkdown components={renderers}>
                    {cleanContentForDisplay(activeStreamingReply)}
                  </ReactMarkdown>
                </div>
                <span className="inline-block w-1.5 h-3.5 bg-[#2d5a4a] animate-pulse ml-0.5 mt-1" />
              </div>
            </div>
          )}

          {/* Loading bubble status */}
          {loading && !activeStreamingReply && (
            <div className="flex justify-start">
              <div className="bg-[#f3ede2] border border-[#e1d8c6] rounded-[14px] px-4 py-3 flex items-center gap-1.5">
                <div className="w-1.5 h-1.5 rounded-full bg-[#8b857b] animate-bounce" style={{ animationDelay: "0ms" }}></div>
                <div className="w-1.5 h-1.5 rounded-full bg-[#8b857b] animate-bounce" style={{ animationDelay: "150ms" }}></div>
                <div className="w-1.5 h-1.5 rounded-full bg-[#8b857b] animate-bounce" style={{ animationDelay: "300ms" }}></div>
              </div>
            </div>
          )}

          {/* Render server-side executed tools log */}
          {executedTools.length > 0 && (
            <div className="p-3 bg-[#e8f0ec]/80 border border-[#d1e2da] rounded-xl text-xs space-y-1.5 max-w-[480px] my-1.5 animate-fadeIn">
              <p className="font-sans text-[11px] font-bold text-[#2d5a4a] uppercase tracking-wider mb-1 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-[#2d5a4a] animate-pulse" />
                Checked actual data sources:
              </p>
              {executedTools.map((tool, idx) => (
                <div key={idx} className="flex items-center gap-1.5 text-[#2d5a4a] text-xs font-serif leading-relaxed">
                  <span className="text-[#2d5a4a] font-bold">✓</span>
                  <span>
                    {tool.name === "searchCalendar" ? "Swept school schedule database" :
                     tool.name === "searchTasks" ? "Analyzed pending tasks and workloads" :
                     tool.name === "searchMemory" ? "Scanned remembered preferences and styles" :
                     tool.name === "summariseEmails" ? "Retrieved and synthesized unread Gmail messages" :
                     `Verified verification for: ${tool.name}`}
                  </span>
                </div>
              ))}
            </div>
          )}

          {/* Visual Pending Approval Card */}
          {pendingApproval && pendingApproval.batch && (
            <div className="p-4 rounded-xl border-2 border-dashed border-[#2d5a4a] bg-[#fdfaf5] shadow-[0_2px_12px_rgba(45,90,74,0.06)] max-w-[450px] my-3 animate-scaleUp">
              <div className="flex items-center gap-2 mb-2">
                <Sparkles className="w-4 h-4 text-[#2d5a4a]" />
                <span className="font-sans font-bold text-xs text-[#2d5a4a] uppercase tracking-wide">
                  Approval Required
                </span>
              </div>
              
              <div className="space-y-4 mb-4">
                {pendingApproval.batch.map((item: any, idx: number) => (
                  <div key={idx}>
                    <p className="text-sm font-serif text-[#1a1612] mb-2 font-semibold leading-snug">
                      {item.explanation || `The AI assistant is proposing a write action using the ${item.tool} tool.`}
                    </p>

                    <div className="p-2.5 bg-[#f3ede2] rounded-lg border border-[#e1d8c6] text-[11px] font-mono space-y-1 text-[#4a4540]">
                      <p className="font-bold uppercase text-[11px] tracking-wide text-[#4a4540] border-b border-[#e1d8c6] pb-1">
                        Tool: {item.tool}
                      </p>
                      {Object.entries(item.args || {}).map(([k, v]) => (
                        <div key={k} className="flex justify-between py-0.5">
                          <span className="text-[#4a4540] lowercase">{k}:</span>
                          <span className="font-bold text-[#2d5a4a] max-w-[200px] truncate text-right">{String(v)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={handleApproveAction}
                  disabled={loading}
                  className="flex-1 bg-[#2d5a4a] hover:bg-[#3d7560] text-white py-2 px-3 rounded-lg text-xs font-sans font-bold flex items-center justify-center gap-1.5 transition-all select-none cursor-pointer shadow-sm active:scale-95 duration-100"
                >
                  <Check className="w-3.5 h-3.5" /> Confirm and Save
                </button>
                <button
                  type="button"
                  onClick={handleCancelAction}
                  disabled={loading}
                  className="bg-white hover:bg-rose-50 border border-rose-200 text-rose-600 hover:text-rose-700 py-2 px-3.5 rounded-lg text-xs font-sans font-bold transition-all select-none cursor-pointer"
                >
                  Dismiss
                </button>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>
      )}

      {/* Input bar */}
      <div className="p-3 border-t border-[#ece6db] bg-[#fcf9f3]">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSendMessage(userInput);
          }}
          className="flex items-center gap-2"
        >
          <input
            type="text"
            value={userInput}
            onChange={(e) => setUserInput(e.target.value)}
            disabled={loading}
            placeholder={loading ? "Thinking..." : "Ask a question or request an action..."}
            className="flex-1 text-xs bg-[#f3ede2] border border-[#e1d8c6] rounded-md px-3.5 py-3 text-[#1a1612] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#2d5a4a]/40 focus:border-[#2d5a4a] disabled:opacity-50 transition-colors placeholder:italic placeholder:text-[#4a4540]/60"
          />
          <button
            type="submit"
            disabled={!userInput.trim() || loading}
            className="text-[#2d5a4a] hover:text-[#3a7560] disabled:opacity-45 p-1 rounded-full focus:outline-none focus-visible:ring-2 focus-visible:ring-[#2d5a4a]/40 transition-colors cursor-pointer"
          >
            <ArrowUpCircle className="w-8 h-8 stroke-[1.5]" />
          </button>
        </form>
      </div>

    </div>
  );
}
