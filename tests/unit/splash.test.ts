/**
 * Splash / intro — presentational wiring (no timers asserted).
 */
import { describe, it, expect, afterEach } from 'vitest';
import { showSplash } from '../../src/app/screens/splash';

afterEach(() => { document.body.innerHTML = ''; });

describe('splash', () => {
  it('mounts a single overlay with the wordmark + tagline', () => {
    showSplash({ durationMs: 100000 });
    const els = document.querySelectorAll('.splash-overlay');
    expect(els.length).toBe(1);
    expect(document.querySelector('.splash-word')).toBeTruthy();
    expect(document.querySelector('.splash-tag')?.textContent).toBeTruthy();
  });

  it('never mounts twice', () => {
    showSplash({ durationMs: 100000 });
    showSplash({ durationMs: 100000 });
    expect(document.querySelectorAll('.splash-overlay').length).toBe(1);
  });

  it('a tap starts the dismissal (adds the out class)', () => {
    showSplash({ durationMs: 100000 });
    const el = document.querySelector('.splash-overlay') as HTMLElement;
    el.dispatchEvent(new Event('pointerdown'));
    expect(el.classList.contains('out')).toBe(true);
  });
});
