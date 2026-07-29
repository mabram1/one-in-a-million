/** How to Play localization integrity + completion flag. */
import { describe, it, expect, beforeEach } from 'vitest';
import en from '../../src/app/config/data/howto.en.json';
import sl from '../../src/app/config/data/howto.sl.json';
import { howToCompleted } from '../../src/app/screens/howToPlay';

describe('how-to-play copy', () => {
  for (const [name, doc] of [['en', en], ['sl', sl]] as const) {
    it(`${name}: has 5 cards each with required fields`, () => {
      expect(doc.cards).toHaveLength(5);
      for (const c of doc.cards) {
        expect(c.eyebrow && c.title && c.body && c.button && c.callout).toBeTruthy();
      }
    });
  }
  it('last card is the "swim" call to action in both locales', () => {
    expect(en.cards[4].button.toLowerCase()).toContain('swim');
    expect(sl.cards[4].button.toLowerCase()).toContain('zaplavajmo');
  });
});

describe('completion flag', () => {
  beforeEach(() => { try { localStorage.removeItem('oiam_howto_v1'); } catch { /* jsdom */ } });
  it('defaults to not completed', () => { expect(howToCompleted()).toBe(false); });
  it('reads a persisted completed flag', () => {
    localStorage.setItem('oiam_howto_v1', JSON.stringify({ version: 1, completed: true }));
    expect(howToCompleted()).toBe(true);
  });
  it('ignores a stale version', () => {
    localStorage.setItem('oiam_howto_v1', JSON.stringify({ version: 0, completed: true }));
    expect(howToCompleted()).toBe(false);
  });
});
