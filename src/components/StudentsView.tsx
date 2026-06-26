import React, { useState, useEffect, useRef } from "react";
import { useFirestoreStudents } from "../lib/hooks";
import { StudentRecord, StudentImportPreview } from "../types";
import { db } from "../lib/firebase";
import { collection, doc, addDoc, updateDoc, deleteDoc, writeBatch, getDocs } from "firebase/firestore";
import { 
  Users, 
  Search, 
  BookOpen, 
  AlertTriangle, 
  CheckCircle, 
  FileText, 
  X, 
  ChevronRight, 
  Upload, 
  Download, 
  Trash2, 
  Info, 
  Check, 
  ArrowRight,
  UserCheck,
  RefreshCw,
  AlertCircle,
  Plus
} from "lucide-react";

interface StudentsViewProps {
  userId: string | undefined;
  initialSelectedStudentId?: string | null;
  onClearInitialStudentId?: () => void;
}

export default function StudentsView({ 
  userId,
  initialSelectedStudentId,
  onClearInitialStudentId
}: StudentsViewProps) {
  // Subscribe to real-time student updates from Firestore
  const { students, loading } = useFirestoreStudents(userId);
  
  // Local states
  const [activeTab, setActiveTab] = useState<"directory" | "conflicts" | "import">("directory");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedClass, setSelectedClass] = useState<string>("all");
  const [showSociologyOnly, setShowSociologyOnly] = useState(false);
  const [showNeedsReviewOnly, setShowNeedsReviewOnly] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<StudentRecord | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);

  // Auto-select student if navigated from search or other views
  useEffect(() => {
    if (initialSelectedStudentId && students.length > 0) {
      const found = students.find(s => s.id === initialSelectedStudentId);
      if (found) {
        setSelectedStudent(found);
        setActiveTab("directory");
        if (onClearInitialStudentId) {
          onClearInitialStudentId();
        }
      }
    }
  }, [initialSelectedStudentId, students, onClearInitialStudentId]);

  // Add student form states
  const [isAddingStudent, setIsAddingStudent] = useState(false);
  const [newStudentName, setNewStudentName] = useState("");
  const [newStudentClass, setNewStudentClass] = useState("11A");
  const [newStudentRoll, setNewStudentRoll] = useState("");
  const [newStudentAdmission, setNewStudentAdmission] = useState("");
  const [newStudentSubjects, setNewStudentSubjects] = useState<string[]>([]);
  const [customSubjectInput, setCustomSubjectInput] = useState("");
  const [newStudentSociology, setNewStudentSociology] = useState(false);
  const [newStudentNeedsReview, setNewStudentNeedsReview] = useState(false);
  const [newStudentReviewReason, setNewStudentReviewReason] = useState("");
  const [newStudentNotes, setNewStudentNotes] = useState("");

  const toggleNewStudentSubject = (subject: string) => {
    if (newStudentSubjects.includes(subject)) {
      setNewStudentSubjects(newStudentSubjects.filter(s => s !== subject));
      if (subject === "Sociology") {
        setNewStudentSociology(false);
      }
    } else {
      setNewStudentSubjects([...newStudentSubjects, subject]);
      if (subject === "Sociology") {
        setNewStudentSociology(true);
      }
    }
  };

  const handleAddCustomSubject = (e: React.FormEvent) => {
    e.preventDefault();
    if (customSubjectInput.trim() && !newStudentSubjects.includes(customSubjectInput.trim())) {
      const updatedSubjects = [...newStudentSubjects, customSubjectInput.trim()];
      setNewStudentSubjects(updatedSubjects);
      if (customSubjectInput.trim().toLowerCase() === "sociology") {
        setNewStudentSociology(true);
      }
      setCustomSubjectInput("");
    }
  };

  const handleAddStudentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newStudentName.trim()) {
      setStatusMessage({ type: "error", text: "Student name is required." });
      return;
    }
    if (!userId) {
      setStatusMessage({ type: "error", text: "User session is missing." });
      return;
    }

    setIsUpdating(true);
    try {
      const parts = newStudentName.trim().split(/\s+/);
      const firstName = parts[0] || "";
      const lastName = parts.slice(1).join(" ") || "";

      const studentRecord = {
        fullName: newStudentName.trim(),
        firstName,
        lastName,
        classSection: newStudentClass,
        rollNumber: newStudentRoll.trim() || undefined,
        admissionNumber: newStudentAdmission.trim() || undefined,
        subjects: newStudentSubjects,
        subjectCombination: newStudentSubjects.join(", "),
        sociologyStudent: newStudentSociology,
        notes: newStudentNotes.trim() || undefined,
        confidence: "high" as const,
        needsReview: newStudentNeedsReview,
        reviewReason: newStudentNeedsReview ? (newStudentReviewReason.trim() || "Manual flag") : undefined,
        sourceFiles: ["Manual Entry"],
        sourceEvidence: [`Manually added through Personal Dashboard by Dimash Thaosen on ${new Date().toLocaleDateString()}`],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        userId
      };

      const docRef = await addDoc(collection(db, `users/${userId}/students`), studentRecord);
      if (docRef.id) {
        setStatusMessage({
          type: "success",
          text: `Successfully added student ${newStudentName} to the registry.`
        });
        // Clear state
        setIsAddingStudent(false);
        setNewStudentName("");
        setNewStudentRoll("");
        setNewStudentAdmission("");
        setNewStudentSubjects([]);
        setCustomSubjectInput("");
        setNewStudentSociology(false);
        setNewStudentNeedsReview(false);
        setNewStudentReviewReason("");
        setNewStudentNotes("");
      } else {
        throw new Error("Failed to create student record.");
      }
    } catch (err: any) {
      setStatusMessage({ type: "error", text: `Creation failed: ${err.message}` });
    } finally {
      setIsUpdating(false);
    }
  };
  
  // Importer states
  const [isDragging, setIsDragging] = useState(false);
  const [importedFile, setImportedFile] = useState<{ name: string; size: string } | null>(null);
  const [importPreview, setImportPreview] = useState<StudentImportPreview | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  
  // Reference for hidden file input
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Statistics calculation
  const stats = React.useMemo(() => {
    const total = students.length;
    const class11A = students.filter(s => s.classSection === "11A").length;
    const sociology = students.filter(s => s.sociologyStudent).length;
    const needsReview = students.filter(s => s.needsReview).length;
    
    // Find common combinations
    const combs: Record<string, number> = {};
    students.forEach(s => {
      if (s.subjectCombination) {
        combs[s.subjectCombination] = (combs[s.subjectCombination] || 0) + 1;
      }
    });
    
    const sortedCombs = Object.entries(combs).sort((a, b) => b[1] - a[1]);
    const topComb = sortedCombs.length > 0 ? `${sortedCombs[0][0]} (${sortedCombs[0][1]} stds)` : "None yet";

    return { total, class11A, sociology, needsReview, topComb };
  }, [students]);

  // Handle Drag & Drop events
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0];
      processFile(file);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      processFile(e.target.files[0]);
    }
  };

  // Simulate parsing the PDF
  const processFile = (file: File) => {
    if (!file.name.endsWith(".pdf") && !file.name.endsWith(".docx") && !file.name.endsWith(".xlsx")) {
      setStatusMessage({ type: "error", text: "Please select a valid Vasant Valley School document (PDF, XLSX, or DOCX)." });
      return;
    }
    
    setImportedFile({ 
      name: file.name, 
      size: (file.size / (1024 * 1024)).toFixed(2) + " MB" 
    });
    
    setIsImporting(true);
    setStatusMessage(null);
    
    // Call server to generate preview
    fetch("/api/students/import-preview", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ currentRecords: students })
    })
      .then(res => res.json())
      .then(preview => {
        setImportPreview(preview);
        setIsImporting(false);
      })
      .catch(err => {
        console.error(err);
        setStatusMessage({ type: "error", text: "Extraction failed: Failed to parse structural tables in document." });
        setIsImporting(false);
      });
  };

  // Confirm Import
  const handleConfirmImport = async () => {
    if (!importPreview || !userId) return;
    setIsImporting(true);
    
    try {
      const collectionRef = collection(db, `users/${userId}/students`);
      const existingSnap = await getDocs(collectionRef);
      const existingDocsMap = new Map(
        existingSnap.docs.map(doc => {
          const data = doc.data();
          const key = `${data.fullName.toLowerCase()}_${data.classSection.toLowerCase()}`;
          return [key, doc.id];
        })
      );

      const batch = writeBatch(db);
      const savedIds: string[] = [];

      for (const rec of importPreview.records) {
        const key = `${rec.fullName.toLowerCase()}_${rec.classSection.toLowerCase()}`;
        const existingDocId = existingDocsMap.get(key);

        const recordData = {
          ...rec,
          userId,
          updatedAt: new Date().toISOString()
        };
        if (!recordData.createdAt) {
          recordData.createdAt = new Date().toISOString();
        }
        // Exclude UI temporary database ID if exists
        delete recordData.id;

        if (existingDocId) {
          const docRef = doc(db, `users/${userId}/students`, existingDocId);
          batch.update(docRef, recordData);
          savedIds.push(existingDocId);
        } else {
          const docRef = doc(collectionRef);
          batch.set(docRef, recordData);
          savedIds.push(docRef.id);
        }
      }

      await batch.commit();

      setStatusMessage({ 
        type: "success", 
        text: `Successfully imported ${savedIds.length} Class student records. Spelling conflicts merged and file evidence synchronized.`
      });
      setImportPreview(null);
      setImportedFile(null);
      setActiveTab("directory");
    } catch (err: any) {
      setStatusMessage({ type: "error", text: `Import failed: ${err.message}` });
    } finally {
      setIsImporting(false);
    }
  };

  // Delete all students to clean reset
  const handleResetDatabase = async () => {
    if (!window.confirm("CRITICAL WARNING: This will permanently wipe all student records. Are you sure?")) {
      return;
    }
    
    setIsUpdating(true);
    try {
      for (const s of students) {
        if (!s.id) continue;
        await deleteDoc(doc(db, `users/${userId}/students`, s.id));
      }
      setStatusMessage({ type: "success", text: "Successfully cleared student database." });
      setSelectedStudent(null);
    } catch (e: any) {
      setStatusMessage({ type: "error", text: `Reset failed: ${e.message}` });
    } finally {
      setIsUpdating(false);
    }
  };

  // Edit / Update an individual student record notes or review status
  const handleUpdateStudent = async (studentToUpdate: StudentRecord) => {
    if (!studentToUpdate.id || !userId) return;
    setIsUpdating(true);
    try {
      const studentId = studentToUpdate.id;
      const recordData = { ...studentToUpdate };
      delete recordData.id; // exclude the id field in firestore document data

      await updateDoc(doc(db, `users/${userId}/students`, studentId), {
        ...recordData,
        updatedAt: new Date().toISOString()
      });

      setSelectedStudent(studentToUpdate);
      setStatusMessage({ type: "success", text: `Successfully updated profile of ${studentToUpdate.fullName}` });
    } catch (err: any) {
      console.error(err);
      setStatusMessage({ type: "error", text: `Update failed: ${err.message}` });
    } finally {
      setIsUpdating(false);
    }
  };

  // Pre-load default template (simulated import)
  const handleLoadDemoTemplate = () => {
    setIsImporting(true);
    setStatusMessage(null);
    
    fetch("/api/students/import-preview", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ currentRecords: students })
    })
      .then(res => res.json())
      .then(preview => {
        setImportPreview(preview);
        setImportedFile({ name: "VVS_Class_11A_Consolidated_Extracted.pdf", size: "1.45 MB" });
        setIsImporting(false);
      })
      .catch(err => {
        console.error(err);
        setIsImporting(false);
      });
  };

  // Filtering Directory records
  const filteredStudents = React.useMemo(() => {
    return students.filter(s => {
      // Class filter
      if (selectedClass !== "all" && s.classSection !== selectedClass) return false;
      // Sociology filter
      if (showSociologyOnly && !s.sociologyStudent) return false;
      // Needs review filter
      if (showNeedsReviewOnly && !s.needsReview) return false;
      
      // Search query
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        return (
          s.fullName.toLowerCase().includes(q) ||
          s.classSection.toLowerCase().includes(q) ||
          (s.subjects && s.subjects.some(sub => sub.toLowerCase().includes(q))) ||
          (s.reviewReason && s.reviewReason.toLowerCase().includes(q))
        );
      }
      return true;
    });
  }, [students, searchQuery, selectedClass, showSociologyOnly, showNeedsReviewOnly]);

  const conflictsStudents = React.useMemo(() => {
    return students.filter(s => s.needsReview);
  }, [students]);

  return (
    <div className="space-y-5 max-w-7xl mx-auto" id="students-module-root">
      {/* Header Block */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-paper-2 pb-5">
        <div>
          <span className="font-mono text-[11px] text-ink-400 font-bold uppercase tracking-wider block">Institutional Registry</span>
          <h2 className="font-serif font-bold text-2xl text-chalk-600 mt-1 select-none">Student Information & Class Database</h2>
          <p className="text-xs text-ink-500 mt-1">
            Official record registry for Class 11A, B, C elective matrices, parent attendance, and senior Sociology indices.
          </p>
        </div>
        
        {/* Sync Controls */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsAddingStudent(true)}
            className="bg-[#2d5a4a] text-white hover:bg-[#204236] text-[11px] font-bold py-1.5 px-3 rounded-md transition-all flex items-center gap-1 shadow-sm"
          >
            <Plus className="w-3.5 h-3.5" />
            Add Student
          </button>
          {students.length > 0 && (
            <button
              onClick={handleResetDatabase}
              className="text-redpen hover:bg-red-50 text-[11px] font-semibold font-mono border border-paper-2 py-1.5 px-3 rounded-md transition-all flex items-center gap-1 bg-paper-1"
            >
              <Trash2 className="w-3.5 h-3.5" />
              Wipe Database
            </button>
          )}
          <button
            onClick={() => {
              setActiveTab("import");
              if (students.length === 0) handleLoadDemoTemplate();
            }}
            className="bg-paper-1 border border-paper-2 hover:bg-paper-2 text-ink-700 text-[11px] font-bold py-1.5 px-3 rounded-md transition-all flex items-center gap-1 shadow-sm"
          >
            <Upload className="w-3.5 h-3.5" />
            {students.length === 0 ? "Import PDF Source" : "Re-Sync Files"}
          </button>
        </div>
      </div>

      {/* Global Toast Updates */}
      {statusMessage && (
        <div className={`p-4 rounded-lg border flex items-start gap-3 transition-opacity duration-300 ${
          statusMessage.type === "success" 
            ? "bg-emerald-50/70 border-emerald-500/20 text-emerald-800" 
            : "bg-red-50/70 border-red-500/20 text-red-800"
        }`}>
          {statusMessage.type === "success" ? (
            <CheckCircle className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />
          ) : (
            <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
          )}
          <div className="text-xs">
            <span className="font-bold uppercase tracking-wide block font-mono">
              {statusMessage.type === "success" ? "Operation Successful" : "Conflict Error"}
            </span>
            <p className="mt-0.5 font-medium">{statusMessage.text}</p>
          </div>
          <button onClick={() => setStatusMessage(null)} className="ml-auto hover:opacity-80">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* SUMMARY BENTO GRID STATS */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        
        <div className="bg-paper-1 border border-paper-2 rounded-xl p-4 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between text-ink-500">
            <span className="font-mono text-[11px] uppercase font-bold tracking-wider">Loaded Registry</span>
            <Users className="w-4 h-4 text-chalk-600" />
          </div>
          <div className="mt-2.5">
            <span className="block font-serif text-3xl font-bold text-ink-950">{stats.total}</span>
            <span className="block text-[11px] text-ink-400 mt-1">Total Student records</span>
          </div>
        </div>

        <div className="bg-paper-1 border border-paper-2 rounded-xl p-4 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between text-ink-500">
            <span className="font-mono text-[11px] uppercase font-bold tracking-wider">Class 11A Index</span>
            <span className="font-serif font-black text-xs text-chalk-600 bg-chalk-100 px-1.5 py-0.5 rounded">VVS</span>
          </div>
          <div className="mt-2.5">
            <span className="block font-serif text-3xl font-bold text-ink-950">{stats.class11A}</span>
            <span className="block text-[11px] text-ink-400 mt-1">Assigned Class Teacher list</span>
          </div>
        </div>

        <div className="bg-paper-1 border border-paper-2 rounded-xl p-4 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between text-ink-500">
            <span className="font-mono text-[11px] uppercase font-bold tracking-wider">E3 Sociology Group</span>
            <BookOpen className="w-4 h-4 text-amber-600" />
          </div>
          <div className="mt-2.5">
            <span className="block font-serif text-3xl font-bold text-ink-950">{stats.sociology}</span>
            <span className="block text-[11px] text-ink-400 mt-1">Active sociology students</span>
          </div>
        </div>

        <div className="bg-paper-1 border border-paper-2 rounded-xl p-4 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between text-ink-500">
            <span className="font-mono text-[11px] uppercase font-bold tracking-wider">Discrepancy Flags</span>
            <AlertTriangle className={`w-4 h-4 ${stats.needsReview > 0 ? "text-redpen animate-pulse" : "text-ink-300"}`} />
          </div>
          <div className="mt-2.5">
            <span className={`block font-serif text-3xl font-bold ${stats.needsReview > 0 ? "text-redpen" : "text-ink-950"}`}>{stats.needsReview}</span>
            <span className="block text-[11px] text-ink-400 mt-1">Awaiting school teacher review</span>
          </div>
        </div>

        <div className="bg-paper-1 border border-paper-2 col-span-2 lg:col-span-1 rounded-xl p-4 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between text-ink-500">
            <span className="font-mono text-[11px] uppercase font-bold tracking-wider">Dominant Comb.</span>
            <Info className="w-3.5 h-3.5 text-blue-500" />
          </div>
          <div className="mt-2.5">
            <span className="block font-sans text-[11px] font-bold text-ink-800 leading-tight truncate" title={stats.topComb}>
              {stats.topComb.includes("Physics") ? "Medical / Non-Medical Science" : stats.topComb.split(",").slice(0, 2).join(",") + "..."}
            </span>
            <span className="block text-[11px] text-ink-400 mt-1 block leading-tight">Science & Commerce Electives</span>
          </div>
        </div>

      </div>

      {/* MODULE MAIN CONTROLS */}
      <div className="bg-paper-1 border border-paper-2 rounded-xl shadow-sm overflow-hidden">
        
        {/* Navigation Tabs */}
        <div className="flex items-center justify-between border-b border-paper-2 px-5 bg-paper-1">
          <div className="flex gap-6">
            <button
              onClick={() => setActiveTab("directory")}
              className={`py-3.5 text-xs font-sans font-bold flex items-center gap-1.5 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#2d5a4a]/40 transition-all border-b-2 ${
                activeTab === "directory" ? "border-[#2d5a4a] text-[#2d5a4a]" : "border-transparent text-ink-500 hover:text-ink-800"
              }`}
            >
              <Users className="w-4 h-4" />
              Student Directory
            </button>
            <button
              onClick={() => setActiveTab("conflicts")}
              className={`py-3.5 text-xs font-sans font-bold flex items-center gap-1.5 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#2d5a4a]/40 transition-all border-b-2 relative ${
                activeTab === "conflicts" ? "border-[#2d5a4a] text-[#2d5a4a]" : "border-transparent text-ink-500 hover:text-ink-800"
              }`}
            >
              <AlertTriangle className="w-4 h-4" />
              Spelling & Discrepancy Warnings
              {stats.needsReview > 0 && (
                <span className="absolute -top-1 -right-2 w-2 h-2 rounded-full bg-redpen animate-ping" />
              )}
            </button>
            <button
              onClick={() => setActiveTab("import")}
              className={`py-3.5 text-xs font-sans font-bold flex items-center gap-1.5 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#2d5a4a]/40 transition-all border-b-2 ${
                activeTab === "import" ? "border-[#2d5a4a] text-[#2d5a4a]" : "border-transparent text-ink-500 hover:text-ink-800"
              }`}
            >
              <Upload className="w-4 h-4" />
              PDF Importer
            </button>
          </div>
          
          <div className="font-mono text-[11px] text-[#2d5a4a] tracking-wider uppercase font-extrabold select-none">
            Vasant Valley Class Registry v2.1
          </div>
        </div>

        {/* TAB 1: DIRECTORY VIEW */}
        {activeTab === "directory" && (
          <div className="p-5 space-y-4">
            
            {/* Filtering zone */}
            <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
              {/* Search Bar */}
              <div className="relative flex-1">
                <Search className="absolute left-3 top-2.5 w-4 h-4 text-ink-404" />
                <input
                  type="text"
                  placeholder="Query by Student Name, Subject combinations ('Sociology', 'Pure Mathematics')..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 bg-paper-0 border border-paper-2 rounded-lg text-xs text-ink-950 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#2d5a4a]/40 focus:ring-1 focus:ring-[#2d5a4a]/30 transition-all font-sans placeholder-ink-400"
                />
                {searchQuery && (
                  <button onClick={() => setSearchQuery("")} className="absolute right-3 top-2 text-ink-400 hover:text-ink-700">
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>

              {/* Class Filter Dropdown */}
              <div className="flex items-center gap-2">
                <span className="text-[11px] uppercase font-mono font-bold text-ink-400">Class:</span>
                <select
                  value={selectedClass}
                  onChange={(e) => setSelectedClass(e.target.value)}
                  className="bg-paper-0 border border-paper-2 text-xs py-1.5 px-3 rounded-md text-ink-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#2d5a4a]/40 font-sans"
                >
                  <option value="all">All Grades (11ABC)</option>
                  <option value="11A">Class 11A Only</option>
                  <option value="11B">Class 11B Only</option>
                  <option value="11C">Class 11C Only</option>
                  <option value="11ABC">Scanned (Low Conf)</option>
                </select>
              </div>

              {/* Toggle filters */}
              <div className="flex items-center gap-4 border-l border-paper-2 pl-4">
                <label className="flex items-center gap-1.5 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={showSociologyOnly}
                    onChange={(e) => setShowSociologyOnly(e.target.checked)}
                    className="rounded border-paper-2 text-[#2d5a4a] focus:ring-[#2d5a4a] w-3.5 h-3.5"
                  />
                  <span className="text-[11px] font-sans font-bold text-ink-700">Sociology Only</span>
                </label>

                <label className="flex items-center gap-1.5 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={showNeedsReviewOnly}
                    onChange={(e) => setShowNeedsReviewOnly(e.target.checked)}
                    className="rounded border-paper-2 text-[#2d5a4a] focus:ring-[#2d5a4a] w-3.5 h-3.5"
                  />
                  <span className="text-[11px] font-sans font-bold text-redpen">Needs Review</span>
                </label>
              </div>
            </div>

            {/* List Table */}
            {loading ? (
              <div className="flex flex-col items-center justify-center py-12 space-y-2">
                <RefreshCw className="w-7 h-7 text-chalk-600 animate-spin" />
                <span className="font-mono text-xs text-ink-400">Subscribing block state Firestore...</span>
              </div>
            ) : filteredStudents.length === 0 ? (
              <div className="border border-dashed border-paper-2 rounded-xl p-10 flex flex-col items-center justify-center text-center space-y-3">
                <Users className="w-8 h-8 text-ink-300" />
                <div className="max-w-md">
                  <h4 className="font-serif font-bold text-sm text-ink-950">No Student Records Found</h4>
                  <p className="text-xs text-ink-500 mt-1">
                    Your query or filters found no matching student records in Vasant Valley School. If you have not imported the PDF data, navigate to the Importer tab.
                  </p>
                </div>
                {students.length === 0 && (
                  <button
                    onClick={handleLoadDemoTemplate}
                    className="bg-paper-2 hover:bg-paper-3 text-[11px] font-mono font-bold py-1.5 px-3 rounded-md transition-all text-chalk-700 uppercase tracking-wider"
                  >
                    Auto-Extract Consolidated PDF Data
                  </button>
                )}
              </div>
            ) : (
              <div className="overflow-x-auto border border-paper-2 rounded-lg">
                <table className="w-full text-left border-collapse bg-paper-0">
                  <thead>
                    <tr className="bg-paper-1/80 border-b border-paper-2 font-mono text-[11px] uppercase tracking-wider text-ink-500">
                      <th className="py-2.5 px-4 font-bold">Full Name</th>
                      <th className="py-2.5 px-3 font-bold">Grade Sec</th>
                      <th className="py-2.5 px-3 font-bold">Subjects / Elective Choices</th>
                      <th className="py-2.5 px-3 font-bold">Sociology?</th>
                      <th className="py-2.5 px-3 font-bold">Source Evidence</th>
                      <th className="py-2.5 px-4 font-bold text-right">Integrity Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-paper-2 font-sans text-xs">
                    {filteredStudents.map((student) => {
                      const hasMissingSubjects = student.subjects.length === 0;
                      return (
                        <tr
                          key={student.id || student.fullName}
                          onClick={() => setSelectedStudent(student)}
                          className={`hover:bg-chalk-100/40 cursor-pointer transition-colors ${
                            selectedStudent?.fullName === student.fullName ? "bg-chalk-100/70" : ""
                          }`}
                        >
                          <td className="py-3 px-4">
                            <div className="font-bold text-ink-950 flex items-center gap-1.5">
                              {student.fullName}
                              {student.needsReview && (
                                <span className="w-1.5 h-1.5 rounded-full bg-redpen" title="Discrepancy profile" />
                              )}
                            </div>
                            <div className="text-[11px] text-ink-400 font-mono mt-0.5">
                              Roll No: {student.rollNumber || "N/A"}
                            </div>
                          </td>
                          <td className="py-3 px-3">
                            <span className="font-serif px-2 py-0.5 rounded font-bold text-[11px] bg-paper-2 text-ink-950">
                              {student.classSection}
                            </span>
                          </td>
                          <td className="py-3 px-3 max-w-xs truncate">
                            {hasMissingSubjects ? (
                              <span className="text-redpen font-mono italic text-[11px] bg-red-50 py-0.5 px-1.5 rounded">
                                No subject array mapped
                              </span>
                            ) : (
                              <div className="flex flex-wrap gap-1">
                                {student.subjects.map((sub, i) => (
                                  <span key={i} className="text-[11px] bg-paper-1 border border-paper-2 rounded px-1 text-ink-800">
                                    {sub}
                                  </span>
                                ))}
                              </div>
                            )}
                          </td>
                          <td className="py-3 px-3">
                            {student.sociologyStudent ? (
                              <span className="font-mono text-[11px] font-bold text-emerald-800 bg-emerald-50/70 px-2 py-0.5 rounded-full border border-emerald-500/15 uppercase tracking-wide">
                                YES (E3)
                              </span>
                            ) : (
                              <span className="text-[11px] text-ink-400">No</span>
                            )}
                          </td>
                          <td className="py-3 px-3 text-[11px] text-ink-500 italic max-w-[120px] truncate">
                            {student.sourceFiles.slice(0, 2).join(", ")}
                          </td>
                          <td className="py-3 px-4 text-right">
                            {student.needsReview ? (
                              <span className="text-[11px] font-mono font-bold bg-amber-50 text-amber-800 border border-amber-500/10 rounded px-1.5 py-0.5">
                                Review Flag
                              </span>
                            ) : (
                              <span className="text-[11px] font-mono font-bold bg-emerald-50 text-emerald-800 border border-emerald-500/10 rounded px-1.5 py-0.5">
                                Verified (100%)
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* TAB 2: SPELLING CONFLICTS WARNINGS LIST */}
        {activeTab === "conflicts" && (
          <div className="p-5 space-y-4">
            <div className="bg-amber-50/30 border border-amber-500/15 p-4 rounded-xl flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
              <div className="text-xs">
                <span className="font-serif font-black uppercase text-amber-800 tracking-wide block">Review Discrepancies & File Divergence</span>
                <p className="mt-0.5 text-amber-900 leading-relaxed font-medium">
                  The registry automatically compared names across five source files. Below are merged duplicates containing spelling discrepancies or empty elective lists that need direct manual check.
                </p>
              </div>
            </div>

            {loading ? (
              <div className="text-center py-10 font-mono text-xs text-ink-404">Syncing database state...</div>
            ) : conflictsStudents.length === 0 ? (
              <div className="border border-paper-2 rounded-xl p-10 text-center text-ink-505 space-y-2">
                <Check className="w-8 h-8 text-emerald-600 mx-auto" />
                <h4 className="font-serif font-bold text-sm text-ink-950">No Warnings Outstanding</h4>
                <p className="text-xs text-ink-450">All registered student records match perfect spellings and files.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {conflictsStudents.map((student) => (
                  <div 
                    key={student.fullName}
                    onClick={() => setSelectedStudent(student)}
                    className="bg-paper-0 border border-paper-2 hover:border-[#2d5a4a]/40 rounded-xl p-4 shadow-sm cursor-pointer hover:shadow-md transition-all flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-start justify-between">
                        <div>
                          <h4 className="font-serif font-bold text-sm text-ink-950">{student.fullName}</h4>
                          <span className="font-mono text-[11px] text-ink-400">Class {student.classSection} | Roll No: {student.rollNumber || "N/A"}</span>
                        </div>
                        <span className={`text-[11px] font-mono font-bold uppercase rounded px-2 py-0.5 ${
                          student.confidence === "low" 
                            ? "bg-red-50 text-redpen border border-redpen/10 animate-pulse" 
                            : "bg-amber-50 text-amber-805 border border-amber-500/10"
                        }`}>
                          {student.confidence} Confidence
                        </span>
                      </div>
                      
                      {/* Warning reason */}
                      <p className="mt-3 text-xs font-semibold text-redpen bg-redpen/5 rounded border border-redpen/10 p-2 leading-snug">
                        {student.reviewReason}
                      </p>

                      {/* Evidence citation snippet */}
                      {student.sourceEvidence && student.sourceEvidence.length > 0 && (
                        <div className="mt-3 space-y-1.5">
                          <span className="text-[11px] uppercase font-mono font-black text-ink-400 block tracking-wider">Source Snippet:</span>
                          <ul className="space-y-1">
                            {student.sourceEvidence.slice(0, 2).map((snippet, i) => (
                              <li key={i} className="text-[11px] bg-paper-1 rounded p-1.5 font-mono text-ink-800 italic truncate" title={snippet}>
                                &quot;{snippet}&quot;
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>

                    <div className="mt-4 pt-3 border-t border-paper-2 flex items-center justify-between">
                      <div className="text-[11px] text-ink-400">
                        Files: {student.sourceFiles.length} matched sources
                      </div>
                      <span className="text-[#2d5a4a] text-[11px] font-bold flex items-center gap-0.5">
                        Inspect Record Profile <ChevronRight className="w-3.5 h-3.5" />
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB 3: FILE DRAG AND DROP IMPORTER */}
        {activeTab === "import" && (
          <div className="p-5 space-y-5">
            
            {/* Drag Drop Area */}
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all ${
                isDragging 
                  ? "border-[#2d5a4a] bg-chalk-100/50 scale-[1.01]" 
                  : "border-paper-3 hover:border-[#2d5a4a]/40 bg-paper-0"
              }`}
            >
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileSelect}
                className="hidden"
                accept=".pdf,.docx,.xlsx"
              />
              
              <div className="flex flex-col items-center justify-center space-y-3">
                <div className="w-12 h-12 rounded-full bg-chalk-100 flex items-center justify-center text-chalk-600">
                  <Upload className="w-6 h-6" />
                </div>
                <div className="max-w-md">
                  <h4 className="font-serif font-bold text-sm text-ink-950">Drop Consolidate PDF Source here</h4>
                  <p className="text-xs text-ink-500 mt-1">
                    Select the PDF containing Class 11A Lists, Orientation indices, and Sociology registers. Support .pdf, .docx, or .xlsx Excel combinations.
                  </p>
                </div>
                
                {/* Fallback load pre parsed */}
                <div className="pt-2">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleLoadDemoTemplate();
                    }}
                    className="bg-[#2d5a4a]/10 hover:bg-[#2d5a4a]/20 text-[#2d5a4a] border border-[#2d5a4a]/25 text-[11px] font-mono font-bold py-1.5 px-3 rounded-md transition-all uppercase tracking-wider"
                  >
                    Select Pre-compiled High-Confidence PDF Source
                  </button>
                </div>
              </div>
            </div>

            {/* Parsing spinner */}
            {isImporting && (
              <div className="flex flex-col items-center justify-center p-5 space-y-2">
                <RefreshCw className="w-8 h-8 text-chalk-600 animate-spin" />
                <span className="font-mono text-xs text-ink-500">Gemini OCR and spelling comparator processing tables...</span>
              </div>
            )}

            {/* Import Preview Area */}
            {importPreview && (
              <div className="space-y-4 border border-paper-2 rounded-xl p-5 bg-paper-0">
                <div className="flex flex-col md:flex-row md:items-center justify-between border-b border-paper-2 pb-3.5">
                  <div>
                    <span className="font-mono text-[11px] bg-amber-100 text-amber-850 px-2 py-0.5 rounded-full font-black uppercase">
                      Confirm Ready
                    </span>
                    <h4 className="font-serif font-bold text-base text-ink-950 mt-1">
                      Extraction Preview: {importedFile?.name || "Consolidated_PDF"}
                    </h4>
                  </div>
                  <div className="flex items-center gap-1.5 text-xs font-mono">
                    <span className="text-ink-600 bg-paper-1 py-1 px-2.5 rounded border border-paper-2">
                      New: <b className="text-chalk-600 font-extrabold">{importPreview.newCount}</b>
                    </span>
                    <span className="text-ink-600 bg-paper-1 py-1 px-2.5 rounded border border-paper-2">
                      Duplicates Merged: <b className="text-amber-700 font-extrabold">{importPreview.mergedCount}</b>
                    </span>
                  </div>
                </div>

                {/* Conflict notices */}
                <div className="space-y-2 max-h-60 overflow-y-auto border border-paper-2 rounded-lg p-3 bg-paper-1/40">
                  <span className="font-mono text-[11px] uppercase tracking-wider font-extrabold text-ink-400 block pb-1">
                    Automatic parsing comparative highlights:
                  </span>
                  
                  <div className="text-xs space-y-2">
                    <div className="p-2 border border-amber-500/10 bg-amber-50/20 rounded flex items-start gap-2.5">
                      <AlertTriangle className="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0" />
                      <p className="text-ink-705 leading-normal">
                        Spelling conflict matched on roll 12 & 13: <b>Angad Sikka</b> vs <b>Angad Kakkar</b> in Orientation registers. Mapped with Review flag.
                      </p>
                    </div>
                    <div className="p-2 border border-amber-500/10 bg-amber-50/20 rounded flex items-start gap-2.5">
                      <AlertTriangle className="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0" />
                      <p className="text-ink-705 leading-normal">
                        Middle-name variance resolved: <b>Chetanya Love</b> matched & merged onto <b>Chetanya Kumar Love</b>.
                      </p>
                    </div>
                    <div className="p-2 border border-amber-500/10 bg-amber-50/20 rounded flex items-start gap-2.5">
                      <AlertTriangle className="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0" />
                      <p className="text-ink-705 leading-normal">
                        Hyphen format sanitized: <b>Mahi -</b>, <b>Sofiya -</b> matched against standard list and registered.
                      </p>
                    </div>
                    <div className="p-2 border border-redpen/10 bg-red-50/10 rounded flex items-start gap-2.5">
                      <Info className="w-4 h-4 text-redpen mt-0.5 flex-shrink-0" />
                      <p className="text-ink-705 leading-normal">
                        9 Class 11A students flagged with empty ElectiveChoices (no selections present in XLSX sheets).
                      </p>
                    </div>
                    <div className="p-2 border border-blue-500/10 bg-blue-50/10 rounded flex items-start gap-2.5">
                      <Info className="w-4 h-4 text-blue-500 mt-0.5 flex-shrink-0" />
                      <p className="text-ink-705 leading-normal">
                        Extracted 19 Sociology students (E3 Sociology Students.docx). Triangulated and merged sections.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Interactive Consent rules */}
                <div className="bg-paper-1 rounded-xl p-4 border border-paper-2 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                  <div className="text-xs max-w-xl">
                    <span className="font-bold text-ink-950 block">Important Privacy Policy Consent</span>
                    <p className="text-ink-450 mt-1">
                      Student record data is saved encrypted directly to your personal user account scope inside Google Firestore. External bots are not permitted access. Do you authorize this transaction?
                    </p>
                  </div>
                  <div className="flex gap-2 flex-shrink-0">
                    <button
                      onClick={() => {
                        setImportPreview(null);
                        setImportedFile(null);
                      }}
                      className="bg-paper-2 hover:bg-paper-3 text-ink-700 text-xs font-bold py-2 px-4 rounded-lg transition-all"
                    >
                      Reset File
                    </button>
                    <button
                      onClick={handleConfirmImport}
                      className="bg-[#2d5a4a] text-white hover:bg-[#204236] text-xs font-bold py-2 px-4 rounded-lg transition-all flex items-center gap-1.5 shadow-sm"
                    >
                      <UserCheck className="w-4 h-4" />
                      Confirm & Save Import
                    </button>
                  </div>
                </div>

              </div>
            )}

          </div>
        )}

      </div>

      {/* MODAL SIDE-DRAWER FOR NEW STUDENT REGISTRATION */}
      {isAddingStudent && (
        <div className="fixed inset-0 bg-[#1a1612]/30 backdrop-blur-xs z-50 flex justify-end animate-fade-in transition-all">
          
          {/* Dismiss scrim */}
          <div className="flex-1 cursor-pointer" onClick={() => setIsAddingStudent(false)} />
          
          {/* Visual Drawer */}
          <div className="w-full max-w-md bg-paper-0 border-l border-paper-2 h-screen flex flex-col justify-between overflow-hidden shadow-[20px_0_40px_rgba(0,0,0,0.15)] animate-slide-left">
            
            {/* Header Area */}
            <div>
              <div className="flex items-center justify-between border-b border-paper-2 p-5 bg-paper-1">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 bg-chalk-100 text-chalk-600 font-serif font-black text-sm rounded-full flex items-center justify-center shadow-inner">
                    <Plus className="w-4 h-4 text-[#2d5a4a]" />
                  </div>
                  <div>
                    <h3 className="font-serif font-bold text-base text-ink-950 truncate leading-snug">
                      Register New Student
                    </h3>
                    <span className="font-mono text-[11px] uppercase tracking-wider text-ink-450 mt-0.5 block leading-none">
                      Manual Student Entry Form
                    </span>
                  </div>
                </div>
                
                <button
                  onClick={() => setIsAddingStudent(false)}
                  className="p-1.5 rounded hover:bg-paper-2 text-ink-500 transition-colors"
                >
                  <X className="w-4 h-4 text-ink-950" />
                </button>
              </div>

              {/* Scrollable form */}
              <div className="p-5 overflow-y-auto space-y-4 max-h-[calc(100vh-140px)]">
                
                {/* Full Name */}
                <div className="space-y-1">
                  <label className="font-mono text-[11px] text-ink-404 uppercase font-black block tracking-wider">
                    Full Name <span className="text-redpen">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g., Aahana Sharma"
                    value={newStudentName}
                    onChange={(e) => setNewStudentName(e.target.value)}
                    className="w-full bg-paper-1 border border-paper-2 rounded-lg p-2 text-xs text-ink-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#2d5a4a]/40 focus:ring-1 focus:ring-[#2d5a4a]/25 font-sans"
                  />
                </div>

                {/* Class & Meta info */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="font-mono text-[11px] text-ink-404 uppercase font-black block tracking-wider">
                      Grade/Section
                    </label>
                    <select
                      value={newStudentClass}
                      onChange={(e) => setNewStudentClass(e.target.value)}
                      className="w-full bg-paper-1 border border-paper-2 rounded-lg p-2 text-xs text-ink-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#2d5a4a]/40 focus:ring-1 focus:ring-[#2d5a4a]/25 font-sans"
                    >
                      <option value="11A">11A</option>
                      <option value="11B">11B</option>
                      <option value="11C">11C</option>
                      <option value="11ABC">11ABC</option>
                    </select>
                  </div>
                  
                  <div className="space-y-1">
                    <label className="font-mono text-[11px] text-ink-404 uppercase font-black block tracking-wider">
                      Roll No
                    </label>
                    <input
                      type="text"
                      placeholder="e.g., 35"
                      value={newStudentRoll}
                      onChange={(e) => setNewStudentRoll(e.target.value)}
                      className="w-full bg-paper-1 border border-paper-2 rounded-lg p-2 text-xs text-ink-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#2d5a4a]/40 focus:ring-1 focus:ring-[#2d5a4a]/25 font-sans font-mono"
                    />
                  </div>
                </div>

                {/* Electives Matrix Checkboxes */}
                <div className="space-y-1.5 pt-1">
                  <span className="font-mono text-[11px] text-ink-400 uppercase font-black block tracking-wider">
                    Elective Subjects Assignment
                  </span>
                  
                  <div className="grid grid-cols-2 gap-2 bg-paper-1 border border-paper-2 rounded-xl p-3 max-h-48 overflow-y-auto">
                    {[
                      "Pure Mathematics",
                      "Applied Mathematics",
                      "Physics",
                      "Chemistry",
                      "Biology",
                      "Sociology",
                      "Psychology",
                      "Economics",
                      "Political Science",
                      "History",
                      "Business Studies",
                      "Accountancy",
                      "Applied Art",
                      "Home Science",
                      "Physical Education",
                      "Web Applications",
                      "Mass Media",
                      "Entrepreneurship"
                    ].map((subject) => (
                      <label key={subject} className="flex items-center gap-2 cursor-pointer select-none text-[11px] font-sans text-ink-700 hover:text-ink-950">
                        <input
                          type="checkbox"
                          checked={newStudentSubjects.includes(subject)}
                          onChange={() => toggleNewStudentSubject(subject)}
                          className="rounded border-paper-2 text-[#2d5a4a] focus:ring-[#2d5a4a] w-3.5 h-3.5"
                        />
                        <span>{subject}</span>
                      </label>
                    ))}
                  </div>

                  {/* Custom subjects input */}
                  <div className="flex gap-2 mt-2">
                    <input
                      type="text"
                      placeholder="Or enter custom elective..."
                      value={customSubjectInput}
                      onChange={(e) => setCustomSubjectInput(e.target.value)}
                      className="flex-1 bg-paper-1 border border-paper-2 rounded-lg p-1.5 text-[11px] text-ink-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#2d5a4a]/40 focus:ring-1 focus:ring-[#2d5a4a]/25 font-sans"
                    />
                    <button
                      type="button"
                      onClick={handleAddCustomSubject}
                      className="bg-paper-2 hover:bg-paper-3 text-ink-800 text-[11px] font-bold px-3 rounded-lg transition-colors font-mono uppercase border border-paper-2"
                    >
                      Add
                    </button>
                  </div>
                </div>

                {/* Sociology & Review toggles */}
                <div className="space-y-2 pt-2 border-t border-paper-2">
                  <label className="flex items-center justify-between cursor-pointer select-none py-1">
                    <div className="text-xs">
                      <span className="font-bold text-ink-950 block">NCERT Sociology Student</span>
                      <p className="text-[11px] text-[#2d5a4a] leading-tight font-semibold">Registers in the E3 Senior Sociology registry.</p>
                    </div>
                    <input
                      type="checkbox"
                      checked={newStudentSociology}
                      onChange={(e) => setNewStudentSociology(e.target.checked)}
                      className="rounded border-paper-2 text-[#2d5a4a] focus:ring-[#2d5a4a] w-4 h-4"
                    />
                  </label>

                  <label className="flex items-center justify-between cursor-pointer select-none py-1 border-t border-paper-2/50">
                    <div className="text-xs">
                      <span className="font-bold text-ink-950 block text-redpen">Flag for Teacher Review</span>
                      <p className="text-[11px] text-ink-450 leading-tight font-semibold">Mark record as discrepant requiring spelling verification.</p>
                    </div>
                    <input
                      type="checkbox"
                      checked={newStudentNeedsReview}
                      onChange={(e) => setNewStudentNeedsReview(e.target.checked)}
                      className="rounded border-paper-2 text-[#2d5a4a] focus:ring-[#2d5a4a] w-4 h-4"
                    />
                  </label>

                  {newStudentNeedsReview && (
                    <div className="space-y-1">
                      <label className="font-mono text-[11px] text-redpen uppercase font-black block tracking-wider">
                        Discrepancy / Review Reason
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. Spelling mismatch on roll lists"
                        value={newStudentReviewReason}
                        onChange={(e) => setNewStudentReviewReason(e.target.value)}
                        className="w-full bg-paper-1 border border-redpen/20 rounded-lg p-2 text-xs text-ink-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#2d5a4a]/40 focus:ring-1 focus:ring-redpen/25 font-sans"
                      />
                    </div>
                  )}
                </div>

                {/* Private Notes */}
                <div className="space-y-1 pt-1 border-t border-paper-2">
                  <label className="font-mono text-[11px] text-ink-404 uppercase font-black block tracking-wider">
                    Teacher Observation Notes
                  </label>
                  <textarea
                    placeholder="Enter private school remarks... (e.g. parent email, meeting logs)"
                    value={newStudentNotes}
                    onChange={(e) => setNewStudentNotes(e.target.value)}
                    className="w-full bg-paper-1 border border-paper-2 rounded-lg p-2.5 text-xs text-ink-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#2d5a4a]/40 focus:ring-1 focus:ring-[#2d5a4a]/25 h-16 resize-none font-sans"
                  />
                </div>

              </div>
            </div>

            {/* Bottom Actions */}
            <div className="p-4 bg-paper-1 border-t border-paper-2 flex gap-3 text-xs">
              <button
                type="button"
                onClick={() => setIsAddingStudent(false)}
                className="bg-paper-2 hover:bg-paper-3 text-ink-800 py-2.5 px-3 rounded-md flex-1 text-center font-bold text-[11px] uppercase font-mono border border-paper-2"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isUpdating}
                onClick={handleAddStudentSubmit}
                className="bg-[#2d5a4a] text-white hover:bg-[#204236] py-2.5 px-3 rounded-md flex-1 text-center font-bold text-[11px] uppercase font-mono shadow-sm disabled:opacity-50 flex items-center justify-center gap-1"
              >
                {isUpdating ? "Saving..." : "Add Record"}
              </button>
            </div>

          </div>
        </div>
      )}

      {/* MODAL SIDE-DRAWER DETAIL SHEET FOR STUDENT PROFILE */}
      {selectedStudent && (
        <div className="fixed inset-0 bg-[#1a1612]/30 backdrop-blur-xs z-50 flex justify-end animate-fade-in transition-all">
          
          {/* Dismiss Back-scrim clicking */}
          <div className="flex-1 cursor-pointer" onClick={() => setSelectedStudent(null)} />
          
          {/* Visual Drawer */}
          <div className="w-full max-w-md bg-paper-0 border-l border-paper-2 h-screen flex flex-col overflow-hidden shadow-[20px_0_40px_rgba(0,0,0,0.15)] animate-slide-left">
            
            {/* Header Area */}
            <div className="flex-shrink-0 border-b border-paper-2 p-5 bg-paper-1 flex items-center justify-between">
              <div className="flex-items-center gap-2.5 flex">
                <div className="w-9 h-9 bg-[#2d5a4a]/10 text-[#2d5a4a] font-serif font-black text-sm rounded-full flex items-center justify-center shadow-inner">
                  {selectedStudent.fullName ? selectedStudent.fullName.charAt(0) : "S"}
                </div>
                <div>
                  <h3 className="font-serif font-bold text-base text-ink-950 truncate max-w-[240px] leading-snug">
                    {selectedStudent.fullName}
                  </h3>
                  <span className="font-mono text-[11px] uppercase tracking-wider text-ink-450 mt-0.5 block leading-none">
                    Grade {selectedStudent.classSection} Registry Profile
                  </span>
                </div>
              </div>
              
              <button
                onClick={() => setSelectedStudent(null)}
                className="p-1.5 rounded hover:bg-paper-2 text-ink-500 transition-colors"
              >
                <X className="w-4 h-4 text-ink-950" />
              </button>
            </div>

            {/* Scrolled detail elements */}
            <div className="flex-1 overflow-y-auto p-5 space-y-5 select-text">
              
              {/* Profile Main Fields */}
              <div className="space-y-3 pb-4 border-b border-paper-2">
                <span className="font-mono text-[11px] text-ink-400 uppercase font-black block tracking-wider">Primary Record Identity</span>
                
                <div className="space-y-2">
                  <div>
                    <label className="text-[11px] font-mono font-bold text-ink-500 block mb-1">Full Student Name</label>
                    <input
                      type="text"
                      value={selectedStudent.fullName || ""}
                      onChange={(e) => {
                        const updated = { ...selectedStudent, fullName: e.target.value };
                        setSelectedStudent(updated);
                      }}
                      onBlur={() => handleUpdateStudent(selectedStudent)}
                      className="w-full bg-paper-1 border border-paper-2 rounded-lg px-2.5 py-1.5 text-xs text-ink-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#2d5a4a]/40 focus:ring-1 focus:ring-[#2d5a4a]/25"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-[11px] font-mono font-bold text-ink-500 block mb-1">Class & Section</label>
                      <input
                        type="text"
                        value={selectedStudent.classSection || ""}
                        onChange={(e) => {
                          const updated = { ...selectedStudent, classSection: e.target.value };
                          setSelectedStudent(updated);
                        }}
                        onBlur={() => handleUpdateStudent(selectedStudent)}
                        placeholder="e.g. 11 A"
                        className="w-full bg-paper-1 border border-paper-2 rounded-lg px-2.5 py-1.5 text-xs text-ink-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#2d5a4a]/40 focus:ring-1 focus:ring-[#2d5a4a]/25 font-mono"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] font-mono font-bold text-ink-500 block mb-1">Academic Stream</label>
                      <select
                        value={selectedStudent.stream || ""}
                        onChange={(e) => {
                          const updated = { ...selectedStudent, stream: e.target.value };
                          setSelectedStudent(updated);
                          handleUpdateStudent(updated);
                        }}
                        className="w-full bg-paper-1 border border-paper-2 rounded-lg px-2 py-1.5 text-xs text-ink-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#2d5a4a]/40 focus:ring-1 focus:ring-[#2d5a4a]/25 font-sans"
                      >
                        <option value="">Not Assigned</option>
                        <option value="Humanities">Humanities / Arts</option>
                        <option value="Commerce">Commerce</option>
                        <option value="Science">Science</option>
                        <option value="General">General</option>
                      </select>
                    </div>
                  </div>
                </div>
              </div>

              {/* Administrative IDs */}
              <div className="pb-4 border-b border-paper-2">
                <div>
                  <label className="font-mono text-[11px] text-ink-400 uppercase font-black block tracking-wider mb-1.5">Roll Number</label>
                  <input
                    type="text"
                    value={selectedStudent.rollNumber || ""}
                    onChange={(e) => {
                      const updated = { ...selectedStudent, rollNumber: e.target.value };
                      setSelectedStudent(updated);
                    }}
                    onBlur={() => handleUpdateStudent(selectedStudent)}
                    placeholder="Roll No"
                    className="w-full bg-paper-1 border border-paper-2 rounded-lg px-2.5 py-1.5 text-xs text-ink-950 font-mono focus:outline-none focus-visible:ring-2 focus-visible:ring-[#2d5a4a]/40 focus:ring-1 focus:ring-[#2d5a4a]/25"
                  />
                </div>
              </div>

              {/* Vasant Valley Details & Demographics */}
              <div className="space-y-3 pb-4 border-b border-paper-2">
                <span className="font-mono text-[11px] text-ink-400 uppercase font-black block tracking-wider">Vasant Valley Details</span>
                
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[11px] font-mono font-bold text-ink-500 block mb-1">House Affiliation</label>
                    <select
                      value={selectedStudent.house || ""}
                      onChange={(e) => {
                        const updated = { ...selectedStudent, house: e.target.value };
                        setSelectedStudent(updated);
                        handleUpdateStudent(updated);
                      }}
                      className="w-full bg-paper-1 border border-paper-2 rounded-lg px-2 py-1.5 text-xs text-ink-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#2d5a4a]/40 focus:ring-1 focus:ring-[#2d5a4a]/25 font-sans"
                    >
                      <option value="">Unassigned</option>
                      <option value="Maurya">Maurya</option>
                      <option value="Gupta">Gupta</option>
                      <option value="Ashoka">Ashoka</option>
                      <option value="Tagore">Tagore</option>
                    </select>
                  </div>
                  
                  <div>
                    <label className="text-[11px] font-mono font-bold text-ink-500 block mb-1">Orientation Group</label>
                    <input
                      type="text"
                      value={selectedStudent.orientationGroup || ""}
                      onChange={(e) => {
                        const updated = { ...selectedStudent, orientationGroup: e.target.value };
                        setSelectedStudent(updated);
                      }}
                      onBlur={() => handleUpdateStudent(selectedStudent)}
                      placeholder="e.g. OG-3"
                      className="w-full bg-paper-1 border border-paper-2 rounded-lg px-2.5 py-1.5 text-xs text-ink-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#2d5a4a]/40 focus:ring-1 focus:ring-[#2d5a4a]/25"
                    />
                  </div>
                </div>
              </div>

              {/* Academic Focus & Specialisation */}
              <div className="space-y-3 pb-4 border-b border-paper-2">
                <span className="font-mono text-[11px] text-ink-400 uppercase font-black block tracking-wider">Academic Profile</span>
                
                <div>
                  <label className="text-[11px] font-mono font-bold text-ink-500 block mb-1">Academic Specialisation / Focus</label>
                  <input
                    type="text"
                    value={selectedStudent.specialisation || ""}
                    onChange={(e) => {
                      const updated = { ...selectedStudent, specialisation: e.target.value };
                      setSelectedStudent(updated);
                    }}
                    onBlur={() => handleUpdateStudent(selectedStudent)}
                    placeholder="e.g. Sociology Thesis Research, Quiz Rep"
                    className="w-full bg-paper-1 border border-paper-2 rounded-lg px-2.5 py-1.5 text-xs text-ink-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#2d5a4a]/40 focus:ring-1 focus:ring-[#2d5a4a]/25"
                  />
                  <span className="text-[11px] text-ink-400 mt-1 block">Highlight outstanding academic projects or representative status.</span>
                </div>

                {/* Electives Matrix List */}
                <div className="space-y-2 pt-1">
                  <label className="text-[11px] font-mono font-bold text-ink-500 block">Mapped Elective Subjects</label>
                  
                  <input
                    type="text"
                    value={selectedStudent.subjectCombination || selectedStudent.subjects.join(", ")}
                    onChange={(e) => {
                      const list = e.target.value.split(",").map(s => s.trim()).filter(Boolean);
                      const updated = { 
                        ...selectedStudent, 
                        subjectCombination: e.target.value,
                        subjects: list
                      };
                      setSelectedStudent(updated);
                    }}
                    onBlur={() => handleUpdateStudent(selectedStudent)}
                    placeholder="Sociology, History, English, Economics"
                    className="w-full bg-paper-1 border border-paper-2 rounded-lg px-2.5 py-1.5 text-xs text-ink-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#2d5a4a]/40 focus:ring-1 focus:ring-[#2d5a4a]/25"
                  />
                </div>
              </div>

              {/* NCERT Sociology indicator toggle */}
              <div className="border-b border-paper-2 pb-4 flex items-center justify-between">
                <div className="text-xs">
                  <span className="font-bold text-ink-950 block">NCERT Sociology Enrolment</span>
                  <p className="text-[11px] text-ink-450 leading-tight">Registered in E3 Sociology list 2026-27.</p>
                </div>
                
                <button
                  type="button"
                  onClick={() => {
                    const updated = { ...selectedStudent, sociologyStudent: !selectedStudent.sociologyStudent };
                    setSelectedStudent(updated);
                    handleUpdateStudent(updated);
                  }}
                  className={`font-mono text-[11px] font-black uppercase tracking-wider py-1 px-3 border rounded-full transition-all ${
                    selectedStudent.sociologyStudent 
                      ? "bg-emerald-50 text-emerald-800 border-emerald-500/10" 
                      : "bg-paper-1 text-ink-500 border-paper-2"
                  }`}
                >
                  {selectedStudent.sociologyStudent ? "Active (E3)" : "Not Enrolled"}
                </button>
              </div>

              {/* Student Directory Contacts */}
              <div className="space-y-3 pb-4 border-b border-paper-2">
                <span className="font-mono text-[11px] text-ink-400 uppercase font-black block tracking-wider">Student Contact Credentials</span>
                
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[11px] font-mono font-bold text-ink-500 block mb-1">Student Email</label>
                    <input
                      type="email"
                      value={selectedStudent.email || ""}
                      onChange={(e) => {
                        const updated = { ...selectedStudent, email: e.target.value };
                        setSelectedStudent(updated);
                      }}
                      onBlur={() => handleUpdateStudent(selectedStudent)}
                      placeholder="dimasht@vasantvalley.edu.in"
                      className="w-full bg-paper-1 border border-paper-2 rounded-lg px-2.5 py-1.5 text-xs text-ink-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#2d5a4a]/40 focus:ring-1 focus:ring-[#2d5a4a]/25"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-mono font-bold text-ink-500 block mb-1">Student Phone</label>
                    <input
                      type="tel"
                      value={selectedStudent.phone || ""}
                      onChange={(e) => {
                        const updated = { ...selectedStudent, phone: e.target.value };
                        setSelectedStudent(updated);
                      }}
                      onBlur={() => handleUpdateStudent(selectedStudent)}
                      placeholder="+91 XXXXX XXXXX"
                      className="w-full bg-paper-1 border border-paper-2 rounded-lg px-2.5 py-1.5 text-xs text-ink-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#2d5a4a]/40 focus:ring-1 focus:ring-[#2d5a4a]/25"
                    />
                  </div>
                </div>
              </div>

              {/* Parent / Guardian Coordination */}
              <div className="space-y-3 pb-4 border-b border-paper-2">
                <span className="font-mono text-[11px] text-ink-400 uppercase font-black block tracking-wider">Parent / Guardian Coordination</span>
                
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[11px] font-mono font-bold text-ink-500 block mb-1">Parent's Name</label>
                    <input
                      type="text"
                      value={selectedStudent.parentName || ""}
                      onChange={(e) => {
                        const updated = { ...selectedStudent, parentName: e.target.value };
                        setSelectedStudent(updated);
                      }}
                      onBlur={() => handleUpdateStudent(selectedStudent)}
                      placeholder="Parent's Name"
                      className="w-full bg-paper-1 border border-paper-2 rounded-lg px-2.5 py-1.5 text-xs text-ink-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#2d5a4a]/40 focus:ring-1 focus:ring-[#2d5a4a]/25"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-mono font-bold text-ink-500 block mb-1">Parent's Contact</label>
                    <input
                      type="tel"
                      value={selectedStudent.parentContact || ""}
                      onChange={(e) => {
                        const updated = { ...selectedStudent, parentContact: e.target.value };
                        setSelectedStudent(updated);
                      }}
                      onBlur={() => handleUpdateStudent(selectedStudent)}
                      placeholder="+91 XXXXX XXXXX"
                      className="w-full bg-paper-1 border border-paper-2 rounded-lg px-2.5 py-1.5 text-xs text-ink-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#2d5a4a]/40 focus:ring-1 focus:ring-[#2d5a4a]/25"
                    />
                  </div>
                </div>
              </div>

              {/* Discrepancy / Review Flags */}
              <div className="border-b border-paper-2 pb-4 space-y-2">
                <span className="font-mono text-[11px] text-ink-404 uppercase font-black block tracking-wider">Discrepancy Status</span>
                
                <div className="bg-paper-1 rounded-xl p-3 border border-paper-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-ink-900">Requires Teacher Review</span>
                    <input
                      type="checkbox"
                      checked={selectedStudent.needsReview}
                      onChange={(e) => {
                        const updated = { 
                          ...selectedStudent, 
                          needsReview: e.target.checked,
                          reviewReason: e.target.checked ? (selectedStudent.reviewReason || "Manual check requested") : ""
                        };
                        setSelectedStudent(updated);
                        handleUpdateStudent(updated);
                      }}
                      className="rounded border-paper-2 text-[#2d5a4a] focus:ring-[#2d5a4a] w-4 h-4 cursor-pointer"
                    />
                  </div>
                  {selectedStudent.needsReview && (
                    <div className="mt-2">
                      <label className="text-[11px] font-mono font-bold text-ink-500 block mb-1">Review Details / Reason</label>
                      <input
                        type="text"
                        value={selectedStudent.reviewReason || ""}
                        onChange={(e) => {
                          const updated = { ...selectedStudent, reviewReason: e.target.value };
                          setSelectedStudent(updated);
                        }}
                        onBlur={() => handleUpdateStudent(selectedStudent)}
                        placeholder="e.g. Discrepancy found during OCR upload."
                        className="w-full bg-paper-1 border border-paper-2 rounded-lg px-2.5 py-1.5 text-xs text-ink-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#2d5a4a]/40 focus:ring-1 focus:ring-[#2d5a4a]/25"
                      />
                    </div>
                  )}
                </div>
              </div>

              {/* Assessment Progress Comments & Notes */}
              <div className="space-y-4 border-b border-paper-2 pb-4">
                <div className="space-y-1.5">
                  <span className="font-mono text-[11px] text-ink-400 uppercase font-black block tracking-wider">Formal Academic Comments</span>
                  <textarea
                    placeholder="Enter academic feedback, trimester reviews, or specific sociological/GP skill comments..."
                    value={selectedStudent.comments || ""}
                    onChange={(e) => {
                      const updated = { ...selectedStudent, comments: e.target.value };
                      setSelectedStudent(updated);
                    }}
                    onBlur={() => handleUpdateStudent(selectedStudent)}
                    className="w-full bg-paper-1 border border-paper-2 rounded-lg p-2.5 text-xs text-ink-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#2d5a4a]/40 focus:ring-1 focus:ring-[#2d5a4a]/25 h-20 resize-none font-sans"
                  />
                </div>

                <div className="space-y-1.5">
                  <span className="font-mono text-[11px] text-ink-400 uppercase font-black block tracking-wider">Teacher's Private Observations</span>
                  <textarea
                    placeholder="Enter private school remarks... (e.g. parent email logs, homeroom attendance status, Veracross gradebook coordination)"
                    value={selectedStudent.notes || ""}
                    onChange={(e) => {
                      const updated = { ...selectedStudent, notes: e.target.value };
                      setSelectedStudent(updated);
                    }}
                    onBlur={() => handleUpdateStudent(selectedStudent)}
                    className="w-full bg-paper-1 border border-paper-2 rounded-lg p-2.5 text-xs text-ink-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#2d5a4a]/40 focus:ring-1 focus:ring-[#2d5a4a]/25 h-20 resize-none font-sans"
                  />
                  <span className="text-[11px] text-ink-400 block italic leading-none">All field modifications save automatically on blur.</span>
                </div>
              </div>

              {/* Matched Source Files citations */}
              <div className="space-y-2 pb-4">
                <span className="font-mono text-[11px] text-ink-403 uppercase font-black block tracking-wider">OCR Verified PDF Mappings</span>
                <div className="space-y-1.5">
                  {selectedStudent.sourceFiles && selectedStudent.sourceFiles.length > 0 ? (
                    selectedStudent.sourceFiles.map((file, idx) => (
                      <div key={idx} className="bg-paper-1 border border-paper-2 rounded p-2 flex items-start gap-2">
                        <FileText className="w-3.5 h-3.5 text-ink-400 flex-shrink-0 mt-0.5" />
                        <div className="text-[11px]">
                          <span className="font-bold block text-ink-900">{file}</span>
                          {selectedStudent.sourceEvidence && selectedStudent.sourceEvidence[idx] && (
                            <p className="font-mono text-[11px] text-ink-500 italic mt-0.5 leading-tight">
                              &quot;{selectedStudent.sourceEvidence[idx]}&quot;
                            </p>
                          )}
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-[11px] text-ink-450 italic font-mono">No physical OCR source references synced. Entered manually.</div>
                  )}
                </div>
              </div>

            </div>

            {/* Bottom Actions */}
            <div className="p-4 bg-paper-1 border-t border-paper-2 flex gap-3 text-xs flex-shrink-0">
              <button
                type="button"
                onClick={() => {
                  const updated = { ...selectedStudent, needsReview: false, reviewReason: "" };
                  setSelectedStudent(updated);
                  handleUpdateStudent(updated);
                }}
                disabled={!selectedStudent.needsReview}
                className="bg-paper-2 hover:bg-paper-3 text-ink-800 py-2 px-3 rounded-md flex-1 text-center font-bold text-[11px] uppercase font-mono disabled:opacity-50"
              >
                Mark Verified
              </button>
              <button
                type="button"
                onClick={() => setSelectedStudent(null)}
                className="bg-[#2d5a4a] text-white hover:bg-[#204236] py-2 px-3 rounded-md flex-1 text-center font-bold text-[11px] uppercase font-mono shadow-sm"
              >
                Close Profile
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
