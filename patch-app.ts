import fs from "fs";

let content = fs.readFileSync("src/App.tsx", "utf8");

// Convert text-[9px] and text-[10px] etc to text-[11px] or text-xs
content = content.replace(/text-\[(?:7|8|9|10)px\]/g, "text-[11px]");

// Remove uppercase from specific places like the nav labels
// sec.label
content = content.replace(
  /<span className="font-mono text-\[11px\] text-ink-500 tracking-wider uppercase block">\{sec\.label\}<\/span>/g,
  `<span className="font-sans text-sm text-[#4a4540] font-medium block pb-1 border-b border-[#e1d8c6] mb-2">{sec.label}</span>`
);

// Menu item text. It is rendered in mapping `sec.items.map((item) => ...)`
//   <span className="font-sans text-xs">{item.label}</span>
// Wait, is it uppercase there? No, `item.label` is "Planner", "Tasks" etc.
// Are the active items uppercase?
content = content.replace(
  /<div className="font-mono text-\[11px\] text-ink-500 uppercase tracking-wider">\{activeTitle\}<\/div>/g,
  `<div className="font-sans font-bold text-sm text-[#4a4540]">{activeTitle}</div>`
);

// Sidebar items `font-mono text-[11px] text-[#7a756f] font-bold uppercase`
content = content.replace(
  /font-mono text-\[11px\] text-\[#7a756f\] font-bold uppercase tracking-\[0\.16em\]/g,
  "font-sans text-sm font-semibold text-[#4a4540]"
);

fs.writeFileSync("src/App.tsx", content);
console.log("App.tsx patched");
