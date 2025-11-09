// Нормализуем ключи: в нижний регистр, без пробелов по краям.
const P: Record<string, string[]> = {
  default: ["#1A1A40","#3C096C","#5A189A","#7B2CBF","#9D4EDD",
            "#0F4C5C","#2A9D8F","#1D3557","#264653","#2C2A4A",
            "#5C374C","#6A040F","#9D0208","#DC2F02","#283618"],

  life:        ["#0E7490","#0891B2","#0369A1","#065F46","#166534"],
  love:        ["#9D174D","#BE185D","#DB2777","#E11D48","#EF4444"],
  motivation:  ["#1D4ED8","#2563EB","#0284C7","#0EA5E9","#22D3EE"],
  philosophy:  ["#111827","#334155","#1F2937","#374151","#4B5563"],
  success:     ["#14532D","#166534","#15803D","#16A34A","#22C55E"],
  humor:       ["#F59E0B","#F97316","#EA580C","#D97706","#B45309"],
  science:     ["#0F766E","#115E59","#134E4A","#155E75","#1D4ED8"],
  art:         ["#6D28D9","#7C3AED","#8B5CF6","#A78BFA","#C4B5FD"],
  wisdom:      ["#1F2937","#2D3748","#2F4858","#3F4C6B","#4A5568"],
};

export function getPalette(category?: string) {
  if (!category) return P.default;
  const key = category.trim().toLowerCase();
  return P[key] ?? P.default;
}
export function getPaletteCategories(): string[] {
  return Object.keys(P).filter(k => k !== "default");
}
