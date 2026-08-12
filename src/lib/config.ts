// ---------------------------------------------------------------------------
// Workspace configuration constants. Deadline-status thresholds drive the
// AT RISK / WATCH / ON TRACK chips on the intake dashboard and the deadline
// chip in the authoring context bar.
// ---------------------------------------------------------------------------

/** Deadlines within this many days show WATCH (caution). */
export const DEADLINE_WARNING_DAYS = 14;

/** Deadlines within this many days (or overdue) show AT RISK (critical). */
export const DEADLINE_CRITICAL_DAYS = 7;

export type DeadlineStatus = "at_risk" | "watch" | "on_track";

export function deadlineStatus(daysLeft: number): DeadlineStatus {
  if (daysLeft <= DEADLINE_CRITICAL_DAYS) return "at_risk";
  if (daysLeft <= DEADLINE_WARNING_DAYS) return "watch";
  return "on_track";
}
