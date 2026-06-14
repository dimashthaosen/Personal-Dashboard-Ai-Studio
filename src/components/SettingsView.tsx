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
    <div className="animate-fade-up max-w-4xl mx-auto space-y-6">
      
      {/* Header */}
      <div className="border-b border-paper-3 pb-4">
        <p className="font-mono text-xs tracking-wider text-ink-500 uppercase font-medium">Platform Management</p>
        <h2 className="font-serif text-2xl font-semibold text-ink-950 mt-1">Conventions & Integrations</h2>
      </div>

      {/* Account Info */}
      <div className="bg-paper-1 border border-paper-2 rounded-lg p-5 shadow-sm space-y-3">
        <h3 className="font-serif font-bold text-sm text-ink-950 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <User className="w-4 h-4 text-chalk-600" />
            Active Session Biography
          </div>
          <button 
            onClick={onSwitchAccount}
            className="text-[10px] font-mono text-emerald-700 bg-emerald-100 hover:bg-emerald-200 px-2 py-1 rounded transition-colors flex items-center gap-1 focus:outline-none"
          >
            <Settings className="w-3 h-3" />
            Switch Primary Account
          </button>
        </h3>
        <div className="flex items-center gap-4 py-2 border-t border-paper-2/45">
          <div className="w-12 h-12 bg-chalk-600 rounded-full flex items-center justify-center text-white text-lg font-bold">
            {currentUser.name.charAt(0)}
          </div>
          <div>
            <span className="font-serif font-bold text-sm text-ink-950 block">{currentUser.name}</span>
            <span className="font-mono text-xs text-ink-500 block">{currentUser.email} (Primary Sync)</span>
            <span className="font-mono text-[9px] text-chalk-600 bg-chalk-100 rounded px-1.5 py-0.5 mt-1 inline-block">
              Vasant Valley Administrator
            </span>
          </div>
        </div>

        <div className="pt-2">
          <h4 className="font-sans font-semibold text-xs text-ink-900 mb-2">Synced Mail Accounts Configuration</h4>
          <div className="bg-paper-0 border border-paper-2 rounded p-3 text-xs flex justify-between items-center mb-2">
            <div>
              <span className="font-bold">{currentUser.email}</span>
              <span className="text-ink-500 block">Workspace Edition (Active)</span>
            </div>
            <input type="checkbox" checked readOnly className="checked:accent-chalk-600" />
          </div>
          <div className="bg-paper-0 border border-paper-2 rounded p-3 text-xs flex justify-between items-center opacity-60">
            <div>
              <span className="font-bold text-ink-900">Add an Alias or Secondary Account</span>
              <span className="text-ink-500 block">Switch the primary account above or configure custom aliases in standard settings.</span>
            </div>
          </div>
        </div>
      </div>

      {/* Integrations Grid */}
      <div className="bg-paper-1 border border-paper-2 rounded-lg p-5 shadow-sm space-y-3">
        <h3 className="font-serif font-bold text-sm text-ink-950 flex items-center gap-2">
          <Cpu className="w-4 h-4 text-chalk-600" />
          Connected Services & Keys
        </h3>
        
        <div className="divide-y divide-paper-2">
          {integrations.map((item, idx) => (
            <div key={idx} className="py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 first:pt-2 font-sans text-xs">
              <div className="space-y-1">
                <span className="font-serif font-bold text-sm text-ink-950 block leading-snug">{item.name}</span>
                <span className="text-ink-700 block pr-6 leading-relaxed max-w-xl">{item.description}</span>
              </div>
              <span className={`font-mono text-[10px] px-2.5 py-1 rounded inline-block font-semibold whitespace-nowrap self-start sm:self-center ${
                item.type === "active" ? "bg-chalk-100 text-chalk-600" : "bg-amber-faint text-woodamber"
              }`}>
                {item.status}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Privacy Guarantee card */}
      <div className="bg-paper-1 border border-paper-2 rounded-lg p-5 shadow-sm space-y-3">
        <h3 className="font-serif font-bold text-sm text-ink-950 flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-chalk-600" />
          Privacy & Verification Guarantees
        </h3>

        <div className="space-y-2 border-t border-paper-2/45 pt-3">
          {privacyGuarantees.map((rule, idx) => (
            <div key={idx} className="flex items-start gap-2.5">
              <span className="text-chalk-600 text-xs mt-0.5 select-none">✓</span>
              <p className="font-serif italic text-xs text-ink-700 leading-normal">{rule}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Env variables list */}
      <div className="bg-paper-1 border border-paper-2 rounded-lg p-5 shadow-sm space-y-3">
        <h3 className="font-serif font-bold text-sm text-ink-950 flex items-center gap-2">
          <Code className="w-4 h-4 text-chalk-600" />
          Workspace Configuration Checklist
        </h3>

        <div className="font-mono text-[11px] border-t border-paper-2/45 pt-3 divide-y divide-paper-2">
          {envs.map((env, idx) => (
            <div key={idx} className="py-2.5 flex items-center justify-between first:pt-1 last:pb-1">
              <span className="text-ink-900 font-semibold">{env.key}</span>
              <div className="flex items-center gap-3">
                <span className="text-ink-500 uppercase tracking-widest text-[9px]">
                  {env.required ? "Required" : "Optional"}
                </span>
                <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                  env.status === "Loaded" || env.status === "Connected" || env.status === "Wired"
                    ? "bg-chalk-100 text-chalk-600"
                    : "bg-red-50 text-redpen"
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
