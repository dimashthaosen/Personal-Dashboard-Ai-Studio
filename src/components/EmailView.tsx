import React, { useState, useEffect } from "react";
import { Email, TeacherUser } from "../types";
import { Mail, Sparkles, Send, Copy, Check, ChevronRight, Settings, Search } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

export default function EmailView({ googleToken, currentUser, onSwitchAccount }: { googleToken?: string | null, currentUser?: TeacherUser | null, onSwitchAccount?: () => void }) {
  const [emails, setEmails] = useState<Email[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedEmail, setSelectedEmail] = useState<Email | null>(null);
  const [activeTab, setActiveTab] = useState<"inbox" | "sent">("inbox");
  const [searchQuery, setSearchQuery] = useState("");

  // AI tools states
  const [summarising, setSummarising] = useState(false);
  const [summaryOutput, setSummaryOutput] = useState("");
  const [draftingReply, setDraftingReply] = useState(false);
  const [replyDraft, setReplyDraft] = useState("");
  const [copiedDraft, setCopiedDraft] = useState(false);

  useEffect(() => {
    setSearchQuery("");
    fetchEmails();
  }, [googleToken, activeTab]);

  // Filtered emails based on search query
  const filteredEmails = emails.filter((email) => {
    const query = searchQuery.toLowerCase().trim();
    if (!query) return true;
    return (
      email.subject?.toLowerCase().includes(query) ||
      email.fromName?.toLowerCase().includes(query) ||
      email.fromEmail?.toLowerCase().includes(query) ||
      email.snippet?.toLowerCase().includes(query)
    );
  });

  useEffect(() => {
    if (filteredEmails.length > 0) {
      if (!selectedEmail || !filteredEmails.find(e => e.id === selectedEmail.id)) {
        setSelectedEmail(filteredEmails[0]);
      }
    } else {
      setSelectedEmail(null);
    }
  }, [searchQuery, emails]);

  const fetchEmails = async () => {
    try {
      setLoading(true);
      const headers: Record<string, string> = {};
      if (googleToken) {
        headers["Authorization"] = `Bearer ${googleToken}`;
      }
      const res = await fetch(`/api/emails?type=${activeTab}`, { headers });
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
    <div className="animate-fade-up max-w-[1050px] mx-auto space-y-6">
      
      {/* Header bar */}
      <div className="border-b border-paper-3 pb-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-4">
            <h2 className="font-serif text-2xl font-normal text-[#1a1612]">Syllabus Mail</h2>
            <div className="flex bg-[#ece6db]/50 p-1 rounded-lg">
              <button
                onClick={() => setActiveTab("inbox")}
                className={`px-3 py-1 font-mono text-[10px] font-bold uppercase tracking-wider rounded-md transition-colors ${activeTab === 'inbox' ? 'bg-white text-[#2d5a4a] shadow-sm' : 'text-[#8b857b] hover:text-[#4a4540]'}`}
              >
                Inbox
              </button>
              <button
                onClick={() => setActiveTab("sent")}
                className={`px-3 py-1 font-mono text-[10px] font-bold uppercase tracking-wider rounded-md transition-colors ${activeTab === 'sent' ? 'bg-white text-[#2d5a4a] shadow-sm' : 'text-[#8b857b] hover:text-[#4a4540]'}`}
              >
                Sent
              </button>
            </div>
          </div>
          <p className="font-serif italic text-xs text-ink-405 mt-1 pl-0.5">
            Synchronised school messages, student briefs, and pointwise AI-drafted replies.
          </p>
        </div>
        <div className="flex items-center gap-3">
          {googleToken ? (
            <div className="flex items-center gap-2.5 border border-[#d2e3da] bg-[#e8f0ec] rounded-lg pl-3 pr-1.5 py-1.5 shadow-[0_1px_2px_rgba(26,22,18,0.02)]">
              <div className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-[#2d5a4a] animate-pulse" />
                <span className="text-[10px] font-mono font-bold text-[#2d5a4a] uppercase tracking-wider">
                  SYNCED: {currentUser?.email || "Gmail"}
                </span>
              </div>
              <button 
                type="button"
                onClick={onSwitchAccount}
                className="text-[9px] font-mono tracking-wider font-bold text-[#2d5a4a] bg-[#fcf9f3]/80 hover:bg-[#ece6db]/50 border border-[#d2e3da] px-2.5 py-1 rounded-md transition-colors flex items-center gap-1 focus:outline-none uppercase"
              >
                <Settings className="w-3.5 h-3.5" />
                CHANGE
              </button>
            </div>
          ) : (
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[9px] font-mono font-bold tracking-wider uppercase bg-[#ece6db] text-[#4a4540] border border-[#e1d8c6]">
              <span className="w-1.5 h-1.5 rounded-full bg-[#8b857b]" />
              DEMO / FALLBACK INBOX
            </span>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* Left column: List of Emails */}
        <div className="lg:col-span-5 bg-[#fcf9f3] border border-[#e1d8c6] rounded-[18px] overflow-hidden shadow-[0_4px_16px_-6px_rgba(26,22,18,0.08)] divide-y divide-[#ece6db]">
          
          {/* Email Search Bar */}
          <div className="p-3.5 bg-[#fcf9f3]">
            <div className="relative">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[#8b857b]/70" />
              <input
                type="text"
                placeholder="Search sender or keyword..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-white border border-[#e1d8c6] rounded-xl text-xs font-serif text-[#1a1612] placeholder-[#8b857b]/50 focus:outline-none focus:ring-1 focus:ring-[#2d5a4a] focus:border-[#2d5a4a] transition-all shadow-[inset_0_1px_2px_rgba(0,0,0,0.02)]"
              />
            </div>
          </div>

          {loading ? (
            <div className="p-6 space-y-4">
              <div className="h-10 shimmer-skeleton rounded"></div>
              <div className="h-10 shimmer-skeleton rounded"></div>
              <div className="h-10 shimmer-skeleton rounded"></div>
            </div>
          ) : emails.length === 0 ? (
            <div className="p-10 text-center text-[#8b857b] font-serif italic text-sm">
              Your synced inbox is completely parsed.
            </div>
          ) : filteredEmails.length === 0 ? (
            <div className="p-10 text-center text-[#8b857b]/80 font-serif italic text-sm space-y-1">
              <div>No matches found.</div>
              <div className="text-[10px] font-mono non-italic text-[#8b857b]/60 uppercase tracking-wider">Try a different keyword</div>
            </div>
          ) : (
            filteredEmails.map((email) => {
              const formattedDate = new Date(email.date).toLocaleDateString("en-GB", {
                day: "numeric",
                month: "short",
              });
              const isSelected = selectedEmail?.id === email.id;
              return (
                <button
                  type="button"
                  key={email.id}
                  onClick={() => {
                    setSelectedEmail(email);
                    setSummaryOutput("");
                    setReplyDraft("");
                  }}
                  className={`w-full text-left p-4.5 flex gap-3.5 focus:outline-none transition-colors relative ${
                    isSelected ? "bg-[#f5f1e8]" : "hover:bg-[#ece6db]/30"
                  }`}
                >
                  {email.needsReply && (
                    <span className="absolute top-4.5 right-4.5 w-1.5 h-1.5 rounded-full bg-[#baa794]" />
                  )}

                  <Mail className={`w-4 h-4 mt-0.5 flex-shrink-0 ${email.needsReply ? "text-[#baa794]" : "text-[#2d5a4a]"}`} />
                  
                  <div className="flex-1 min-w-0 space-y-1">
                    <div className="flex justify-between items-baseline gap-2">
                      <span className="font-mono text-[9px] text-[#7a756f] font-bold tracking-wide uppercase truncate">
                        {email.fromName}
                      </span>
                      <span className="font-mono text-[8px] text-[#8b857b] uppercase flex-shrink-0">{formattedDate}</span>
                    </div>
                    <h4 className={`font-serif text-xs font-bold text-[#1a1612] truncate ${email.needsReply ? "text-[#8a3324] font-bold" : ""}`}>
                      {email.subject}
                    </h4>
                    <p className="text-xs text-[#8b857b] truncate leading-normal italic font-serif">{email.snippet}</p>
                  </div>
                  <ChevronRight className="w-4 h-4 text-[#8b857b]/50 self-center hidden sm:block" />
                </button>
              );
            })
          )}
        </div>

        {/* Right column: Preview & AI Summaries panel */}
        <div className="lg:col-span-7 bg-[#fcf9f3] border border-[#e1d8c6] rounded-[18px] p-6 shadow-[0_4px_16px_-6px_rgba(26,22,18,0.08)] space-y-5">
          {selectedEmail ? (
            <div className="space-y-5">
              
              {/* Mail Info */}
              <div className="border-b border-[#ece6db] pb-3">
                <div className="flex justify-between items-start gap-4">
                  <h3 className="font-serif font-semibold text-lg text-[#1a1612] leading-tight pr-4">
                    {selectedEmail.subject}
                  </h3>
                  {selectedEmail.needsReply && (
                    <span className="font-mono text-[9px] font-bold text-[#8a3324] border border-[#f3d3cb] bg-[#faebe8] uppercase tracking-wider px-2.5 py-1 rounded-md flex-shrink-0 mt-0.5">
                      ACTION REQUIRED
                    </span>
                  )}
                </div>
                <div className="flex justify-between items-center text-[10px] text-[#8b857b] font-mono mt-3 uppercase tracking-wider">
                  <span>{activeTab === 'sent' ? 'TO' : 'FROM'}: {selectedEmail.from}</span>
                  <span>{new Date(selectedEmail.date).toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "long" })}</span>
                </div>
              </div>

              {/* Mail Body */}
              <div className="bg-[#f3ede2] p-5 rounded-[12px] border border-[#e1d8c6] text-xs text-[#4a4540] leading-relaxed font-sans whitespace-pre-wrap max-h-96 overflow-y-auto shadow-[inset_0_1px_2px_rgba(0,0,0,0.03)] selection:bg-[#2d5a4a]/10">
                {selectedEmail.body || selectedEmail.snippet}
              </div>

              {/* AI Actions Row */}
              <div className="flex flex-wrap gap-2.5 pt-1">
                <button
                  type="button"
                  onClick={() => handleSummariseEmail(selectedEmail.id)}
                  disabled={summarising}
                  className="font-mono text-[10px] font-bold uppercase tracking-wider text-[#2d5a4a] bg-[#e8f0ec] hover:bg-[#d2e3da] border border-[#d2e3da] px-3.5 py-2 rounded-md transition-all cursor-pointer focus:outline-none flex items-center gap-1.5 disabled:opacity-50"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  {summarising ? "Summarising..." : "AI Analyse Message"}
                </button>

                <button
                  type="button"
                  onClick={() => handleDraftReply(selectedEmail.id)}
                  disabled={draftingReply}
                  className="font-mono text-[10px] font-bold uppercase tracking-wider text-[#1d2d5a] bg-[#e0eaf5] hover:bg-[#c7daf0] border border-[#b8cfe8] px-3.5 py-2 rounded-md transition-all cursor-pointer focus:outline-none flex items-center gap-1.5 disabled:opacity-50"
                >
                  <Send className="w-3.5 h-3.5" />
                  {draftingReply ? "Formulating Draft..." : "AI Compose Reply"}
                </button>
              </div>

              {/* AI Summary result */}
              {summaryOutput && (
                <div className="bg-[#fcf9f3] border border-[#e1d8c6] rounded-[14px] p-4 shadow-sm space-y-2.5 animate-fade-up">
                  <h4 className="font-mono text-[9px] text-[#2d5a4a] font-bold uppercase tracking-wider flex items-center gap-1.5 border-b border-[#ece6db] pb-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-[#2d5a4a]" />
                    Interactive Bullet Analysis
                  </h4>
                  <div className="text-xs text-[#4a4540] leading-relaxed font-serif pl-1 border-l-2 border-[#2d5a4a]/40">
                    <ReactMarkdown 
                      remarkPlugins={[remarkGfm]}
                      components={{
                        p: ({ node, ...props }) => <p className="mb-2 last:mb-0" {...props} />,
                        ul: ({ node, ...props }) => <ul className="list-disc pl-4 mb-2 space-y-1" {...props} />,
                        ol: ({ node, ...props }) => <ol className="list-decimal pl-4 mb-2 space-y-1" {...props} />,
                        li: ({ node, ...props }) => <li className="pl-0.5" {...props} />,
                        strong: ({ node, ...props }) => <strong className="font-bold text-[#1a1612] not-italic" {...props} />,
                        em: ({ node, ...props }) => <em className="italic" {...props} />,
                      }}
                    >
                      {summaryOutput}
                    </ReactMarkdown>
                  </div>
                </div>
              )}

              {/* AI Reply result */}
              {replyDraft && (
                <div className="bg-[#fcf9f3] border border-[#e1d8c6] rounded-[14px] p-4.5 shadow-sm space-y-3 animate-fade-up">
                  <div className="flex justify-between items-center border-b border-[#ece6db] pb-2">
                    <h4 className="font-mono text-[9px] text-[#1d2d5a] font-bold uppercase tracking-wider flex items-center gap-1.5">
                      <Send className="w-3.5 h-3.5" />
                      Suggested Reply Draft
                    </h4>
                    <button
                      type="button"
                      onClick={handleCopyDraft}
                      className="font-mono text-[9px] font-bold uppercase text-[#8b857b] hover:text-[#2d5a4a] flex items-center gap-1 focus:outline-none cursor-pointer"
                    >
                      {copiedDraft ? (
                        <>
                          <Check className="w-3 h-3 text-chalk-600 font-bold" />
                          COPIED!
                        </>
                      ) : (
                        <>
                          <Copy className="w-3 h-3" />
                          COPY DRAFT
                        </>
                      )}
                    </button>
                  </div>
                  <pre className="text-xs text-[#2c2724] leading-relaxed font-sans whitespace-pre-wrap bg-[#f3ede2] p-4 rounded-md border border-[#e1d8c6] max-h-60 overflow-y-auto">
                    {replyDraft}
                  </pre>
                  <p className="font-serif italic text-[10px] text-[#8b857b] pl-1 h-auto leading-normal">
                    Approved standard guidelines apply. This response uses your personal biography style preference from Assistant Core Memory.
                  </p>
                </div>
              )}

            </div>
          ) : (
            <div className="p-16 text-center text-[#8b857b] font-serif italic text-sm">
              Please select a syllabus message to begin academic parsing.
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
