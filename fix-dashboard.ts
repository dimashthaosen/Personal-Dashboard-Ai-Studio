import fs from "fs";

let content = fs.readFileSync("src/components/DashboardView.tsx", "utf8");

// Fix mappedTimetableToday
content = content.replace(
  /const mappedTimetableToday = todayTimetable\.map\(\(t\) => \(\{\s*id: `tt-\$\{t\.day\}-\$\{t\.period\}`,\s*title: `\$\{t\.subject\} \(Class \$\{t\.classSection\}\)`,\s*start: t\.startTime,\s*isTimetable: true,\s*venue: t\.room \|\| t\.venue \|\| "Classroom",\s*\}\)\);/,
  `const mappedTimetableToday = todayTimetable.map((t) => ({
    id: \`tt-\${t.day}-\${t.period}\`,
    title: \`\${t.subject} (Class \${t.classSection})\`,
    start: t.startTime,
    end: t.endTime,
    isTimetable: true,
    venue: t.room || t.venue || "Classroom",
  }));`
);

// Fix mappedCalendarToday
content = content.replace(
  /const mappedCalendarToday = todayEvents\.map\(\(evt\) => \(\{\s*id: evt\.id,\s*title: evt\.title,\s*start: formatTimeLabel\(evt\.start\),\s*isTimetable: false,\s*venue: evt\.location \|\| "",\s*\}\)\);/,
  `const mappedCalendarToday = todayEvents.map((evt) => ({
    id: evt.id,
    title: evt.title,
    start: formatTimeLabel(evt.start),
    end: formatTimeLabel(evt.end),
    isTimetable: false,
    venue: evt.location || "",
  }));`
);

fs.writeFileSync("src/components/DashboardView.tsx", content);
console.log("Fixed dashboard slot mappings");
