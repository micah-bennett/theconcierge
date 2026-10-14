export function nowT(d = new Date()) {
  const h = d.getHours() % 12 || 12;
  return `${h}:${String(d.getMinutes()).padStart(2, "0")}`;
}
export function nowTA(d = new Date()) {
  return `${nowT(d)} ${d.getHours() < 12 ? "AM" : "PM"}`;
}
