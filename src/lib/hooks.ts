import { useState, useEffect } from "react";
import { collection, query, onSnapshot, addDoc, updateDoc, deleteDoc, doc, getDocs, where, orderBy } from "firebase/firestore";
import { db } from "./firebase";
import { Task, CalendarEvent, MemoryItem, ChatMessage } from "../types";
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
