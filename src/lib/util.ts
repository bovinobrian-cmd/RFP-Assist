/** Simulated network/model latency so the demo feels like real systems. */
export function simulateLatency(baseMs: number): Promise<void> {
  const jitter = Math.random() * baseMs * 0.5;
  return new Promise((resolve) => setTimeout(resolve, baseMs + jitter));
}

export function formatDate(iso: string): string {
  const d = new Date(iso + (iso.length === 10 ? "T12:00:00" : ""));
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export function daysUntil(iso: string): number {
  const now = new Date();
  const target = new Date(iso + "T23:59:59");
  return Math.ceil((target.getTime() - now.getTime()) / 86_400_000);
}

export function monthsBetween(fromIso: string, to: Date = new Date()): number {
  const from = new Date(fromIso + (fromIso.length === 10 ? "T12:00:00" : ""));
  return (
    (to.getFullYear() - from.getFullYear()) * 12 + (to.getMonth() - from.getMonth())
  );
}

export function wordCount(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

let idCounter = 0;
export function uid(prefix: string): string {
  idCounter += 1;
  return `${prefix}-${Date.now().toString(36)}-${idCounter}`;
}

export function classNames(...parts: (string | false | null | undefined)[]): string {
  return parts.filter(Boolean).join(" ");
}
