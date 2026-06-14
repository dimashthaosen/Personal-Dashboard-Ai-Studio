import React, { useState, useEffect } from "react";
import { Email, TeacherUser } from "../types";
import { Mail, Sparkles, Send, Copy, Check, ChevronRight, Settings } from "lucide-react";

export default function EmailView({ googleToken, currentUser, onSwitchAccount }: { googleToken?: string | null, currentUser?: TeacherUser | null, onSwitchAccount?: () => void }) {
  const [emails, setEmails] = useState<Email[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedEmail, setSelectedEmail] = useState<Email | null>(null);

  // AI tools states
  const [summarising, setSummarising] = useState(false);
  const [summaryOutput, setSummaryOutput] = useState("");
  const [draftingReply, setDraftingReply] = useState(false);
  const [replyDraft, setReplyDraft] = useState("");
  const [copiedDraft, setCopiedDraft] = useState(false);

  useEffect(() => {
    fetchEmails();
  }, [googleToken]);

  const fetchEmails = async () => {
    try {
      setLoading(true);
      const headers: Record<string, string> = {};
      if (googleToken) {
        headers["Authorization"] = `Bearer ${googleToken}`;
      }
      const res = await fetch("/api/emails", { headers });
      if (!res.ok) throw new Error("API failed");
      const text = await res.text();
      let data = [];
      try {
        data = JSON.parse(text);
      } catch(e) {
        throw new Error("Invalid response");
      }
      setEmails(data);
      if (data.length > 0) {
        setSelectedEmail(data[0]);
      } else {
        setSelectedEmail(null);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSummariseEmail = async (id: string) => {
    setSummarising(true);
    setSummaryOutput("");
    try {
      const res = await fetch(`/api/emails/${id}/summarise`, { method: "POST" });
      if (!res.ok) throw new Error("API failed");
      const text = await res.text();
      const data = JSON.parse(text);
      setSummaryOutput(data.summary);
    } catch (err) {
      console.error(err);
      setSummaryOutput("Failed to compile summary. Check connection.");
    } finally {
      setSummarising(false);
    }
  };

  const handleDraftReply = async (id: string) => {
    setDraftingReply(true);
    setReplyDraft("");
    try {
      const res = await fetch(`/api/emails/${id}/reply`, { method: "POST" });
      if (!res.ok) throw new Error("API failed");
      const text = await res.text();
      const data = JSON.parse(text);
      setReplyDraft(data.reply);
    } catch (err) {
      console.error(err);
      setReplyDraft("Failed to draft automatic responder.");
    } finally {
      setDraftingReply(false);
    }
  };

  const handleCopyDraft = () => {
    navigator.clipboard.writeText(replyDraft);
    setCopiedDraft(true);
    setTimeout(() => setCopiedDraft(false), 2000);
  };

  return (
    <div className="animate-fade-up max-w-6xl mx-auto space-y-6">
      
      {/* Header */}
      <div className="border-b border-paper-3 pb-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <p className="font-mono text-xs tracking-wider text-ink-500 uppercase font-medium">Communication Channels</p>
          <h2 className="font-serif text-2xl font-semibold text-ink-950 mt-1">Syllabus Mail inbox</h2>
        </div>
        <div className="flex items-center gap-3">
          {googleToken ? (
            <div className="flex items-center gap-3 border border-emerald-200 bg-emerald-50 rounded pl-3 pr-1 py-1 shadow-sm">
              <div className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-xs font-mono font-medium text-emerald-800">
                  Synced: {currentUser?.email || "Gmail Account"}
                </span>
              </div>
              <button 
                onClick={onSwitchAccount}
                className="text-[10px] font-mono text-emerald-700 bg-emerald-100 hover:bg-emerald-200 px-2 py-1 rounded transition-colors flex items-center gap-1 focus:outline-none"
              >
                <Settings className="w-3 h-3" />
                Change
              </button>
            </div>
          ) : (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-mono font-medium bg-amber-50 text-amber-700 border border-amber-200">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
              Demo / Fallback Inbox
            </span>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* Left column: List of Emails */}
        <div className="lg:col-span-5 bg-paper-1 border border-paper-2 rounded-lg overflow-hidden shadow-sm divide-y divide-paper-2">
          {loading ? (
            <div className="p-6 space-y-4">
              <div className="h-10 shimmer-skeleton rounded"></div>
              <div className="h-10 shimmer-skeleton rounded"></div>
              <div className="h-10 shimmer-skeleton rounded"></div>
            </div>
          ) : emails.length === 0 ? (
            <div className="p-8 text-center text-ink-500 font-serif text-sm">
              Your synced inbox is completely parsed.
            </div>
          ) : (
            emails.map((email) => {
              const formattedDate = new Date(email.date).toLocaleDateString("en-GB", {
                day: "numeric",
                month: "short",
              });
              const isSelected = selectedEmail?.id === email.id;
              return (
                <button
                  key={email.id}
                  onClick={() => {
                    setSelectedEmail(email);
                    setSummaryOutput("");
                    setReplyDraft("");
                  }}
                  className={`w-full text-left p-4 flex gap-3 focus:outline-none transition-colors relative ${
                    isSelected ? "bg-paper-2" : "hover:bg-paper-0"
                  }`}
                >
                  {email.needsReply && !email.summary && (
                    <span className="absolute top-4 right-4 w-1.5 h-1.5 rounded-full bg-redpen animate-pulse" />
                  )}

                  <Mail className={`w-4 h-4 mt-0.5 flex-shrink-0 ${email.needsReply ? "text-redpen" : "text-chalk-600"}`} />
                  
                  <div className="flex-1 min-w-0 space-y-1">
                    <div className="flex justify-between items-baseline gap-2">
                      <span className="font-mono text-[10px] text-ink-500 font-semibold tracking-wide uppercase truncate">
                        {email.fromName}
                      </span>
                      <span className="font-mono text-[9px] text-ink-300 flex-shrink-0">{formattedDate}</span>
                    </div>
                    <h4 className={`font-serif text-xs font-semibold text-ink-950 truncate ${email.needsReply && "text-redpen"}`}>
                      {email.subject}
                    </h4>
                    <p className="text-xs text-ink-500 truncate leading-snug">{email.snippet}</p>
                  </div>
                  <ChevronRight className="w-4 h-4 text-ink-300 self-center hidden sm:block" />
                </button>
              );
            })
          )}
        </div>

        {/* Right column: Preview & AI Summaries panel */}
        <div className="lg:col-span-7 bg-paper-1 border border-paper-2 rounded-lg p-5 shadow-sm space-y-5">
          {selectedEmail ? (
            <div className="space-y-4">
              
              {/* Mail Info */}
              <div className="border-b border-paper-2 pb-3">
                <div className="flex justify-between items-start gap-4">
                  <h3 className="font-serif font-bold text-lg text-ink-950 leading-tight">
                    {selectedEmail.subject}
                  </h3>
                  {selectedEmail.needsReply && (
                    <span className="font-mono text-[9px] font-bold text-redpen border border-redpen bg-red-50 uppercase tracking-widest px-2.5 py-0.5 rounded flex-shrink-0 mt-1">
                      Action Required
                    </span>
                  )}
                </div>
                <div className="flex justify-between items-center text-xs text-ink-500 font-mono mt-2">
                  <span>From: {selectedEmail.from}</span>
                  <span>{new Date(selectedEmail.date).toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "long" })}</span>
                </div>
              </div>

              {/* Mail Body snippet */}
              <div className="bg-paper-0 p-4 rounded-md border border-paper-2 text-sm text-ink-900 leading-relaxed font-sans min-h-24">
                {selectedEmail.snippet}
              </div>

              {/* AI Actions Row */}
              <div className="flex flex-wrap gap-2.5 pt-1">
                <button
                  onClick={() => handleSummariseEmail(selectedEmail.id)}
                  disabled={summarising}
                  className="font-mono text-xs text-chalk-600 bg-chalk-100 hover:bg-chalk-600 hover:text-white px-3 py-1.5 rounded transition-all focus:outline-none flex items-center gap-1.5 disabled:opacity-50"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  {summarising ? "Summarising..." : "AI Analyse Message"}
                </button>

                <button
                  onClick={() => handleDraftReply(selectedEmail.id)}
                  disabled={draftingReply}
                  className="font-mono text-xs text-inkblue bg-blue-50 border border-blue-100 hover:bg-inkblue hover:text-white px-3 py-1.5 rounded transition-all focus:outline-none flex items-center gap-1.5 disabled:opacity-50"
                >
                  <Send className="w-3.5 h-3.5" />
                  {draftingReply ? "Formulating Draft..." : "AI Compose Reply"}
                </button>
              </div>

              {/* AI Summary result */}
              {summaryOutput && (
                <div className="bg-paper-2 p-4 rounded-md border border-paper-3 space-y-2 animate-fade-up">
                  <h4 className="font-mono text-[10px] text-chalk-600 font-bold uppercase tracking-wider flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5" />
                    Interactive Bullet Analysis
                  </h4>
                  <div className="text-xs text-ink-700 leading-relaxed font-sans whitespace-pre-wrap">
                    {summaryOutput}
                  </div>
                </div>
              )}

              {/* AI Reply result */}
              {replyDraft && (
                <div className="bg-paper-2 p-4 rounded-md border border-paper-3 space-y-2.5 animate-fade-up">
                  <div className="flex justify-between items-center border-b border-paper-3 pb-1.5">
                    <h4 className="font-mono text-[10px] text-inkblue font-bold uppercase tracking-wider flex items-center gap-1.5">
                      <Send className="w-3.5 h-3.5" />
                      Suggested Reply Draft
                    </h4>
                    <button
                      onClick={handleCopyDraft}
                      className="font-mono text-[10px] text-ink-500 hover:text-inkblue flex items-center gap-1 focus:outline-none"
                    >
                      {copiedDraft ? (
                        <>
                          <Check className="w-3 h-3 text-chalk-600" />
                          Copied!
                        </>
                      ) : (
                        <>
                          <Copy className="w-3 h-3" />
                          Copy Draft
                        </>
                      )}
                    </button>
                  </div>
                  <pre className="text-xs text-ink-900 leading-relaxed font-sans whitespace-pre-wrap bg-paper-0 p-3 rounded border border-paper-3 max-h-60 overflow-y-auto">
                    {replyDraft}
                  </pre>
                  <p className="font-serif italic text-[10px] text-ink-500">
                    Approved standard guidelines apply. This response uses your biography style preference.
                  </p>
                </div>
              )}

            </div>
          ) : (
            <div className="p-12 text-center text-ink-300 font-serif italic text-sm">
              Please select a message to begin syllabus parsing.
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
