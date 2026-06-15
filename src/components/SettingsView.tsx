import React from "react";
import { User, ShieldCheck, Cpu, Code, Settings } from "lucide-react";

interface SettingsViewProps {
  currentUser: { name: string; email: string };
  apiMode: string;
  onSwitchAccount?: () => void;
}

export default function SettingsView({ currentUser, apiMode, onSwitchAccount }: SettingsViewProps) {
  
  const integrations = [
    {
      name: "Syllabus Gmail Proxy",
      description: "Extract unread summaries and draft pointwise replies in your biography style.",
      status: "Connected (Verified)",
      type: "active",
    },
    {
      name: "Gemini 3.5 Flash Engine",
      description: "Powers chat streams, pointwise replies, and personalized schedulers.",
      status: apiMode === "AI-Enabled" ? "Active (Grounded)" : "Demo Mode Mock active",
      type: apiMode === "AI-Enabled" ? "active" : "demo",
    },
  ];

  const privacyGuarantees = [
    "No telemetry larping — your logs correspond strictly to raw browser states.",
    "Emails are never dispatched silently — every reply draft requires manual approval.",
    "Student names and academic files are treated as top-level private entities in the sandboxed local db.",
    "Constant biography records and memory logs can be wiped clean in one click on keyviews.",
    "No automatic background crawlers — syllabus syncing strictly happens when requested manually.",
  ];

  const envs = [
    { key: "GEMINI_API_KEY", required: true, status: apiMode === "AI-Enabled" ? "Loaded" : "Missing" },
    { key: "GOOGLE_CLIENT_ID", required: true, status: "Connected" },
    { key: "NEXTAUTH_SECRET", required: true, status: "Connected" },
    { key: "APP_URL", required: false, status: "Wired" },
  ];

  return (
    <div className="animate-fade-up max-w-[1050px] mx-auto space-y-6">
      
      {/* Header bar */}
      <div className="border-b border-paper-3 pb-4">
        <h2 className="font-serif text-2xl font-normal text-[#1a1612]">Conventions & Integrations</h2>
        <p className="font-serif italic text-xs text-ink-405 mt-1 pl-0.5">
          Workspace parameters, school environment, active OAuth session checks, and security definitions.
        </p>
      </div>

      {/* Account Info */}
      <div className="bg-[#fcf9f3] border border-[#e1d8c6] rounded-[18px] p-6 shadow-[0_4px_16px_-6px_rgba(26,22,18,0.08)] space-y-4">
        <h3 className="font-serif font-bold text-sm text-[#1a1612] flex items-center justify-between pb-2 border-b border-[#ece6db]">
          <div className="flex items-center gap-2">
            <User className="w-4 h-4 text-[#2d5a4a]" />
            Active Session Biography
          </div>
          <button 
            type="button"
            onClick={onSwitchAccount}
            className="text-[9px] font-mono tracking-wider font-bold text-[#2d5a4a] bg-[#e8f0ec] hover:bg-[#d2e3da] border border-[#d2e3da] px-3 py-1.5 rounded-md transition-colors flex items-center gap-1 focus:outline-none uppercase"
          >
            <Settings className="w-3.5 h-3.5" />
            SWITCH ACCOUNT
          </button>
        </h3>

        <div className="flex items-center gap-4 py-2">
          <div className="w-12 h-12 bg-[#2d5a4a] rounded-full flex items-center justify-center text-[#fcf9f3] text-lg font-bold">
            {currentUser.name.charAt(0)}
          </div>
          <div>
            <span className="font-serif font-bold text-sm text-[#1a1612] block leading-tight">{currentUser.name}</span>
            <span className="font-mono text-[10px] text-[#8b857b] block uppercase mt-0.5">{currentUser.email} • PRIMARY SYNC</span>
            <span className="font-mono text-[8px] tracking-wider font-bold text-[#2d5a4a] bg-[#e8f0ec] border border-[#d2e3da] px-2 py-0.5 rounded-md mt-1.5 inline-block">
              VASANT VALLEY FA CULTY ADMINISTRATOR
            </span>
          </div>
        </div>

        <div className="pt-2">
          <h4 className="font-sans font-bold text-xs text-[#1a1612] mb-2 uppercase tracking-wide">Synced Mail Accounts Configuration</h4>
          <div className="bg-[#f3ede2] border border-[#e1d8c6] rounded-md p-3.5 text-xs flex justify-between items-center mb-2 animate-fadeIn">
            <div>
              <span className="font-serif font-bold text-xs text-[#1a1612] block mb-0.5">{currentUser.email}</span>
              <span className="text-[#8b857b] font-mono text-[9px] uppercase tracking-wider block">WORKSPACE EDITION (ACTIVE)</span>
            </div>
            <input type="checkbox" checked readOnly className="w-4 h-4 rounded text-[#2d5a4a] focus:ring-0 checked:bg-[#2d5a4a]" />
          </div>
          <div className="bg-[#fcf9f3] border border-[#e1d8c6] border-dashed rounded-md p-3.5 text-xs flex justify-between items-center opacity-65">
            <div>
              <span className="font-serif font-bold text-xs text-[#8b857b] block mb-0.5">Add an Alias or Secondary Account</span>
              <span className="text-[#8b857b] font-serif italic text-[11px] block">Switch the primary account using the option above to download secondary inbox syncs.</span>
            </div>
          </div>
        </div>
      </div>

      {/* Integrations Grid */}
      <div className="bg-[#fcf9f3] border border-[#e1d8c6] rounded-[18px] p-6 shadow-[0_4px_16px_-6px_rgba(26,22,18,0.08)] space-y-3">
        <h3 className="font-serif font-bold text-sm text-[#1a1612] flex items-center gap-2 pb-2 border-b border-[#ece6db]">
          <Cpu className="w-4 h-4 text-[#2d5a4a]" />
          Connected Services & Verification Keys
        </h3>
        
        <div className="divide-y divide-[#ece6db]">
          {integrations.map((item, idx) => (
            <div key={idx} className="py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 first:pt-2 last:pb-1 font-sans text-xs">
              <div className="space-y-1">
                <span className="font-serif font-bold text-sm text-[#1a1612] block leading-snug">{item.name}</span>
                <span className="text-[#4a4540] font-sans text-xs block pr-6 leading-relaxed max-w-xl">{item.description}</span>
              </div>
              <span className={`font-mono text-[9px] px-2.5 py-1 rounded-full inline-block font-bold tracking-wider uppercase whitespace-nowrap self-start sm:self-center border ${
                item.type === "active" 
                  ? "bg-[#e8f0ec] border-[#d2e3da] text-[#2d5a4a]" 
                  : "bg-[#fcf9f3] border-[#e1d8c6] text-[#8b857b]"
              }`}>
                {item.status}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Privacy Guarantee card */}
      <div className="bg-[#fcf9f3] border border-[#e1d8c6] rounded-[18px] p-6 shadow-[0_4px_16px_-6px_rgba(26,22,18,0.08)] space-y-3">
        <h3 className="font-serif font-bold text-sm text-[#1a1612] flex items-center gap-2 pb-2 border-b border-[#ece6db]">
          <ShieldCheck className="w-4 h-4 text-[#2d5a4a]" />
          Privacy & Verification Guarantees
        </h3>

        <div className="space-y-2 pt-1">
          {privacyGuarantees.map((rule, idx) => (
            <div key={idx} className="flex items-start gap-2.5">
              <span className="text-[#2d5a4a] text-xs mt-0.5 select-none font-bold">✓</span>
              <p className="font-serif italic text-xs text-[#4a4540] leading-normal">{rule}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Env variables list */}
      <div className="bg-[#fcf9f3] border border-[#e1d8c6] rounded-[18px] p-6 shadow-[0_4px_16px_-6px_rgba(26,22,18,0.08)] space-y-3">
        <h3 className="font-serif font-bold text-sm text-[#1a1612] flex items-center gap-2 pb-2 border-b border-[#ece6db]">
          <Code className="w-4 h-4 text-[#2d5a4a]" />
          Workspace Configuration Checklist
        </h3>

        <div className="font-mono text-[10px] uppercase tracking-wider pt-1 divide-y divide-[#ece6db]">
          {envs.map((env, idx) => (
            <div key={idx} className="py-2.5 flex items-center justify-between first:pt-1 last:pb-1">
              <span className="text-[#1a1612] font-bold">{env.key}</span>
              <div className="flex items-center gap-3">
                <span className="text-[#8b857b] text-[9px] tracking-wider font-semibold">
                  {env.required ? "REQUIRED" : "OPTIONAL"}
                </span>
                <span className={`px-2.5 py-0.5 rounded-md text-[9px] font-bold border ${
                  env.status === "Loaded" || env.status === "Connected" || env.status === "Wired"
                    ? "bg-[#e8f0ec] border-[#d2e3da] text-[#2d5a4a]"
                    : "bg-[#fcf9f3] border-[#b83232]/25 text-[#b83232]"
                }`}>
                  {env.status}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

    </div>
  );
}
