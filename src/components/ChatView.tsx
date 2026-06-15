import React, { useState, useEffect, useRef } from "react";
import { ChatMessage } from "../types";
import { Send, Sparkles, Trash2, ArrowUpCircle, Check } from "lucide-react";
import { useFirestoreTasks, useFirestoreEvents, useFirestoreMemory, useFirestoreChat } from "../lib/hooks";
import { collection, addDoc } from "firebase/firestore";
import { db } from "../lib/firebase";

function cleanContentForDisplay(content: string) {
  if (!content) return "";
  return content
    .replace(/\[CREATE_TASK:\s*([^\]]+)\]/g, "")
    .replace(/\[CREATE_EVENT:\s*([^\]]+)\]/g, "")
    .replace(/\[CREATE_MEMORY:\s*([^\]]+)\]/g, "")
    .trim();
}

export default function ChatView({ userId }: { userId?: string }) {
  const { messages: firestoreMessages } = useFirestoreChat(userId);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [userInput, setUserInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [activeStreamingReply, setActiveStreamingReply] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

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

  const handleClearHistory = async () => {
    if (!userId) return;
    try {
      setMessages([]);
      setActiveStreamingReply("");
    } catch (err) {
      console.error(err);
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const handleSendMessage = async (textToSend: string) => {
    if (!textToSend.trim() || loading || !userId) return;

    const userMessageText = textToSend;
    setUserInput("");
    setLoading(true);
    setActiveStreamingReply("");

    try {
      // First, add the user message to Firestore
      await addDoc(collection(db, `users/${userId}/chatMessages`), {
        role: "user",
        content: userMessageText,
        timestamp: new Date().toISOString(),
        userId
      });

      // Optimistically update chat view with User bubble
      const userMsg: ChatMessage = {
        id: "opt-msg-" + Date.now(),
        role: "user",
        content: userMessageText,
        timestamp: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, userMsg]);

      // Provide context
      const contextData = {
        tasks: tasks.filter((t) => t.status !== "done").map((t) => `- [${t.priority.toUpperCase()}] ${t.title} (${t.category}, due: ${t.deadline || "none"})`).join("\n"),
        calendar: events.map((e) => `- ${e.title} at ${e.start} - ${e.end}`).join("\n"),
        memory: memoryItems.map((m) => `- ${m.key}: ${m.value}`).join("\n"),
      };

      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: userMessageText, contextData }),
      });

      if (!response.ok) {
        throw new Error("API Connection failed.");
      }

      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error("No readable stream support.");
      }

      const decoder = new TextDecoder("utf-8");
      let completedOutput = "";

      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        completedOutput += chunk;
        setActiveStreamingReply(completedOutput);
      }

      // Parse and execute potential database trigger tokens
      const taskRegex = /\[CREATE_TASK:\s*([^\]]+)\]/g;
      const eventRegex = /\[CREATE_EVENT:\s*([^\]]+)\]/g;
      const memoryRegex = /\[CREATE_MEMORY:\s*([^\]]+)\]/g;

      let match;
      while ((match = taskRegex.exec(completedOutput)) !== null) {
        const parts = match[1].split("|").map(p => p.trim());
        const title = parts[0] || "New Activity";
        const description = parts[1] || "";
        const category = parts[2] || "school";
        const priority = parts[3] || "medium";
        const deadline = parts[4] || "";

        try {
          await addDoc(collection(db, `users/${userId}/tasks`), {
            title,
            description,
            category,
            priority,
            deadline,
            status: "pending",
            source: "assistant",
            createdAt: new Date().toISOString(),
            userId
          });
        } catch (e) {
          console.error("Firestore automatic Task creation failed:", e);
        }
      }

      while ((match = eventRegex.exec(completedOutput)) !== null) {
        const parts = match[1].split("|").map(p => p.trim());
        const title = parts[0] || "New Event";
        const description = parts[1] || "";
        const location = parts[2] || "Vasant Valley School";
        const start = parts[3] || new Date().toISOString();
        const end = parts[4] || new Date(Date.now() + 3600000).toISOString();

        try {
          await addDoc(collection(db, `users/${userId}/calendarEvents`), {
            title,
            description,
            location,
            start,
            end,
            createdAt: new Date().toISOString(),
            userId
          });
        } catch (e) {
          console.error("Firestore automatic Event creation failed:", e);
        }
      }

      while ((match = memoryRegex.exec(completedOutput)) !== null) {
        const parts = match[1].split("|").map(p => p.trim());
        const key = parts[0] || "Reminder";
        const value = parts[1] || "";
        const category = parts[2] || "general";

        try {
          await addDoc(collection(db, `users/${userId}/memoryItems`), {
            key,
            value,
            category,
            createdAt: new Date().toISOString(),
            userId
          });
        } catch (e) {
          console.error("Firestore automatic Memory Item creation failed:", e);
        }
      }

      // Add assistant message to Firestore
      await addDoc(collection(db, `users/${userId}/chatMessages`), {
        role: "assistant",
        content: completedOutput,
        timestamp: new Date().toISOString(),
        userId
      });

      setActiveStreamingReply("");
    } catch (err: any) {
      console.error("Stream reader error:", err);
      setMessages((prev) => [
        ...prev,
        {
          id: "err-msg-" + Date.now(),
          role: "assistant",
          content: "Sorry, I had an issue connecting to the personal assistant server. Please check your config.",
          timestamp: new Date().toISOString(),
        },
      ]);
      setActiveStreamingReply("");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="animate-fade-up max-w-[1050px] mx-auto h-[78vh] flex flex-col bg-[#fcf9f3] border border-[#e1d8c6] rounded-[20px] shadow-[0_4px_24px_-10px_rgba(26,22,18,0.1)] relative overflow-hidden">
      
      {/* Header bar */}
      <div className="p-4 border-b border-[#ece6db] bg-[#fcf9f3] flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <Sparkles className="w-5 h-5 text-[#2d5a4a]" />
          <div>
            <h3 className="font-serif font-bold text-sm text-[#1a1612]">Active Assistant Terminal</h3>
            <p className="font-mono text-[8px] text-[#2d5a4a] uppercase tracking-wider font-bold">Context Synchronous (Grounded)</p>
          </div>
        </div>
        
        {messages.length > 0 && (
          <button
            type="button"
            onClick={handleClearHistory}
            className="text-[#8b857b] hover:text-[#b83232] hover:bg-[#f5f1e8] p-2 rounded-lg transition-all focus:outline-none cursor-pointer"
            title="Wipe conversation log"
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
            <h4 className="font-serif font-semibold text-base text-[#1a1612]">Inquire Session Context</h4>
            <p className="font-serif italic text-xs text-[#8b857b] max-w-sm mt-1 leading-relaxed">
              Connect school curriculum notes, unread teacher emails, and pending task lists directly in standard British English.
            </p>
          </div>

          <div className="w-full max-w-lg grid grid-cols-1 md:grid-cols-2 gap-2 text-left">
            {suggestionChips.map((chip, idx) => (
              <button
                type="button"
                key={idx}
                onClick={() => handleSendMessage(chip)}
                className="p-3.5 bg-[#fcf9f3] border border-[#e1d8c6] hover:border-[#2d5a4a] rounded-lg text-xs text-[#4a4540] font-serif italic text-left leading-normal hover:bg-[#f3ede2] hover:text-[#2d5a4a] transition-all focus:outline-none cursor-pointer"
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
            const hasTaskAction = msg.role === "assistant" && msg.content.includes("[CREATE_TASK:");
            const hasEventAction = msg.role === "assistant" && msg.content.includes("[CREATE_EVENT:");
            const hasMemoryAction = msg.role === "assistant" && msg.content.includes("[CREATE_MEMORY:");

            return (
              <div
                key={msg.id}
                className={`flex ${msg.role === "user" ? "justify-end" : "justify-start animate-fadeIn"}`}
              >
                <div
                  className={`max-w-[85%] rounded-[14px] px-4 py-3 shadow-[0_1px_2px_rgba(26,22,18,0.02)] border ${
                    msg.role === "user"
                      ? "bg-[#2d5a4a] border-[#2d5a4a] text-[#fcf9f3] font-sans text-xs"
                      : "bg-[#f3ede2] border-[#e1d8c6] text-[#2c2724] font-serif text-sm leading-relaxed"
                  }`}
                >
                  <p className="whitespace-pre-wrap leading-relaxed">
                    {msg.role === "user" ? msg.content : cleanContentForDisplay(msg.content)}
                  </p>

                  {(hasTaskAction || hasEventAction || hasMemoryAction) && (
                    <div className="mt-2.5 pt-2 border-t border-[#e2dacb] flex flex-wrap gap-1.5 animate-fadeIn">
                      {hasTaskAction && (
                        <span className="flex items-center gap-1 font-mono text-[9px] font-bold text-[#2d5a4a] bg-[#e8f0ec] border border-[#d1e2da] px-1.5 py-0.5 rounded uppercase tracking-wide">
                          <Check className="w-2.5 h-2.5 stroke-[2.5]" /> Registered on Blackboard (Task)
                        </span>
                      )}
                      {hasEventAction && (
                        <span className="flex items-center gap-1 font-mono text-[9px] font-bold text-sky-800 bg-sky-50 border border-sky-100 px-1.5 py-0.5 rounded uppercase tracking-wide">
                          <Check className="w-2.5 h-2.5 stroke-[2.5]" /> Booked on Calendar (Event)
                        </span>
                      )}
                      {hasMemoryAction && (
                        <span className="flex items-center gap-1 font-mono text-[9px] font-bold text-purple-800 bg-purple-50 border border-purple-100 px-1.5 py-0.5 rounded uppercase tracking-wide">
                          <Check className="w-2.5 h-2.5 stroke-[2.5]" /> Saved to Assistant Memory
                        </span>
                      )}
                    </div>
                  )}

                  <div
                    className={`text-[8px] font-mono mt-1.5 uppercase ${
                      msg.role === "user" ? "text-[#e8f0ec]" : "text-[#8b857b]"
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
                <p className="whitespace-pre-wrap leading-relaxed">{cleanContentForDisplay(activeStreamingReply)}</p>
                <span className="inline-block w-1.5 h-3.5 bg-[#2d5a4a] animate-pulse ml-0.5" />
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
            placeholder={loading ? "AI Assistant thinking..." : "Inquire syllabus worksheet logs..."}
            className="flex-1 text-xs bg-[#f3ede2] border border-[#e1d8c6] rounded-md px-3.5 py-3 text-[#1a1612] focus:outline-none focus:border-[#2d5a4a] disabled:opacity-50 transition-colors placeholder:italic placeholder:text-[#8b857b]/60"
          />
          <button
            type="submit"
            disabled={!userInput.trim() || loading}
            className="text-[#2d5a4a] hover:text-[#3a7560] disabled:opacity-45 p-1 rounded-full focus:outline-none transition-colors cursor-pointer"
          >
            <ArrowUpCircle className="w-8 h-8 stroke-[1.5]" />
          </button>
        </form>
      </div>

    </div>
  );
}
