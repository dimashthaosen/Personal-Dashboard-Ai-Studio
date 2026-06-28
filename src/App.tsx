import { apiFetch } from "./lib/api";
import React, { useState, useEffect, Suspense, lazy } from "react";
import { TeacherUser, Email } from "./types";
import { useFirestoreTasks } from "./lib/hooks";
import { motion, AnimatePresence } from "motion/react";

const DashboardView = lazy(() => import("./components/DashboardView"));
const LessonPlannerView = lazy(() => import("./components/LessonPlannerView"));
const TasksView = lazy(() => import("./components/TasksView"));
const ChatView = lazy(() => import("./components/ChatView"));
const EmailView = lazy(() => import("./components/EmailView"));
const CalendarView = lazy(() => import("./components/CalendarView"));
const MemoryView = lazy(() => import("./components/MemoryView"));
const ProjectsView = lazy(() => import("./components/ProjectsView"));
const SettingsView = lazy(() => import("./components/SettingsView"));
const CommandBar = lazy(() => import("./components/CommandBar"));
const StudentsView = lazy(() => import("./components/StudentsView"));
const TimetableView = lazy(() => import("./components/TimetableView"));
const DriveView = lazy(() => import("./components/DriveView"));

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
  Search,
  Check,
  AlertTriangle,
  HardDrive
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
  const [isCommandBarOpen, setIsCommandBarOpen] = useState(false);
  const [proposedActionPrompt, setProposedActionPrompt] = useState<string | null>(null);
  const [selectedStudentIdForView, setSelectedStudentIdForView] = useState<string | null>(null);
  const [selectedTaskIdForView, setSelectedTaskIdForView] = useState<string | null>(null);
  const [selectedEventIdForView, setSelectedEventIdForView] = useState<string | null>(null);
  const [selectedMemoryIdForView, setSelectedMemoryIdForView] = useState<string | null>(null);
  const [selectedEmailIdForView, setSelectedEmailIdForView] = useState<string | null>(null);
  const [selectedChatMessageIdForView, setSelectedChatMessageIdForView] = useState<string | null>(null);

  // Reminders / Notification state and checker
  const { tasks } = useFirestoreTasks(currentUser?.userId);
  const [notifiedTasks, setNotifiedTasks] = useState<Record<string, boolean>>({});
  const [appAlerts, setAppAlerts] = useState<{ id: string; title: string; message: string }[]>([]);

  // Request browser notification permissions on first load of dashboard
  useEffect(() => {
    if (typeof window !== "undefined" && "Notification" in window) {
      if (Notification.permission === "default") {
        Notification.requestPermission();
      }
    }
  }, []);

  // Poller checks every 30 seconds for pending tasks due within 30 minutes
  useEffect(() => {
    if (!currentUser?.userId || tasks.length === 0) return;

    const checkDueReminders = () => {
      const now = Date.now();
      const THIRTY_MIN_MS = 30 * 60 * 1000;

      tasks.forEach((task) => {
        if (task.status === "done" || task.status === "cancelled") return;
        if (!task.deadline) return;

        // Try standard conversion
        const dueTime = new Date(task.deadline).getTime();
        if (isNaN(dueTime)) return;

        const timeDiff = dueTime - now;

        // If due within next 30 minutes and not yet notified
        if (timeDiff > 0 && timeDiff <= THIRTY_MIN_MS && !notifiedTasks[task.id]) {
          // Mark as notified so we do not spam notifications
          setNotifiedTasks((prev) => ({ ...prev, [task.id]: true }));

          const messageText = `Task "${task.title}" is due soon! (in ${Math.round(timeDiff / 60000)} minutes)`;

          // 1. Show native browser notification
          if (typeof window !== "undefined" && "Notification" in window && Notification.permission === "granted") {
            try {
              new Notification("Syllabus & Task Reminder", {
                body: messageText,
              });
            } catch (e) {
              console.warn("Notification failed:", e);
            }
          }

          // 2. Add to in-app alerts stack
          setAppAlerts((prev) => [
            ...prev,
            {
              id: task.id,
              title: "Upcoming Deadline",
              message: messageText,
            }
          ]);
        }
      });
    };

    checkDueReminders();
    const interval = setInterval(checkDueReminders, 30000);
    return () => clearInterval(interval);
  }, [tasks, currentUser?.userId, notifiedTasks]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "k") {
        e.preventDefault();
        setIsCommandBarOpen((prev) => !prev);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const handleSendAssistantPrompt = (prompt: string) => {
    setProposedActionPrompt(prompt);
    setCurrentTab("chat");
  };

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
        const res = await apiFetch("/api/emails", { headers });
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
    apiFetch("/api/health")
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
    } catch (err: any) {
      console.error("Firebase Google Sign-In failed:", err);
      if (err.code === "auth/cancelled-popup-request" || err.code === "auth/popup-closed-by-user") {
         if (window.self !== window.top) {
            alert("Google Sign-In popups are blocked inside the AI Studio preview iframe. Please click the 'Open in New Tab' icon (↗️) at the top right of this preview window and try signing in from the new tab.");
         } else {
            alert("Sign-In popup was closed or cancelled. Please try again.");
         }
      } else {
         alert("Sign-In failed. Please verify cookie/popup settings and try again. Error: " + err.message);
      }
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
        { id: "drive", label: "Drive", icon: <HardDrive className="w-4 h-4" /> },
      ],
    },
    {
      label: "Organise",
      items: [
        { id: "lessons", label: "Lesson Planner", icon: <BookOpen className="w-4 h-4" /> },
        { id: "projects", label: "Projects", icon: <FolderKanban className="w-4 h-4" /> },
        { id: "timetable", label: "Time Table", icon: <Calendar className="w-4 h-4" /> },
        { id: "memory", label: "Memory Bio", icon: <Brain className="w-4 h-4" /> },
        { id: "students", label: "Student Registry", icon: <Database className="w-4 h-4" /> },
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
    });

    return (
      <div className="min-h-screen bg-paper-0 flex items-center justify-center p-4 sm:p-6 font-sans">
        <div className="max-w-[1000px] w-full animate-fade-up bg-[#fcf9f3] border border-paper-3 rounded-[32px] shadow-[0_12px_40px_-16px_rgba(26,22,18,0.12)] overflow-hidden grid grid-cols-1 md:grid-cols-12 min-h-[580px]">
          
          {/* Left Column - deep-green brand panel */}
          <div className="md:col-span-6 bg-[#2d5a4a] p-10 sm:p-12 flex flex-col justify-between text-[#fcf9f3] relative overflow-hidden select-none">
            {/* Soft background glow */}
            <div className="absolute top-0 right-0 w-80 h-80 bg-white/[0.025] rounded-full blur-3xl pointer-events-none -mr-16 -mt-16 bg-gradient-to-br from-white/10 to-transparent"></div>

            {/* Logo and school header */}
            <div className="space-y-6 relative z-10">
              <div className="flex items-start gap-4">
                <div className="w-[44px] h-[44px] bg-[#fcf9f3] rounded-[10px] flex items-center justify-center text-[#2d5a4a] text-[22px] font-bold font-serif shadow-sm">
                  V
                </div>
                <div className="space-y-0.5">
                  <p className="font-mono text-[11px] text-[#fcf9f3]/70 uppercase tracking-[0.16em] font-semibold leading-none pt-0.5">
                    VASANT VALLEY SCHOOL
                  </p>
                  <h1 className="font-serif font-semibold text-lg text-[#fcf9f3] tracking-tight">
                    Faculty Planner
                  </h1>
                </div>
              </div>
            </div>

            {/* Display message */}
            <div className="my-10 relative z-10 space-y-4">
              <p className="font-mono text-[11px] text-[#fcf9f3]/65 uppercase tracking-[0.12em] font-medium">
                {loginTodayMono}
              </p>
              <h2 className="font-serif text-[38px] leading-[1.1] font-normal text-[#fcf9f3] tracking-tight">
                Your day, gathered<br />before the bell.
              </h2>
              <p className="font-serif italic text-sm text-[#fcf9f3]/80 leading-relaxed max-w-sm">
                A quiet desk for lessons, mail and meetings - grounded in your own curriculum notes.
              </p>
            </div>

            {/* Features check rows with elegant circular check marks */}
            <div className="space-y-4 relative z-10 pt-6 border-t border-white/10">
              <div className="flex items-start gap-3.5 text-[13px] text-[#fcf9f3]/95">
                <div className="w-5 h-5 rounded-full bg-white/10 flex items-center justify-center text-[#fcf9f3] font-bold mt-0.5 flex-shrink-0">
                  <Check className="w-3 h-3 stroke-[2.5]" />
                </div>
                <span className="leading-relaxed">Read unread parent mail and prepare measured reply drafts.</span>
              </div>
              <div className="flex items-start gap-3.5 text-[13px] text-[#fcf9f3]/95">
                <div className="w-5 h-5 rounded-full bg-white/10 flex items-center justify-center text-[#fcf9f3] font-bold mt-0.5 flex-shrink-0">
                  <Check className="w-3 h-3 stroke-[2.5]" />
                </div>
                <span className="leading-relaxed">Compose point-wise day plans from syllabus and timetable.</span>
              </div>
              <div className="flex items-start gap-3.5 text-[13px] text-[#fcf9f3]/95">
                <div className="w-5 h-5 rounded-full bg-white/10 flex items-center justify-center text-[#fcf9f3] font-bold mt-0.5 flex-shrink-0">
                  <Check className="w-3 h-3 stroke-[2.5]" />
                </div>
                <span className="leading-relaxed">Everything stays on a sandboxed local memory.</span>
              </div>
            </div>
          </div>

          {/* Right Column - sign-in panel */}
          <div className="md:col-span-6 p-10 sm:p-12 flex flex-col justify-between bg-[#fcf9f3] relative select-none">
            {/* Top spacer to balance formatting */}
            <div className="hidden md:block"></div>

            <div className="max-w-xs w-full mx-auto space-y-8 my-auto">
              <div className="space-y-2">
                <p className="font-mono text-[11px] text-[#7a756f] tracking-[0.16em] uppercase font-bold leading-none">
                  STAFFROOM ENTRANCE
                </p>
                <h3 className="font-serif text-[32px] font-medium text-[#1a1612] tracking-tight leading-tight">
                  Welcome back.
                </h3>
                <p className="font-serif italic text-xs text-[#7a756f]">
                  Sign in to open today's planner.
                </p>
              </div>

              {/* Styled horizontal dividers and the Google Sign-In button */}
              <div className="space-y-6 pt-2">
                <div className="border-t border-[#e2dacb] w-full"></div>
                
                <button
                  onClick={handleLoginGoogle}
                  className="w-full bg-[#fcf9f3] hover:bg-[#ece6db] border border-[#e1d8c6] text-[#1a1612] font-mono text-[11px] uppercase tracking-wider font-semibold py-4 rounded-[10px] transition-all duration-200 cursor-pointer flex items-center justify-center gap-3 shadow-sm active:scale-[0.99]"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" className="flex-shrink-0">
                    <path fill="#4285F4" d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v3.92h6.69c-.29 1.5-.11 3-.3 4.49l3.2 2.48c1.87-1.72 2.94-4.26 2.94-7.14z" />
                    <path fill="#34A853" d="M12 24c3.24 0 5.97-1.08 7.96-2.91l-3.2-2.48c-.9.6-2.03.96-3.23.96-3.12 0-5.77-2.11-6.71-4.96h-3.3v2.55C5.51 21.05 8.52 24 12 24z" />
                    <path fill="#FBBC05" d="M5.29 14.61A7.19 7.19 0 0 1 4.9 12c0-.82.14-1.61.39-2.36V7.08h-3.3a11.94 11.94 0 0 0 0 9.84l3.3-2.31z" />
                    <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.22 0 12 0 8.52 0 5.51 2.95 3.51 7.08l3.3 2.31c.94-2.85 3.59-4.96 6.71-4.96z" />
                  </svg>
                  Sign in with Google
                </button>

                <div className="border-t border-[#e2dacb] w-full"></div>
              </div>

            </div>

            {/* Bottom alignment spacer */}
            <div className="hidden md:block"></div>
          </div>
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
        return (
          <TasksView 
            userId={currentUser?.userId} 
            initialSelectedTaskId={selectedTaskIdForView}
            onClearInitialTaskId={() => setSelectedTaskIdForView(null)}
          />
        );
      case "chat":
        return (
          <ChatView 
            userId={currentUser?.userId} 
            googleToken={googleToken} 
            initialCommandPrompt={proposedActionPrompt}
            onClearCommandPrompt={() => setProposedActionPrompt(null)}
            initialSelectedChatMessageId={selectedChatMessageIdForView}
            onClearInitialChatMessageId={() => setSelectedChatMessageIdForView(null)}
          />
        );
      case "email":
        return (
          <EmailView 
            googleToken={googleToken} 
            currentUser={currentUser} 
            userId={currentUser?.userId} 
            onSwitchAccount={handleLoginGoogle} 
            initialSelectedEmailId={selectedEmailIdForView}
            onClearInitialEmailId={() => setSelectedEmailIdForView(null)}
          />
        );
      case "calendar":
        return (
          <CalendarView 
            userId={currentUser?.userId} 
            googleToken={googleToken}
            onReauth={handleLoginGoogle}
            initialSelectedEventId={selectedEventIdForView}
            onClearInitialEventId={() => setSelectedEventIdForView(null)}
          />
        );
      case "memory":
        return (
          <MemoryView 
            userId={currentUser?.userId} 
            initialSelectedMemoryId={selectedMemoryIdForView}
            onClearInitialMemoryId={() => setSelectedMemoryIdForView(null)}
          />
        );
      case "timetable":
        return <TimetableView userId={currentUser?.userId} />;
      case "drive":
        return <DriveView userId={currentUser?.userId} googleToken={googleToken} onReauth={handleLoginGoogle} />;
      case "students":
        return (
          <StudentsView 
            userId={currentUser?.userId} 
            initialSelectedStudentId={selectedStudentIdForView}
            onClearInitialStudentId={() => setSelectedStudentIdForView(null)}
          />
        );
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
            className="p-1.5 hover:bg-paper-2 rounded focus:outline-none focus-visible:ring-2 focus-visible:ring-[#2d5a4a]/40"
          >
            <Menu className="w-5 h-5 text-ink-900" />
          </button>
          <span className="font-serif font-black text-sm text-chalk-600 uppercase tracking-tight">Faculty Planner</span>
          {!isOnline && (
            <span className="bg-redpen/10 text-redpen border border-redpen/20 px-1 py-0.5 rounded font-mono text-[11px] font-bold uppercase tracking-wider animate-pulse">
              Off
            </span>
          )}
        </div>
        <div className="font-sans font-bold text-sm text-[#4a4540]">{activeTitle}</div>
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
                <span className="font-mono text-[11px] text-ink-500 font-bold uppercase block">{todayStr}</span>
                <span className="font-serif font-bold text-sm text-chalk-600 block leading-snug">Vasant Valley School</span>
              </div>

              {/* Navigation list */}
              <div className="space-y-4">
                {sections.map((sec, idx) => (
                  <div key={idx} className="space-y-1.5">
                    <span className="font-sans text-sm text-[#4a4540] font-medium block pb-1 border-b border-[#e1d8c6] mb-2">{sec.label}</span>
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
                  <span className="block truncate font-mono text-[11px] text-ink-300 font-normal">{currentUser.email}</span>
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    setCurrentTab("settings");
                    setMobileDrawerOpen(false);
                  }}
                  className="font-mono text-[11px] text-ink-500 hover:text-chalk-600 border border-paper-2 bg-paper-0 p-1.5 rounded flex-1 text-center"
                >
                  Configure
                </button>
                <button
                  onClick={handleLogout}
                  className="font-mono text-[11px] text-redpen hover:border-redpen border border-paper-2 bg-paper-0 p-1.5 rounded flex-1 text-center font-bold"
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
                    <span className="bg-redpen/10 text-redpen border border-redpen/20 px-1 py-0.5 rounded font-mono text-[11px] font-bold uppercase tracking-wider animate-pulse">
                      Disconnected
                    </span>
                  )}
                </div>
                <p className="font-sans text-[11px] text-ink-400 mt-0.5 leading-none">Vasant Valley School</p>
              </div>
            </div>
            {/* Mono date line under a hairline */}
            <div className="mt-3.5 pt-2 border-t border-[#ece6db]">
              <span className="font-sans text-sm font-semibold text-[#4a4540]">
                {todayStr.toUpperCase()}
              </span>
            </div>
          </div>

          {/* Spotlight Search Mimic Trigger */}
          <div className="px-1">
            <button
              onClick={() => setIsCommandBarOpen(true)}
              className="w-full flex items-center justify-between px-3 py-2 bg-[#fcf9f3] hover:bg-[#ece6db]/50 border border-[#e1d8c6] rounded-lg text-left text-ink-405 group focus:outline-none transition-all cursor-pointer shadow-sm"
              title="Shortcut: Ctrl+K"
            >
              <div className="flex items-center gap-2 text-xs">
                <Search className="w-4 h-4 text-[#8b857b] group-hover:text-ink-600 transition-colors" />
                <span className="font-serif italic text-[#8b857b] group-hover:text-ink-600 transition-colors">Search anything...</span>
              </div>
              <span className="text-[11px] font-mono font-semibold bg-[#ece6db]/60 border border-[#e1d8c6] px-1.5 py-0.5 rounded text-[#4a4540] tracking-wider">
                Ctrl+K
              </span>
            </button>
          </div>

          {/* Middle Navigation Grouped Nav */}
          <div className="space-y-5">
            {sections.map((sec, idx) => (
              <div key={idx} className="space-y-2">
                <span className="font-mono text-[11px] text-ink-400 font-bold tracking-[0.18em] uppercase block px-1">
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
                            <span className="bg-[#b83232] text-white font-mono text-[11px] font-bold px-1.5 py-0.5 rounded-full leading-none">
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
              <span className="font-mono text-[11px] text-ink-400 block truncate leading-none mt-0.5">
                {currentUser?.username || "dverma"}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-1.5 pt-1">
            <button
              onClick={() => setCurrentTab("settings")}
              className={`font-mono text-[11px] text-[#4a4540] hover:text-[#2d5a4a] bg-transparent hover:bg-[#e8f0ec] border border-[#e1d8c6] py-1.5 rounded-md flex items-center justify-center gap-1 focus:outline-none transition-colors uppercase tracking-wider font-semibold ${
                currentTab === "settings" && "bg-chalk-100 border-[#d2e3da] text-chalk-700"
              }`}
            >
              <Cog className="w-3 h-3" />
              Configure
            </button>
            <button
              onClick={handleLogout}
              className="font-mono text-[11px] text-[#4a4540] hover:text-[#b83232] bg-transparent hover:bg-red-50 border border-[#e1d8c6] py-1.5 rounded-md flex items-center justify-center gap-1 focus:outline-none transition-colors uppercase tracking-wider font-semibold"
            >
              <LogOut className="w-3 h-3" />
              Sign Out
            </button>
          </div>
        </div>

      </aside>

      {/* CENTRAL SCROLL VIEWPORT */}
      <main className="flex-1 overflow-y-auto p-4 sm:p-6 pb-12 min-w-0">
        <Suspense fallback={
          <div className="w-full h-full flex flex-col items-center justify-center space-y-4">
            <div className="w-8 h-8 rounded-full border-2 border-[#2d5a4a]/20 border-t-[#2d5a4a] animate-spin" />
            <p className="font-mono text-xs uppercase tracking-widest text-[#7a756f]">Loading View...</p>
          </div>
        }>
          {renderActiveView()}
        </Suspense>
      </main>

      {/* Global Spot Command Search Modal Bar Overlay */}
      <Suspense fallback={null}>
        <CommandBar 
          userId={currentUser?.userId}
          isOpen={isCommandBarOpen}
          onClose={() => setIsCommandBarOpen(false)}
          onNavigateTab={(tab) => setCurrentTab(tab)}
          onSendAssistantPrompt={handleSendAssistantPrompt}
          onSelectStudent={(studentId) => setSelectedStudentIdForView(studentId)}
          onSelectTask={(taskId) => setSelectedTaskIdForView(taskId)}
          onSelectEvent={(eventId) => setSelectedEventIdForView(eventId)}
          onSelectMemory={(memoryId) => setSelectedMemoryIdForView(memoryId)}
          onSelectEmail={(emailId) => setSelectedEmailIdForView(emailId)}
          onSelectChatMessage={(messageId) => setSelectedChatMessageIdForView(messageId)}
        />
      </Suspense>

      {/* Real-time In-App Notification Alerts Stack */}
      <div className="fixed bottom-5 right-5 z-50 space-y-3 max-w-sm w-full pointer-events-none">
        <AnimatePresence>
          {appAlerts.map((alert) => (
            <motion.div
              key={alert.id}
              initial={{ opacity: 0, y: 50, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -20, scale: 0.9, transition: { duration: 0.15 } }}
              className="pointer-events-auto bg-[#faf7f2] border-2 border-amber-300 rounded-xl p-4 shadow-[0_10px_25px_-5px_rgba(26,22,18,0.12)] flex items-start gap-3 text-[#1a1612] font-sans"
            >
              <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
              <div className="flex-1 min-w-0">
                <h4 className="font-sans font-bold text-xs uppercase tracking-wider text-amber-900">{alert.title}</h4>
                <p className="font-serif italic text-xs text-[#5c564f] mt-1 leading-normal">
                  {alert.message}
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setAppAlerts((prev) => prev.filter((a) => a.id !== alert.id));
                  }}
                  className="mt-2 text-[10px] font-mono font-bold text-[#2d5a4a] hover:text-[#3a7560] uppercase tracking-wider cursor-pointer"
                >
                  Dismiss Alert
                </button>
              </div>
              <button
                type="button"
                onClick={() => {
                  setAppAlerts((prev) => prev.filter((a) => a.id !== alert.id));
                }}
                className="text-[#a29c91] hover:text-[#1a1612] transition-colors"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

    </div>
  );
}
