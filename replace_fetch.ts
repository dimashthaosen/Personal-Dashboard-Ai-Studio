import fs from "fs";
import path from "path";
import { execSync } from "child_process";

const dirsToScan = ["src/components", "src/App.tsx"];
const ignoreList = ["src/server"];

function walk(dir: string, fileList: string[]) {
  if (fs.statSync(dir).isFile()) {
    fileList.push(dir);
    return;
  }
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      walk(fullPath, fileList);
    } else {
      if (fullPath.endsWith(".tsx") || fullPath.endsWith(".ts")) {
        fileList.push(fullPath);
      }
    }
  }
}

const allFiles = [];
for (const dir of dirsToScan) {
  walk(dir, allFiles);
}

for (const file of allFiles) {
  let content = fs.readFileSync(file, "utf-8");
  if (content.includes('fetch("/api') || content.includes('fetch(`/api')) {
    content = content.replace(/fetch\("\/api/g, 'apiFetch("/api');
    content = content.replace(/fetch\(\`\/api/g, 'apiFetch(`/api');
    
    // Add import if not present
    if (!content.includes('apiFetch')) {
        // Just replaced, need to add import
        // Determine relative path to src/lib/api.ts
        const depth = file.split('/').length - 2; // src/components/DashboardView.tsx -> depth 1
        const relPath = depth === 0 ? "./lib/api" : "../lib/api";
        content = `import { apiFetch } from "${relPath}";\n` + content;
    }
    
    fs.writeFileSync(file, content);
    console.log(`Updated ${file}`);
  }
}
