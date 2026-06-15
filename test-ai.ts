import { getGemini } from "./src/server/db"; // wait, it's ai.ts maybe?
import { generateLessonPlan } from "./src/server/ai";

async function test() {
  try {
    const res = await generateLessonPlan("Test prompt");
    console.log("Success:", res);
  } catch(e) {
    console.error("Error:", e.message);
  }
}
test();
