import React, { useState, useEffect } from "react";
import { TeacherUser } from "./types";
import DashboardView from "./components/DashboardView";
import TasksView from "./components/TasksView";
import ChatView from "./components/ChatView";
import EmailView from "./components/EmailView";
import CalendarView from "./components/CalendarView";
import MemoryView from "./components/MemoryView";
import ProjectsView from "./components/ProjectsView";
import SettingsView from "./components/SettingsView";
import { initAuth, googleSignIn, firebaseLogout } from "./lib/firebase";
import {
  Menu,
  X,
  BookOpen,
  Calendar,
  Sparkles,
  ClipboardList,
  Mail,
  FolderKanban,
  Brain,
  Database,
  LogOut,
  Cog,
  CheckCircle2,
} from "lucide-react";

export default function App() {
  const [currentUser, setCurrentUser] = useState<TeacherUser | null>(() => {
    const saved = localStorage.getItem("teacher_user");
    return saved ? JSON.parse(saved) : null;
  });

  const [apiMode, setApiMode] = useState("Demo-Fallback");
  const [currentTab, setCurrentTab] = useState("dashboard");
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);
  const [googleToken, setGoogleToken] = useState<string | null>(null);

  useEffect(() => {
    // Detect server API status (AI-Enabled vs Demo mode)
    fetch("/api/health")
      .then((res) => res.json())
      .then((data) => {
        if (data.mode === "AI-Enabled") {
          setApiMode("AI-Enabled");
        }
      })
      .catch((err) => console.log("Health check failed, fallback mode active:", err));
  }, []);

  useEffect(() => {
    // Listen to Firebase Auth state
    const unsubscribe = initAuth(
      (user, token) => {
        setGoogleToken(token);
        const googleUser: TeacherUser = {
          name: user.displayName || "Google Scholar",
          email: user.email || "gmail_user@vasantvalley.edu.in",
          username: user.email ? user.email.split("@")[0] : "google_scholar",
          isGoogle: true,
          userId: user.uid,
        };
        localStorage.setItem("teacher_user", JSON.stringify(googleUser));
        setCurrentUser(googleUser);
      },
      () => {
        // Clear token on failure/signout but keep profile intact unless user clicked logout
        setGoogleToken(null);
      }
    );
    return () => {
      if (typeof unsubscribe === "function") unsubscribe();
    };
  }, []);

  const handleLoginDemo = () => {
    const demoUser: TeacherUser = {
      name: "Devendra Verma",
      email: "dverma@vasantvalley.edu.in",
      username: "dverma",
      isGoogle: false,
    };
    localStorage.setItem("teacher_user", JSON.stringify(demoUser));
    setCurrentUser(demoUser);
    setCurrentTab("dashboard");
  };

  const handleLoginGoogle = async () => {
    try {
      const result = await googleSignIn();
      if (result) {
        const { user, accessToken } = result;
        const googleUser: TeacherUser = {
          name: user.displayName || "Google Scholar",
          email: user.email || "gmail_user@vasantvalley.edu.in",
          username: user.email ? user.email.split("@")[0] : "google_scholar",
          isGoogle: true,
          userId: user.uid,
        };
        localStorage.setItem("teacher_user", JSON.stringify(googleUser));
        setGoogleToken(accessToken);
        setCurrentUser(googleUser);
        if (!currentUser) {
          setCurrentTab("dashboard");
        }
      }
    } catch (err) {
      console.error("Firebase Google Sign-In failed:", err);
      alert("Sign-In failed or cancelled. Please verify cookie/popup settings and try again.");
    }
  };

  const handleLogout = async () => {
    localStorage.removeItem("teacher_user");
    setCurrentUser(null);
    setGoogleToken(null);
    setMobileDrawerOpen(false);
    try {
      await firebaseLogout();
    } catch (err) {
      console.error("Firebase Sign-Out error:", err);
    }
  };

  const todayStr = new Date().toLocaleDateString("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });

  // Sidebar navigation sections
  const sections = [
    {
      label: "Today",
      items: [
        { id: "dashboard", label: "Planner", icon: <BookOpen className="w-4 h-4" /> },
        { id: "tasks", label: "Tasks", icon: <ClipboardList className="w-4 h-4" /> },
        { id: "chat", label: "Assistant", icon: <Sparkles className="w-4 h-4" /> },
      ],
    },
    {
      label: "Communicate",
      items: [
        { id: "email", label: "Email", icon: <Mail className="w-4 h-4" /> },
        { id: "calendar", label: "Calendar", icon: <Calendar className="w-4 h-4" /> },
      ],
    },
    {
      label: "Organise",
      items: [
        { id: "projects", label: "Projects", icon: <FolderKanban className="w-4 h-4" /> },
        { id: "memory", label: "Memory Bio", icon: <Brain className="w-4 h-4" /> },
      ],
    },
  ];

  // Landing Page: Simple visual cover
  if (!currentUser) {
    return (
      <div className="min-h-screen bg-paper-0 flex items-center justify-center p-4 sm:p-6 font-serif">
        <div className="max-w-md w-full animate-fade-up bg-paper-1 border border-paper-2 rounded-lg shadow-sm p-6 sm:p-8 space-y-6 notebook-lines relative overflow-hidden">
          
          {/* Header */}
          <div className="flex items-center gap-3 border-b border-paper-3 pb-4">
            <div className="w-10 h-10 bg-chalk-600 rounded flex items-center justify-center text-white text-base font-bold font-serif select-none shadow-none">
              V
            </div>
            <div>
              <p className="font-mono text-[9px] text-ink-300 uppercase leading-none font-bold tracking-widest">{todayStr}</p>
              <h1 className="font-serif font-semibold text-sm text-chalk-600 tracking-tight leading-normal mt-0.5">Vasant Valley School</h1>
            </div>
          </div>

          {/* Value Prop */}
          <div className="space-y-4">
            <h2 className="font-serif font-black text-2xl text-ink-950 leading-tight">
              Teacher&apos;s Assistant
            </h2>
            <p className="font-sans text-xs text-ink-700 leading-relaxed">
              Your daily planner, pointwise scheduler, and unread mail summary coordinator. Grounded directly in school curriculum worksheets.
            </p>

            <ul className="space-y-2.5 pt-1.5 pb-2">
              <li className="flex items-start gap-2 text-xs font-sans text-ink-700 select-none">
                <CheckCircle2 className="w-4 h-4 text-chalk-600 mt-0.5 flex-shrink-0" />
                <span>Analyse unread parent messages and prepare custom reply drafts instantly.</span>
              </li>
              <li className="flex items-start gap-2 text-xs font-sans text-ink-700 select-none">
                <CheckCircle2 className="w-4 h-4 text-chalk-600 mt-0.5 flex-shrink-0" />
                <span>Log point-wise daily timelines automatically from curriculum files.</span>
              </li>
              <li className="flex items-start gap-2 text-xs font-sans text-ink-700 select-none">
                <CheckCircle2 className="w-4 h-4 text-chalk-600 mt-0.5 flex-shrink-0" />
                <span>Keeps all details secure on sandboxed local database memories.</span>
              </li>
            </ul>
          </div>

          {/* Action buttons */}
          <div className="space-y-2.5 pt-2">
            <button
              onClick={handleLoginDemo}
              className="w-full bg-chalk-600 hover:bg-chalk-500 font-mono text-xs font-bold text-white py-3 rounded shadow-none focus:outline-none transition-all cursor-pointer"
            >
              Enter Demo Mode
            </button>
            <button
              onClick={handleLoginGoogle}
              className="w-full bg-paper-0 border border-paper-2 hover:bg-paper-2 font-mono text-xs font-bold text-ink-950 py-3 rounded focus:outline-none transition-all cursor-pointer flex items-center justify-center gap-2"
            >
              {/* Simple Google SVG icon */}
              <svg width="14" height="14" viewBox="0 0 24 24" className="flex-shrink-0">
                <path fill="#4285F4" d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v3.92h6.69c-.29 1.5-.11 3-.3 4.49l3.2 2.48c1.87-1.72 2.94-4.26 2.94-7.14z" />
                <path fill="#34A853" d="M12 24c3.24 0 5.97-1.08 7.96-2.91l-3.2-2.48c-.9.6-2.03.96-3.23.96-3.12 0-5.77-2.11-6.71-4.96h-3.3v2.55C5.51 21.05 8.52 24 12 24z" />
                <path fill="#FBBC05" d="M5.29 14.61A7.19 7.19 0 0 1 4.9 12c0-.82.14-1.61.39-2.36V7.08h-3.3a11.94 11.94 0 0 0 0 9.84l3.3-2.31z" />
                <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.22 0 12 0 8.52 0 5.51 2.95 3.51 7.08l3.3 2.31c.94-2.85 3.59-4.96 6.71-4.96z" />
              </svg>
              Sign in with Google
            </button>
          </div>

          <p className="text-center font-serif italic text-[10px] text-ink-300">
            Certified British English Speller & Pointwise Assistant.
          </p>
        </div>
      </div>
    );
  }

  // Active Workspace: Sidebar + views
  const renderActiveView = () => {
    switch (currentTab) {
      case "dashboard":
        return <DashboardView googleToken={googleToken} onNavigate={(tab) => setCurrentTab(tab)} userId={currentUser?.userId} />;
      case "tasks":
        return <TasksView userId={currentUser?.userId} />;
      case "chat":
        return <ChatView userId={currentUser?.userId} />;
      case "email":
        return <EmailView googleToken={googleToken} currentUser={currentUser} onSwitchAccount={handleLoginGoogle} />;
      case "calendar":
        return <CalendarView userId={currentUser?.userId} />;
      case "memory":
        return <MemoryView userId={currentUser?.userId} />;
      case "projects":
        return <ProjectsView userId={currentUser?.userId} />;
      case "settings":
        return <SettingsView currentUser={currentUser} apiMode={apiMode} onSwitchAccount={handleLoginGoogle} />;
      default:
        return <DashboardView googleToken={googleToken} onNavigate={(tab) => setCurrentTab(tab)} />;
    }
  };

  const activeTitle = sections
    .flatMap((s) => s.items)
    .find((item) => item.id === currentTab)?.label || "Workspace";

  return (
    <div className="min-h-screen bg-paper-0 flex flex-col md:flex-row relative">
      
      {/* MOBILE HEADER BAR */}
      <div className="md:hidden flex items-center justify-between p-4 bg-paper-1 border-b border-paper-2 flex-shrink-0 relative z-30">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setMobileDrawerOpen(true)}
            className="p-1.5 hover:bg-paper-2 rounded focus:outline-none"
          >
            <Menu className="w-5 h-5 text-ink-900" />
          </button>
          <span className="font-serif font-black text-sm text-chalk-600 uppercase tracking-tight">VVS Assistant</span>
        </div>
        <div className="font-mono text-[10px] text-ink-500 uppercase tracking-wider">{activeTitle}</div>
      </div>

      {/* MOBILE SLIDE-OUT DRAWER */}
      {mobileDrawerOpen && (
        <div className="md:hidden fixed inset-0 z-40 flex">
          {/* Backdrop overlay */}
          <div
            onClick={() => setMobileDrawerOpen(false)}
            className="absolute inset-0 bg-ink-900/10 backdrop-blur-[1px]"
          />
          
          {/* Drawer container */}
          <div className="relative w-64 max-w-sm bg-paper-1 border-r border-paper-2 flex flex-col justify-between py-6 px-4 z-50 h-full animate-fade-up">
            <button
              onClick={() => setMobileDrawerOpen(false)}
              className="absolute top-4 right-4 p-1.5 rounded hover:bg-paper-2"
            >
              <X className="w-4 h-4 text-ink-900" />
            </button>

            <div className="space-y-6">
              {/* Header */}
              <div className="border-b border-paper-2 pb-3">
                <span className="font-mono text-[9px] text-ink-500 font-bold uppercase block">{todayStr}</span>
                <span className="font-serif font-bold text-sm text-chalk-600 block leading-snug">Vasant Valley School</span>
              </div>

              {/* Navigation list */}
              <div className="space-y-4">
                {sections.map((sec, idx) => (
                  <div key={idx} className="space-y-1.5">
                    <span className="font-mono text-[9px] text-ink-500 tracking-wider uppercase block">{sec.label}</span>
                    <ul className="space-y-1">
                      {sec.items.map((item) => (
                        <li key={item.id}>
                          <button
                            onClick={() => {
                              setCurrentTab(item.id);
                              setMobileDrawerOpen(false);
                            }}
                            className={`w-full text-left font-sans text-xs px-3 py-2 rounded flex items-center gap-2 border ${
                              currentTab === item.id
                                ? "bg-chalk-100 border-chalk-500/10 text-chalk-600 font-bold"
                                : "text-ink-700 bg-transparent border-transparent hover:bg-paper-0"
                            }`}
                          >
                            {item.icon}
                            <span>{item.label}</span>
                          </button>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </div>

            {/* Footer */}
            <div className="border-t border-paper-2 pt-4 space-y-3">
              <div className="flex items-center gap-2.5 text-xs text-ink-950 font-medium">
                <div className="w-7 h-7 bg-chalk-600 text-white font-serif rounded-full flex items-center justify-center font-bold">
                  {currentUser.name.charAt(0)}
                </div>
                <div className="truncate">
                  <span className="block truncate font-bold text-ink-950">{currentUser.name}</span>
                  <span className="block truncate font-mono text-[10px] text-ink-300 font-normal">{currentUser.email}</span>
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    setCurrentTab("settings");
                    setMobileDrawerOpen(false);
                  }}
                  className="font-mono text-[10px] text-ink-500 hover:text-chalk-600 border border-paper-2 bg-paper-0 p-1.5 rounded flex-1 text-center"
                >
                  Configure
                </button>
                <button
                  onClick={handleLogout}
                  className="font-mono text-[10px] text-redpen hover:border-redpen border border-paper-2 bg-paper-0 p-1.5 rounded flex-1 text-center font-bold"
                >
                  Sign Out
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* DESKTOP PERSISTENT LEFT SIDEBAR */}
      <aside className="hidden md:flex w-56 bg-paper-1 border-r border-paper-2 flex-col justify-between p-5 min-h-screen flex-shrink-0">
        
        <div className="space-y-6">
          {/* Upper Title elements */}
          <div className="border-b border-paper-2 pb-4">
            <span className="font-mono text-[9px] text-ink-300 font-bold uppercase tracking-widest">{todayStr}</span>
            <h1 className="font-serif font-black text-base text-chalk-600 leading-tight mt-1">Teacher Assistant</h1>
            <p className="font-sans text-[10px] text-ink-500 mt-0.5">Vasant Valley school</p>
          </div>

          {/* Navigation panels */}
          <div className="space-y-5">
            {sections.map((sec, idx) => (
              <div key={idx} className="space-y-1.5">
                <span className="font-mono text-[9px] text-ink-500 font-bold tracking-wider uppercase block">{sec.label}</span>
                <ul className="space-y-1">
                  {sec.items.map((item) => (
                    <li key={item.id}>
                      <button
                        onClick={() => setCurrentTab(item.id)}
                        className={`w-full text-left font-sans text-xs px-3 py-2 rounded flex items-center gap-2.5 transition-all text-xs border ${
                          currentTab === item.id
                            ? "bg-chalk-100 border-chalk-500/10 text-chalk-600 font-semibold"
                            : "text-ink-700 bg-transparent border-transparent hover:bg-paper-0"
                        }`}
                      >
                        <span className={currentTab === item.id ? "text-chalk-600" : "text-ink-300"}>
                          {item.icon}
                        </span>
                        <span>{item.label}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>

        {/* Biography signature block & logout */}
        <div className="border-t border-paper-2 pt-4 space-y-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 bg-chalk-600 text-white font-serif rounded-full flex items-center justify-center font-bold text-xs select-none shadow-none flex-shrink-0">
              {currentUser.name.charAt(0)}
            </div>
            <div className="min-w-0">
              <span className="font-sans font-bold text-xs text-ink-950 block truncate leading-tight">{currentUser.name}</span>
              <span className="font-mono text-[9px] text-ink-300 block truncate">{currentUser.email}</span>
            </div>
          </div>

          <div className="flex flex-col gap-1">
            <button
              onClick={() => setCurrentTab("settings")}
              className={`w-full font-mono text-[10px] text-ink-500 hover:text-chalk-600 bg-paper-2 hover:bg-chalk-100 border border-paper-3 px-2 py-1 rounded flex items-center justify-center gap-1.5 focus:outline-none transition-colors ${
                currentTab === "settings" && "text-chalk-600 bg-chalk-100 border-chalk-500/15"
              }`}
            >
              <Cog className="w-3.5 h-3.5" />
              Configure System
            </button>
            <button
              onClick={handleLogout}
              className="w-full font-mono text-[10px] text-ink-500 hover:text-redpen bg-paper-0 hover:bg-red-50 border border-paper-2 px-2 py-1 rounded flex items-center justify-center gap-1.5 focus:outline-none transition-colors"
            >
              <LogOut className="w-3.5 h-3.5" />
              Sign Out
            </button>
          </div>
        </div>

      </aside>

      {/* CENTRAL SCROLL VIEWPORT */}
      <main className="flex-1 overflow-y-auto p-4 sm:p-6 pb-12 min-w-0">
        {renderActiveView()}
      </main>

    </div>
  );
}
