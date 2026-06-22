import React, { useState, useEffect } from "react";
import { TeacherUser, Email } from "./types";
import DashboardView from "./components/DashboardView";
import LessonPlannerView from "./components/LessonPlannerView";
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
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed && (parsed.userId === "demo-devendra-verma" || !parsed.isGoogle)) {
          localStorage.removeItem("teacher_user");
          return null;
        }
        return parsed;
      } catch (e) {
        console.error("Failed to parse cached teacher_user", e);
      }
    }
    return null;
  });

  const [apiMode, setApiMode] = useState("Offline-Fallback");
  const [currentTab, setCurrentTab] = useState("dashboard");
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);
  const [googleToken, setGoogleToken] = useState<string | null>(null);
  const [emails, setEmails] = useState<Email[]>([]);
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  useEffect(() => {
    const fetchEmails = async () => {
      try {
        const headers: Record<string, string> = {};
        if (googleToken) {
          headers["Authorization"] = `Bearer ${googleToken}`;
        }
        const res = await fetch("/api/emails", { headers });
        if (res.ok) {
          const data = await res.json();
          setEmails(data);
        }
      } catch (err) {
        console.error("Failed to fetch emails in App:", err);
      }
    };
    fetchEmails();
  }, [googleToken, currentTab]);

  useEffect(() => {
    // Detect server API status (AI-Enabled vs Demo mode)
    fetch("/api/health")
      .then((res) => {
        if (!res.ok) throw new Error("Server error");
        return res.json();
      })
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
          email: user.email || "dimasht@vasantvalley.edu.in",
          username: user.email ? user.email.split("@")[0] : "dimasht",
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

  const handleLoginGoogle = async () => {
    try {
      const result = await googleSignIn();
      if (result) {
        const { user, accessToken } = result;
        const googleUser: TeacherUser = {
          name: user.displayName || "Google Scholar",
          email: user.email || "dimasht@vasantvalley.edu.in",
          username: user.email ? user.email.split("@")[0] : "dimasht",
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
        { id: "lessons", label: "Lesson Planner", icon: <BookOpen className="w-4 h-4" /> },
        { id: "projects", label: "Projects", icon: <FolderKanban className="w-4 h-4" /> },
        { id: "memory", label: "Memory Bio", icon: <Brain className="w-4 h-4" /> },
      ],
    },
  ];

  // Landing Page: Simple visual cover
  if (!currentUser) {
    const loginTodayMono = new Date().toLocaleDateString("en-GB", {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
    }).toUpperCase();

    return (
      <div className="min-h-screen bg-paper-0 flex items-center justify-center p-4 sm:p-6 font-sans">
        <div className="max-w-[940px] w-full animate-fade-up bg-paper-1 border border-paper-3 rounded-[24px] shadow-[0_10px_32px_-12px_rgba(26,22,18,0.14)] overflow-hidden grid grid-cols-1 md:grid-cols-12 min-h-[540px]">
          
          {/* Left Column — deep-green brand panel */}
          <div className="md:col-span-6 bg-gradient-to-br from-[#2d5a4a] to-[#234a3d] p-8 sm:p-10 flex flex-col justify-between text-[#fcf9f3] relative overflow-hidden select-none">
            {/* Radial Sheen */}
            <div className="absolute top-0 right-0 w-80 h-80 bg-white/[0.035] rounded-full blur-3xl pointer-events-none -mr-20 -mt-20"></div>

            {/* Logo and school header */}
            <div className="space-y-4 relative z-10">
              <div className="flex items-center gap-3">
                <div className="w-[42px] h-[42px] bg-[#fcf9f3] rounded-lg flex items-center justify-center text-[#2d5a4a] text-xl font-bold font-serif shadow-sm">
                  V
                </div>
                <div>
                  <p className="font-mono text-[9px] text-[#fcf9f3]/70 uppercase tracking-[0.16em] font-medium leading-none">
                    VASANT VALLEY SCHOOL
                  </p>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h1 className="font-serif font-semibold text-lg text-[#fcf9f3] tracking-tight leading-normal mt-0.5">
                      Faculty Planner
                    </h1>
                    <span className="bg-[#b83232]/25 text-[#fecaca] border border-[#b83232]/35 px-1.5 py-0.5 rounded font-mono text-[8px] font-bold uppercase tracking-wider">
                      Disconnected
                    </span>
                  </div>
                </div>
              </div>
              <p className="font-mono text-[10px] text-[#fcf9f3]/65 uppercase tracking-[0.12em]">
                {loginTodayMono}
              </p>
            </div>

            {/* Display message */}
            <div className="my-8 relative z-10 space-y-2.5">
              <h2 className="font-serif text-3xl font-normal leading-tight text-[#fcf9f3] tracking-tight">
                Your day, gathered<br />before the bell.
              </h2>
              <p className="font-serif italic text-sm text-[#fcf9f3]/80 leading-relaxed font-light">
                “Preparation is the silent half of teaching.”
              </p>
            </div>

            {/* Features check rows */}
            <div className="space-y-4 relative z-10 pt-4 border-t border-white/10">
              <div className="flex items-start gap-3 text-xs text-[#fcf9f3]/90">
                <div className="w-5 h-5 rounded-full bg-[#fcf9f3]/10 flex items-center justify-center text-[#fcf9f3] font-bold text-[10px] select-none mt-0.5 flex-shrink-0">
                  ✓
                </div>
                <span className="leading-relaxed">Analyse unread parent syllabus messages and prepare responder drafts instantly.</span>
              </div>
              <div className="flex items-start gap-3 text-xs text-[#fcf9f3]/90">
                <div className="w-5 h-5 rounded-full bg-[#fcf9f3]/10 flex items-center justify-center text-[#fcf9f3] font-bold text-[10px] select-none mt-0.5 flex-shrink-0">
                  ✓
                </div>
                <span className="leading-relaxed">Log point-wise timetable sessions directly from curriculum syllabus notes.</span>
              </div>
              <div className="flex items-start gap-3 text-xs text-[#fcf9f3]/90">
                <div className="w-5 h-5 rounded-full bg-[#fcf9f3]/10 flex items-center justify-center text-[#fcf9f3] font-bold text-[10px] select-none mt-0.5 flex-shrink-0">
                  ✓
                </div>
                <span className="leading-relaxed">Protect institutional records in secure sandboxed local database contexts.</span>
              </div>
            </div>
                {/* Right Column — sign-in panel */}
          <div className="md:col-span-6 p-8 sm:p-10 flex flex-col justify-center bg-[#fcf9f3] relative">
            <div className="max-w-xs w-full mx-auto space-y-6">
              
              <div className="space-y-1.5">
                <p className="font-mono text-[9px] text-[#7a756f] tracking-[0.16em] uppercase font-bold leading-none">
                  STAFFROOM ENTRANCE
                </p>
                <h3 className="font-serif text-2xl font-medium text-[#1a1612]">
                  Welcome back.
                </h3>
                <p className="font-serif italic text-xs text-[#7a756f]">
                  Sign in to compile daily lists and lessons.
                </p>
              </div>

              {/* Google Button */}
              <div className="space-y-3.5 pt-2">
                <button
                  onClick={handleLoginGoogle}
                  className="w-full bg-[#fcf9f3] border border-[#e1d8c6] hover:bg-[#ece6db] text-[#1a1612] font-serif text-sm font-medium py-3 rounded-[8px] transition-all duration-200 cursor-pointer flex items-center justify-center gap-2.5 shadow-sm"
                >
                  <svg width="15" height="15" viewBox="0 0 24 24" className="flex-shrink-0">
                    <path fill="#4285F4" d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v3.92h6.69c-.29 1.5-.11 3-.3 4.49l3.2 2.48c1.87-1.72 2.94-4.26 2.94-7.14z" />
                    <path fill="#34A853" d="M12 24c3.24 0 5.97-1.08 7.96-2.91l-3.2-2.48c-.9.6-2.03.96-3.23.96-3.12 0-5.77-2.11-6.71-4.96h-3.3v2.55C5.51 21.05 8.52 24 12 24z" />
                    <path fill="#FBBC05" d="M5.29 14.61A7.19 7.19 0 0 1 4.9 12c0-.82.14-1.61.39-2.36V7.08h-3.3a11.94 11.94 0 0 0 0 9.84l3.3-2.31z" />
                    <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.22 0 12 0 8.52 0 5.51 2.95 3.51 7.08l3.3 2.31c.94-2.85 3.59-4.96 6.71-4.96z" />
                  </svg>
                  Sign in with Google
                </button>
              </div>

              {/* Micro Caption */}
              <p className="text-center font-serif italic text-[11px] text-[#8b857b] pt-2">
                British English speller · Point-wise assistant
              </p>
            </div>
          </div>         </div>

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
      case "lessons":
        return <LessonPlannerView userId={currentUser?.userId} />;
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
          {!isOnline && (
            <span className="bg-redpen/10 text-redpen border border-redpen/20 px-1 py-0.5 rounded font-mono text-[7px] font-bold uppercase tracking-wider animate-pulse">
              Off
            </span>
          )}
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
      <aside className="hidden md:flex w-[248px] bg-paper-1 border-r border-paper-2 flex-col justify-between p-5 min-h-screen flex-shrink-0 select-none">
        
        <div className="space-y-6">
          {/* Top Zone */}
          <div className="border-b border-paper-3 pb-4">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 bg-chalk-600 rounded-md flex items-center justify-center text-[#fcf9f3] text-lg font-bold font-serif select-none shadow-none">
                V
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <h1 className="font-serif font-bold text-sm text-chalk-600 tracking-tight leading-none">Faculty Planner</h1>
                  {!isOnline && (
                    <span className="bg-redpen/10 text-redpen border border-redpen/20 px-1 py-0.5 rounded font-mono text-[8px] font-bold uppercase tracking-wider animate-pulse">
                      Disconnected
                    </span>
                  )}
                </div>
                <p className="font-sans text-[10px] text-ink-400 mt-0.5 leading-none">Vasant Valley School</p>
              </div>
            </div>
            {/* Mono date line under a hairline */}
            <div className="mt-3.5 pt-2 border-t border-[#ece6db]">
              <span className="font-mono text-[9px] text-[#7a756f] font-bold uppercase tracking-[0.16em]">
                {todayStr.toUpperCase()}
              </span>
            </div>
          </div>

          {/* Middle Navigation Grouped Nav */}
          <div className="space-y-5">
            {sections.map((sec, idx) => (
              <div key={idx} className="space-y-2">
                <span className="font-mono text-[9px] text-ink-400 font-bold tracking-[0.18em] uppercase block px-1">
                  {sec.label.toUpperCase()}
                </span>
                <ul className="space-y-1">
                  {sec.items.map((item) => {
                    const isActive = currentTab === item.id;
                    return (
                      <li key={item.id}>
                        <button
                          onClick={() => setCurrentTab(item.id)}
                          className={`w-full text-left font-sans text-[13px] py-2 px-3 rounded-lg flex items-center justify-between transition-all duration-150 border-l-[3px] ${
                            isActive
                              ? "bg-chalk-100 border-[#2d5a4a] text-ink-900 font-bold"
                              : "text-[#4a4540] bg-transparent border-transparent hover:bg-[#ece6db]/50"
                          }`}
                        >
                          <div className="flex items-center gap-2.5">
                            <span className={`w-[17px] h-[17px] flex items-center justify-center ${isActive ? "text-[#2d5a4a]" : "text-[#8b857b]"}`}>
                              {item.icon}
                            </span>
                            <span>{item.label}</span>
                          </div>
                          {/* Alert label if email */}
                          {item.id === "email" && emails.filter(e => e.needsReply).length > 0 && (
                            <span className="bg-[#b83232] text-white font-mono text-[9px] font-bold px-1.5 py-0.5 rounded-full leading-none">
                              {emails.filter(e => e.needsReply).length}
                            </span>
                          )}
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))}
          </div>
        </div>

        {/* Bottom Zone */}
        <div className="border-t border-paper-3 pt-4 space-y-3">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-[#2d5a4a] text-[#fcf9f3] font-serif rounded-full flex items-center justify-center font-bold text-xs select-none shadow-none flex-shrink-0">
              {(currentUser?.name || "D").charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0">
              <span className="font-sans font-bold text-xs text-ink-900 block truncate leading-tight">
                {currentUser?.name || "Devendra Verma"}
              </span>
              <span className="font-mono text-[9px] text-ink-400 block truncate leading-none mt-0.5">
                {currentUser?.username || "dverma"}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-1.5 pt-1">
            <button
              onClick={() => setCurrentTab("settings")}
              className={`font-mono text-[9px] text-[#4a4540] hover:text-[#2d5a4a] bg-transparent hover:bg-[#e8f0ec] border border-[#e1d8c6] py-1.5 rounded-md flex items-center justify-center gap-1 focus:outline-none transition-colors uppercase tracking-wider font-semibold ${
                currentTab === "settings" && "bg-chalk-100 border-[#d2e3da] text-chalk-700"
              }`}
            >
              <Cog className="w-3 h-3" />
              Configure
            </button>
            <button
              onClick={handleLogout}
              className="font-mono text-[9px] text-[#4a4540] hover:text-[#b83232] bg-transparent hover:bg-red-50 border border-[#e1d8c6] py-1.5 rounded-md flex items-center justify-center gap-1 focus:outline-none transition-colors uppercase tracking-wider font-semibold"
            >
              <LogOut className="w-3 h-3" />
              Sign Out
            </button>
          </div>
        </div>

      </aside>

      {/* CENTRAL SCROLL VIEWPORT */}
      <main className="flex-1 overflow-y-auto p-4 sm:p-6 pb-12 min-w-0">
        {renderActiveView()}
      </main>

      {/* Floating real username on bottom right */}
      <div className="fixed bottom-4 right-4 z-50 bg-[#fcf9f3]/95 backdrop-blur-sm border border-[#e1d8c6] rounded-full px-3.5 py-1.5 shadow-[0_4px_16px_-4px_rgba(26,22,18,0.15)] flex items-center gap-2 pointer-events-none select-none">
        <span className="w-2 h-2 rounded-full bg-[#2d5a4a] animate-pulse" />
        <span className="font-mono text-[9px] font-bold text-[#1a1612] uppercase tracking-[0.12em]">
          User: {currentUser?.username || "guest"}
        </span>
      </div>

    </div>
  );
}
