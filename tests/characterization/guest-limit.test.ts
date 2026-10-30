/**
 * Guest daily play limit — a guest gets GUEST_DAILY_LIMIT race starts per day;
 * further starts are gated (sign-in nudge). Signed-in players are never limited.
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { setupGame, type Harness } from '../setup/harness';
import { getProfileStore } from '../../src/app/profileStore';
import { guestPlaysToday, GUEST_DAILY_LIMIT } from '../../src/app/guestLimit';

let h: Harness;
beforeEach(() => { h = setupGame(); });

const play = () => (document.getElementById('practicePlay') as HTMLElement).click();

describe('guest daily play limit', () => {
  it('caps a guest at GUEST_DAILY_LIMIT race starts per day', () => {
    expect(h.isLinkedPlayer()).toBe(false);
    for (let i = 0; i < GUEST_DAILY_LIMIT + 2; i++) play();   // try more than allowed
    // The extra starts are gated before they count, so the tally stops at the limit.
    expect(guestPlaysToday()).toBe(GUEST_DAILY_LIMIT);
  });

  it('does not block within the free allowance', () => {
    expect(h.isLinkedPlayer()).toBe(false);
    play();
    expect(h.G.state).not.toBe('start');   // first race left the menu
    expect(guestPlaysToday()).toBe(1);
  });

  it('never limits a signed-in player', () => {
    getProfileStore().linkAccount('user-xyz', 'Champ');
    expect(h.isLinkedPlayer()).toBe(true);
    for (let i = 0; i < GUEST_DAILY_LIMIT + 2; i++) play();
    expect(guestPlaysToday()).toBe(0);   // linked players are never counted or gated
  });
});
