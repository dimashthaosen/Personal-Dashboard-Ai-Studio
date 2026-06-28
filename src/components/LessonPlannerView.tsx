import { apiFetch } from "../lib/api";
import React, { useState, useEffect, useRef } from "react";
import { BookOpen, ChevronDown, Check, Save, Copy, Loader2, Upload, Sparkles, FileText, Layout, HardDrive } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { CURRICULUM, getChapterForWeek, GP_EXAMPLES, SOCIOLOGY_EXAMPLES } from "../data/curriculum";
import { getAccessToken, db } from "../lib/firebase";
import { addDoc, collection, deleteDoc, doc } from "firebase/firestore";
import { useFirestoreLessonPlans } from "../lib/hooks";

interface ParsedLesson {
  number: number;
  title: string;
  concept: string;
  process: string;
  tools: string;
  assessment: string;
}

interface ParsedPlan {
  learningObjective: string;
  skills: string;
  lessons: ParsedLesson[];
}

function parseLessonPlan(markdown: string, targetCount: number): ParsedPlan {
  const result: ParsedPlan = {
    learningObjective: "",
    skills: "",
    lessons: []
  };

  const objMatch = markdown.match(/\*\*Learning Objective:\*\*\s*(.+)/i);
  if (objMatch) result.learningObjective = objMatch[1].trim();

  const skillsMatch = markdown.match(/\*\*Skills:\*\*\s*(.+)/i);
  if (skillsMatch) result.skills = skillsMatch[1].trim();

  // Split by ## Lesson
  const parts = markdown.split(/##\s*Lesson\s*\d+:/i);
  if (parts.length > 1) {
    for (let i = 1; i <= targetCount; i++) {
      if (i < parts.length) {
        const block = parts[i].split(/##\s*Homework/i)[0].split(/###\s*Reflection/i)[0].split(/---/)[0];
        const titleMatch = parts[i].match(/^\s*(.+)/);
        const title = titleMatch ? titleMatch[1].trim().replace(/[*_`]/g, "") : `Lesson ${i}`;
        
        const conceptMatch = block.match(/\*\*Concept:\*\*\s*(.*?)(?=\n\*\*|$)/s);
        const processMatch = block.match(/\*\*Process:\*\*\s*(.*?)(?=\n\*\*|$)/s);
        const toolsMatch = block.match(/\*\*Tools\/Resources:\*\*\s*(.*?)(?=\n\*\*|$)/s);
        const assessmentMatch = block.match(/\*\*Assessment\/Differentiation:\*\*\s*(.*?)(?=\n\*\*|$)/s);

        result.lessons.push({
          number: i,
          title,
          concept: conceptMatch ? conceptMatch[1].trim().replace(/[*_`]/g, "") : "",
          process: processMatch ? processMatch[1].trim() : "",
          tools: toolsMatch ? toolsMatch[1].trim().replace(/[*_`]/g, "") : "",
          assessment: assessmentMatch ? assessmentMatch[1].trim().replace(/[*_`]/g, "") : ""
        });
      } else {
        result.lessons.push({ number: i, title: "", concept: "", process: "", tools: "", assessment: "" });
      }
    }
  }

  // Pad lessons if needed
  while (result.lessons.length < Math.max(5, targetCount)) {
    result.lessons.push({ number: result.lessons.length + 1, title: "", concept: "", process: "", tools: "", assessment: "" });
  }

  return result;
}

export default function LessonPlannerView({ userId }: { userId?: string }) {
  const { plans, loading: plansLoading } = useFirestoreLessonPlans(userId);
  const [activeTab, setActiveTab] = useState<"create" | "saved">("create");

  // Form State
  const [courseId, setCourseId] = useState<string>("gp8");
  const [learningCycleIndex, setLearningCycleIndex] = useState<number>(0);
  const [week, setWeek] = useState<number>(1);
  const [lessonsPerWeek, setLessonsPerWeek] = useState<number>(2);
  const [pedagogicalMix, setPedagogicalMix] = useState<string>("discussion");
  const [languageTone, setLanguageTone] = useState<string>("accessible");
  
  // Homework State
  const [generateHomework] = useState(false);
  const [homeworkNature, setHomeworkNature] = useState<string>("academic");
  const [customHomeworkPrompt, setCustomHomeworkPrompt] = useState("");

  // Source & Pacing State
  const [customSourceMaterial, setCustomSourceMaterial] = useState("");
  const [pacingOptions, setPacingOptions] = useState<any>(null);
  const [gettingPacing, setGettingPacing] = useState(false);
  const [appliedPacing, setAppliedPacing] = useState<{ count: number; layoutText: string } | null>(null);

  // Generation State
  const [generating, setGenerating] = useState(false);
  const [generatedMarkdown, setGeneratedMarkdown] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // Defaults when course changes
    const course = CURRICULUM[courseId];
    if (course) {
      setLessonsPerWeek(course.defaultLessonsPerWeek);
      setLearningCycleIndex(0);
      setWeek(course.learningCycles[0].weeks[0]);
    }
  }, [courseId]);

  useEffect(() => {
    // When cycle changes, clamp week
    const course = CURRICULUM[courseId];
    if (course && course.learningCycles[learningCycleIndex]) {
      const cycle = course.learningCycles[learningCycleIndex];
      if (week < cycle.weeks[0] || week > cycle.weeks[1]) {
        setWeek(cycle.weeks[0]);
      }
    }
  }, [learningCycleIndex, courseId]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.name.endsWith('.docx')) {
      const reader = new FileReader();
      reader.onload = async (event) => {
        const arrayBuffer = event.target?.result as ArrayBuffer;
        try {
          const mammoth = await import("mammoth");
          const result = await mammoth.extractRawText({ arrayBuffer });
          setCustomSourceMaterial(prev => prev + "\n" + result.value);
        } catch (err) {
          console.error("Error reading docx:", err);
          alert("Failed to read the .docx file.");
        }
      };
      reader.readAsArrayBuffer(file);
    } else if (file.name.endsWith('.txt')) {
      const text = await file.text();
      setCustomSourceMaterial(prev => prev + "\n" + text);
    } else {
      alert("Please upload a .docx or .txt file.");
    }
  };

  const getPacingRecommendation = async () => {
    if (!customSourceMaterial.trim()) return;
    setGettingPacing(true);
    setPacingOptions(null);
    setAppliedPacing(null);
    try {
      const token = await getAccessToken();
      const res = await apiFetch("/api/lessons/pacing", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token && { "Authorization": `Bearer ${token}` })
        },
        body: JSON.stringify({
          prompt: `You are an expert curriculum design assistant. Analyze the following custom educational source material and recommend the optimal lesson pacing.\n\n=== EDUCATIONAL MATERIAL ===\n${customSourceMaterial}\n=== END ===\n\nDetail how this material divides into exactly 2, 3, 4, 5, or 6 lessons in a week. For each configuration, give explicit sequential lesson focuses (Lesson 1, Lesson 2, …). Make each lesson distinct and logical.`
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setPacingOptions(data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setGettingPacing(false);
    }
  };

  const applyPacing = (count: number) => {
    if (!pacingOptions) return;
    const breakdown = pacingOptions[`breakdown${count}`];
    if (breakdown && breakdown.focus) {
      const layoutText = breakdown.focus.map((f: string, i: number) => `- Lesson ${i+1}: ${f}`).join('\n');
      setAppliedPacing({ count, layoutText });
      setLessonsPerWeek(count);
    }
  };

  const handleGenerate = async () => {
    setGenerating(true);
    setGeneratedMarkdown(null);
    
    // Build Prompt
    const course = CURRICULUM[courseId];
    const chapterData = getChapterForWeek(courseId, week);
    
    let toneInstruction: string;
    if (languageTone === "accessible") {
      toneInstruction = "REQUIRED EXPLANATORY TONE: HIGHLY ACCESSIBLE, CONCEPT-CLEAR, ENGAGING. Do NOT dump dense, un-unpacked academic jargon. Use active, student-centric, relatable terms - clear analogies, real-world examples (social media, youth subcultures, mobile phones), step-by-step unpacking. Make the Process feel like an interactive classroom for 16-18 year-olds; introduce, bold, and simply define correct sociological terms.";
    } else {
      toneInstruction = "REQUIRED EXPLANATORY TONE: ADVANCED ACADEMIC. Formal, rigorous, dense with exam-board terminology; university-prep discourse.";
    }

    let pedaMix: string;
    if (pedagogicalMix === "progressive") {
      pedaMix = "PROGRESSIVE LEVEL CURVE - Lesson 1: FIRST PRINCIPLES (definitions, concept mapping, vocabulary; no premature debate). Lesson 2: FIELD CASEWORK / EMPIRICAL READINGS (text excerpts, statistics, case studies). Lesson 3: INTERACTIVE COLLABORATION (dialogue circles, fishbowl, roleplay, peer debate). Lesson 4+: APPLIED SYNTHESIS & WRITING (written arguments, prompt deconstruction, checking fallacies).";
    } else if (pedagogicalMix === "discussion") {
      pedaMix = "CONVERSATIONAL & PERSPECTIVE-HEAVY - Lesson 1: DECONSTRUCTION OF VESTED INTERESTS (locate biases, value judgements, predict outcomes). Lesson 2: DEEP-LEVEL SOCRATIC SEARCH (probe the logic of the source). Lesson 3: THE CLASSROOM FORUM (groups argue Local/National/Global or contrasting theories). Lesson 4+: PERSPECTIVE WRITING SYNTHESIS (reflective arguments, peer-evaluate, trace fallacies).";
    } else if (pedagogicalMix === "research") {
      pedaMix = "RIGOROUS INQUIRY & EXPERIMENTATION - Lesson 1: DATA ANALYTICS & VISUAL LITERACY (charts, graphs, research tools/limits). Lesson 2: SOURCE DISSECTION & CRAAP METRICS. Lesson 3: COMPLEX CASE EXAMPLES (structural vs circumstantial causes). Lesson 4+: HYPOTHESIS & SCIENTIFIC ARGUMENTS (evidence-based briefs, next investigation steps).";
    } else {
      pedaMix = "BOARD EXAM PREPARATION - Lesson 1: EXAM PROMPT & MARK-SCHEME INSIGHTS (past questions, mark boundaries, premium answers). Lesson 2: CONCEPTUAL DRILLS & TIMED STRUCTURES. Lesson 3: TIMED COOPERATIVE WORKSHOP (essay outlines in pairs, rubric checklists). Lesson 4+: PEER ASSESSMENT LOOP (deconstruct attempts, rewrite workshops).";
    }

    const gpInstruction = courseId === "gp8" ? "IMPORTANT: For Grade 8 Global Perspectives, strictly follow the syllabus progression. Do NOT introduce later concepts early. Stick ONLY to the topic assigned for this week." : "";
    const limitInstruction = lessonsPerWeek < 4 ? `IMPORTANT: With only ${lessonsPerWeek} lessons this week, pace appropriately; if the topic is broad, focus on core concepts and carry the remainder to subsequent weeks so the whole syllabus is covered over the year.` : "";

    let contentBlock = chapterData?.chapterContent || "";
    if (courseId === "asLevel" && chapterData?.pastedText) {
      contentBlock += `\n\n${chapterData.pastedText}\n`;
      if (chapterData.keyTerms && chapterData.keyTerms.length > 0) {
        contentBlock += `\nKey Terms: ` + chapterData.keyTerms.map(t => `${t.term} (${t.definition})`).join("; ");
      }
      if (chapterData.keyTheorists && chapterData.keyTheorists.length > 0) {
        contentBlock += `\nKey Theorists: ` + chapterData.keyTheorists.map(t => `${t.name} (${t.contribution})`).join("; ");
      }
    }

    const customSrc = customSourceMaterial.trim() ? `\n=== ADDITIONAL CUSTOM SOURCE MATERIAL ===\n${customSourceMaterial}\n=== END ===\n` : "";
    const pacingInstr = appliedPacing ? `\n=== CRITICAL LESSON DIVISION INSTRUCTION ===\nDivide into EXACTLY ${lessonsPerWeek} lessons. Focus each lesson EXACTLY on:\n${appliedPacing.layoutText}\n=== END ===\n` : "";
    const examples = courseId === "gp8" ? GP_EXAMPLES : SOCIOLOGY_EXAMPLES;

    let homeworkInstruction = "";
    if (generateHomework) {
      homeworkInstruction = `\n## Homework Assignment\n\n**Nature:** ${homeworkNature === "custom" ? customHomeworkPrompt : homeworkNature}\n\n**Task:** [Detailed homework aligned with the week's topic and the requested nature.]\n`;
    }

    const prompt = `
You are an expert ${courseId === "gp8" ? "Global Perspectives" : "Sociology"} teacher at Vasant Valley School, New Delhi writing weekly lesson plans.

Generate a lesson plan for Week ${week} of 40 for ${course.label} with EXACTLY ${lessonsPerWeek} lessons.

${toneInstruction}

${gpInstruction}
${limitInstruction}

This week falls under ${chapterData?.learningCycleLabel} and covers: ${chapterData?.chapterName}

=== SYLLABUS/TEXTBOOK CONTENT FOR THIS WEEK ===
${contentBlock}
=== END ===
${customSrc}
${pacingInstr}
=== GOLD STANDARD EXAMPLES FOR THE 'PROCESS' SECTION ===
${examples}
=== END OF EXAMPLES ===

FORMAT - produce exactly this structure in Markdown:

# Week ${week}: [Topic Title]

**Learning Objective:** [One sentence - what students will understand by end of week]

**Skills:** [2-3 relevant subject skills]

---

## Lesson 1: [Topic]

**Concept:** [chapter/topic name]

**Process:** [~110-word paragraph: open with the central question/idea, describe the main pedagogical move (discussion, debate, data analysis, close reading, case study...), name specific content/examples used, describe what students do analytically, and end with how the lesson closes or transitions. Flowing prose, NOT bullets.]

**Tools/Resources:** Canva, Projector, Whiteboard and marker

**Assessment/Differentiation:** [brief - exit slip, pop quiz, think-pair-share, past-paper question, etc.]

[Repeat for all ${lessonsPerWeek} lessons]

---
${homeworkInstruction}
### Reflection
**What went really well:**
**What could be improved:**
**What have I learned about students that will inform next lesson:**

STRICT RULES:
- Each lesson's Process must be ~110 words of flowing prose, NOT bullet points.
- Emulate the narrative depth, specific context, and pedagogical approaches in the GOLD STANDARD EXAMPLES.
- Reference specific ${courseId === "asLevel" ? "Cambridge Coursebook" : courseId === "soc11" ? "NCERT" : "Cambridge"} content: key concepts, methodologies, examples.
- Adhere strictly to the requested tone.
- Apply the required pedagogical sequencing rule (below) so each lesson is clearly distinct in analytical difficulty and classroom configuration. Never repeat the same structural type or activity twice in one week.
- Leave the three reflection fields blank (label only).
- Use Markdown headers (#, ##, ###) and bold (**) for structure.

${pedaMix}
`.trim();

    try {
      const token = await getAccessToken();
      const res = await apiFetch("/api/lessons/generate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token && { "Authorization": `Bearer ${token}` })
        },
        body: JSON.stringify({ prompt }),
      });
      if (res.ok) {
        const data = await res.json();
        setGeneratedMarkdown(data.markdown);
      } else {
        const data = await res.json().catch(() => ({}));
        alert("Generation failed: " + (data.error || res.statusText));
      }
    } catch (err) {
      console.error(err);
      alert("Failed to generate plan");
    } finally {
      setGenerating(false);
    }
  };

  const handleSaveToDrive = async () => {
    if (!userId || !generatedMarkdown) return;
    const token = await getAccessToken();
    if (!token) {
      alert("Please connect Google Account from Settings to use Drive.");
      return;
    }
    try {
      const name = `Lesson Plan - ${CURRICULUM[courseId]?.label || "Course"} Week ${week}.md`;
      const res = await apiFetch("/api/drive/upload-text", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({ name, content: generatedMarkdown, mimeType: "text/markdown" })
      });
      if (res.ok) alert("Saved to Google Drive!");
      else throw new Error("Failed to save to Drive");
    } catch (err) {
      alert("Could not save to Drive. Check permissions.");
      console.error(err);
    }
  };

  const handleSavePlan = async () => {
    if (!userId || !generatedMarkdown) return;
    try {
      await addDoc(collection(db, `users/${userId}/lessonPlans`), {
        courseId,
        week,
        lessonsPerWeek,
        pedagogicalMix,
        languageTone,
        markdown: generatedMarkdown,
        createdAt: new Date().toISOString(),
        userId
      });
      alert("Plan saved successfully!");
      setActiveTab("saved");
    } catch (e) {
      console.error(e);
      alert("Error saving plan");
    }
  };

  const currentCourse = CURRICULUM[courseId];
  const currentCycle = currentCourse?.learningCycles[learningCycleIndex];

  return (
    <div className="max-w-6xl mx-auto font-sans bg-paper-1 shadow-sm border border-paper-2 rounded-[24px] overflow-hidden min-h-[85vh] flex flex-col">
      {/* Header */}
      <div className="px-6 py-5 border-b border-paper-2 bg-paper-0 flex justify-between items-center z-10 flex-shrink-0">
        <div className="flex gap-4">
          <button
            onClick={() => setActiveTab("create")}
            className={`px-4 py-2 font-serif font-bold text-sm rounded-lg transition-colors ${activeTab === "create" ? "bg-[#2d5a4a] text-white" : "text-ink-600 hover:bg-paper-2"}`}
          >
            Create Plan
          </button>
          <button
            onClick={() => setActiveTab("saved")}
            className={`px-4 py-2 font-serif font-bold text-sm rounded-lg transition-colors ${activeTab === "saved" ? "bg-[#2d5a4a] text-white" : "text-ink-600 hover:bg-paper-2"}`}
          >
            My Plans {plans.length > 0 && `(${plans.length})`}
          </button>
        </div>
      </div>

      {activeTab === "create" && (
        <div className="flex-1 overflow-y-auto relative bg-paper-0">
          
          {/* TOP: Config Panel */}
          <div className="w-full bg-paper-1 border-b border-paper-2 p-5 md:p-8 shrink-0 relative z-10">
            <div className="max-w-5xl mx-auto">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                
                {/* Column 1 */}
                <div className="space-y-5">
              {/* Course Selection */}
              <div>
                <label className="block font-mono text-[11px] text-ink-500 uppercase tracking-widest mb-2 font-bold">Subject & Grade</label>
                <div className="relative">
                  <select
                    className="w-full appearance-none bg-paper-0 border border-paper-3 rounded-lg px-3 py-2.5 text-sm font-sans font-medium text-ink-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#2d5a4a]/40 focus:ring-1 focus:ring-[#2d5a4a]"
                    value={courseId}
                    onChange={(e) => setCourseId(e.target.value)}
                  >
                    {Object.values(CURRICULUM).map((c) => (
                      <option key={c.id} value={c.id}>{c.label}</option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-3 top-3 w-4 h-4 text-ink-400 pointer-events-none" />
                </div>
              </div>

              {/* Cycle & Week */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-mono text-[11px] text-ink-500 uppercase tracking-widest mb-2 font-bold">Learning Cycle</label>
                  <select
                    className="w-full appearance-none bg-paper-0 border border-paper-3 rounded-lg px-3 py-2 text-sm font-medium text-ink-900 text-ellipsis overflow-hidden"
                    value={learningCycleIndex}
                    onChange={(e) => setLearningCycleIndex(Number(e.target.value))}
                  >
                    {currentCourse?.learningCycles.map((c, i) => (
                      <option key={i} value={i}>{c.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block font-mono text-[11px] text-ink-500 uppercase tracking-widest mb-2 font-bold">Week</label>
                  <select
                    className="w-full appearance-none bg-paper-0 border border-paper-3 rounded-lg px-3 py-2 text-sm font-medium text-ink-900"
                    value={week}
                    onChange={(e) => setWeek(Number(e.target.value))}
                  >
                    {currentCycle && Array.from({length: currentCycle.weeks[1] - currentCycle.weeks[0] + 1}, (_, i) => currentCycle.weeks[0] + i).map(w => (
                      <option key={w} value={w}>Week {w}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* Column 2 */}
            <div className="space-y-5">
              {/* Lesson Format Settings */}
              <div>
                <label className="block font-mono text-[11px] text-ink-500 uppercase tracking-widest mb-2 font-bold">Pedagogy & Pacing</label>
                <div className="p-3 bg-chalk-100 rounded-lg border border-chalk-500/10 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-ink-800">Lessons per week</span>
                    <input 
                      type="number" 
                      min={2} 
                      max={6} 
                      disabled={!!appliedPacing}
                      className="w-16 px-2 py-1 text-sm border border-paper-3 rounded bg-paper-0 text-center" 
                      value={lessonsPerWeek} 
                      onChange={(e) => setLessonsPerWeek(Number(e.target.value))}
                    />
                  </div>
                  <div>
                    <span className="text-[11px] uppercase font-mono tracking-wider text-ink-500 mb-1 block">Pedagogical Rhythm</span>
                    <select
                      className="w-full text-xs py-1.5 px-2 bg-paper-0 border border-paper-3 rounded"
                      value={pedagogicalMix}
                      onChange={(e) => setPedagogicalMix(e.target.value)}
                    >
                      <option value="discussion">Conversational / Heavy Discussion</option>
                      <option value="progressive">Progressive Scaffold (Intro to Application)</option>
                      <option value="research">Rigorous Inquiry & Data Work</option>
                      <option value="exam">Board Exam Drill / Review</option>
                    </select>
                  </div>
                  <div>
                    <span className="text-[11px] uppercase font-mono tracking-wider text-ink-500 mb-1 block">Language Tone</span>
                    <select
                      className="w-full text-xs py-1.5 px-2 bg-paper-0 border border-paper-3 rounded"
                      value={languageTone}
                      onChange={(e) => setLanguageTone(e.target.value)}
                    >
                      <option value="accessible">Accessible & Engaging (16-18 Yrs)</option>
                      <option value="academic">Advanced Academic / Board Style</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>

            {/* Column 3 */}
              <div className="space-y-5 lg:col-span-1 md:col-span-2">
                {/* Custom Source material / Pacing Assistant */}
                <div>
                <label className="block font-mono text-[11px] text-ink-500 uppercase tracking-widest mb-1.5 font-bold">Custom Extracurricular Material (Optional)</label>
                <p className="text-[11px] text-ink-400 mb-2 leading-tight">Paste a handout or article here, or upload a .docx/.txt to get AI lesson division recommendations.</p>
                <textarea
                  className="w-full h-24 bg-paper-0 border border-paper-3 rounded-lg p-2 text-xs font-serif leading-relaxed text-ink-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#2d5a4a]/40 focus:ring-1 focus:ring-[#2d5a4a] resize-none"
                  placeholder="Paste article, case study, or handout text here..."
                  value={customSourceMaterial}
                  onChange={(e) => setCustomSourceMaterial(e.target.value)}
                />
                
                <div className="flex gap-2 mt-2">
                  <input type="file" ref={fileInputRef} className="hidden" accept=".txt,.docx" onChange={handleFileUpload} />
                  <button onClick={() => fileInputRef.current?.click()} className="flex items-center gap-1 text-[11px] font-mono uppercase tracking-wider font-bold text-ink-500 hover:text-ink-800 border border-paper-3 bg-paper-0 px-2 py-1.5 rounded">
                    <Upload className="w-3 h-3" /> Upload .docx
                  </button>
                  {customSourceMaterial.trim() && !pacingOptions && !appliedPacing && (
                    <button onClick={getPacingRecommendation} disabled={gettingPacing} className="flex flex-1 justify-center items-center gap-1 text-[11px] font-mono uppercase tracking-wider font-bold text-[#b75a1c] hover:bg-[#b75a1c]/10 border border-[#b75a1c]/30 bg-orange-50/50 px-2 py-1.5 rounded disabled:opacity-50">
                      {gettingPacing ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
                      Pacing AI Recommendations
                    </button>
                  )}
                </div>

                {/* Pacing Recommendations Block */}
                {pacingOptions && !appliedPacing && (
                  <div className="mt-3 bg-orange-50 border border-orange-200 rounded-lg p-3 relative overflow-hidden animate-fade-in">
                    <div className="absolute top-0 right-0 p-1 opacity-20"><Sparkles className="w-16 h-16 text-orange-400" /></div>
                    <h4 className="text-xs font-bold font-sans text-orange-900 mb-1 flex items-center gap-1.5 z-10 relative">
                      Pacing Recommendation
                    </h4>
                    <p className="text-[11px] text-orange-850 italic mb-2 relative z-10 leading-tight">
                      {pacingOptions.reasoning} Difficulty: {pacingOptions.difficulty}.
                    </p>
                    <div className="space-y-1 mt-2 z-10 relative">
                      {[2,3,4,5,6].map(count => {
                        const rec = pacingOptions[`breakdown${count}`];
                        if (rec && rec.focus) {
                          const isRecommended = count === pacingOptions.recommendedCount;
                          return (
                            <button key={count} onClick={() => applyPacing(count)} className={`w-full text-left text-xs p-1.5 rounded flex items-center justify-between ${isRecommended ? 'bg-orange-200/50 font-bold text-orange-950 border border-orange-300' : 'hover:bg-orange-100 text-orange-900'}`}>
                              <span>Break into {count} lessons</span>
                              {isRecommended && <span className="text-[11px] uppercase tracking-wider bg-orange-600 text-white px-1.5 py-0.5 rounded">Optimal</span>}
                            </button>
                          )
                        }
                        return null;
                      })}
                    </div>
                  </div>
                )}
                
                {/* Applied Pacing Preview */}
                {appliedPacing && (
                  <div className="mt-3 bg-[#e8f0ec] border border-[#d1e2da] rounded-lg p-3 animate-fade-up">
                    <div className="flex items-center justify-between mb-2">
                       <span className="text-[11px] uppercase font-mono font-bold text-[#2d5a4a] flex items-center gap-1.5"><Check className="w-3 h-3" /> Pacing Applied ({appliedPacing.count} lessons)</span>
                       <button onClick={() => setAppliedPacing(null)} className="text-[11px] text-[#2d5a4a] underline">Clear</button>
                    </div>
                    <div className="space-y-1">
                      {appliedPacing.layoutText.split('\n').map((line, i) => (
                        <div key={i} className="text-[11px] text-ink-800 font-sans leading-snug pl-2 border-l-2 border-[#2d5a4a]/30">{line}</div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Homework generation */}
              <div className="border-t border-paper-2 pt-4">
                <label className="flex items-center gap-2 cursor-pointer group">
                  <div className={`w-4 h-4 rounded border flex items-center justify-center transition-colors ${generateHomework ? 'bg-[#2d5a4a] border-[#2d5a4a]' : 'border-paper-3 bg-paper-0 group-hover:border-[#2d5a4a]'}`}>
                    {generateHomework && <Check className="w-3 h-3 text-white" />}
                  </div>
                  <span className="text-xs font-bold text-ink-800 select-none">Include Homework Task</span>
                </label>
                {generateHomework && (
                  <div className="mt-3 space-y-2 animate-fade-in pl-6">
                    <select className="w-full text-xs py-1.5 px-2 bg-paper-0 border border-paper-3 rounded" value={homeworkNature} onChange={e => setHomeworkNature(e.target.value)}>
                      <option value="academic">Academic & Reading</option>
                      <option value="revision">Exam Question Revision</option>
                      <option value="fun">Creative / Interactive Reflection</option>
                      <option value="custom">Custom Instruction...</option>
                    </select>
                    {homeworkNature === "custom" && (
                      <input type="text" placeholder="e.g. Find one news article about this..." className="w-full px-2 py-1.5 text-xs bg-paper-0 border border-paper-3 rounded focus:outline-none focus-visible:ring-2 focus-visible:ring-[#2d5a4a]/40 focus:border-[#2d5a4a]" value={customHomeworkPrompt} onChange={(e) => setCustomHomeworkPrompt(e.target.value)} />
                    )}
                  </div>
                )}
              </div>
            </div>
            </div>
              
            {/* Action Bar */}
              <div className="mt-8 pt-6 border-t border-paper-2 flex justify-end">
                <button 
                  onClick={handleGenerate}
                  disabled={generating}
                  className="w-full md:w-auto px-8 bg-[#2d5a4a] hover:bg-[#3a7560] disabled:bg-chalk-300 disabled:cursor-not-allowed text-white font-serif text-sm font-medium py-3 rounded-xl transition-all shadow-sm flex items-center justify-center gap-2"
                >
                  {generating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                  {generating ? 'Drafting Lesson...' : 'Generate Plan'}
                </button>
              </div>
            </div>
          </div>

          {/* BOTTOM: Output Panel */}
          <div className="p-5 md:p-10 relative flex-1 flex flex-col min-h-[500px]">
            {!generatedMarkdown && !generating && (
              <div className="flex-1 flex flex-col items-center justify-center text-center opacity-40 select-none py-20">
                <BookOpen className="w-16 h-16 text-ink-300 mb-4" />
                <h3 className="font-serif text-xl font-bold text-ink-900 mb-1">Canvas is empty</h3>
                <p className="font-sans text-sm text-ink-500 max-w-[260px]">Configure your lesson details on the left and generate a structured scheme of work.</p>
              </div>
            )}
            
            {generating && (
              <div className="flex-1 flex flex-col items-center justify-center text-center py-20">
                <div className="w-12 h-12 rounded-full border-2 border-[#2d5a4a]/20 border-t-[#2d5a4a] animate-spin mb-6"></div>
                <h3 className="font-serif animate-pulse text-lg text-ink-800">Synthesising syllabus documents...</h3>
                <p className="font-mono text-[11px] uppercase tracking-widest text-ink-400 mt-2">Vasant Valley Faculty Server</p>
              </div>
            )}

            {generatedMarkdown && !generating && (
              <div className="max-w-4xl mx-auto w-full animate-fade-up">
                
                <div className="flex items-center justify-between mb-8 pb-4 border-b border-paper-2">
                  <div>
                    <h2 className="font-serif text-2xl font-bold text-ink-900 leading-tight">Weekly Plan: {CURRICULUM[courseId]?.label || "Course"}</h2>
                    <p className="font-mono text-[11px] uppercase tracking-widest text-[#2d5a4a] font-bold mt-1.5">Week {week} | {lessonsPerWeek} Lessons</p>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => navigator.clipboard.writeText(generatedMarkdown)} className="p-2 border border-paper-3 bg-paper-1 hover:bg-paper-2 rounded-lg text-ink-600 transition-colors" title="Copy Markdown">
                      <Copy className="w-4 h-4" />
                    </button>
                    <button onClick={handleSaveToDrive} className="px-3 py-2 border border-blue-600 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg text-xs font-bold font-mono tracking-wider uppercase flex items-center gap-1.5 transition-colors">
                      <HardDrive className="w-3.5 h-3.5" /> Save to Drive
                    </button>
                    <button onClick={handleSavePlan} className="px-3 py-2 border border-[#2d5a4a] bg-[#e8f0ec] hover:bg-[#d1e2da] text-[#2d5a4a] rounded-lg text-xs font-bold font-mono tracking-wider uppercase flex items-center gap-1.5 transition-colors">
                      <Save className="w-3.5 h-3.5" /> Save to My Plans
                    </button>
                  </div>
                </div>

                {/* Structured Rendition */}
                <div className="space-y-5">
                  {(() => {
                    const parsed = parseLessonPlan(generatedMarkdown, lessonsPerWeek);
                    return (
                      <>
                        {(parsed.learningObjective || parsed.skills) && (
                          <div className="bg-paper-1 border border-paper-2 rounded-xl p-5 mb-8 shadow-sm">
                            {parsed.learningObjective && (
                              <div className="mb-3">
                                <h4 className="font-mono text-[11px] uppercase tracking-widest text-ink-400 font-bold mb-1">Learning Objective</h4>
                                <p className="font-serif text-[15px] font-medium text-ink-900 leading-relaxed">{parsed.learningObjective}</p>
                              </div>
                            )}
                            {parsed.skills && (
                              <div>
                                <h4 className="font-mono text-[11px] uppercase tracking-widest text-ink-400 font-bold mb-1">Target Skills</h4>
                                <p className="font-sans text-[13px] text-ink-700">{parsed.skills}</p>
                              </div>
                            )}
                          </div>
                        )}

                        <div className="grid gap-5 grid-cols-1">
                          {parsed.lessons.filter(l => l.title || l.process).map((lesson, idx) => (
                            <div key={idx} className="bg-white border text-left border-paper-2 rounded-xl overflow-hidden shadow-[0_2px_12px_-4px_rgba(26,22,18,0.06)] relative border-l-[4px] border-l-[#2d5a4a]">
                              <div className="bg-paper-1 px-5 py-3 border-b border-paper-2">
                                <h3 className="font-serif text-[16px] font-bold text-ink-950">Lesson {lesson.number}: <span className="text-ink-700">{lesson.title}</span></h3>
                              </div>
                              <div className="p-5 space-y-4">
                                {lesson.concept && (
                                  <div>
                                    <span className="block font-mono text-[11px] uppercase tracking-[0.16em] text-ink-400 font-bold mb-1">Topic / Concept</span>
                                    <span className="inline-block bg-chalk-100 text-chalk-800 text-xs px-2 py-0.5 rounded border border-chalk-500/10 font-bold">{lesson.concept}</span>
                                  </div>
                                )}
                                {lesson.process && (
                                  <div>
                                    <span className="block font-mono text-[11px] uppercase tracking-[0.16em] text-ink-400 font-bold mb-1">Pedagogical Process</span>
                                    <p className="font-serif text-[13px] leading-[1.7] text-[#2c2724] text-justify">{lesson.process}</p>
                                  </div>
                                )}
                                <div className="grid grid-cols-2 gap-4 pt-3 border-t border-paper-2 mt-4">
                                  {lesson.tools && (
                                    <div>
                                      <span className="block font-mono text-[11px] uppercase tracking-[0.16em] text-ink-400 font-bold mb-1">Tools & Format</span>
                                      <p className="text-xs font-sans text-ink-700 font-medium">{lesson.tools}</p>
                                    </div>
                                  )}
                                  {lesson.assessment && (
                                    <div>
                                      <span className="block font-mono text-[11px] uppercase tracking-[0.16em] text-ink-400 font-bold mb-1">Assessment</span>
                                      <p className="text-xs font-sans text-ink-700 font-medium">{lesson.assessment}</p>
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </>
                    )
                  })()}

                  <div className="my-8 relative">
                     <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-paper-2"></div></div>
                     <div className="relative flex justify-center"><span className="bg-paper-0 px-4 text-[11px] font-mono text-ink-400 uppercase tracking-widest">Or view raw markdown</span></div>
                  </div>

                  <div className="markdown-body p-5 bg-paper-1 rounded-xl border border-paper-2 shadow-sm">
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>{generatedMarkdown}</ReactMarkdown>
                  </div>
                </div>

              </div>
            )}
          </div>
        </div>
      )}

      {/* SAVED PLANS TAB */}
      {activeTab === "saved" && (
        <div className="flex-1 overflow-y-auto p-5 bg-paper-0">
          <div className="max-w-4xl mx-auto space-y-5">
            {plansLoading ? (
              <div className="flex justify-center p-12"><Loader2 className="w-6 h-6 text-chalk-600 animate-spin" /></div>
            ) : plans.length === 0 ? (
              <div className="text-center py-20">
                <FileText className="w-12 h-12 text-paper-3 mx-auto mb-3" />
                <h3 className="font-serif font-bold text-lg text-ink-800">No saved plans</h3>
                <p className="text-sm text-ink-500 font-sans mt-1">Generate a lesson plan and click 'Save' to keep it here.</p>
              </div>
            ) : (
              <div className="grid gap-4 md:grid-cols-2">
                {plans.map(plan => {
                  const course = CURRICULUM[plan.courseId];
                  const parsed = parseLessonPlan(plan.markdown, plan.lessonsPerWeek);
                  const date = plan.createdAt ? new Date(plan.createdAt).toLocaleDateString('en-GB') : '';
                  return (
                    <div key={plan.id} className="bg-paper-1 border border-paper-2 rounded-xl p-5 hover:border-[#2d5a4a]/30 transition-colors shadow-sm flex flex-col group">
                      <div className="flex justify-between items-start mb-3">
                        <div>
                           <span className="inline-block px-1.5 py-0.5 bg-chalk-100 text-chalk-700 text-[11px] font-mono uppercase tracking-wider font-bold rounded mb-1">{course?.label || plan.courseId}</span>
                           <h3 className="font-serif font-bold text-lg text-ink-950 leading-tight">Week {plan.week} Plan</h3>
                        </div>
                        <div className="flex gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button onClick={() => { setGeneratedMarkdown(plan.markdown); setActiveTab("create"); }} className="p-1.5 bg-paper-0 border border-paper-2 hover:bg-paper-2 rounded" title="View/Edit">
                            <Layout className="w-3.5 h-3.5 text-ink-600" />
                          </button>
                          <button onClick={() => deleteDoc(doc(db, `users/${userId}/lessonPlans/${plan.id}`))} className="p-1.5 bg-paper-0 border border-paper-2 hover:bg-red-50 hover:text-red-600 rounded text-ink-600" title="Delete">
                            <span className="font-bold text-xs">×</span>
                          </button>
                        </div>
                      </div>
                      
                      <div className="text-xs text-ink-600 font-sans line-clamp-2 mb-4 leading-relaxed">
                        {parsed.learningObjective || "No learning objective extracted."}
                      </div>
                      
                      <div className="mt-auto pt-3 border-t border-paper-2 flex justify-between items-center text-[11px] font-mono tracking-wider text-ink-500">
                        <span>{plan.lessonsPerWeek} Lessons | {plan.pedagogicalMix}</span>
                        <span>{date}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
