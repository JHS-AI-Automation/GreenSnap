// Duur-weergave voor klokregistratie: "2u15" of "42 min"
export function formatDuration(ms: number): string {
  if (!isFinite(ms) || ms < 0) return "0 min";
  const totalMinutes = Math.floor(ms / 60_000);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (hours === 0) return `${minutes} min`;
  return `${hours}u${String(minutes).padStart(2, "0")}`;
}
