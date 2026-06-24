export const getCategoryColor = (category: string) => {
  if (!category) return "bg-[#6b6560] text-white border-transparent";
  const norm = category.toLowerCase();
  switch (norm) {
    case "school": return "bg-[#2d5a4a] text-white border-[#234a3d]"; // chalk-green
    case "project": return "bg-[#b8860b] text-white border-[#9c720a]"; // woodamber
    case "admin": return "bg-[#6b6560] text-white border-[#5a5551]"; // pencil
    case "email": return "bg-[#2c4a7c] text-white border-[#21385e]"; // inkblue
    case "personal": return "bg-[#b83232] text-white border-[#9c2b2b]"; // red-pen
    default: return "bg-[#4a4540] text-white border-[#2a2520]"; // ink-500
  }
};

export const getCategoryTextColor = (category: string) => {
  if (!category) return "text-[#6b6560]";
  const norm = category.toLowerCase();
  switch (norm) {
    case "school": return "text-[#2d5a4a]"; // chalk-green
    case "project": return "text-[#b8860b]"; // woodamber
    case "admin": return "text-[#6b6560]"; // pencil
    case "email": return "text-[#2c4a7c]"; // inkblue
    case "personal": return "text-[#b83232]"; // red-pen
    default: return "text-[#4a4540]"; // ink-500
  }
};

export const getPriorityColor = (priority: string) => {
  if (!priority) return "bg-[#6b6560]";
  const norm = priority.toLowerCase();
  switch (norm) {
    case "urgent": return "bg-[#b83232]"; // red-pen
    case "high": return "bg-[#b8860b]"; // woodamber
    case "medium": return "bg-[#2d5a4a]"; // chalk-green
    case "low": return "bg-[#6b6560]"; // pencil
    default: return "bg-[#4a4540]";
  }
};
