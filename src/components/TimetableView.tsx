import React, { useState, useEffect } from "react";
import { useFirestoreTimetable } from "../lib/hooks";
import { TimetableEntry, TimetableImportPreview } from "../types";
import { db } from "../lib/firebase";
import { collection, doc, getDocs, writeBatch } from "firebase/firestore";
import {
  Calendar,
  Upload,
  AlertTriangle,
  CheckCircle2,
  Trash2,
  Clock,
  BookOpen,
  Coffee,
  Check,
  ChevronRight,
  HelpCircle,
} from "lucide-react";

interface TimetableViewProps {
  userId: string | undefined;
}

export default function TimetableView({ userId }: TimetableViewProps) {
  const { timetable, loading: timetableLoading } = useFirestoreTimetable(userId);
  const [preview, setPreview] = useState<TimetableImportPreview | null>(null);
  const [loading, setLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [freePeriods, setFreePeriods] = useState<any[]>([]);
  const [conflicts, setConflicts] = useState<any[]>([]);

  // Standard VVS Timings
  const standardPeriods = [
    { label: "LESSON 1", startTime: "8:10 am", endTime: "8:50 am" },
    { label: "LESSON 2", startTime: "8:50 am", endTime: "9:30 am" },
    { label: "LESSON 3", startTime: "9:45 am", endTime: "10:25 am" },
    { label: "LESSON 4", startTime: "10:25 am", endTime: "11:05 am" },
    { label: "LESSON 5", startTime: "11:15 am", endTime: "11:53 am" },
    { label: "LESSON 6", startTime: "11:53 am", endTime: "12:31 pm" },
    { label: "LESSON 7", startTime: "12:31 pm", endTime: "1:10 pm" },
    { label: "LESSON 8", startTime: "1:45 pm", endTime: "2:23 pm" },
    { label: "LESSON 9", startTime: "2:23 pm", endTime: "3:00 pm" },
  ];

  const daysOfWeek = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];

  useEffect(() => {
    if (userId && timetable.length > 0) {
      // 1. Calculate free periods locally
      const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
      const todayName = days[new Date().getDay()];

      if (todayName === "Saturday" || todayName === "Sunday") {
        setFreePeriods([]);
      } else {
        const todayEntries = timetable.filter((r: any) => r.day.toLowerCase() === todayName.toLowerCase());
        const free = standardPeriods.filter(std => {
          const hasTeaching = todayEntries.some((entry: any) => {
            const p = entry.period.toUpperCase();
            return p.includes(std.label);
          });
          return !hasTeaching;
        });
        setFreePeriods(free);
      }

      // 2. Calculate conflicts locally
      const localConflicts: any[] = [];
      const grouped = new Map<string, any[]>();

      for (const entry of timetable) {
        const key = `${entry.day}_${entry.period}`;
        if (!grouped.has(key)) {
          grouped.set(key, []);
        }
        grouped.get(key)!.push(entry);
      }

      for (const [key, entries] of grouped.entries()) {
        if (entries.length > 1) {
          const [day, period] = key.split("_");
          localConflicts.push({
            type: "clash",
            description: `Double booking detected on ${day} during ${period}`,
            entries
          });
        }
      }
      setConflicts(localConflicts);
    } else {
      setFreePeriods([]);
      setConflicts([]);
    }
  }, [userId, timetable]);

  const handleFetchPreview = async () => {
    if (!userId) return;
    setLoading(true);
    setErrorMsg(null);
    try {
      const res = await fetch("/api/timetable/import-preview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentRecords: timetable }),
      });
      if (!res.ok) throw new Error("Failed to load preview");
      const data = await res.json();
      setPreview(data);
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to load import preview");
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmImport = async () => {
    if (!userId || !preview) return;
    setLoading(true);
    setErrorMsg(null);
    try {
      const collectionRef = collection(db, `users/${userId}/timetableEntries`);
      const existingSnap = await getDocs(collectionRef);
      const existingDocsMap = new Map(
        existingSnap.docs.map(docSnap => {
          const data = docSnap.data();
          const key = `${data.day.toLowerCase()}_${data.period.toLowerCase()}_${data.classSection.toLowerCase()}_${data.subject.toLowerCase()}`;
          return [key, docSnap.id];
        })
      );

      const batch = writeBatch(db);
      const savedIds: string[] = [];

      for (const rec of preview.records) {
        const key = `${rec.day.toLowerCase()}_${rec.period.toLowerCase()}_${rec.classSection.toLowerCase()}_${rec.subject.toLowerCase()}`;
        const existingDocId = existingDocsMap.get(key);

        const recordData = {
          ...rec,
          userId,
          updatedAt: new Date().toISOString()
        };
        if (!recordData.createdAt) {
          recordData.createdAt = new Date().toISOString();
        }
        delete recordData.id;

        if (existingDocId) {
          const docRef = doc(db, `users/${userId}/timetableEntries`, existingDocId);
          batch.update(docRef, recordData);
          savedIds.push(existingDocId);
        } else {
          const docRef = doc(collectionRef);
          batch.set(docRef, recordData);
          savedIds.push(docRef.id);
        }
      }

      await batch.commit();

      setSuccessMsg(`Successfully imported ${savedIds.length} timetable periods!`);
      setPreview(null);
      setTimeout(() => setSuccessMsg(null), 4000);
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to finalize import");
    } finally {
      setLoading(false);
    }
  };

  const handleClearTimetable = async () => {
    if (!userId || !window.confirm("Are you sure you want to clear your loaded timetable entries? This will delete them from your schedule.")) return;
    setLoading(true);
    setErrorMsg(null);
    try {
      const collectionRef = collection(db, `users/${userId}/timetableEntries`);
      const existingSnap = await getDocs(collectionRef);
      
      const batch = writeBatch(db);
      existingSnap.docs.forEach((docSnap) => {
        batch.delete(docSnap.ref);
      });
      
      await batch.commit();
      setSuccessMsg("Timetable cleared successfully.");
      setTimeout(() => setSuccessMsg(null), 3000);
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to clear timetable");
    } finally {
      setLoading(false);
    }
  };

  // Map entry to Day + Period slot
  const getCellContent = (day: string, periodLabel: string) => {
    return timetable.find(
      (entry) =>
        entry.day.toLowerCase() === day.toLowerCase() &&
        entry.period.toUpperCase().includes(periodLabel.toUpperCase())
    );
  };

  if (timetableLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center gap-2">
          <div className="w-8 h-8 border-4 border-[#2d5a4a] border-t-transparent rounded-full animate-spin"></div>
          <span className="font-mono text-xs text-[#7a756f]">Loading schedule...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Title & Stats */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-[#ece6db] pb-4">
        <div>
          <h1 className="font-serif font-semibold text-2xl text-ink-900 tracking-tight">
            Teacher Time Table
          </h1>
          <p className="text-xs text-[#7a756f] mt-1 font-serif italic">
            Integrate teaching periods, supervision duties, and tutorial blocks.
          </p>
        </div>
        
        {timetable.length > 0 && (
          <button
            onClick={handleClearTimetable}
            className="flex items-center gap-2 px-3.5 py-1.5 border border-[#e1d8c6] hover:bg-red-50 hover:border-red-200 text-[#4a4540] hover:text-red-700 font-mono text-xs rounded-lg transition-colors cursor-pointer"
          >
            <Trash2 className="w-3.5 h-3.5" />
            Clear Schedule
          </button>
        )}
      </div>

      {successMsg && (
        <div className="p-4 bg-emerald-50 border border-emerald-100 text-emerald-800 rounded-xl text-xs flex items-center gap-2.5 animate-fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {errorMsg && (
        <div className="p-4 bg-red-50 border border-red-100 text-red-800 rounded-xl text-xs flex items-center gap-2.5 animate-fade-in">
          <AlertTriangle className="w-4 h-4 text-red-600 flex-shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Screen A: No timetable loaded */}
      {timetable.length === 0 && !preview && (
        <div className="bg-[#fcf9f3] border border-[#e2dacb] rounded-2xl p-10 text-center max-w-2xl mx-auto space-y-6 shadow-sm my-6">
          <div className="w-16 h-16 bg-[#e8f0ec] text-[#2d5a4a] rounded-full flex items-center justify-center mx-auto">
            <Calendar className="w-8 h-8" />
          </div>
          
          <div className="space-y-2">
            <h2 className="font-serif font-bold text-lg text-ink-900">Import Your Teacher Time Table</h2>
            <p className="text-xs text-[#7a756f] max-w-md mx-auto leading-relaxed">
              We identified your Vasant Valley School timetable PDF at: <br />
              <code className="bg-paper-1 border border-[#ece6db] px-2 py-1 rounded text-[10px] select-all block mt-1.5 text-ink-800 font-mono">
                C:\Users\dimas\Documents\School Work\Time Table\Teacher Time Tables\Social Science II_DT.pdf
              </code>
            </p>
          </div>

          <div className="pt-2">
            <button
              onClick={handleFetchPreview}
              disabled={loading}
              className="px-6 py-2.5 bg-[#2d5a4a] hover:bg-[#204034] disabled:bg-[#78968b] text-white font-sans text-xs font-bold rounded-xl transition-all shadow-md inline-flex items-center gap-2 cursor-pointer"
            >
              {loading ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              ) : (
                <Upload className="w-4 h-4" />
              )}
              Analyze & Preview PDF Timetable
            </button>
          </div>
        </div>
      )}

      {/* Screen B: Import Preview Modal / Container */}
      {preview && (
        <div className="bg-[#fcf9f3] border border-[#d2e3da] rounded-2xl p-6 space-y-5 shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-[#ece6db] pb-4">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 bg-[#e8f0ec] text-[#2d5a4a] rounded-full flex items-center justify-center">
                <Check className="w-4 h-4" />
              </div>
              <div>
                <h3 className="font-serif font-bold text-sm text-ink-900">Confirm Timetable Import</h3>
                <p className="text-[10px] text-[#7a756f] font-mono mt-0.5">
                  Source: {preview.records[0]?.sourceFile} | {preview.records.length} periods extracted
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setPreview(null)}
                className="px-3.5 py-1.5 border border-[#e1d8c6] hover:bg-[#ece6db]/50 text-[#4a4540] font-sans text-xs font-semibold rounded-lg transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmImport}
                disabled={loading}
                className="px-4 py-1.5 bg-[#2d5a4a] hover:bg-[#204034] text-white font-sans text-xs font-bold rounded-lg transition-colors shadow-sm inline-flex items-center gap-1.5 cursor-pointer"
              >
                {loading && <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>}
                Import & Activate Schedule
              </button>
            </div>
          </div>

          {/* Stats cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-white p-3 rounded-xl border border-[#ece6db]">
              <span className="text-[10px] text-ink-400 font-mono uppercase block">Total Rows</span>
              <span className="text-xl font-bold text-ink-900 mt-1 block">{preview.records.length}</span>
            </div>
            <div className="bg-white p-3 rounded-xl border border-[#ece6db]">
              <span className="text-[10px] text-[#9a6a24] font-mono uppercase block">Needs Review</span>
              <span className="text-xl font-bold text-[#9a6a24] mt-1 block">
                {preview.records.filter((r) => r.needsReview).length}
              </span>
            </div>
            <div className="bg-white p-3 rounded-xl border border-[#ece6db]">
              <span className="text-[10px] text-[#2d5a4a] font-mono uppercase block">Duplicate Rows</span>
              <span className="text-xl font-bold text-[#2d5a4a] mt-1 block">{preview.duplicateCount}</span>
            </div>
            <div className="bg-white p-3 rounded-xl border border-[#ece6db]">
              <span className="text-[10px] text-ink-500 font-mono uppercase block">New Insertions</span>
              <span className="text-xl font-bold text-ink-800 mt-1 block">{preview.newCount}</span>
            </div>
          </div>

          {/* Review Alerts */}
          {preview.records.some((r) => r.needsReview) && (
            <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-xl space-y-2 text-xs text-amber-900">
              <div className="flex items-center gap-2 font-bold">
                <AlertTriangle className="w-4 h-4 text-amber-600" />
                <span>Extracted periods flagged for review:</span>
              </div>
              <ul className="list-disc pl-5 space-y-1 text-[11px] text-amber-800">
                {preview.records
                  .filter((r) => r.needsReview)
                  .map((r, i) => (
                    <li key={i}>
                      <strong>{r.day} {r.period}:</strong> {r.originalText} &mdash; <em>{r.reviewReason}</em>
                    </li>
                  ))}
              </ul>
            </div>
          )}

          {/* Extracted Rows list */}
          <div className="bg-white rounded-xl border border-[#ece6db] overflow-hidden max-h-72 overflow-y-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#fcf9f3] text-ink-500 border-b border-[#ece6db] font-mono text-[10px] sticky top-0">
                <tr>
                  <th className="p-3">Day / Period</th>
                  <th className="p-3">Subject</th>
                  <th className="p-3">Class Section</th>
                  <th className="p-3">Timings</th>
                  <th className="p-3 text-right">Confidence</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#ece6db] text-ink-800">
                {preview.records.map((r, i) => (
                  <tr key={i} className={`hover:bg-[#fcf9f3]/50 ${r.needsReview ? "bg-amber-50/40" : ""}`}>
                    <td className="p-3 font-semibold">
                      <div className="flex items-center gap-1.5">
                        <span className="text-ink-900">{r.day}</span>
                        <span className="text-[10px] text-ink-400 font-mono">({r.period})</span>
                      </div>
                    </td>
                    <td className="p-3">
                      <span className="px-2 py-0.5 bg-paper-1 border border-[#ece6db] rounded font-medium text-[11px]">
                        {r.subject}
                      </span>
                    </td>
                    <td className="p-3 font-mono text-ink-700">{r.classSection}</td>
                    <td className="p-3 text-ink-500">{r.startTime} &ndash; {r.endTime}</td>
                    <td className="p-3 text-right">
                      {r.needsReview ? (
                        <span className="text-[#a66e1e] font-bold bg-amber-100/50 px-1.5 py-0.5 rounded text-[10px]">
                          Review
                        </span>
                      ) : (
                        <span className="text-emerald-700 font-bold bg-emerald-100/40 px-1.5 py-0.5 rounded text-[10px]">
                          High
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Screen C: Timetable Grid & Utilities */}
      {timetable.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Grid column: 8 columns width on desktop */}
          <div className="lg:col-span-8 space-y-6">
            <div className="bg-white border border-[#e2dacb] rounded-2xl shadow-sm overflow-hidden">
              <div className="p-4 bg-[#fcf9f3] border-b border-[#ece6db] flex items-center justify-between">
                <span className="font-serif font-bold text-xs text-ink-900">VVS WEEKLY GRID VIEW</span>
                <span className="font-mono text-[9px] text-[#7a756f] uppercase tracking-wider">Class Days (Mon-Fri)</span>
              </div>

              <div className="overflow-x-auto">
                <div className="min-w-[700px]">
                  {/* Grid header */}
                  <div className="grid grid-cols-6 border-b border-[#ece6db] bg-[#fcf9f3]/40">
                    <div className="p-3 border-r border-[#ece6db] font-mono text-[10px] text-[#7a756f] uppercase font-bold text-center flex items-center justify-center">
                      Period
                    </div>
                    {daysOfWeek.map((day) => (
                      <div
                        key={day}
                        className="p-3 font-serif font-bold text-[13px] text-ink-900 text-center border-r border-[#ece6db] last:border-r-0"
                      >
                        {day}
                      </div>
                    ))}
                  </div>

                  {/* Grid body rows */}
                  <div className="divide-y divide-[#ece6db]">
                    {standardPeriods.map((period, pIdx) => (
                      <div key={period.label} className="grid grid-cols-6 items-stretch">
                        {/* Left column: timing */}
                        <div className="p-3 border-r border-[#ece6db] bg-[#fcf9f3]/20 flex flex-col justify-center items-center text-center">
                          <span className="font-mono text-[10px] font-bold text-ink-800 tracking-tight">
                            {period.label.split(" ")[1] || period.label}
                          </span>
                          <span className="text-[9px] font-mono text-[#8b857b] mt-0.5">
                            {period.startTime}
                          </span>
                        </div>

                        {/* Class days cells */}
                        {daysOfWeek.map((day) => {
                          const cell = getCellContent(day, period.label);
                          
                          return (
                            <div
                              key={day}
                              className={`p-2 border-r border-[#ece6db] last:border-r-0 flex flex-col justify-between min-h-[75px] transition-colors relative group ${
                                cell
                                  ? cell.needsReview
                                    ? "bg-amber-50/40 hover:bg-amber-100/30"
                                    : "bg-[#e8f0ec]/40 hover:bg-[#e8f0ec]/70"
                                  : "bg-transparent hover:bg-[#fcf9f3]/40"
                              }`}
                            >
                              {cell ? (
                                <>
                                  <div className="space-y-1">
                                    <div className="flex items-start justify-between gap-1.5">
                                      <span className="font-sans font-bold text-[11px] text-ink-900 tracking-tight leading-snug">
                                        {cell.subject}
                                      </span>
                                      {cell.needsReview && (
                                        <AlertTriangle className="w-3 h-3 text-amber-600 flex-shrink-0" />
                                      )}
                                    </div>
                                    <span className="font-mono text-[10px] text-ink-500 font-semibold block leading-none">
                                      Class {cell.classSection}
                                    </span>
                                  </div>

                                  <div className="flex items-center justify-between text-[9px] font-mono text-[#8b857b] border-t border-black/[0.03] pt-1 mt-1.5">
                                    <span className="truncate max-w-[55px]">
                                      {cell.room || cell.venue || "Class"}
                                    </span>
                                    <span className="text-[8px] uppercase px-1 rounded bg-black/5">
                                      {cell.teacherCode}
                                    </span>
                                  </div>
                                </>
                              ) : (
                                <div className="flex items-center justify-center h-full">
                                  <span className="text-[9px] font-mono text-[#b1aaa0] tracking-wider uppercase opacity-0 group-hover:opacity-100 transition-opacity">
                                    Free
                                  </span>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Right column: side cards */}
          <div className="lg:col-span-4 space-y-6">
            {/* Free Periods today */}
            <div className="bg-white border border-[#e2dacb] rounded-2xl shadow-sm p-4.5 space-y-4">
              <div className="flex items-center gap-2 border-b border-[#ece6db] pb-2.5">
                <Coffee className="w-4 h-4 text-[#2d5a4a]" />
                <h4 className="font-serif font-bold text-xs text-ink-900 uppercase tracking-wider">Free Periods Today</h4>
              </div>

              {freePeriods.length === 0 ? (
                <p className="text-xs text-[#7a756f] italic">No free periods scheduled for today (or it is a weekend).</p>
              ) : (
                <div className="space-y-2">
                  {freePeriods.map((fp, i) => (
                    <div
                      key={i}
                      className="flex items-center justify-between p-2.5 bg-[#fcf9f3] border border-[#ece6db] rounded-xl text-xs"
                    >
                      <div className="space-y-0.5">
                        <span className="font-bold text-ink-900">{fp.label}</span>
                        <p className="text-[10px] text-[#7a756f] font-mono">
                          {fp.startTime} &ndash; {fp.endTime}
                        </p>
                      </div>
                      <span className="px-2 py-0.5 font-mono text-[9px] font-bold text-[#2d5a4a] bg-emerald-50 rounded-md border border-emerald-100 uppercase">
                        Unassigned
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* conflicts card */}
            <div className="bg-white border border-[#e2dacb] rounded-2xl shadow-sm p-4.5 space-y-4">
              <div className="flex items-center gap-2 border-b border-[#ece6db] pb-2.5">
                <AlertTriangle className="w-4 h-4 text-amber-600" />
                <h4 className="font-serif font-bold text-xs text-ink-900 uppercase tracking-wider">Clash Detection</h4>
              </div>

              {conflicts.length === 0 ? (
                <div className="flex items-center gap-2 text-xs text-[#2a5c48] bg-emerald-50/50 p-2.5 rounded-xl border border-emerald-100">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span className="font-serif italic text-[11px]">All clear! No overlapping period bookings.</span>
                </div>
              ) : (
                <div className="space-y-3">
                  {conflicts.map((conf, i) => (
                    <div
                      key={i}
                      className="p-3 bg-red-50/50 border border-red-100 rounded-xl space-y-2 text-xs text-red-800"
                    >
                      <p className="font-bold">{conf.description}</p>
                      <div className="space-y-1 pl-2 border-l border-red-200">
                        {conf.entries.map((ent: any, j: number) => (
                          <p key={j} className="text-[10px] text-red-700">
                            Class: {ent.classSection} &bull; {ent.subject} ({ent.startTime})
                          </p>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* General info card */}
            <div className="bg-[#fcf9f3] border border-[#ece6db] rounded-2xl p-4.5 space-y-3 text-xs text-[#4a4540]">
              <div className="flex items-center gap-2 font-bold text-ink-900 font-serif">
                <BookOpen className="w-4 h-4 text-[#2d5a4a]" />
                <span>Schedule Reference</span>
              </div>
              <p className="leading-relaxed text-[11px] text-[#7a756f]">
                All timetable listings are automatically mapped in your calendar, daily planner assistant briefings, and command searches.
              </p>
              <div className="text-[10px] space-y-1 font-mono text-[#8b857b]">
                <p>&bull; 8I: Social Science II</p>
                <p>&bull; 11 E3: Class 11 Elective Sociology</p>
                <p>&bull; 12 E1: Class 12 Elective Sociology</p>
                <p>&bull; 11 I E3: Class 11 IGCSE Elective Sociology</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
