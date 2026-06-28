import { useState, useEffect } from "react";
import { collection, query, onSnapshot, orderBy } from "firebase/firestore";
import { db } from "./firebase";
import { Task, CalendarEvent, MemoryItem, ChatMessage, StudentRecord, TimetableEntry } from "../types";
import { schoolEvents } from "../data/schoolEvents";

export function useFirestoreTasks(userId: string | undefined) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) {
      setTasks([]);
      setLoading(false);
      return;
    }
    const q = query(collection(db, `users/${userId}/tasks`), orderBy("createdAt", "desc"));
    const unsub = onSnapshot(q, (snap) => {
      const data = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Task));
      setTasks(data);
      setLoading(false);
    }, (error) => {
      console.error(error);
      setLoading(false);
    });
    return unsub;
  }, [userId]);

  return { tasks, loading };
}

export function useFirestoreEvents(userId: string | undefined) {
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) {
      setEvents(schoolEvents);
      setLoading(false);
      return;
    }
    const q = query(collection(db, `users/${userId}/calendarEvents`), orderBy("createdAt", "desc"));
    const unsub = onSnapshot(q, (snap) => {
      const data = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as CalendarEvent));
      // Merge official school events with user's custom calendar events
      setEvents([...data, ...schoolEvents]);
      setLoading(false);
    }, (error) => {
      console.error(error);
      setLoading(false);
    });
    return unsub;
  }, [userId]);

  return { events, loading };
}

export function useFirestoreMemory(userId: string | undefined) {
  const [memoryItems, setMemoryItems] = useState<MemoryItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) {
      setMemoryItems([]);
      setLoading(false);
      return;
    }
    const q = query(collection(db, `users/${userId}/memoryItems`), orderBy("createdAt", "desc"));
    const unsub = onSnapshot(q, (snap) => {
      const data = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as MemoryItem));
      setMemoryItems(data);
      setLoading(false);
    }, (error) => {
      console.error(error);
      setLoading(false);
    });
    return unsub;
  }, [userId]);

  return { memoryItems, loading };
}

export function useFirestoreChat(userId: string | undefined) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) {
      setMessages([]);
      setLoading(false);
      return;
    }
    const q = query(collection(db, `users/${userId}/chatMessages`), orderBy("timestamp", "asc"));
    const unsub = onSnapshot(q, (snap) => {
      const data = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as ChatMessage));
      setMessages(data);
      setLoading(false);
    }, (error) => {
      console.error(error);
      setLoading(false);
    });
    return unsub;
  }, [userId]);

  return { messages, loading };
}

export function useFirestoreLessonPlans(userId: string | undefined) {
  const [plans, setPlans] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) {
      setPlans([]);
      setLoading(false);
      return;
    }
    const q = query(collection(db, `users/${userId}/lessonPlans`), orderBy("createdAt", "desc"));
    const unsub = onSnapshot(q, (snap) => {
      const data = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setPlans(data);
      setLoading(false);
    }, (error) => {
      console.error(error);
      setLoading(false);
    });
    return unsub;
  }, [userId]);

  return { plans, loading };
}

export function useFirestoreStudents(userId: string | undefined) {
  const [students, setStudents] = useState<StudentRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) {
      setStudents([]);
      setLoading(false);
      return;
    }
    const q = query(collection(db, `users/${userId}/students`), orderBy("fullName", "asc"));
    const unsub = onSnapshot(q, (snap) => {
      const data = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as StudentRecord));
      setStudents(data);
      setLoading(false);
    }, (error) => {
      console.error("Error loaded students from firestore:", error);
      setLoading(false);
    });
    return unsub;
  }, [userId]);

  return { students, loading };
}

export function useFirestoreTimetable(userId: string | undefined) {
  const [timetable, setTimetable] = useState<TimetableEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) {
      setTimetable([]);
      setLoading(false);
      return;
    }
    const q = query(collection(db, `users/${userId}/timetableEntries`));
    const unsub = onSnapshot(q, (snap) => {
      const data = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as TimetableEntry));
      setTimetable(data);
      setLoading(false);
    }, (error) => {
      console.error("Error loading timetable from firestore:", error);
      setLoading(false);
    });
    return unsub;
  }, [userId]);

  return { timetable, loading };
}

export function useTodayTimetable(userId: string | undefined) {
  const { timetable, loading } = useFirestoreTimetable(userId);
  const [todayTimetable, setTodayTimetable] = useState<TimetableEntry[]>([]);

  useEffect(() => {
    if (timetable.length === 0) {
      setTodayTimetable([]);
      return;
    }
    const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
    const todayName = days[new Date().getDay()];
    // Filter by today's day
    const filtered = timetable.filter(entry => entry.day.toLowerCase() === todayName.toLowerCase());
    // Sort by period, let's parse lesson period numbers or times
    const sorted = [...filtered].sort((a, b) => {
      const getPeriodNum = (p: string) => {
        if (p.toLowerCase().includes("dispersal")) return 10;
        const match = p.match(/\d+/);
        return match ? parseInt(match[0], 10) : 99;
      };
      return getPeriodNum(a.period) - getPeriodNum(b.period);
    });
    setTodayTimetable(sorted);
  }, [timetable]);

  return { todayTimetable, loading };
}

