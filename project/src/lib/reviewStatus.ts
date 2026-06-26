/**
 * Review status computation.
 * Status is derived from scheduled date + completion_status + whether input exists.
 * Time is never used for locking — date boundaries only.
 */

export type ReviewStatus =
  | 'Not Started'
  | 'Due Soon'
  | 'In Progress'
  | 'Overdue'
  | 'Rescheduled'
  | 'Missed'
  | 'Completed';

// Higher index = higher priority when multiple statuses could apply
export const STATUS_PRIORITY: ReviewStatus[] = [
  'Not Started',
  'Due Soon',
  'In Progress',
  'Overdue',
  'Rescheduled',
  'Missed',
  'Completed',
];

export const STATUS_STYLES: Record<ReviewStatus, { class: string; label: string }> = {
  'Not Started':  { class: 'bg-gray-100 text-gray-700',    label: 'Not Started' },
  'Due Soon':     { class: 'bg-orange-100 text-orange-700', label: 'Due Soon' },
  'In Progress':  { class: 'bg-blue-100 text-blue-700',    label: 'In Progress' },
  'Overdue':      { class: 'bg-red-100 text-red-700',      label: 'Overdue' },
  'Rescheduled':  { class: 'bg-yellow-100 text-yellow-700', label: 'Rescheduled' },
  'Missed':       { class: 'bg-red-200 text-red-800',      label: 'Missed' },
  'Completed':    { class: 'bg-green-100 text-green-700',  label: 'Completed' },
};

/** Returns today as a plain calendar date (midnight local), stripping time. */
function today(): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

/** Strips time from any date so comparisons are date-only. */
function dateOnly(d: Date): Date {
  const c = new Date(d);
  c.setHours(0, 0, 0, 0);
  return c;
}

/** Day difference: positive = scheduledDate is in the future. */
function dayDiff(scheduledDate: Date): number {
  return Math.floor((dateOnly(scheduledDate).getTime() - today().getTime()) / 86_400_000);
}

export interface MeetingStatusInput {
  /** ISO string of the scheduled meeting datetime */
  scheduled_datetime: string | null;
  /** ISO string of the original datetime before rescheduling, if any */
  original_scheduled_datetime?: string | null;
  /** DB completion_status field */
  completion_status: string | null;
  /** True if any review input (check-in or monthly review) exists for this meeting */
  has_input: boolean;
}

export function computeReviewStatus(m: MeetingStatusInput): ReviewStatus {
  const cs = m.completion_status;

  // Completed: submitted or completed regardless of date
  if (cs === 'submitted' || cs === 'completed') return 'Completed';

  if (!m.scheduled_datetime) {
    // No date set — treat as not started
    if (cs === 'in_progress' || cs === 'completed_pending' || m.has_input) return 'In Progress';
    return 'Not Started';
  }

  const scheduled = new Date(m.scheduled_datetime);
  const diff = dayDiff(scheduled); // positive = future, 0 = today, negative = past

  // Missed: 5+ days overdue and not submitted
  if (diff <= -5) return 'Missed';

  // Overdue: 1–4 days past scheduled date (day after = diff == -1)
  if (diff < 0) {
    // If input exists, it's In Progress even though overdue — but spec says Overdue beats In Progress
    // Priority: Completed > Missed > Rescheduled > Overdue > In Progress > Due Soon > Not Started
    if (
      m.original_scheduled_datetime &&
      m.original_scheduled_datetime !== m.scheduled_datetime
    ) {
      return 'Rescheduled';
    }
    return 'Overdue';
  }

  // Rescheduled: date was changed (original != current), and not yet past the missed window
  if (
    m.original_scheduled_datetime &&
    m.original_scheduled_datetime !== m.scheduled_datetime
  ) {
    return 'Rescheduled';
  }

  // In Progress: any input added before submission
  if (cs === 'in_progress' || cs === 'completed_pending' || m.has_input) return 'In Progress';

  // Due Soon: 1–2 days before scheduled date (diff = 1 or 2)
  if (diff >= 1 && diff <= 2) return 'Due Soon';

  // Today (diff = 0) is still accessible — treat as Not Started until input added
  return 'Not Started';
}
