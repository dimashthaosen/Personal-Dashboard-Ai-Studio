const fs = require('fs');
const files = [
  'src/App.tsx',
  'src/components/CalendarView.tsx',
  'src/components/ChatView.tsx',
  'src/components/DashboardView.tsx',
  'src/components/DriveView.tsx',
  'src/components/EmailView.tsx',
  'src/components/LessonPlannerView.tsx',
  'src/components/StudentsView.tsx',
  'src/components/TimetableView.tsx'
];

for (const file of files) {
  let c = fs.readFileSync(file, 'utf-8');
  if (c.startsWith('import { apiFetch } from ${p};')) {
    const p = file.includes('components') ? '../lib/api' : './lib/api';
    c = c.replace('import { apiFetch } from ${p};', `import { apiFetch } from "${p}";`);
    fs.writeFileSync(file, c);
  }
}
