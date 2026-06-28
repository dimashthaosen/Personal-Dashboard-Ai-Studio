const fs = require('fs');
let lines = fs.readFileSync('server.ts', 'utf-8').split('\n');

for (let i = 0; i < lines.length; i++) {
  if (lines[i].includes('app.') && lines[i].includes('("/api/') && lines[i].includes('(req, res) => {')) {
    if (lines[i].includes('/api/health') || lines[i].includes('/api/cron/')) {
      continue;
    }
    
    // Check if resolveUid is already in the next 3 lines
    const snippet = lines.slice(i+1, i+4).join('\n');
    if (!snippet.includes('resolveUid')) {
      // Need to insert
      // Check if there's a try { block
      if (lines[i+1].includes('try {')) {
        lines.splice(i+2, 0, '      const userId = resolveUid(req, res);', '      if (!userId) return;');
      } else {
        lines.splice(i+1, 0, '    const userId = resolveUid(req, res);', '    if (!userId) return;');
      }
    }
  }
}

fs.writeFileSync('server.ts', lines.join('\n'));
