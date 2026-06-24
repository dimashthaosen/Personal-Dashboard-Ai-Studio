import fs from "fs";

let content = fs.readFileSync("src/components/EmailView.tsx", "utf8");

content = content.replace(
  /className={`px-3 py-1 font-mono text-\[11px\] font-bold uppercase tracking-wider rounded-md transition-colors \$\{activeTab === 'inbox' \? 'bg-white text-\[#2d5a4a\] shadow-sm' : 'text-\[#4a4540\] hover:text-\[#4a4540\]'\}`} /g,
  "className={`px-3 py-1 font-sans text-sm font-semibold rounded-md transition-colors ${activeTab === 'inbox' ? 'bg-white text-[#2d5a4a] shadow-sm' : 'text-[#4a4540] hover:text-[#4a4540]'}`} "
);

content = content.replace(
  /className={`px-3 py-1 font-mono text-\[11px\] font-bold uppercase tracking-wider rounded-md transition-colors \$\{activeTab === 'sent' \? 'bg-white text-\[#2d5a4a\] shadow-sm' : 'text-\[#4a4540\] hover:text-\[#4a4540\]'\}`} /g,
  "className={`px-3 py-1 font-sans text-sm font-semibold rounded-md transition-colors ${activeTab === 'sent' ? 'bg-white text-[#2d5a4a] shadow-sm' : 'text-[#4a4540] hover:text-[#4a4540]'}`} "
);

content = content.replace(/INBOX/g, "Inbox");
content = content.replace(/SENT DRAFTS/g, "Sent Drafts");

fs.writeFileSync("src/components/EmailView.tsx", content);
console.log("Patched EmailView");
