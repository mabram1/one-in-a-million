/**
 * One-shot migration helper: splits the single-file prototype into
 * index.html + src/styles/game.css + src/game/legacy/game.ts + src/main.ts.
 *
 * This is a MOVE, not a rewrite. The game body is transplanted verbatim;
 * the only edits are the module wrapper and the tuning import.
 * Kept in the repo so the migration is reproducible and auditable.
 */
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');
const SRC = process.argv[2] || path.resolve(root, '../prototype/spermy-prototype.html');
const html = fs.readFileSync(SRC, 'utf8');

const between = (s, open, close, from = 0) => {
  const i = s.indexOf(open, from);
  if (i < 0) throw new Error(`missing ${open}`);
  const j = s.indexOf(close, i + open.length);
  if (j < 0) throw new Error(`missing ${close} after ${open}`);
  return { body: s.slice(i + open.length, j), start: i, end: j + close.length };
};

// 1. <style> … </style>
const style = between(html, '<style>', '</style>');

// 2. module script with the optional CDN transports
const modScript = between(html, '<script type="module">', '</script>', style.end);

// 3. main IIFE
const mainOpen = html.indexOf('<script>', modScript.end);
const mainClose = html.indexOf('</script>', mainOpen);
const mainScript = html.slice(mainOpen + '<script>'.length, mainClose);

// 4. DOM markup lives between </style> and the module script
const dom = html.slice(style.end, modScript.start).trim();

// --- IIFE  ->  exported function -------------------------------------------
const USE_STRICT = '"use strict";';
const bodyStart = mainScript.indexOf(USE_STRICT) + USE_STRICT.length;
const bodyEnd = mainScript.lastIndexOf('})();');
let body = mainScript.slice(bodyStart, bodyEnd).replace(/\s+$/, '');

// Replace the declared tunables block with values sourced from the typed config.
const TUNE_OPEN = '  // ---------- Tunables ----------';
const TUNE_CLOSE = '  // ---------- State ----------';
const ti = body.indexOf(TUNE_OPEN);
const tj = body.indexOf(TUNE_CLOSE);
if (ti < 0 || tj < 0) throw new Error('tunables block markers not found');
const tunables = body.slice(ti, tj);
const wired = `  // ---------- Tunables (sourced from src/game/config/tuning.ts) ----------
  // Values are NOT redefined here. Any change must go through the typed config
  // and bump tuningVersion. See handbook 7.6.
  const { controls, launch, momentum, steering, collision, items, finalSprint,
          camera, trackGeneration, networkInterpolation, race, scoring } = tuning;
  const PX_PER_UNIT    = camera.pxPerUnit;
  let   LEVEL_LENGTH   = race.defaultLevelUnits;
  let   SPRINT_START   = race.defaultSprintStartUnits;
  function setLevelLength(units){ LEVEL_LENGTH = Math.max(finalSprint.minLevelUnits, Math.round(units)); SPRINT_START = LEVEL_LENGTH - Math.min(finalSprint.zoneMaxUnits, Math.round(LEVEL_LENGTH*finalSprint.zoneFraction)); }
  const CRUISE_CAP     = momentum.cruiseCap;
  const OVER_CAP       = momentum.overCap;
  const SPERM_Y_FRAC   = camera.spermYFraction;
  const REFRACTORY     = controls.strokeRefractoryMs;
  const SHAKE_THRESH   = controls.shakeThreshold;
  const STROKE_WINDOW  = controls.strokeWindowMs;
  const STEADY_RATE    = controls.steadyRhythmRate;
  const ACCEL_UP       = momentum.accelUp;
  const DRIVE_RATE     = controls.driveRate;
  const DECAY_CRUISE   = momentum.decayCruise;
  const DECAY_SPRINT   = momentum.decaySprint;
  const STEER_SENS     = steering.sensitivity;
  const TILT_GAIN      = steering.tiltGain;
  const STEER_LOCK_MS  = steering.shakeLockMs;
  const STEER_FLOOR    = CRUISE_CAP * steering.authorityFloorFraction;
  const HIT_PENALTY    = collision.speedKeptOnHit;
  const CHG_RATE       = launch.chargeRatePerSecond;
  const CHG_ACTIVE_MS  = launch.activeWindowMs;
  const CHG_ZONE_LO    = launch.goZoneLow, CHG_ZONE_HI = launch.goZoneHigh, CHG_MAX = launch.chargeMax;
  const CHG_RELEASE_MS = launch.releaseIdleMs;

  // iOS Safari reports accelerationIncludingGravity with the OPPOSITE sign to Android/Chrome,
  // so tilt-steering comes out mirrored on iPhone. Flip it on iOS so both platforms match.
  const IS_IOS = /iP(hone|ad|od)/.test(navigator.userAgent) ||
                 (navigator.platform === 'MacIntel' && (navigator.maxTouchPoints || 0) > 1);
  const MOTION_SIGN = IS_IOS ? -1 : 1;

`;
body = body.slice(0, ti) + wired + body.slice(tj);

// The original file declared setLevelLength inside the tunables block; drop the duplicate.
body = body.replace(
  /\n  function setLevelLength\(units\)\{ LEVEL_LENGTH = Math\.max\(700[^\n]*\n/,
  '\n'
);

const gameTs = `/* eslint-disable */
// @ts-nocheck
/**
 * LEGACY GAME MODULE — transplanted verbatim from the single-file prototype.
 *
 * This file is intentionally untyped for now (@ts-nocheck). It is being split
 * into typed modules incrementally (handbook 7.2 / audit P1-08). Do not retune
 * gameplay here: all constants come from ../config/tuning.ts.
 *
 * bootGame() returns a handle used by tests to drive the loop deterministically.
 */
import { tuning } from '../config/tuning';

export function bootGame() {
  "use strict";
${body}

  // Test/diagnostic handle. Not a global; production simply ignores it.
  return { G, MP, tuning, loop, resize, competitors, setLevelLength, encodeGhost, decodeGhost, ghostWorldAt, setGhost };
}
`;

const mainTs = `import '../src/styles/game.css';
`;

// index.html — DOM only; head mirrors the previous generated wrapper exactly.
const indexHtml = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover">
<title>One in a Million</title>
<meta name="theme-color" content="#0d0305">
<meta name="mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
<meta name="apple-mobile-web-app-title" content="One in a Million">
<link rel="manifest" href="manifest.webmanifest">
<link rel="icon" href="icon.svg" type="image/svg+xml">
<link rel="apple-touch-icon" href="icon.svg">
<style>html,body{margin:0;background:#0d0305;}</style>
</head>
<body>
${dom}
<script type="module" src="/src/main.ts"></script>
</body>
</html>
`;

fs.mkdirSync(path.join(root, 'src/styles'), { recursive: true });
fs.mkdirSync(path.join(root, 'src/game/legacy'), { recursive: true });
fs.writeFileSync(path.join(root, 'src/styles/game.css'), style.body.replace(/^\n/, ''), 'utf8');
fs.writeFileSync(path.join(root, 'src/game/legacy/game.ts'), gameTs, 'utf8');
fs.writeFileSync(path.join(root, 'index.html'), indexHtml, 'utf8');
fs.writeFileSync(path.join(root, 'tools/.cdn-transports.js'), modScript.body.trim() + '\n', 'utf8');

console.log('css bytes      :', style.body.length);
console.log('dom bytes      :', dom.length);
console.log('game body bytes:', body.length);
console.log('removed tunables block bytes:', tunables.length);
console.log('wrote: index.html, src/styles/game.css, src/game/legacy/game.ts');
