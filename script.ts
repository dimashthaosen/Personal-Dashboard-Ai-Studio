import fs from "fs";
import path from "path";

function getAllFiles(dir: string): string[] {
  let results: string[] = [];
  const list = fs.readdirSync(dir);
  list.forEach(function(file) {
    file = dir + '/' + file;
    const stat = fs.statSync(file);
    if (stat && stat.isDirectory()) { 
      results = results.concat(getAllFiles(file));
    } else { 
      if (file.endsWith('.tsx') || file.endsWith('.ts')) results.push(file);
    }
  });
  return results;
}

const files = getAllFiles("src/components");
files.forEach(f => {
  let content = fs.readFileSync(f, "utf8");
  
  // Convert basic focus:outline-none 
  content = content.replace(/focus:outline-none/g, "focus:outline-none focus-visible:ring-2 focus-visible:ring-[#2d5a4a]/40");
  // To avoid doubling up if I run it twice:
  content = content.replace(/(focus-visible:ring-2 focus-visible:ring-\[#2d5a4a\]\/40\s*)+/g, "focus-visible:ring-2 focus-visible:ring-[#2d5a4a]/40 ");

  // Reduce redundant hairline borders where there's already grouping / shadow
  // We'll manually fix the big layout ones.
  fs.writeFileSync(f, content);
});

// App name
let appTsx = fs.readFileSync("src/App.tsx", "utf8");
appTsx = appTsx.replace(/VVS Assistant/g, "Faculty Planner");
appTsx = appTsx.replace(/VVS Assistant/g, "Faculty Planner"); // Just in case
fs.writeFileSync("src/App.tsx", appTsx);

console.log("Replaced outline none and App name");
