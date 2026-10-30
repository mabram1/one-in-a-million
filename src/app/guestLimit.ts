/**
 * Guest daily play limit. A guest (not signed in) gets GUEST_DAILY_LIMIT race
 * STARTS per calendar day (UTC); after that the account gate is offered as a soft
 * nudge to sign in. Linked users are never limited (the caller checks that).
 *
 * This is a convenience nudge, not hard security — it lives in localStorage, so
 * clearing site data or using a private window resets it. That is fine for its
 * purpose (encourage sign-up), and avoids tracking anonymous devices server-side.
 */
export const GUEST_DAILY_LIMIT = 3;
const KEY = 'oiam_guest_plays';

function today(): string {
  try { return new Date().toISOString().slice(0, 10); } catch { return ''; }
}

function read(): { date: string; count: number } {
  try {
    const x = JSON.parse(localStorage.getItem(KEY) || 'null');
    if (x && x.date === today() && typeof x.count === 'number') return x;
  } catch { /* ignore */ }
  return { date: today(), count: 0 };
}

/** How many race starts the guest has used today. */
export function guestPlaysToday(): number { return read().count; }

/** Has the guest hit today's free limit? */
export function guestLimitReached(): boolean { return read().count >= GUEST_DAILY_LIMIT; }

/** Count one race start against today's allowance. */
export function recordGuestPlay(): void {
  const r = read();
  try { localStorage.setItem(KEY, JSON.stringify({ date: today(), count: r.count + 1 })); } catch { /* ignore */ }
}
