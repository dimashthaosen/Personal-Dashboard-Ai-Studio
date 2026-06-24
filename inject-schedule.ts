import fs from "fs";

let content = fs.readFileSync("src/components/DashboardView.tsx", "utf8");

const parseTimeStr = `
const parseTime = (timeStr: string) => {
  if (!timeStr) return 0;
  const match = timeStr.match(/(\\d+):(\\d+)\\s*(am|pm)/i);
  if (!match) return 0;
  let hours = parseInt(match[1], 10);
  const minutes = parseInt(match[2], 10);
  const ampm = match[3].toLowerCase();
  if (ampm === "pm" && hours < 12) hours += 12;
  if (ampm === "am" && hours === 12) hours = 0;
  return hours * 60 + minutes;
};
`;

const renderSchedule = `
        {timetable.length === 0 ? (
          <div className="flex items-center justify-between py-2 text-xs text-[#4a4540] italic font-serif">
            <span>Your weekly school timetable has not been loaded yet.</span>
            <button
              onClick={() => onNavigate("timetable")}
              className="text-[#2d5a4a] font-mono text-[11px] font-bold uppercase tracking-wider focus:outline-none focus-visible:ring-2 focus-visible:ring-[#2d5a4a]/40"
            >
              Parse PDF Data →
            </button>
          </div>
        ) : todayDayName === "Saturday" || todayDayName === "Sunday" ? (
          <div className="py-8 text-center bg-white border border-[#e1d8c6] rounded-xl">
            <p className="font-serif italic text-xs text-[#4a4540]">
              It's the weekend! No teaching or periods are scheduled for today ({todayDayName}).
            </p>
            <button
              onClick={() => onNavigate("timetable")}
              className="mt-3 font-mono text-[11px] text-[#2d5a4a] border border-[#d2e3da] px-3 py-1 rounded-[6px] hover:bg-[#2d5a4a] hover:text-white transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-[#2d5a4a]/40"
            >
              View Full Weekly Timetable
            </button>
          </div>
        ) : (
          <div className="relative mt-2">
            {/* Desktop View (Time proportional) */}
            <div className="hidden md:block relative border-l border-[#e1d8c6] ml-16 pb-4">
              {/* Hour markers 8am to 3pm */}
              {[8, 9, 10, 11, 12, 13, 14, 15].map(hour => (
                <div key={hour} className="absolute w-full border-t border-dashed border-[#e1d8c6]/60" style={{ top: \`\${(hour * 60 - 480)}px\` }}>
                  <span className="absolute -left-16 -top-2.5 w-12 text-right font-mono text-[11px] text-[#4a4540]">
                    {hour === 12 ? '12 pm' : hour > 12 ? \`\${hour - 12} pm\` : \`\${hour} am\`}
                  </span>
                </div>
              ))}
              
              {/* Current time marker */}
              {(() => {
                const now = new Date();
                const nowMins = now.getHours() * 60 + now.getMinutes();
                if (nowMins >= 480 && nowMins <= 960) {
                  return (
                    <div className="absolute w-full z-10" style={{ top: \`\${nowMins - 480}px\` }}>
                      <div className="absolute -left-16 -top-2 w-12 text-right">
                        <span className="font-mono text-[11px] font-bold text-[#b83232] bg-[#f7e4e1] px-1 rounded">now</span>
                      </div>
                      <div className="w-full border-t-2 border-[#b83232]"></div>
                    </div>
                  );
                }
                return null;
              })()}

              {/* Render slots and free periods */}
              <div className="relative w-full ml-4" style={{ height: \`\${(16 * 60 - 480)}px\` }}>
                {(() => {
                   let lastEnd = 480; // 8:00 AM
                   const blocks = [];
                   const now = new Date();
                   const nowMins = now.getHours() * 60 + now.getMinutes();

                   combinedTodaySlots.forEach((slot, i) => {
                     const startMins = parseTime(slot.start);
                     const endMins = parseTime(slot.end);
                     if (startMins === 0 || endMins === 0) return;

                     // Free period gap
                     if (startMins > lastEnd) {
                       const gap = startMins - lastEnd;
                       blocks.push(
                         <div key={\`gap-\${i}\`} className="absolute w-[calc(100%-1rem)] border-2 border-dashed border-[#e1d8c6] bg-transparent rounded-lg flex items-center justify-center overflow-hidden" style={{ top: \`\${lastEnd - 480}px\`, height: \`\${gap}px\` }}>
                           <span className="font-sans italic text-[11px] text-[#4a4540]">
                             {gap >= 30 && startMins >= 720 && startMins <= 840 ? \`Lunch Break · \${gap} min\` : \`Free period · \${gap} min\`}
                           </span>
                         </div>
                       );
                     }
                     
                     const isPast = endMins < nowMins;
                     const isCurrent = startMins <= nowMins && endMins >= nowMins;
                     
                     let bgClass = slot.isTimetable ? "bg-[#e8f0ec]/90 border-[#cbe3d6]" : "bg-[#e8eef7]/90 border-[#c1d4eb]";
                     let textClass = slot.isTimetable ? "text-[#2d5a4a]" : "text-[#2c4a7c]";
                     
                     if (isPast) {
                       bgClass = "bg-[#f5f1e8] border-[#ece6db] opacity-70";
                       textClass = "text-[#7a756f]";
                     }
                     
                     const ringClass = isCurrent ? \`ring-2 \${slot.isTimetable ? "ring-[#2d5a4a]" : "ring-[#2c4a7c]"} ring-offset-1 ring-offset-[#fcf9f3]\` : "";

                     blocks.push(
                       <div key={slot.id} className={\`absolute w-[calc(100%-1rem)] border rounded-lg p-2.5 overflow-hidden transition-all duration-200 hover:shadow-sm \${bgClass} \${ringClass}\`} style={{ top: \`\${startMins - 480}px\`, height: \`\${endMins - startMins}px\` }}>
                         <div className="flex justify-between items-start">
                           <div>
                             <h4 className={\`font-sans font-bold text-[13px] leading-tight \${textClass}\`}>{slot.title}</h4>
                             <p className="font-mono text-[11px] text-[#4a4540] mt-0.5">{slot.start} – {slot.end}</p>
                           </div>
                           <div className="text-right">
                             <span className={\`font-mono text-[11px] px-1.5 py-0.5 rounded font-bold uppercase tracking-wider \${slot.isTimetable ? 'bg-[#d2e3da] text-[#2d5a4a]' : 'bg-[#d1e0f3] text-[#2c4a7c]'}\`}>
                               {slot.isTimetable ? "Class" : "Meeting"}
                             </span>
                             {slot.venue && <p className="font-mono text-[11px] text-[#4a4540] mt-1 truncate max-w-[100px]">{slot.venue}</p>}
                           </div>
                         </div>
                       </div>
                     );
                     lastEnd = Math.max(lastEnd, endMins);
                   });
                   return blocks;
                })()}
              </div>
            </div>

            {/* Mobile View (Stacked Agenda) */}
            <div className="md:hidden space-y-3">
              {combinedTodaySlots.length === 0 ? (
                <div className="text-center py-6 border border-dashed border-[#e1d8c6] rounded-xl">
                  <span className="font-sans italic text-[11px] text-[#4a4540]">No events or periods scheduled.</span>
                </div>
              ) : (
                combinedTodaySlots.map((slot) => {
                  const now = new Date();
                  const nowMins = now.getHours() * 60 + now.getMinutes();
                  const startMins = parseTime(slot.start);
                  const endMins = parseTime(slot.end);
                  const isPast = endMins < nowMins;
                  const isCurrent = startMins <= nowMins && endMins >= nowMins;

                  let bgClass = slot.isTimetable ? "bg-[#e8f0ec] border-[#cbe3d6]" : "bg-[#e8eef7] border-[#c1d4eb]";
                  let textClass = slot.isTimetable ? "text-[#2d5a4a]" : "text-[#2c4a7c]";
                  
                  if (isPast) {
                    bgClass = "bg-[#f5f1e8] border-[#ece6db] opacity-75";
                    textClass = "text-[#4a4540]";
                  }

                  const ringClass = isCurrent ? \`ring-2 \${slot.isTimetable ? "ring-[#2d5a4a]" : "ring-[#2c4a7c]"} ring-offset-1 ring-offset-[#fcf9f3]\` : "";

                  return (
                    <div key={slot.id} className={\`border rounded-xl p-3 flex justify-between items-start \${bgClass} \${ringClass}\`}>
                      <div>
                        <h4 className={\`font-sans font-bold text-[13px] \${textClass}\`}>{slot.title}</h4>
                        <p className="font-mono text-[11px] text-[#4a4540] mt-1">{slot.start} – {slot.end}</p>
                      </div>
                      <div className="text-right flex flex-col items-end gap-1.5">
                        <span className={\`font-mono text-[11px] px-1.5 py-0.5 rounded font-bold uppercase tracking-wider \${slot.isTimetable ? 'bg-[#d2e3da] text-[#2d5a4a]' : 'bg-[#d1e0f3] text-[#2c4a7c]'}\`}>
                          {slot.isTimetable ? "Class" : "Meeting"}
                        </span>
                        {slot.venue && <span className="font-mono text-[11px] text-[#4a4540]">{slot.venue}</span>}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}`;

// replace the grid content 
const regex = /\{timetable\.length === 0 \? \([\s\S]*?\}\s*<\/div>/;
content = content.replace(regex, renderSchedule);

// Also we need to inject parseTime at the top of the component or before combinedTodaySlots
content = content.replace(
  "const combinedTodaySlots = [",
  parseTimeStr + "\n  const combinedTodaySlots = ["
);
// and remove it from inside sort to avoid duplication
content = content.replace(
  /const parseTime = \(timeStr: string\) => \{[\s\S]*?\};\s*return parseTime\(a\.start\) - parseTime\(b\.start\);/,
  "return parseTime(a.start) - parseTime(b.start);"
);

fs.writeFileSync("src/components/DashboardView.tsx", content);
console.log("Updated DashboardView schedule");
