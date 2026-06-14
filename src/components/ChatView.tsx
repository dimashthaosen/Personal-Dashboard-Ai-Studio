import React, { useState, useEffect, useRef } from "react";
import { ChatMessage } from "../types";
import { Send, Sparkles, Trash2, ArrowUpCircle } from "lucide-react";
import { useFirestoreTasks, useFirestoreEvents, useFirestoreMemory, useFirestoreChat } from "../lib/hooks";
import { collection, addDoc, doc, updateDoc, deleteDoc } from "firebase/firestore";
import { db } from "../lib/firebase";

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
      // In a real app we'd delete them individually or batched from firestore. 
      // For this prototype, we'll just ignore for now or you can implement delete.
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
      // Fallback
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
    <div className="animate-fade-up max-w-4xl mx-auto h-[78vh] flex flex-col bg-paper-1 border border-paper-2 rounded-lg shadow-sm relative overflow-hidden">
      
      {/* Header bar */}
      <div className="p-4 border-b border-paper-2 bg-paper-1 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-chalk-600" />
          <div>
            <h3 className="font-serif font-semibold text-sm text-ink-950">Active Assistant Terminal</h3>
            <p className="font-mono text-[9px] text-ink-300 uppercase">Context Synchronous (Grounded)</p>
          </div>
        </div>
        
        {messages.length > 0 && (
          <button
            onClick={handleClearHistory}
            className="text-ink-500 hover:text-redpen hover:bg-paper-2 p-2 rounded transition-all focus:outline-none"
            title="Wipe conversation log"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Suggested chips if log is empty */}
      {messages.length === 0 && !activeStreamingReply && (
        <div className="flex-1 overflow-y-auto p-6 flex flex-col justify-center items-center text-center space-y-6">
          <div className="w-12 h-12 bg-chalk-100 rounded-full flex items-center justify-center text-chalk-600">
            <Sparkles className="w-6 h-6" />
          </div>
          <div>
            <h4 className="font-serif font-semibold text-base text-ink-950">Inquire Session Context</h4>
            <p className="font-serif italic text-xs text-ink-500 max-w-sm mt-1">
              Connect school curriculum notes, unread teacher emails, and pending task lists directly in standard British English.
            </p>
          </div>

          <div className="w-full max-w-lg grid grid-cols-1 md:grid-cols-2 gap-2 text-left">
            {suggestionChips.map((chip, idx) => (
              <button
                key={idx}
                onClick={() => handleSendMessage(chip)}
                className="p-3 bg-paper-0 border border-paper-2 hover:border-chalk-600 rounded text-xs text-ink-700 font-sans font-medium text-left leading-normal hover:bg-paper-1 hover:text-chalk-600 transition-all focus:outline-none"
              >
                {chip}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Chat scroll box */}
      {(messages.length > 0 || activeStreamingReply) && (
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex ${msg.role === "user" ? "justify-end" : "justify-start animate-fadeIn"}`}
            >
              <div
                className={`max-w-[85%] rounded-lg px-4 py-3 shadow-none border ${
                  msg.role === "user"
                    ? "bg-chalk-600 border-chalk-500 text-white font-sans text-sm"
                    : "bg-paper-2 border-paper-3 text-ink-900 font-sans text-sm leading-relaxed"
                }`}
              >
                {/* Format paragraphs or points */}
                <p className="whitespace-pre-wrap leading-relaxed">{msg.content}</p>
                <div
                  className={`text-[9px] font-mono mt-1 ${
                    msg.role === "user" ? "text-chalk-100" : "text-ink-500"
                  }`}
                >
                  {new Date(msg.timestamp).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}
                </div>
              </div>
            </div>
          ))}

          {/* Active Streaming Chunk Display */}
          {activeStreamingReply && (
            <div className="flex justify-start">
              <div className="max-w-[85%] rounded-lg px-4 py-3 shadow-none border bg-paper-2 border-paper-3 text-ink-900 font-sans text-sm leading-relaxed">
                <p className="whitespace-pre-wrap leading-relaxed">{activeStreamingReply}</p>
                <span className="inline-block w-1.5 h-3 bg-chalk-600 animate-pulse ml-0.5" />
              </div>
            </div>
          )}

          {/* Loading bubble status */}
          {loading && !activeStreamingReply && (
            <div className="flex justify-start">
              <div className="bg-paper-2 border border-paper-3 rounded-lg px-4 py-3 flex items-center gap-1.5">
                <div className="w-1.5 h-1.5 rounded-full bg-ink-300 animate-bounce" style={{ animationDelay: "0ms" }}></div>
                <div className="w-1.5 h-1.5 rounded-full bg-ink-300 animate-bounce" style={{ animationDelay: "1500ms" }}></div>
                <div className="w-1.5 h-1.5 rounded-full bg-ink-300 animate-bounce" style={{ animationDelay: "3000ms" }}></div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>
      )}

      {/* Suggestion row above input if there are active chats */}
      {(messages.length > 0 || activeStreamingReply) && (
        <div className="px-4 py-2 bg-paper-1/50 border-t border-paper-2 flex gap-2 overflow-x-auto whitespace-nowrap scrollbar-thin">
          {suggestionChips.slice(0, 2).map((chip, idx) => (
            <button
              key={idx}
              onClick={() => handleSendMessage(chip)}
              className="text-[10px] font-mono border border-paper-3 rounded bg-paper-0 px-2.5 py-1 text-ink-500 hover:text-chalk-600 hover:border-chalk-600 transition-all focus:outline-none"
            >
              {chip}
            </button>
          ))}
        </div>
      )}

      {/* Input bar */}
      <div className="p-3 border-t border-paper-2 bg-paper-1">
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
            className="flex-1 text-sm bg-paper-0 border border-paper-2 rounded-md px-3.5 py-2.5 text-ink-950 focus:outline-none focus:border-chalk-600 disabled:opacity-50 transition-colors placeholder:italic"
          />
          <button
            type="submit"
            disabled={!userInput.trim() || loading}
            className="text-chalk-600 hover:text-chalk-500 disabled:opacity-45 p-2 rounded focus:outline-none transition-colors"
          >
            <ArrowUpCircle className="w-7 h-7 stroke-[1.5]" />
          </button>
        </form>
      </div>

    </div>
  );
}
