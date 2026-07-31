/* eslint-disable */
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
import { tuning, tuningVersion } from '../config/tuning';
import { mulberry32, randomSeed, type Rng } from '../content/prng';
import { encodeDeltas, decodeDeltas, interpolateAt, encodeChallengeCode, decodeChallengeCode } from '../replay/codec';
import { art, equip } from '../assets/store';
import { emitAudio, unlockAudio, setMusicState, setRaceSpeed, getAudioSettings, setAudioSettings } from '../../audio';

export function bootGame() {
  "use strict";

  const canvas = document.getElementById('c');
  const ctx = canvas.getContext('2d');
  const $ = id => document.getElementById(id);
  const now = () => performance.now();

  // ---------- Tunables (sourced from src/game/config/tuning.ts) ----------
  // Values are NOT redefined here. Any change must go through the typed config
  // and bump tuningVersion. See handbook 7.6.
  const { controls, launch: launchCfg, momentum, steering, collision, items, finalSprint,
          camera, trackGeneration, networkInterpolation, race, scoring, endless: END } = tuning;
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
  const CHG_RATE       = launchCfg.chargeRatePerSecond;
  const CHG_ACTIVE_MS  = launchCfg.activeWindowMs;
  const CHG_ZONE_LO    = launchCfg.goZoneLow, CHG_ZONE_HI = launchCfg.goZoneHigh, CHG_MAX = launchCfg.chargeMax;
  const CHG_RELEASE_MS = launchCfg.releaseIdleMs;

  // iOS Safari reports accelerationIncludingGravity with the OPPOSITE sign to Android/Chrome,
  // so tilt-steering comes out mirrored on iPhone. Flip it on iOS so both platforms match.
  const IS_IOS = /iP(hone|ad|od)/.test(navigator.userAgent) ||
                 (navigator.platform === 'MacIntel' && (navigator.maxTouchPoints || 0) > 1);
  const MOTION_SIGN = IS_IOS ? -1 : 1;

  // ---------- State ----------
  let W=0, H=0, spermY=0, cx=0, maxHalf=0, dpr=1;
  const GFX = {};   // cached gradients (rebuilt on resize)
  const G = {
    state:'start', mode:'level',
    _viewScale:1,
    inputUsed:{ motion:false, keyboard:false, touch:false }, inputClass:'mobile_motion',
    externalChallenge:false, isPersonalBest:false, _soloPractice:false,
    canalSeed:0,
    distance:0, prevDistance:0, speed:0,
    xNorm:0, steer:0, steerTarget:0,
    strokes:[], boostOn:false, sprint:false,
    boostCharges:items.startingBoostCharges, shieldCharges:items.startingShieldCharges, shieldActive:false, boosting:0,
    charge:0, chargeInputT:0,
    topSpeed:0, hits:0, elapsed:0,
    obstacles:[], pickups:[], score:0, nextSpawn:0, particles:[],
    raceSeed:0, rng:(Math.random as Rng), _seedOverride:null,
    challengeSeed:null, challengeTuning:null, challengeLegacy:false, challengeLevelUnits:0,
    ghost:null, ghostTime:0, ghostRec:[], _ghostTimer:0, lastGhostCode:'',
    hitFlash:0, shake:0, tailPhase:0, flick:0,
    rival:{ world:0, speed:0, target:60, finished:false, finishT:0, retarget:0 },
    finished:false, win:false, muted:false,
    // Finish flow (goal): presentation-only absorption animation. The authoritative
    // result is locked on the crossing frame (commitGoalFinish); the animation only
    // delays the results overlay and never touches elapsed/score/replay/placement.
    _committed:false, _commitCount:0, _result:null, finishAnim:null, finishElapsed:0, finishScore:0, _eggFrames:0,
    banner:null, _lastStroke:0,
    motion:{ active:false, base:0, lp:0, grav:0, prevMag:null, permission:'—', events:0 },
    ptr:{ down:false },
  };

  // ---------- Sizing ----------
  function resize(){
    const r = canvas.getBoundingClientRect();
    const screenW = r.width, screenH = r.height;
    dpr = Math.min(window.devicePixelRatio || 1, 2.5);
    canvas.width = Math.round(screenW*dpr); canvas.height = Math.round(screenH*dpr);
    // Lay the whole world out in a fixed LOGICAL width and uniformly scale it to
    // fill the real screen width. Canal width / obstacle geometry are then
    // identical on every device (audit P1-10/H4); wider aspect ratios just see a
    // little more vertical track. The simulation now uses only logical units.
    const viewScale = screenW / camera.logicalWidth;
    G._viewScale = viewScale;
    ctx.setTransform(dpr*viewScale, 0, 0, dpr*viewScale, 0, 0);
    W = camera.logicalWidth; H = screenH / viewScale;
    spermY = H*SPERM_Y_FRAC; cx = W/2; maxHalf = Math.min(W*camera.maxHalfViewportFraction, camera.maxHalfCapPx);
    // cache gradients once per resize (creating them every frame tanked Android perf)
    GFX.wallL = ctx.createLinearGradient(0,0,cx,0);
    GFX.wallL.addColorStop(0,'#1c060b'); GFX.wallL.addColorStop(0.5,'#5e1229'); GFX.wallL.addColorStop(1,'#b8304f');
    GFX.wallR = ctx.createLinearGradient(W,0,cx,0);
    GFX.wallR.addColorStop(0,'#1c060b'); GFX.wallR.addColorStop(0.5,'#5e1229'); GFX.wallR.addColorStop(1,'#b8304f');
    GFX.edge = ctx.createLinearGradient(0,0,W,0);   // shadow cast inward from both walls = depth
    GFX.edge.addColorStop(0,'rgba(6,1,3,.80)'); GFX.edge.addColorStop(0.26,'rgba(6,1,3,0)');
    GFX.edge.addColorStop(0.74,'rgba(6,1,3,0)');  GFX.edge.addColorStop(1,'rgba(6,1,3,.80)');
    GFX.vig = ctx.createRadialGradient(cx,H*0.5,H*0.3, cx,H*0.5,H*0.85);
    GFX.vig.addColorStop(0,'rgba(0,0,0,0)'); GFX.vig.addColorStop(1,'rgba(9,2,4,.55)');
  }
  window.addEventListener('resize', resize);
  if (window.ResizeObserver){ new ResizeObserver(resize).observe(canvas); }

  // ---------- Canal geometry ----------
  function wallHalf(worldY){
    const t = worldY*trackGeneration.wallFrequency + G.canalSeed;   // per-run phase => tunnel shape differs every game
    let half = maxHalf*(trackGeneration.wallBase + trackGeneration.wallAmplitude*Math.sin(t));
    half *= trackGeneration.wallModBase + trackGeneration.wallModAmplitude*Math.sin(t*trackGeneration.wallSecondaryFrequency + trackGeneration.wallSecondaryPhase);
    // Width profile: FULL width for the first `wideUntilFraction` of the track (a
    // wide, easier plateau), then taper down so the canal reaches its narrowest by
    // the FINAL SPRINT start and holds that width to the egg. The obstacle-bearing
    // run stays roomy; the pinch lands where the sprint (obstacle-free) begins.
    const prog = Math.min(1, worldY/LEVEL_LENGTH);
    const wideUntil = trackGeneration.wideUntilFraction;
    const narrowBy = Math.max(wideUntil + 0.05, SPRINT_START/LEVEL_LENGTH);   // taper completes at the sprint
    const taper = Math.min(1, Math.max(0, (prog - wideUntil) / (narrowBy - wideUntil)));
    half *= 1 - trackGeneration.narrowAmount*Math.pow(taper, trackGeneration.narrowPower);
    return Math.max(maxHalf*trackGeneration.minHalfFraction, half);
  }
  // VISUAL-ONLY organic edge: small layered "villi" ripples make the membrane look
  // uneven/biological instead of a clean math curve. Collision & obstacle/sperm
  // placement keep the smooth wallHalf() — this only perturbs what is DRAWN.
  function villi(w, off){ return Math.sin(w*0.13+off)*4 + Math.sin(w*0.31+off*1.7)*3 + Math.sin(w*0.67+off*2.3)*2.2 + Math.sin(w*1.4+off)*1.2; }
  function wallHalfViz(worldY, off){ return wallHalf(worldY) + villi(worldY, off); }
  const yToWorld = y => G.distance + (spermY - y)/PX_PER_UNIT;
  const worldToY = w => spermY - (w - G.distance)*PX_PER_UNIT;

  // ---------- Audio ----------
  // All sound + haptics go through the centralized system in src/audio (the sim
  // only emits typed events; the AudioManager owns Web Audio / vibration). The old
  // procedural tones live on as SfxPlayer fallbacks. `initAudio()` here is just the
  // gesture-driven unlock hook. `G.muted` mirrors the persisted audio setting so
  // the in-HUD mute button keeps working.
  function initAudio(){ unlockAudio(); }

  // ---------- Strokes ----------
  function registerStroke(intensity){
    const t = now();
    if (t - G._lastStroke < REFRACTORY) return;
    G._lastStroke = t;
    G.flick = Math.min(1, G.flick+0.6);
    // A stroke while charging is a "rev tick"; while playing it's a swim stroke.
    emitAudio(G.state==='charging' ? 'charge_tick' : 'stroke', { intensity: Math.min(1, intensity||0.6) });
    // strokes no longer punch speed directly — they mark "I'm shaking now";
    // update() turns sustained shaking into a smooth, gradual push.
    if (G.state === 'charging'){ G.chargeInputT = t; }
    else if (G.state === 'playing'){ G.strokes.push(t); }
  }

  // ---------- Motion ----------
  function onMotion(e){
    G.motion.events++;
    const g = e.accelerationIncludingGravity;
    if (!g || g.x == null) return;
    if (!G.motion.active){ G.motion.active = true; $('strokepad').classList.add('hidden'); updateHint(); }
    if (G.state==='playing'||G.state==='charging') G.inputUsed.motion = true;   // motion is driving the run
    G.motion.lp = G.motion.lp*0.85 + g.x*0.15;
    // neutral ("straight ahead") = your natural hold, averaged right up until launch
    if (G.state === 'ready' || G.state === 'charging') G.motion.base = G.motion.base*0.92 + G.motion.lp*0.08;
    if (G.state === 'playing'){
      // while shaking, the shake blurs the tilt reading and it's hard to aim → hold straight;
      // steer only when you hold the phone steady (not mid-stroke).
      const shaking = (now() - G._lastStroke) < STEER_LOCK_MS;
      G.steerTarget = (shaking || G.sprint) ? 0 : Math.max(-1, Math.min(1, -(G.motion.lp - G.motion.base) * TILT_GAIN * MOTION_SIGN));
    }
    let mag; const a = e.acceleration;
    if (a && a.x != null){ mag = Math.hypot(a.x,a.y,a.z); }
    else { const m = Math.hypot(g.x,g.y,g.z); G.motion.grav = G.motion.grav*0.9 + m*0.1; mag = Math.abs(m - G.motion.grav); }
    if ((G.state==='playing' || G.state==='charging') && G.motion.prevMag != null){
      if (mag - G.motion.prevMag > SHAKE_THRESH) registerStroke(Math.min(1,(mag-G.motion.prevMag)/14));
    }
    G.motion.prevMag = mag;
  }

  // ---------- Keyboard + pointer ----------
  // Input-class governance (handbook 1.2): keyboard/touch play is unranked; only
  // sustained mobile-motion runs are ranked. We record which inputs actually drove
  // the run and classify it at the finish.
  function markInput(kind){ if (G.state==='playing'||G.state==='charging'||G.state==='ready') G.inputUsed[kind]=true; }
  function activeInputClass(){
    const u = G.inputUsed;
    if (u.keyboard) return 'desktop_keyboard';   // any keyboard use disqualifies from ranked
    if (u.touch)    return 'mobile_touch_fallback';
    if (u.motion)   return 'mobile_motion';
    // nothing used yet → fall back to device capability
    return G.motion.active ? 'mobile_motion' : (IS_IOS || ('ontouchstart' in window) ? 'mobile_touch_fallback' : 'desktop_keyboard');
  }
  function isRanked(){ return activeInputClass()==='mobile_motion'; }
  window.addEventListener('keydown', e => {
    if (e.repeat) return;
    if (e.code==='ArrowLeft'||e.code==='KeyA'){ G.steerTarget=-1; markInput('keyboard'); }
    else if (e.code==='ArrowRight'||e.code==='KeyD'){ G.steerTarget=1; markInput('keyboard'); }
    else if (e.code==='Space'){ e.preventDefault(); if (G.state==='playing'||G.state==='charging'){ markInput('keyboard'); registerStroke(0.8); } }
  });
  window.addEventListener('keyup', e => {
    if ((e.code==='ArrowLeft'||e.code==='KeyA') && G.steerTarget<0) G.steerTarget=0;
    if ((e.code==='ArrowRight'||e.code==='KeyD') && G.steerTarget>0) G.steerTarget=0;
  });
  $('strokepad').addEventListener('pointerdown', e => { e.preventDefault(); if (G.state==='playing'||G.state==='charging'){ markInput('touch'); registerStroke(0.85); } });
  canvas.addEventListener('pointerdown', e => { if (G.motion.active) return; G.ptr.down=true; steerFromPointer(e); });
  canvas.addEventListener('pointermove', e => { if (G.ptr.down) steerFromPointer(e); });
  window.addEventListener('pointerup', () => { if (G.ptr.down){ G.ptr.down=false; G.steerTarget=0; } });
  // Skip the finish animation with a tap (only after FINISH_SKIP_MS). This jumps
  // straight to results; it can never change the already-locked finish data.
  window.addEventListener('pointerdown', () => {
    if (G.state==='finishing' && G.finishAnim && (now()-G.finishAnim.startMs) >= FINISH_SKIP_MS) showResults();
  }, true);
  function steerFromPointer(e){ markInput('touch'); const r=canvas.getBoundingClientRect(); const xLogical=(e.clientX-r.left)/(G._viewScale||1); G.steerTarget=Math.max(-1,Math.min(1,(xLogical - W/2)/(W*0.34))); }

  // ---------- Banner ----------
  function banner(text){ G.banner = { text, t: now() }; }

  // ---------- Ghost race (async multiplayer) ----------
  // Records the player's distance every 0.1s, encodes it into a shareable code so a
  // friend can race against this exact run as a "ghost". No server needed.
  // Replay/challenge encoding lives in the pure ../replay/codec module (no DOM/state).
  // These thin wrappers bind it to the current game state.
  const encodeGhost = encodeDeltas;
  const decodeGhost = decodeDeltas;
  function ghostWorldAt(t){ return interpolateAt(G.ghost, t); }
  function encodeChallenge(){
    return encodeChallengeCode({
      seed: G.raceSeed,
      distM: LEVEL_LENGTH / PX_PER_UNIT,
      tuningVersion,
      durMs: G.elapsed * 1000,
      dists: G.ghostRec,
      inputClass: G.inputClass || activeInputClass(),
    });
  }
  const decodeChallenge = decodeChallengeCode;

  function setChallenge(dec){
    if (!dec || !dec.dists || dec.dists.length < 3) return false;
    G.ghost = dec.dists;
    G.challengeSeed   = dec.seed;                       // null for v1
    G.challengeTuning = dec.tv;
    G.challengeLegacy = dec.version < 2 || dec.seed == null || (dec.tv && dec.tv !== tuningVersion);
    const units = (dec.distM != null) ? dec.distM * PX_PER_UNIT : dec.dists[dec.dists.length-1];
    setLevelLength(units);
    G.challengeLevelUnits = LEVEL_LENGTH;
    let gt = dec.dists.length*0.1;
    for (let i=0;i<dec.dists.length;i++){ if (dec.dists[i] >= LEVEL_LENGTH){ gt=i*0.1; break; } }
    G.ghostTime = gt;
    G.externalChallenge = true;   // a loaded ghost is an external challenge by default (PB load resets this)
    G.isPersonalBest = false;
    selectMode('level');
    const b=$('challengeBadge');
    if (b){ b.classList.remove('hidden');
      b.innerHTML = (G.challengeLegacy ? '⚠ Legacy challenge — ' : '⚔ Challenge — ') +
                    'beat <b>'+gt.toFixed(1)+'s</b> to the egg'; }
    return true;
  }
  // Back-compat shim (bare distance array = legacy v1).
  function setGhost(dists){ return setChallenge({ version:1, dists, seed:null, tv:null, distM:null }); }

  function loadGhostFromHash(){
    const m = (location.hash||'').match(/g=([A-Za-z0-9\-_~.]+)/);
    if (m){ try { if (setChallenge(decodeChallenge(decodeURIComponent(m[1])))) G.externalChallenge = true; } catch(e){} }
  }

  // ---------- Live multiplayer (serverless P2P rooms via Trystero) ----------
  const MP = { active:false, transport:'', room:null, client:null, ch:null, id:'', code:'', name:'', peers:{}, finishes:{}, send:null, sendGo:null, started:false, _sendT:0 };
  const randomCode = () => { let c='', A='ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; for(let i=0;i<4;i++) c+=A[Math.floor(Math.random()*A.length)]; return c; };
  function peerHue(id){ let h=0; for(const ch of id) h=(h*31 + ch.charCodeAt(0))%360; return h; }
  function peerCount(){ return Object.keys(MP.peers).length; }

  // --- server config (Supabase: works with self-hosted Docker or cloud — only URL + anon key change) ---
  // Live server everyone uses by default. The anon key is public by design (safe in client code).
  const SUPA_DEFAULT = {
    url: 'https://tsddumsxoclcjguczezr.supabase.co',
    key: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRzZGR1bXN4b2NsY2pndWN6ZXpyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQ4Nzg0OTAsImV4cCI6MjEwMDQ1NDQ5MH0.1yTBnlNOAzxgSQdS27bo52fPSx_JEH5T2DM3cQb8rq4'
  };
  const normUrl = u => String(u||'').trim().replace(/\/+$/,'').replace(/\/rest\/v1$/,'');
  function supaCfg(){
    try { const s = JSON.parse(localStorage.getItem('oiam_supa')||'null'); if (s && s.url && s.key) return s; } catch(e){}
    return SUPA_DEFAULT;
  }
  function setSupaCfg(){
    const cur = supaCfg()||{}; let url='', key='';
    try { url = prompt('Supabase URL — leave blank to use the default live server:', cur.url||'')||''; } catch(e){ return; }
    if (!normUrl(url)){ try{ localStorage.removeItem('oiam_supa'); }catch(e){} toast('Using the default live server ✓'); return; }
    try { key = prompt('Supabase anon key:', cur.key||'')||''; } catch(e){ return; }
    if (!key.trim()) return;
    try { localStorage.setItem('oiam_supa', JSON.stringify({ url:normUrl(url), key:key.trim() })); } catch(e){}
    toast('Custom server saved ✓');
  }

  function startLive(){
    const cfg = supaCfg();
    const haveSupa = !!(cfg && cfg.url && cfg.key && window.__supa);
    if (!haveSupa && !window.__trystero){ toast('Live race needs the web/app link (not the in-chat preview)'); return; }
    let code=''; try{ code = prompt('Enter a room code to join a friend, or leave blank to create one:')||''; }catch(e){ return; }
    code = code.trim().toUpperCase().replace(/[^A-Z0-9]/g,'').slice(0,6);
    MP.isHost = !code;                    // created the room => host; typed a code => joined
    if (!code) code = randomCode();
    MP.code=code; MP.active=true; MP.started=false; MP.peers={};
    MP.name = 'Swimmer '+Math.floor(Math.random()*90+10);
    MP.id = Math.random().toString(36).slice(2,9);
    if (haveSupa) startLiveSupabase(code, cfg); else startLiveP2P(code);
  }

  function startLiveSupabase(code, cfg){
    try {
      const client = window.__supa.createClient(cfg.url, cfg.key, { realtime:{ params:{ eventsPerSecond: 20 } } });
      const ch = client.channel('oiam:'+code, { config:{ broadcast:{ self:false }, presence:{ key: MP.id } } });
      MP.transport='supabase'; MP.client=client; MP.ch=ch;
      ch.on('broadcast', { event:'st' }, ({ payload }) => {
        if (!payload || !payload.id) return;
        ingestPeerState(payload.id, payload);
      });
      ch.on('broadcast', { event:'go' }, ({ payload }) => { if (!MP.started) beginLiveRace(payload && payload.m, payload && payload.seed); });
      ch.on('presence', { event:'sync' }, updateLobby);
      ch.on('presence', { event:'join' }, updateLobby);
      ch.on('presence', { event:'leave' }, updateLobby);
      ch.subscribe(async (status) => {
        if (status==='SUBSCRIBED'){ try{ await ch.track({ name: MP.name }); }catch(e){} updateLobby(); }
        else if (status==='CHANNEL_ERROR' || status==='TIMED_OUT'){ toast('Cannot reach Supabase — check Server settings'); }
      });
      MP.send   = (payload) => { try{ ch.send({ type:'broadcast', event:'st', payload:{ ...payload, id:MP.id } }); }catch(e){} };
      MP.sendGo = (payload) => { try{ ch.send({ type:'broadcast', event:'go', payload: payload||{} }); }catch(e){} };
      showLobby();
    } catch(e){ MP.active=false; toast('Supabase connection failed — check Server settings'); }
  }

  function startLiveP2P(code){
    try {
      const room = window.__trystero.joinRoom({ appId:'oneinamillion-oiam-v1' }, code);
      MP.transport='p2p'; MP.room=room;
      const [sendState, getState] = room.makeAction('st');
      const [sendGo, getGo] = room.makeAction('go');
      MP.send = sendState; MP.sendGo = sendGo;
      getState((d, id) => ingestPeerState(id, d));
      getGo((d) => { if (!MP.started) beginLiveRace(d && d.m, d && d.seed); });
      room.onPeerJoin(()=>updateLobby());
      room.onPeerLeave(id=>{ delete MP.peers[id]; updateLobby(); });
      showLobby();
    } catch(e){ MP.active=false; toast('Could not open the room — try the web/app link'); }
  }

  function showLobby(){ $('start').classList.add('hidden'); $('end').classList.add('hidden'); $('lobby').classList.remove('hidden'); updateLobby(); }
  function updateLobby(){
    const el=$('lobbyInfo'); if(!el) return;
    let n = peerCount()+1;
    if (MP.transport==='supabase' && MP.ch && MP.ch.presenceState){ try{ n = Math.max(1, Object.keys(MP.ch.presenceState()).length); }catch(e){} }
    const via = MP.transport==='supabase' ? 'Supabase' : 'P2P';
    el.innerHTML = 'Room <b>'+MP.code+'</b><br><span style="font-size:15px;color:var(--muted)">'+n+' swimmer'+(n===1?'':'s')+' connected · via '+via+'</span>';
    // only the host starts the race (and picks the distance)
    const sb=$('lobbyStart'), wt=$('lobbyWait'), ch=$('mpChips');
    if (sb) sb.style.display = MP.isHost ? '' : 'none';
    if (ch) ch.style.display = MP.isHost ? '' : 'none';
    if (wt) wt.style.display = MP.isHost ? 'none' : '';
  }
  function leaveLobby(){
    try{ clearInterval(MP._finT); }catch(e){}
    try{ MP.room && MP.room.leave && MP.room.leave(); }catch(e){}
    try{ MP.ch && MP.ch.unsubscribe && MP.ch.unsubscribe(); }catch(e){}
    MP.active=false; MP.transport=''; MP.room=null; MP.ch=null; MP.client=null; MP.peers={}; MP.finishes={}; MP.started=false;
    $('lobby').classList.add('hidden'); $('start').classList.remove('hidden');
  }
  let mpM = 600;   // multiplayer track length (metres), chosen in the lobby
  function beginLiveRace(m, seed){ MP.started=true; MP.finishes={}; G.ghost=null; G._seedOverride = (seed!=null) ? (seed>>>0) : randomSeed(); setLevelLength((m||mpM||600)*PX_PER_UNIT); $('lobby').classList.add('hidden'); selectMode('level'); beginPlay(); }
  function broadcastState(){ if (!MP.active || !MP.send) return; MP.send({ d:Math.round(G.distance), x:+G.xNorm.toFixed(2), n:MP.name, fin:G.finished?1:0, ft:+G.elapsed.toFixed(1) }); }

  // ---- Multiplayer finish authority (P1-11) ----
  // Clients self-report position, so we cannot fully trust them without a server.
  // What we CAN do P2P: race one shared seeded track (host broadcasts the seed), and
  // treat each peer's FIRST physically-plausible finish time as authoritative —
  // deduplicating repeat/contradictory reports and rejecting impossible times.
  // Nothing can move faster than OVER_CAP, so a run shorter than this is a fabrication.
  function minPossibleFinishSeconds(){ return LEVEL_LENGTH / OVER_CAP; }
  function recordPeerFinish(id, ft){
    if (ft == null || ft <= 0) return;                    // missing / nonsense
    if (ft < minPossibleFinishSeconds()) return;          // physically impossible -> reject
    if (MP.finishes[id] == null) MP.finishes[id] = ft;    // idempotent: first valid report wins
  }
  function ingestPeerState(id, d){
    if (!d || id === MP.id) return;
    const p = MP.peers[id] || (MP.peers[id] = {});
    p.td = d.d; p.tx = d.x; if (p.d == null){ p.d = p.td; p.x = p.tx; }   // smoothed toward target
    p.n = d.n; p.fin = d.fin; p.ft = d.ft; p.t = now();
    if (d.fin) recordPeerFinish(id, d.ft);
  }
  // Placement from the validated finish set: how many peers legitimately finished
  // before us. total counts everyone still present (finished peers are kept).
  function mpPlacement(){
    const total = peerCount() + 1;
    const before = Object.keys(MP.finishes).filter((id) => id !== MP.id && MP.finishes[id] <= G.elapsed).length;
    return { place: before + 1, total };
  }
  // keep finished racers forever (they stop broadcasting) so results/placement stay correct
  function prunePeers(){ const t=now(); for (const id in MP.peers){ const p=MP.peers[id]; if (!p.fin && t-(p.t||0) > networkInterpolation.peerTimeoutMs) delete MP.peers[id]; } }
  function smoothPeers(dt){
    const k = Math.min(1, dt*networkInterpolation.smoothingPerSecond);
    for (const id in MP.peers){ const p=MP.peers[id];
      if (p.td!=null){ if (p.d==null) p.d=p.td; p.d += (p.td-p.d)*k; }
      if (p.tx!=null){ if (p.x==null) p.x=p.tx; p.x += (p.tx-p.x)*k; }
    }
  }
  // Everyone you're racing (live peers, or the AI rival / friend's ghost in single player)
  function competitors(){
    const out=[];
    if (MP.active){
      for (const id in MP.peers){ const p=MP.peers[id]; if (p.d==null) continue; out.push({ id, world:p.d, name:p.n||'?', hue:peerHue(id) }); }
    } else if (G.mode==='level' && G.rival && !G.rival.finished){
      out.push({ id:'rival', world:G.rival.world, name: G.ghost?'Ghost':'Rival', hue: G.ghost?215:2 });
    }
    return out;
  }
  // Race rail on the right: a marker for every competitor, not just you
  function syncRaceMarkers(){
    const race=$('race'); if(!race) return;
    const list=competitors();
    const pool = race.__pool || (race.__pool=[]);
    while (pool.length < list.length){ const d=document.createElement('div'); d.className='marker comp'; race.appendChild(d); pool.push(d); }
    for (let i=0;i<pool.length;i++){
      const el=pool[i];
      if (i<list.length){ const c=list[i];
        el.style.display='';
        el.style.top = (100 - Math.min(100, Math.max(0, c.world/LEVEL_LENGTH*100)))+'%';
        el.style.background = 'hsl('+c.hue+',80%,60%)';
        el.style.color = 'hsl('+c.hue+',80%,60%)';
      } else el.style.display='none';
    }
  }
  // Competitors off the top/bottom of the screen: show a pointer + how far away they are
  function drawCompetitorMarkers(){
    const list=competitors(); if (!list.length) return;
    const ahead=[], behind=[];
    for (const c of list){ const y=worldToY(c.world); if (y>=-30 && y<=H+30) continue; (y<0?ahead:behind).push(c); }
    if (!ahead.length && !behind.length) return;
    ctx.save(); ctx.textAlign='center'; ctx.font='700 10px system-ui, sans-serif';
    const row=(arr,py,up)=>arr.forEach((c,i)=>{
      const x = cx + (i-(arr.length-1)/2)*80;
      const col='hsl('+c.hue+',80%,62%)';
      const gapM = Math.abs(Math.round((c.world-G.distance)/PX_PER_UNIT));
      ctx.fillStyle=col; ctx.beginPath();
      if (up){ ctx.moveTo(x-8,py+7); ctx.lineTo(x+8,py+7); ctx.lineTo(x,py-6); }
      else   { ctx.moveTo(x-8,py-7); ctx.lineTo(x+8,py-7); ctx.lineTo(x,py+6); }
      ctx.closePath(); ctx.fill();
      ctx.fillStyle='#fff'; ctx.fillText(gapM+'m '+c.name, x, up?py+20:py-14);
    });
    row(ahead, 104, true); row(behind, H-104, false);
    ctx.restore();
  }
  function drawPeers(){
    for (const id in MP.peers){ const p=MP.peers[id]; if (p.d==null) continue;
      const y=worldToY(p.d); if (y<-44||y>H+44) continue;
      const x=cx + (p.x||0)*(wallHalf(p.d)-22); const hue=peerHue(id);
      drawSpermShape(x, y, 0.82, 'hsl('+hue+',75%,88%)', 'hsl('+hue+',85%,62%)', p.fin?0.26:0.5, now()*0.011, false);
      ctx.save(); ctx.globalAlpha=0.6; ctx.fillStyle='#fff'; ctx.font='700 10px system-ui, sans-serif'; ctx.textAlign='center';
      ctx.shadowColor='#000'; ctx.shadowBlur=4; ctx.fillText(p.n||'?', x, y-26); ctx.restore();
    }
  }

  // ---------- Spawning ----------
  function seedParticles(){
    G.particles = [];
    for (let i=0;i<trackGeneration.particleCount;i++) G.particles.push({ w:G.distance + G.rng()*(H/PX_PER_UNIT+60), lane:(G.rng()*2-1), s:1+G.rng()*2.4, sway:G.rng()*6.28 });
  }
  function spawnAhead(){
    const horizon = G.distance + H/PX_PER_UNIT + 40;
    const spawnLimit = (G.mode==='level') ? SPRINT_START : Infinity; // clear straight for the sprint
    while (G.nextSpawn < horizon){
      const prog = Math.min(1, G.nextSpawn/LEVEL_LENGTH);   // 0 at the wide start -> 1 at the narrow egg
      // Distribute by LOCAL lane width: wide canal => denser obstacles, narrow => sparser.
      const wf = Math.max(0.3, Math.min(1, wallHalf(G.nextSpawn)/maxHalf));
      const gap = Math.max(60, Math.min(trackGeneration.gapMax,
        trackGeneration.gapBase * (1 + trackGeneration.widthDensityBias*(0.5 - wf)) + G.nextSpawn*trackGeneration.gapPerWorldUnit));
      if (G.nextSpawn > trackGeneration.graceUntilUnits && G.nextSpawn < spawnLimit){
        if (G.rng() < trackGeneration.cellProbability){
          const n = 1 + (G.rng() < trackGeneration.clusterProbability*(1-prog) ? 1 : 0);        // clusters early, singles late
          // wider canal => bigger cells; capped to a fraction of the lane so it stays passable
          const size = Math.min(
            (trackGeneration.cellSizeBase + G.rng()*trackGeneration.cellSizeRandom) * (1 + trackGeneration.widthSizeBias*(wf - 0.5)),
            wallHalf(G.nextSpawn) * trackGeneration.maxCellLaneFraction);
          for (let i=0;i<n;i++) G.obstacles.push({ type:'cell', world:G.nextSpawn + i*trackGeneration.clusterSpacingUnits, lane:(G.rng()*trackGeneration.cellLaneSpread-trackGeneration.cellLaneSpread/2), r:size, hit:false, ph:G.rng()*6.28 });
        } else {
          G.obstacles.push({ type:'band', world:G.nextSpawn, gapLane:(G.rng()*trackGeneration.bandLaneSpread-trackGeneration.bandLaneSpread/2), gapHalf:Math.min(trackGeneration.bandGapMax, trackGeneration.bandGapBase + prog*trackGeneration.bandGapByProgress), hit:false });
        }
        if (G.rng() < trackGeneration.pickupProbability){   // a collectible sitting in the open lane
          const roll=G.rng(); const kind = roll<0.5?'star':roll<0.7?'boost':roll<0.9?'shield':'speed';
          G.pickups.push({ kind, world:G.nextSpawn + gap*0.5, lane:(G.rng()*1.5-0.75), r:trackGeneration.cellSizeBase, taken:false, ph:G.rng()*6.28 });
        }
      }
      // only a rare wide-open "breather" for variety
      G.nextSpawn += (G.rng() < trackGeneration.breatherProbability) ? gap*trackGeneration.breatherMultiplier : gap;
    }
    G.obstacles = G.obstacles.filter(o => o.world > G.distance - trackGeneration.cullBehindUnits);
  }

  // ---------- Flow ----------
  function selectMode(m){ G.mode=m; const l=$('modeLevel'),e=$('modeEndless'); if(l)l.classList.toggle('sel',m==='level'); if(e)e.classList.toggle('sel',m==='endless'); }
  let practiceM = 1000;

  const detectControls = () => ('DeviceMotionEvent' in window);
  const inIframe = (() => { try { return window.self !== window.top; } catch(e){ return true; } })();
  function updateDiag(){
    const el = $('diag'); if (!el) return;
    const m = G.motion;
    // only surface this on a touch device whose motion sensor isn't delivering — otherwise stay hidden
    if (m.events>0 || (navigator.maxTouchPoints||0)===0){ el.style.display='none'; return; }
    el.style.display='';
    let s, cls='';
    if (!window.isSecureContext){ s='❌ needs HTTPS (open the https:// link)'; cls='bad'; }
    else if (!('DeviceMotionEvent' in window)){ s='❌ motion sensor not supported by this browser'; cls='bad'; }
    else if (m.events > 0){ s='✅ sensor active — tilt & shake work'; cls='ok'; }
    else if (String(m.permission).startsWith('error')){ s='❌ '+m.permission; cls='bad'; }
    else if (m.permission === 'denied'){ s='❌ motion denied — reload & tap Allow'; cls='bad'; }
    else if (m.permission === 'granted' || m.permission === 'auto'){ s='⚠️ allowed but NO sensor data'+(inIframe?' — likely the embed. Open in Safari/Chrome or fullscreen':''); cls='bad'; }
    else if (G.state === 'start'){ s='ℹ️ tap PLAY to enable motion'; }
    else { s='⏳ waiting for sensor…'; }
    el.className = 'diag '+cls;
    el.innerHTML = `Motion: ${s}<br><span class="mono">secure:${window.isSecureContext?'Y':'N'} · embed:${inIframe?'Y':'N'} · ios:${IS_IOS?'Y':'N'} · perm:${m.permission} · events:${m.events}</span>`;
  }
  function updateHint(){
    const h = $('controlHint');
    if (G.motion.active) h.innerHTML = '<b>Rev up:</b> shake to charge, stop to launch.<br><b>Then:</b> shake = speed (goes straight); stop &amp; tilt to steer.';
    else if (detectControls()) h.innerHTML = '<b>On your phone:</b> shake to charge & launch, tilt to steer.<br><b>On a laptop:</b> <span class="k">Space</span> to charge/swim, <span class="k">← →</span> to steer.';
    else h.innerHTML = '<b>Charge:</b> tap the pad / <span class="k">Space</span>, then stop to launch.<br><b>Steer:</b> drag left / right.';
  }

  async function beginPlay(){
    unlockAudio();   // real user gesture (Play/Race) — create/resume the AudioContext
    try{
      if (typeof DeviceMotionEvent!=='undefined' && typeof DeviceMotionEvent.requestPermission==='function'){
        const res = await DeviceMotionEvent.requestPermission();
        G.motion.permission = res;
        if (res==='granted') window.addEventListener('devicemotion', onMotion);
      } else if ('DeviceMotionEvent' in window){ G.motion.permission='auto'; window.addEventListener('devicemotion', onMotion); }
      else { G.motion.permission='unsupported'; }
    }catch(e){ G.motion.permission = 'error: '+(e && e.message ? e.message : e); }
    resetRun();
    $('start').classList.add('hidden'); $('end').classList.add('hidden');
    $('hud').classList.remove('hidden');
    $('race').classList.toggle('hidden', G.mode!=='level');
    $('strokepad').classList.toggle('hidden', G.motion.active);
    $('kTime').textContent = G.mode==='endless' ? 'Time ⏱' : 'Time';
    $('btnQuit').textContent = G.mode==='endless' ? '⏹' : '✕';
    if (G.mode==='level'){ $('sprintMark').style.top = (100 - SPRINT_START/LEVEL_LENGTH*100) + '%'; }
    startCountdown();
  }
  $('againBtn').onclick = beginPlay;
  document.querySelectorAll('#distChips .chip').forEach(ch => { ch.onclick = () => { practiceM = +ch.dataset.m; document.querySelectorAll('#distChips .chip').forEach(c=>c.classList.toggle('sel', c===ch)); }; });
  // Personal-best ghost storage (per distance + input class). Racing your own best
  // run is the Practice pacer instead of a generic AI rival.
  function pbKey(distM, ic){ return 'oiam_pb_' + ic + '_' + Math.round(distM); }
  function loadPB(distM, ic){ try{ return JSON.parse(localStorage.getItem(pbKey(distM, ic)) || 'null'); }catch(e){ return null; } }
  function savePB(distM, ic, code, time){ try{ localStorage.setItem(pbKey(distM, ic), JSON.stringify({ code, time })); }catch(e){} }

  $('practicePlay').onclick = () => {
    if (G.ghost && G.externalChallenge){                       // a friend's challenge was loaded
      if (G.challengeSeed != null) G._seedOverride = G.challengeSeed;
      setLevelLength(G.challengeLevelUnits || (practiceM*PX_PER_UNIT));
      G._soloPractice = false;
    } else {
      setLevelLength(practiceM * PX_PER_UNIT);
      G.ghost = null; G.isPersonalBest = false; G.externalChallenge = false;
      let raced = false;
      const pb = (G._seedOverride == null) ? loadPB(practiceM, activeInputClass()) : null;   // respect an explicitly forced seed
      if (pb && pb.code){
        try {
          const dec = decodeChallenge(pb.code);
          if (dec && dec.dists && dec.dists.length >= 3 && dec.seed != null && dec.tv === tuningVersion){
            setChallenge(dec); G._seedOverride = G.challengeSeed; G.externalChallenge = false; G.isPersonalBest = true; raced = true;
            const b=$('challengeBadge'); if (b){ b.classList.remove('hidden'); b.innerHTML = '⏱ YOUR BEST — beat <b>'+(pb.time||G.ghostTime).toFixed(1)+'s</b>'; }
          }
        } catch(e){}
      }
      G._soloPractice = !raced;                                // no personal best yet -> solo first run
      if (!raced){ G.ghost = null; const b=$('challengeBadge'); if (b) b.classList.add('hidden'); }
    }
    selectMode('level'); beginPlay();
  };
  $('endlessPanel').onclick = () => { selectMode('endless'); beginPlay(); };
  $('mpPanel').onclick = () => startLive();
  $('chPanel').onclick = () => shareChallenge();
  let toastTimer=0;
  function toast(msg){ const t=$('toast'); if(!t) return; t.textContent=msg; t.classList.remove('hidden'); clearTimeout(toastTimer); toastTimer=setTimeout(()=>t.classList.add('hidden'), 2400); }
  function shareChallenge(){
    if (!G.lastGhostCode){ toast('Finish a Level race to the egg first — then challenge!'); return; }
    const isWeb = location.protocol.indexOf('http')===0;
    const payload = isWeb ? (location.origin + location.pathname + '#g=' + G.lastGhostCode) : G.lastGhostCode;
    const msg = isWeb ? 'Link copied! 📋 Send it to a friend' : 'Code copied! 📋 Send it to a friend';
    const fallback = () => { try { prompt('Copy this challenge, send it to a friend:', payload); } catch(e){} };
    if (navigator.clipboard && navigator.clipboard.writeText){ navigator.clipboard.writeText(payload).then(()=>toast(msg)).catch(fallback); }
    else fallback();
  }
  function enterChallenge(){
    let code=''; try { code = prompt('Paste the challenge code or link:') || ''; } catch(e){ return; }
    if (!code) return;
    const m = code.match(/g=([A-Za-z0-9\-_~.]+)/); const raw = m ? decodeURIComponent(m[1]) : code.trim();
    if (setChallenge(decodeChallenge(raw))){ G.externalChallenge = true; toast('Challenge loaded ⚔ — race the ghost!'); } else toast("Hmm, that code didn't work");
  }
  $('challengeBtn').onclick = shareChallenge;
  $('challengePaste').onclick = enterChallenge;
  $('serverCfg').onclick = setSupaCfg;
  document.querySelectorAll('#mpChips .chip').forEach(ch => { ch.onclick = () => { mpM = +ch.dataset.m; document.querySelectorAll('#mpChips .chip').forEach(c=>c.classList.toggle('sel', c===ch)); }; });
  $('lobbyStart').onclick = () => { if (!MP.isHost) return; const seed = randomSeed(); if (MP.sendGo){ try{ MP.sendGo({ m: mpM, seed }); }catch(e){} } beginLiveRace(mpM, seed); };
  $('lobbyLeave').onclick = leaveLobby;

  function resetRun(){
    try{ clearInterval(MP._finT); }catch(e){}
    // Seed the reproducible track RNG first — canal shape and particles derive from it.
    // Priority: explicit override (tests / multiplayer host / challenge) > fresh random seed.
    G.raceSeed = (G._seedOverride != null) ? (G._seedOverride >>> 0) : randomSeed();
    G._seedOverride = null;   // one-shot: consumed here so the next race is fresh unless re-set
    G.rng = mulberry32(G.raceSeed);
    Object.assign(G, { distance:0, prevDistance:0, speed:0, xNorm:0, steer:0, steerTarget:0,
      strokes:[], boostOn:false, sprint:false, charge:0, chargeInputT:0,
      topSpeed:0, hits:0, elapsed:0, obstacles:[], pickups:[], score:0, nextSpawn:0,
      hitFlash:0, shake:0, tailPhase:0, flick:0, bestDist:0, finished:false, win:false, banner:null,
      boostCharges:items.startingBoostCharges, shieldCharges:items.startingShieldCharges, shieldActive:false, boosting:0,
      ghostRec:[], _ghostTimer:0, lastGhostCode:'',
      timeLeft: END.startSeconds, checkpointsHit:0, cpIndex:0,
      nextCheckpoint: END.firstCheckpointUnits*PX_PER_UNIT,
      inputUsed:{ motion:false, keyboard:false, touch:false },
      _committed:false, _commitCount:0, _result:null, finishAnim:null, finishElapsed:0, finishScore:0, _eggFrames:0,
      canalSeed: G.rng()*1000 });
    G.motion.prevMag=null; G.motion.base=G.motion.lp;
    G.rival = { world:0, speed:0, target:0.7*CRUISE_CAP, finished:false, finishT:0, retarget:0 };
    seedParticles();
  }

  let countT=0, countN=3;
  function startCountdown(){ G.state='ready'; countN=3; countT=now(); $('count').classList.remove('hidden'); $('countBig').textContent='3'; }

  function launch(){
    const c = G.charge;
    const inZone = c>=CHG_ZONE_LO && c<=CHG_ZONE_HI;
    let launchEvent;
    if (inZone){ G.speed = OVER_CAP; banner('PERFECT LAUNCH! 🚀'); launchEvent='launch_perfect'; }
    else if (c > CHG_ZONE_HI){ G.speed = CRUISE_CAP*launchCfg.fizzleFraction; banner('OVERCOOKED 💥'); launchEvent='launch_overcooked'; }
    else { G.speed = CRUISE_CAP*(launchCfg.weakBase + launchCfg.weakScale*c); banner('LAUNCH!'); launchEvent='launch_weak'; }
    G.shake = 1; G.flick = 1; G.charge = 0; G.strokes = [];
    emitAudio(launchEvent);       // sound + launch haptic (perfect = two crisp pulses)
    G.state = 'playing';
    setMusicState('race_fast', { speed01: Math.min(1, G.speed/OVER_CAP) });   // race music starts here
  }

  function quitRun(){ if (G.state==='playing'||G.state==='charging') endRun(G.mode==='endless'); }
  $('btnQuit').onclick = quitRun;
  $('btnMute').onclick = () => { unlockAudio(); G.muted=!G.muted; setAudioSettings({ muted: G.muted }); $('btnMute').textContent = G.muted?'🔇':'🔊'; };
  $('btnCenter').onclick = () => { G.motion.base = G.motion.lp; banner('Centered ⟲'); };
  $('btnBoost').onclick = () => { if (G.state==='playing' && !G.sprint && G.boostCharges>0 && G.boosting<=0){ G.boostCharges--; G.boosting=items.boostDurationSeconds; G.speed=OVER_CAP; G.flick=1; banner('BOOST! ⚡'); emitAudio('boost_activate'); } };
  $('btnShield').onclick = () => { if (G.state==='playing' && G.shieldCharges>0 && !G.shieldActive){ G.shieldCharges--; G.shieldActive=true; banner('SHIELD UP 🛡'); emitAudio('shield_activate'); } };

  // ---- Finish "enter the ovum" animation (presentation only) --------------------
  //
  // The ovum stays FULLY VISIBLE the whole time. Champ breaks through the visible
  // membrane and travels inside: his silhouette is drawn twice per frame, clipped
  // OUTSIDE the ovum (full-bright, still emerging) and INSIDE it (dimmed, seen
  // through the membrane), so a fixed ovum-ellipse clip + a descending rig reads
  // as "passing through the surface". No sunburst rays / flash / confetti; the
  // ovum is never hidden, shrunk or made fully transparent.
  const FINISH_MS_FULL = 1500;
  const FINISH_MS_REDUCED = 600;
  const FINISH_SKIP_MS = 450;   // taps before this are ignored (no accidental skip)
  const OVUM_D = 150;           // on-screen ovum diameter (matches drawEgg eggD)

  function prefersReducedMotion(){
    try { return !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches); }
    catch { return false; }
  }

  const _clamp = (v,a,b) => Math.max(a, Math.min(b, v));
  const _lerp = (a,b,t) => a + (b-a)*t;
  const _easeOutCubic = x => 1 - Math.pow(1-x, 3);
  const _easeInCubic  = x => x*x*x;
  const _easeOutBack  = x => { const c1=1.70158, c3=c1+1; return 1 + c3*Math.pow(x-1,3) + c1*Math.pow(x-1,2); };

  // Compute the current frame of the entry animation. Pure read of G.finishAnim +
  // the clock — it never mutates game state. Returns the ovum transform (stays
  // ~1, only a satisfied pulse at the end), the Champ parent transform, how far
  // Champ has entered, camera bump, the local membrane dent and procedural rings.
  function finishFrame(){
    const fa = G.finishAnim; if (!fa) return null;
    const e = _clamp(now() - fa.startMs, 0, fa.durationMs);
    const eggY = worldToY(LEVEL_LENGTH), eggX = cx;
    const ff = {
      eggX, eggY, eggSX:1, eggSY:1, ovumRx:OVUM_D/2, ovumRy:OVUM_D/2,
      champX:eggX, champY:eggY, champSX:1, champSY:1, champAlpha:1, wobble:0,
      camX:0, camY:0, haloAlpha:0.9, haloScale:1, dentDepth:0,
      ripples:[], rings:[],
    };
    const topY = eggY - ff.ovumRy*0.9;     // the near (outer) membrane surface
    const deepY = eggY + 28;               // 20-35 px deeper than centre
    const setY = d => { ff.champY = _lerp(topY, deepY, d); };

    if (fa.reduced){
      const dur = fa.durationMs, p = e/dur;
      setY(_easeInCubic(_clamp(p/0.85,0,1)));
      ff.champSX = ff.champSY = _lerp(1, 0.12, _easeInCubic(_clamp((e-dur*0.1)/(dur*0.75),0,1)));
      ff.champAlpha = e < dur*0.62 ? 1 : _lerp(1, 0, (e-dur*0.62)/(dur*0.38));
      ff.dentDepth = e < dur*0.55 ? _clamp(e/(dur*0.3),0,1) : _lerp(1,0,_clamp((e-dur*0.55)/(dur*0.45),0,1));
      return ff;                           // no cam bump, no wobble, ovum steady
    }

    if (e < 160){                          // membrane impact
      const p = e/160;
      ff.champSX = _lerp(1, 0.82, p); ff.champSY = _lerp(1, 1.14, p);
      setY(_lerp(0, 0.08, p));
      ff.camY = _lerp(0, 4, p);            // <= 4 logical px
      ff.dentDepth = _lerp(0, 0.5, p);
    } else if (e < 380){                   // breakthrough — front passes inside first
      const p = (e-160)/220;
      ff.champSX = _lerp(0.82, 1, _easeOutBack(p)); ff.champSY = _lerp(1.14, 1, _easeOutBack(p));
      setY(_lerp(0.08, 0.42, _easeOutCubic(p)));
      ff.camY = 4*(1-p);
      ff.dentDepth = _lerp(0.5, 1, p);
      ff.ripples.push({ r:_lerp(30,80,p), a:0.16*(1-p) });
    } else if (e < 950){                   // entering — deeper, shrink + fade
      const p = (e-380)/570;
      setY(_lerp(0.42, 1, _easeInCubic(p)));
      ff.champSX = ff.champSY = _lerp(1, 0.12, _easeInCubic(p));
      ff.champAlpha = p < 0.65 ? 1 : _lerp(1, 0, (p-0.65)/0.35);   // most fade in the final 35%
      ff.wobble = 0.10*Math.sin(p*Math.PI*4)*(1-p);               // <= +/-0.10 rad
      ff.dentDepth = 1;
    } else if (e < 1250){                  // membrane closes behind him
      const p = (e-950)/300;
      ff.champAlpha = 0;
      ff.dentDepth = _lerp(1, 0, p);
      const pulse = 1 + 0.045*Math.sin(p*Math.PI);                 // one satisfied pulse
      ff.eggSX = ff.eggSY = pulse;
      ff.haloAlpha = _lerp(0.9, 1.0, Math.sin(p*Math.PI));         // halo brightens then returns
      ff.rings.push({ r:_lerp(50,110,p), a:0.20*(1-p) });
      ff.rings.push({ r:_lerp(26,80,p),  a:0.14*(1-p) });
    } else {                               // handoff — intact, visible ovum
      ff.champAlpha = 0;
    }
    ff.ovumRx = OVUM_D/2*ff.eggSX; ff.ovumRy = OVUM_D/2*ff.eggSY;   // never < base (only pulses up)
    return ff;
  }

  function drawFinishRipples(ff){
    ctx.save();
    for (const rp of ff.ripples){ ctx.globalAlpha=rp.a; ctx.strokeStyle='rgba(255,140,110,1)'; ctx.lineWidth=2; ctx.beginPath(); ctx.arc(0,0,rp.r,0,6.283); ctx.stroke(); }
    for (const rg of ff.rings){ ctx.globalAlpha=rg.a; ctx.strokeStyle='rgba(255,205,140,1)'; ctx.lineWidth=2.4; ctx.beginPath(); ctx.arc(0,0,rg.r,0,6.283); ctx.stroke(); }
    ctx.restore();
  }

  // The local inward membrane dent at the contact point (top of the ovum) — a soft
  // darker pocket + coral rim that deepens as Champ pushes through, then closes.
  function drawMembraneDent(ff){
    if ((ff.dentDepth||0) <= 0.001) return;
    const d = ff.dentDepth;
    ctx.save();
    ctx.translate(ff.eggX, ff.eggY - ff.ovumRy*0.72);
    ctx.globalAlpha = 0.18*d; ctx.fillStyle = 'rgba(150,40,40,1)';
    ctx.beginPath(); ctx.ellipse(0, 6*d, 20, 10+8*d, 0, 0, 6.283); ctx.fill();
    ctx.globalAlpha = 0.30*d; ctx.strokeStyle = 'rgba(255,150,120,1)'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.ellipse(0, 4*d, 22, 12, 0, 0, 6.283); ctx.stroke();
    ctx.restore();
  }

  // Draw the layered Champ rig ONCE as a single parent transform (tail, body,
  // face, cosmetics all aligned). `bright` dims the copy that is seen through the
  // membrane (inside the ovum) versus the still-emerging copy outside it.
  function drawChampRigOnce(ff, bright){
    ctx.save();
    ctx.translate(ff.champX, ff.champY);
    ctx.rotate(ff.wobble || 0);
    ctx.scale(ff.champSX, ff.champSY);
    ctx.globalAlpha = ff.champAlpha * bright;
    if (art.ready && art.rig && art.img.body){ drawSpermSprite(0, 0); }
    else { drawSpermShape(0, 0, 1, '#fbf0e0', '#43e0cf', ff.champAlpha*bright, G.tailPhase, true); }
    ctx.restore();
  }

  // Champ passing THROUGH the visible ovum membrane: the part still outside the
  // ovum ellipse is full-bright, the part inside is dimmed (submerged look). The
  // ovum itself has already been drawn (drawEgg) and stays on top-visible.
  function drawFinishChamp(ff){
    if (ff.champAlpha <= 0.01) return;
    // outside the ovum (everything except the ellipse) — still emerging, bright
    ctx.save();
    ctx.beginPath();
    ctx.rect(-60, -60, W+120, H+120);
    ctx.ellipse(ff.eggX, ff.eggY, ff.ovumRx, ff.ovumRy, 0, 0, 6.283);
    ctx.clip('evenodd');
    drawChampRigOnce(ff, 1.0);
    ctx.restore();
    // inside the ovum — seen through the membrane, dimmed
    ctx.save();
    ctx.beginPath();
    ctx.ellipse(ff.eggX, ff.eggY, ff.ovumRx, ff.ovumRy, 0, 0, 6.283);
    ctx.clip();
    drawChampRigOnce(ff, 0.5);
    ctx.restore();
  }

  // ---- Finish authority + result presentation ----------------------------------
  //
  // The GOAL finish is split into three responsibilities (see
  // docs/gameplay/FINISH_ABSORPTION_ANIMATION.md):
  //   commitGoalFinish()    — idempotently lock the authoritative result on the
  //                           crossing frame (time/score/place/input/MP broadcast).
  //   beginFinishAnimation()— start the presentation-only "absorption" sequence.
  //   showResults()         — reveal the results overlay after the sequence.
  // Quit and the Endless timeout keep the immediate, non-goal flow via endRun().

  // Multiplayer: announce our finish immediately, then keep re-announcing so late
  // finishers can place us. Idempotent — the caller guards against a second commit.
  function mpFinishBroadcast(){
    if (!MP.active) return;
    broadcastState();
    try{ clearInterval(MP._finT); }catch(e){}
    MP._finT = setInterval(() => { if (MP.active) broadcastState(); else clearInterval(MP._finT); }, networkInterpolation.finishRebroadcastMs);
  }

  // Lock the shareable "challenge" ghost + personal best from the finished run.
  function saveGhostAndPB(finishedGoal){
    if (!(G.mode==='level' && finishedGoal && G.ghostRec.length>5)) return;
    G.lastGhostCode = encodeChallenge();
    try { localStorage.setItem('oiam_run', G.lastGhostCode); } catch(e){}   // so the start-screen button works next time
    // Save as your personal-best ghost for this distance + input class (plain Practice only).
    if (!G.externalChallenge){
      const distM = LEVEL_LENGTH/PX_PER_UNIT;
      const pb = loadPB(distM, G.inputClass);
      if (!pb || G.elapsed < pb.time){ savePB(distM, G.inputClass, G.lastGhostCode, +G.elapsed.toFixed(2)); }
    }
  }

  // Compute the result strings + G.win from the (now locked) run values. Reads
  // G.elapsed/score/placement, which are frozen once the run has ended, so calling
  // this on the crossing frame captures the authoritative placement.
  function buildResult(finishedGoal){
    let title, sub, cls='';
    if (MP.active){
      const { place, total } = mpPlacement();
      G.win = finishedGoal && place===1;
      if (!finishedGoal){ title='Left the race'; sub='You bailed before the egg.'; cls='lose'; }
      else { title = place===1 ? 'You win! 🥚🏆' : 'Finished #'+place; sub='Place '+place+' of '+total+' • '+G.elapsed.toFixed(1)+'s'; cls = place===1?'win':''; }
    } else if (G.mode==='level' && G.ghost){
      G.win = finishedGoal && G.elapsed <= G.ghostTime;
      if (!finishedGoal){ title='Gave up'; sub='You bailed before the egg.'; cls='lose'; }
      else if (G.win){ title='Challenge won! ⚔'; sub='Beat the ghost by '+(G.ghostTime-G.elapsed).toFixed(1)+'s'; cls='win'; }
      else { title='Ghost wins ⚔'; sub=(G.elapsed-G.ghostTime).toFixed(1)+'s behind — go again'; cls='lose'; }
    } else if (G.mode==='level'){
      G.win = (G.rival.finishT===0) || (G.elapsed <= G.rival.finishT);
      if (!finishedGoal){ title='Gave up'; sub='You bailed before the egg.'; cls='lose'; }
      else if (G.win){ title='One in a million! 🥚'; sub='Beat your rival to the egg.'; cls='win'; }
      else { title='Rival wins'; sub='Pipped at the egg — go again.'; cls='lose'; }
    } else {   // endless checkpoint mode
      const dist = Math.round(G.distance/PX_PER_UNIT);
      let best = 0; try{ best = +(localStorage.getItem('oiam_endless_best')||0) || 0; }catch(e){}
      const isPB = dist > best;
      if (isPB){ try{ localStorage.setItem('oiam_endless_best', String(dist)); }catch(e){} }
      G.win = isPB;
      cls = isPB ? 'win' : '';
      title = isPB ? 'New personal best! 🏁' : "Time's up ⏱";
      sub = G.checkpointsHit+' checkpoints • '+dist+' m'+(isPB ? '' : ' • best '+best+' m');
    }
    return { title, sub, cls };
  }

  // Paint the result overlay from a computed result. Purely presentational.
  function renderResultDOM(finishedGoal, result){
    const rt=$('resultTitle'); rt.textContent=result.title; rt.className='result '+result.cls;
    let sub = result.sub;
    // Non-motion runs are unranked (handbook 1.2) — label it on the result.
    if (finishedGoal && !isRanked()) sub += (G.inputClass==='desktop_keyboard' ? ' · UNRANKED (keyboard)' : ' · UNRANKED');
    $('resultSub').textContent = sub;
    const m = v => Math.round(v/PX_PER_UNIT);
    if (G.mode==='endless'){
      let best = 0; try{ best = +(localStorage.getItem('oiam_endless_best')||0) || 0; }catch(e){}
      $('endStats').innerHTML =
        `<div class="row"><span class="k">Distance</span><span class="v">${m(G.distance)} m</span></div>`+
        `<div class="row"><span class="k">Checkpoints</span><span class="v">${G.checkpointsHit}</span></div>`+
        `<div class="row"><span class="k">Score</span><span class="v">${Math.floor(G.score).toLocaleString()}</span></div>`+
        `<div class="row"><span class="k">Best</span><span class="v">${best} m</span></div>`;
    } else {
      $('endStats').innerHTML =
        `<div class="row"><span class="k">Score</span><span class="v">${Math.floor(G.score).toLocaleString()}</span></div>`+
        `<div class="row"><span class="k">Distance</span><span class="v">${m(G.distance)} m</span></div>`+
        `<div class="row"><span class="k">Time</span><span class="v">${G.elapsed.toFixed(1)} s</span></div>`+
        `<div class="row"><span class="k">Bumps</span><span class="v">${G.hits}</span></div>`;
    }
    const cbtn=$('challengeBtn');
    if (G.mode==='level' && finishedGoal && G.ghostRec.length>5){
      if (cbtn){ cbtn.classList.remove('hidden'); cbtn.textContent='⚔ Challenge a friend'; }
    } else if (cbtn){ cbtn.classList.add('hidden'); }
    $('hud').classList.add('hidden'); $('race').classList.add('hidden'); $('count').classList.add('hidden');
    const end=$('end'); end.classList.remove('hidden'); end.classList.remove('fadein'); void end.offsetWidth; end.classList.add('fadein');
  }

  // Immediate result flow — quit and the Endless timeout. NOT the goal absorption.
  function endRun(finishedGoal){
    if (G._committed) return;                       // idempotent
    G._committed = true; G._commitCount++;
    G.state='end'; G.finished=true;
    G.inputClass = activeInputClass();              // lock how this run was controlled
    G.finishElapsed = G.elapsed; G.finishScore = G.score;
    mpFinishBroadcast();
    saveGhostAndPB(finishedGoal);
    const result = buildResult(finishedGoal);
    G._result = result;
    renderResultDOM(finishedGoal, result);
  }

  // Crossing frame: G.distance >= LEVEL_LENGTH. Locks the authoritative result and
  // hands off to the cosmetic animation. Idempotent — repeated calls do nothing.
  function commitGoalFinish(){
    if (G._committed) return;
    G._committed = true; G._commitCount++;
    G.finished = true;
    G.distance = LEVEL_LENGTH;
    G.inputClass = activeInputClass();
    G.finishElapsed = G.elapsed; G.finishScore = G.score;   // the locked, authoritative values
    mpFinishBroadcast();                                     // broadcast immediately (once)
    saveGhostAndPB(true);
    G._result = buildResult(true);                           // placement/win locked at crossing
  }

  function beginFinishAnimation(){
    const reduced = prefersReducedMotion();
    G.finishAnim = {
      startMs: now(),
      durationMs: reduced ? FINISH_MS_REDUCED : FINISH_MS_FULL,
      reduced,
      champX0: spermScreenX(),
      firedPop: false,
      firedSuction: false,
      firedSeal: false,
    };
    G.state = 'finishing';
    $('hud').classList.add('hidden'); $('race').classList.add('hidden'); $('count').classList.add('hidden');
    emitAudio('finish_impact');   // soft rubbery "boomp" + impact haptic + duck music
  }

  // Advance the presentation-only animation. Never touches simulation/replay data;
  // when it completes (or is skipped) it reveals the already-locked results. The
  // four finish sounds fire IN ORDER at their phase boundaries (scaled for reduced
  // motion): impact (at start) -> membrane_pop -> suction -> seal.
  function updateFinishAnim(){
    const fa = G.finishAnim; if (!fa){ showResults(); return; }
    const e = now() - fa.startMs;
    const dur = fa.durationMs, k = dur / FINISH_MS_FULL;   // scale phase times for reduced motion
    // Presentation-only flourish: the tail whips faster mid-suction (tailPhase is
    // not part of the sim or replay).
    G.tailPhase += 0.05 + ((!fa.reduced && e>360 && e<980) ? 0.22 : 0);
    if (!fa.firedPop     && e >= 200*k){ fa.firedPop = true; emitAudio('finish_membrane_pop'); }
    if (!fa.firedSuction && e >= 420*k){ fa.firedSuction = true; emitAudio('finish_suction'); }
    if (!fa.firedSeal    && e >= 980*k){ fa.firedSeal = true; emitAudio('finish_seal'); }
    if (e >= dur) showResults();
  }

  // Reveal the results overlay. Idempotent (skip + animation-complete both call it).
  function showResults(){
    if (G.state==='end') return;
    G.state='end';
    G.finishAnim = null;
    renderResultDOM(true, G._result || buildResult(true));
    emitAudio(G.win ? 'result_win' : 'result_lose');   // short arcade sting + music handoff
  }

  // ---------- Charge update ----------
  function chargeUpdate(dt, t){
    const active = (t - G.chargeInputT) < CHG_ACTIVE_MS;   // currently shaking hard enough
    if (active) G.charge = Math.min(CHG_MAX, G.charge + CHG_RATE*dt);  // smooth, ~5s to fill
    if (G.charge >= CHG_MAX){ launch(); return; }                     // held too long -> fizzle
    if (!active && G.charge > launchCfg.minReleaseCharge && (t - G.chargeInputT) > CHG_RELEASE_MS){ launch(); return; }
    G.tailPhase += dt*8;
    // HUD is refreshed by the loop's presentation phase, not from inside the sim tick.
  }

  // ---------- Play update ----------
  function update(dt, t){
    // boost = steady rhythm while actively shaking
    const cutoff = t - STROKE_WINDOW;
    while (G.strokes.length && G.strokes[0] < cutoff) G.strokes.shift();
    const rate = G.strokes.length/(STROKE_WINDOW/1000);
    G.boostOn = false;
    if (G.strokes.length >= 4){
      const iv=[]; for (let i=1;i<G.strokes.length;i++) iv.push(G.strokes[i]-G.strokes[i-1]);
      const mean = iv.reduce((a,b)=>a+b,0)/iv.length;
      let vr=0; for (const x of iv) vr += (x-mean)*(x-mean); vr/=iv.length;
      if (Math.sqrt(vr)/mean < 0.24 && rate > STEADY_RATE) G.boostOn = true;
    }

    // sprint zone
    if (G.mode==='level' && !G.sprint && G.distance >= SPRINT_START){
      G.sprint = true; banner('⚡ FINAL SPRINT! ⚡'); G.boosting = 0; emitAudio('final_sprint_start');   // no carried-over boost into the sprint
      G.obstacles = G.obstacles.filter(o => o.world < SPRINT_START);
      G.pickups = G.pickups.filter(p => p.world < SPRINT_START);        // no boosters in the sprint arena
    }

    // momentum: shaking pushes speed UP gently (smooth, never snaps); always bleeds slowly.
    const ceil = (G.boostOn || G.sprint || G.boosting>0) ? OVER_CAP : CRUISE_CAP;
    const thrust01 = Math.min(1, rate/DRIVE_RATE);
    // Hammering hard in the sprint pushes more, so flat-out hammering holds a high
    // speed (~96%) instead of decaying to the base equilibrium; stop hammering and
    // the fast bleed still drags you down.
    const accel = G.sprint ? ACCEL_UP * finalSprint.hammerAccelMultiplier : ACCEL_UP;
    if (G.speed < ceil) G.speed = Math.min(ceil, G.speed + accel*thrust01*dt);
    if (G.boosting>0){ G.boosting -= dt; G.speed = Math.max(G.speed, OVER_CAP); }  // ⚡ boost burst
    const decay = G.sprint ? DECAY_SPRINT : DECAY_CRUISE;
    G.speed -= G.speed*decay*dt;
    if (G.speed < 0) G.speed = 0;
    if (G.speed > G.topSpeed) G.topSpeed = G.speed;

    // steering — authority scales with speed (no speed, no turning)
    if (G.sprint) G.steerTarget = 0;   // final sprint: steering off — pure straight hammer to the egg
    G.steer += (G.steerTarget - G.steer)*Math.min(1, dt*steering.smoothing);
    const auth = Math.min(1, G.speed/STEER_FLOOR);
    G.xNorm += G.steer*STEER_SENS*auth*dt;
    if (G.sprint) G.xNorm += (0 - G.xNorm)*Math.min(1, dt*steering.sprintCenteringRate);  // glide to center, lined up with the egg
    if (G.xNorm > 1 || G.xNorm < -1){
      G.xNorm = Math.max(-1, Math.min(1, G.xNorm));
      if (!G._wall){ softWallBump(); G._wall = true; }   // one knock on contact
      else { G.speed *= (1 - 0.4*dt); }                  // gentle scrub while grinding
    } else { G._wall = false; }

    G.prevDistance = G.distance;
    G.distance += G.speed*dt;
    G.elapsed += dt;
    G.score += G.speed*dt*scoring.scorePerSpeedSecond;   // points accrue faster the faster you go
    if (G.mode==='level'){ G._ghostTimer += dt; if (G._ghostTimer >= 0.1){ G._ghostTimer -= 0.1; G.ghostRec.push(G.distance); } }
    G.tailPhase += dt*(6 + G.speed/CRUISE_CAP*22);
    G.flick = Math.max(0, G.flick - dt*4);
    G.hitFlash = Math.max(0, G.hitFlash - dt*3);
    G.shake = Math.max(0, G.shake - dt*6);

    spawnAhead(); collisions(); collectPickups(); updateRival(dt, t);

    for (const p of G.particles){ if (p.w < G.distance-10) p.w += H/PX_PER_UNIT + 60 + G.rng()*40; p.sway += dt*2; }

    if (G.mode==='level' && G.distance >= LEVEL_LENGTH && !G.finished){
      G.distance=LEVEL_LENGTH;
      commitGoalFinish();        // lock the authoritative result on THIS frame
      beginFinishAnimation();    // then play the cosmetic absorption
      return;                    // stop this frame's remaining sim (no extra MP broadcast)
    }
    if (G.mode==='endless' && !G.finished){
      if (G.distance > G.bestDist) G.bestDist = G.distance;
      // Checkpoint crossings are resolved BEFORE the clock is decremented, so a
      // checkpoint reached on the final frame still banks its time (handbook 2.14:
      // "a last-second checkpoint uses authoritative crossing time").
      while (G.distance >= G.nextCheckpoint){
        G.checkpointsHit++;
        G.timeLeft = Math.min(END.maxBankedSeconds, G.timeLeft + END.timePerCheckpointSeconds);
        const gapUnits = END.checkpointSpacingUnits + G.cpIndex*END.spacingGrowthUnits;   // authored bands: gaps grow
        G.cpIndex++;
        G.nextCheckpoint += gapUnits*PX_PER_UNIT;
        banner('CHECKPOINT +'+END.timePerCheckpointSeconds+'s ⏱');
        emitAudio('checkpoint');
      }
      G.timeLeft -= dt;
      if (G.timeLeft <= 0){ G.timeLeft=0; endRun(false); }   // run ends on the clock, never on collision
    }

    if (MP.active){ MP._sendT += dt; if (MP._sendT >= networkInterpolation.sendIntervalSeconds){ MP._sendT=0; broadcastState(); } prunePeers(); smoothPeers(dt); }
    // HUD refresh happens in the loop's presentation phase (see loop()).
  }

  function softWallBump(){ if (G.speed > CRUISE_CAP*collision.wallBumpMinSpeedFraction){ G.speed *= collision.wallBumpMultiplier; G.shake=Math.min(1,G.shake+0.25); emitAudio('collision_wall'); } }
  function spermScreenX(){ return cx + G.xNorm*(wallHalf(G.distance)-22); }

  function collisions(){
    const sx = spermScreenX(), sr = collision.spermRadius;
    for (const o of G.obstacles){
      if (o.hit) continue;
      if (o.type==='cell'){
        if (Math.abs(o.world-G.distance) < (sr+o.r)/PX_PER_UNIT){
          const ox = cx + o.lane*(wallHalf(o.world)-o.r);
          if (Math.abs(ox-sx) < sr + o.r*0.8) doHit(o);
        }
      } else if (G.prevDistance < o.world && G.distance >= o.world){
        if (G.xNorm < o.gapLane-o.gapHalf || G.xNorm > o.gapLane+o.gapHalf) doHit(o);
      }
    }
  }
  function doHit(o){
    o.hit=true;
    if (G.shieldActive){ G.shieldActive=false; G.shake=Math.min(1,G.shake+0.3); banner('BLOCKED 🛡'); emitAudio('collision_membrane', { intensity: 0.5 }); return; }
    G.hits++; G.speed *= HIT_PENALTY; G.hitFlash=1; G.shake=1;
    emitAudio(o && o._cv==='virus' ? 'collision_virus' : 'collision_wbc');
  }

  function collectPickups(){
    const sx=spermScreenX(), sr=collision.pickupRadius;
    for (const p of G.pickups){
      if (p.taken) continue;
      if (Math.abs(p.world-G.distance) < (sr+p.r)/PX_PER_UNIT){
        const px = cx + p.lane*(wallHalf(p.world)-p.r);
        if (Math.abs(px-sx) < sr+p.r) takePickup(p);
      }
    }
    G.pickups = G.pickups.filter(p => !p.taken && p.world > G.distance-30);
  }
  function takePickup(p){
    p.taken=true; G.flick=Math.min(1,G.flick+0.4);
    if (p.kind==='star'){ G.score+=items.starScore; emitAudio('pickup_star'); }
    else if (p.kind==='boost'){ G.boostCharges=Math.min(items.maxCharges,G.boostCharges+1); banner('⚡ +1'); emitAudio('pickup_star'); }
    else if (p.kind==='shield'){ G.shieldCharges=Math.min(items.maxCharges,G.shieldCharges+1); banner('🛡 +1'); emitAudio('pickup_shield'); }
    else { G.boosting=Math.max(G.boosting,items.speedOrbDurationSeconds); G.speed=Math.max(G.speed,OVER_CAP); G.score+=items.speedOrbScore; banner('SPEED! ✦'); emitAudio('pickup_speed'); }
  }

  function updateRival(dt, t){
    if (MP.active || G._soloPractice) return;   // live peers replace the AI rival; solo practice has none
    const r = G.rival; if (r.finished) return;
    if (G.ghost){   // race the friend's recorded run
      r.world = ghostWorldAt(G.elapsed);
      if (r.world >= LEVEL_LENGTH){ r.world=LEVEL_LENGTH; r.finished=true; r.finishT=G.ghostTime; }
      return;
    }
    const inSprint = G.mode==='level' && r.world >= SPRINT_START;
    if (t > r.retarget){ r.retarget = t + 900 + Math.random()*1400; r.target = inSprint ? CRUISE_CAP*(0.88+Math.random()*0.16) : CRUISE_CAP*(0.55+Math.random()*0.4); }
    r.speed += (r.target - r.speed)*Math.min(1, dt*1.6);
    r.world += r.speed*dt;
    if (G.mode==='level' && r.world >= LEVEL_LENGTH){ r.world=LEVEL_LENGTH; r.finished=true; r.finishT=G.elapsed; }
  }

  // ---------- HUD ----------
  function syncHUD(){
    $('hDist').innerHTML = Math.round(G.distance/PX_PER_UNIT)+'<small>m</small>';
    const bar=$('thrustBar'), fill=$('thrustFill');
    if (G.state==='charging'){
      const inZone = G.charge>=CHG_ZONE_LO && G.charge<=CHG_ZONE_HI;
      bar.classList.add('charging'); bar.classList.toggle('inzone', inZone); bar.classList.remove('boost');
      fill.style.width = Math.min(100, G.charge/CHG_MAX*100)+'%';
      $('kSpeed').textContent = 'Charge';
      $('hSpeed').innerHTML = Math.round(Math.min(100,G.charge/CHG_ZONE_HI*100))+'<small>%</small>';
      $('padText').textContent = 'Charge… then STOP to launch';
      $('strokepad').classList.add('charging');
      $('hTime').innerHTML = 'REV';
      $('boostTag').classList.remove('on');
    } else {
      bar.classList.remove('charging','inzone');
      bar.classList.toggle('boost', G.boostOn || G.sprint);
      fill.style.width = Math.min(100, G.speed/OVER_CAP*100)+'%';
      $('kSpeed').textContent = 'Score';
      $('hSpeed').textContent = Math.floor(G.score).toLocaleString();
      $('padText').textContent = 'Tap / Space to swim';
      $('strokepad').classList.remove('charging');
      if (G.mode==='endless'){
        const tl = Math.max(0, G.timeLeft);
        $('hTime').innerHTML = tl.toFixed(1)+'<small>s</small>';
        const ht=$('hTime'); if (ht) ht.classList.toggle('urgent', tl <= 5);   // clock running low
      } else {
        $('hTime').innerHTML = G.elapsed.toFixed(1)+'<small>s</small>';
      }
      const bt=$('boostTag');
      if (G.mode==='endless'){
        // The next checkpoint target is always visible (handbook 2.14).
        const togo = Math.max(0, Math.round((G.nextCheckpoint - G.distance)/PX_PER_UNIT));
        bt.classList.add('on'); bt.classList.remove('sprint');
        bt.textContent = '▶ Next checkpoint in '+togo+' m';
      } else {
        bt.classList.toggle('on', G.boostOn || G.sprint);
        bt.classList.toggle('sprint', G.sprint);
        bt.textContent = G.sprint ? '⚡ FINAL SPRINT — GO GO GO ⚡' : '◆ Perfect rhythm — boost ◆';
      }
    }
    // items
    if (art.ready && !G._hudSkinned && art.img.boost_normal && art.img.shield_normal){
      const bb=$('btnBoost'), bs=$('btnShield');
      bb.style.backgroundImage = `url(${art.img.boost_normal.src})`; bb.classList.add('sprite');
      bs.style.backgroundImage = `url(${art.img.shield_normal.src})`; bs.classList.add('sprite');
      G._hudSkinned = true;   // one-shot: the art carries the icon + frame from here on
    }
    $('boostCnt').textContent = G.boostCharges;
    $('shieldCnt').textContent = G.shieldCharges;
    $('btnBoost').classList.toggle('empty', G.boostCharges<=0 || G.sprint);
    $('btnShield').classList.toggle('empty', G.shieldCharges<=0);
    $('btnShield').classList.toggle('on', G.shieldActive);
    if (G.mode==='level'){
      $('mYou').style.top = (100 - Math.min(100,G.distance/LEVEL_LENGTH*100))+'%';
      const yf=$('youFill'); if (yf) yf.style.height = Math.min(100,G.distance/LEVEL_LENGTH*100)+'%';
      const pv=$('placeVal');
      $('mRival').style.display='none';        // replaced by per-competitor markers
      syncRaceMarkers();
      let ahead=0;
      for (const c of competitors()){ if (c.world > G.distance) ahead++; }
      const P=['','1st','2nd','3rd','4th','5th','6th','7th','8th'];
      if (pv) pv.textContent = P[ahead+1] || (ahead+1)+'th';
    }
  }

  // ---------- Render ----------
  function render(){
    const ff = (G.state==='finishing' && G.finishAnim) ? finishFrame() : null;
    ctx.save();
    if (ff){ ctx.translate(ff.camX, ff.camY); }   // small finish camera bump (<= 4px)
    else if (G.shake>0){ ctx.translate((Math.random()*2-1)*G.shake*7, (Math.random()*2-1)*G.shake*7); }
    // Deep-tunnel backdrop (receding maroon canal) for real depth; gradient fallback.
    const tb = art.ready && art.img.tunnel_bg;
    if (tb && tb.complete){
      // Canal v2: tunnel bg = ambient depth (cover-fit); the scrolling wall strips
      // (drawWalls -> drawWallTexture) are the moving foreground that defines the lane.
      ctx.fillStyle='#0d0305'; ctx.fillRect(-12,-12,W+24,H+24);
      const iw=tb.naturalWidth||1080, ih=tb.naturalHeight||1920, s=Math.max((W+24)/iw,(H+24)/ih), dw=iw*s, dh=ih*s;
      ctx.drawImage(tb, cx-dw/2, H/2-dh/2, dw, dh);
    } else {
      const bg = ctx.createRadialGradient(cx,H*0.12,H*0.05, cx,H*0.42,H*0.95);
      bg.addColorStop(0,'#5c1122'); bg.addColorStop(0.42,'#3a0d18'); bg.addColorStop(1,'#120407');
      ctx.fillStyle=bg; ctx.fillRect(-12,-12,W+24,H+24);
    }
    // warm "light at the end" toward the egg, brightening as you get closer
    const glowI = (G.mode==='level' && (G.state==='playing'||G.state==='charging')) ? Math.min(0.5, 0.14 + G.distance/LEVEL_LENGTH*0.5) : 0.16;
    const gl = ctx.createRadialGradient(cx,H*0.09,0, cx,H*0.09,H*0.55);
    gl.addColorStop(0,`rgba(255,188,110,${glowI})`); gl.addColorStop(1,'rgba(255,188,110,0)');
    ctx.fillStyle=gl; ctx.fillRect(0,0,W,H);

    drawWalls(); drawParticles(); drawObstacles(); drawPickups();
    if (G.mode==='level'){ drawSprintLine(); drawEgg(ff); }
    else if (G.mode==='endless'){ drawCheckpoints(); }
    drawRivalGhost(); if (MP.active) drawPeers();
    if (ff){ drawFinishChamp(ff); drawMembraneDent(ff); } else drawSperm();
    ctx.restore();

    drawCompetitorMarkers();
    if (G.hitFlash>0){ ctx.fillStyle=`rgba(255,80,70,${G.hitFlash*0.32})`; ctx.fillRect(0,0,W,H); }
    const sf = G.speed/CRUISE_CAP;
    if (sf>0.02){ const v=ctx.createRadialGradient(cx,spermY,H*0.2,cx,spermY,H*0.78); v.addColorStop(0,'rgba(0,0,0,0)'); v.addColorStop(1,`rgba(67,224,207,${Math.min(0.16,sf*0.11)})`); ctx.fillStyle=v; ctx.fillRect(0,0,W,H); }
    drawBanner();
  }

  // Skin the canal with the membrane texture as a semi-transparent overlay,
  // CLIPPED to the smooth wall path so the inner edge stays smooth (no stepping)
  // and tiled seamlessly (no seams). The procedural coral edge + gloss stroke are
  // drawn on top afterwards for the crisp boundary; this just adds organic veins.
  function drawWallTexture(){
    const wl = art.img.wall_left, wr = art.img.wall_right;
    if (!wl || !wr || !wl.complete || !wr.complete) return;
    const tileW = 146, tileH = 256;
    const scroll = (((G.distance*PX_PER_UNIT) % tileH) + tileH) % tileH;   // world-pinned vertical scroll
    const side = (img, anchorX, isLeft) => {
      ctx.save();
      ctx.beginPath();
      // clip to the exact collision boundary (wallHalf) so the visible wall edge matches gameplay
      if (isLeft){ ctx.moveTo(-10,-10); for (let y=-10; y<=H+10; y+=10) ctx.lineTo(cx-wallHalf(yToWorld(y)), y); ctx.lineTo(-10,H+10); }
      else       { ctx.moveTo(W+10,-10); for (let y=-10; y<=H+10; y+=10) ctx.lineTo(cx+wallHalf(yToWorld(y)), y); ctx.lineTo(W+10,H+10); }
      ctx.closePath(); ctx.clip();
      ctx.globalAlpha = 1;   // solid foreground membrane; the art's own alpha fades it toward the lane
      for (let ty=-tileH+scroll; ty < H+tileH; ty += tileH) ctx.drawImage(img, anchorX, ty, tileW, tileH);
      ctx.restore();
    };
    side(wl, 0, true);           // left wall: texture anchored to the screen edge
    side(wr, W-tileW, false);    // right wall: texture anchored to the screen edge
  }
  function drawWalls(){
    // The tunnel background art IS the canal now — no procedural side walls or membrane
    // overlay (that produced a doubled-bubble look). Just a soft corner vignette so the
    // clean tunnel image reads with focus toward the centre.
    if (art.ready && art.img.tunnel_bg && art.img.tunnel_bg.complete){
      // Canal v2: the wall strips are the moving foreground membrane, clipped to the
      // lane (wallHalfViz) so the visible walls follow the narrowing. Same fine
      // material as the tunnel bg — no grape-like forms.
      if (art.img.wall_left) drawWallTexture();
      return;
    }
    // Fallback (art not loaded): keep the old procedural walls so the canal still reads.
    const step=10, left=[], right=[];
    for (let y=-step; y<=H+step; y+=step){ const w=yToWorld(y); left.push([cx-wallHalfViz(w,0.0),y]); right.push([cx+wallHalfViz(w,2.4),y]); }
    ctx.fillStyle=GFX.wallL; ctx.beginPath(); ctx.moveTo(-10,-10);
    for (const p of left) ctx.lineTo(p[0],p[1]); ctx.lineTo(-10,H+10); ctx.closePath(); ctx.fill();
    ctx.fillStyle=GFX.wallR; ctx.beginPath(); ctx.moveTo(W+10,-10);
    for (const p of right) ctx.lineTo(p[0],p[1]); ctx.lineTo(W+10,H+10); ctx.closePath(); ctx.fill();
    ctx.fillStyle=GFX.edge; ctx.fillRect(0,0,W,H);
    ctx.fillStyle=GFX.vig;  ctx.fillRect(0,0,W,H);
  }
  function drawParticles(){
    // ambient red blood cells drifting in the canal
    const rbc = art.ready && art.img.rbc && art.img.rbc.complete ? art.img.rbc : null;
    ctx.globalAlpha=0.42;
    for (let i=0;i<G.particles.length;i++){
      if (i % 9 < 4) continue;                    // thin the ambient cells (~55% shown) — decor only
      const p=G.particles[i];
      const y=worldToY(p.w); if (y<-14||y>H+14) continue;
      const half=wallHalf(p.w)-8; const x=cx+p.lane*half+Math.sin(p.sway)*5; const r=p.s*2.4;
      if (rbc){ const d=r*3; ctx.drawImage(rbc, x-d/2, y-d/2, d, d); }
      else { ctx.fillStyle='#c8404c'; ctx.beginPath(); ctx.ellipse(x,y,r,r*0.82,0,0,6.28); ctx.fill(); ctx.fillStyle='#7c1a24'; ctx.beginPath(); ctx.arc(x,y,r*0.42,0,6.28); ctx.fill(); }
    }
    ctx.globalAlpha=1;
  }
  function drawObstacles(){
    for (const o of G.obstacles){
      const y=worldToY(o.world); if (y<-60||y>H+60) continue;
      if (o.type==='cell'){
        const x=cx+o.lane*(wallHalf(o.world)-o.r);
        // Variant is a deterministic function of world position (NOT rng), so the
        // seeded track stays identical for everyone and ghosts stay compatible.
        if (o._cv==null){ const h=Math.abs((Math.sin(o.world*0.9161+2.1)*43758.5453)%1); o._cv = h<0.30?'virus' : h<0.44?'cluster' : h<0.58?'pod' : 'wbc'; }
        let img=null;
        if (art.ready){
          if (o._cv==='virus') img = o.r<19?art.img.virus_s : o.r<24?art.img.virus_m : art.img.virus_l;
          else if (o._cv==='cluster') img = art.img.cell_cluster;
          else if (o._cv==='pod') img = art.img.immune_pod;
          else img = o.r<19?art.img.wbc_s : o.r<24?art.img.wbc_m : art.img.wbc_l;
        }
        if (img && img.complete){
          let d=o.r*2.3;
          ctx.save(); ctx.translate(x,y); if (o.hit) ctx.globalAlpha=0.55;
          if (o._cv==='cluster') ctx.rotate((now()*0.0006 + o.ph)%6.283);          // slow spin
          if (o._cv==='pod') d *= 1 + 0.06*Math.sin(now()*0.005 + o.ph);            // pulse
          ctx.drawImage(img,-d/2,-d/2,d,d); ctx.restore();
        } else {
          ctx.save(); ctx.translate(x,y);
          const grd=ctx.createRadialGradient(-o.r*0.3,-o.r*0.3,o.r*0.2,0,0,o.r);
          grd.addColorStop(0,o.hit?'#c9b7a8':'#f3e7d6'); grd.addColorStop(1,o.hit?'#8a7566':'#c9a98f');
          ctx.fillStyle=grd;
          ctx.beginPath(); for (let a=0;a<6.28;a+=0.4){ const rr=o.r*(0.86+0.14*Math.sin(a*3+o.ph)); const px=Math.cos(a)*rr, py=Math.sin(a)*rr; a===0?ctx.moveTo(px,py):ctx.lineTo(px,py); } ctx.closePath(); ctx.fill();
          const ng=ctx.createRadialGradient(o.r*0.05,0,o.r*0.1, o.r*0.15,o.r*0.1,o.r*0.45);
          ng.addColorStop(0,'#a06bc0'); ng.addColorStop(1,'#5e3480');
          ctx.fillStyle=ng; ctx.beginPath(); ctx.arc(o.r*0.15,o.r*0.1,o.r*0.42,0,6.28); ctx.fill();
          ctx.fillStyle='rgba(255,255,255,.35)'; ctx.beginPath(); ctx.arc(o.r*0.02,o.r*-0.05,o.r*0.14,0,6.28); ctx.fill(); ctx.restore();
        }
      } else {
        const half=wallHalf(o.world), gcx=cx+o.gapLane*(half*0.8), gw=o.gapHalf*half;
        const mem = art.ready && art.img.membrane && art.img.membrane.complete ? art.img.membrane : null;
        if (mem){
          const bandH=42, tw=bandH*(360/270);
          const seg = (x0,x1) => { const w=x1-x0; if (w<=2) return; ctx.save(); if (o.hit) ctx.globalAlpha=0.5; ctx.beginPath(); ctx.rect(x0,y-bandH/2,w,bandH); ctx.clip(); for (let tx=x0; tx<x1; tx+=tw) ctx.drawImage(mem, tx, y-bandH/2, tw, bandH); ctx.restore(); };
          seg(cx-half, gcx-gw); seg(gcx+gw, cx+half);
          ctx.strokeStyle='rgba(67,224,207,.55)'; ctx.lineWidth=2; ctx.beginPath(); ctx.moveTo(gcx-gw,y); ctx.lineTo(gcx+gw,y); ctx.stroke();   // passable gap
        } else {
          ctx.fillStyle=o.hit?'rgba(120,60,80,.5)':'rgba(150,30,60,.85)';
          ctx.fillRect(cx-half,y-9,(gcx-gw)-(cx-half),18); ctx.fillRect(gcx+gw,y-9,(cx+half)-(gcx+gw),18);
          ctx.strokeStyle='rgba(67,224,207,.5)'; ctx.lineWidth=2; ctx.beginPath(); ctx.moveTo(gcx-gw,y); ctx.lineTo(gcx+gw,y); ctx.stroke();
        }
      }
    }
  }
  function drawPickups(){
    for (const p of G.pickups){
      if (p.taken) continue;
      const y=worldToY(p.world); if (y<-22||y>H+22) continue;
      const x=cx+p.lane*(wallHalf(p.world)-p.r), bob=Math.sin(now()*0.004+p.ph)*3;
      // Collectible glow halo so bonuses clearly read as "grab me" vs matte obstacles.
      const gcol = p.kind==='shield' ? '#43e0cf' : p.kind==='speed' ? '#7cff9f' : '#ffd24d';
      const pulse = 0.82 + 0.18*Math.sin(now()*0.006 + p.ph);
      const gr = ctx.createRadialGradient(x, y+bob, p.r*0.2, x, y+bob, p.r*2.0*pulse);
      gr.addColorStop(0, gcol+'99'); gr.addColorStop(0.55, gcol+'33'); gr.addColorStop(1, gcol+'00');
      ctx.save(); ctx.fillStyle=gr; ctx.beginPath(); ctx.arc(x, y+bob, p.r*2.0*pulse, 0, 6.28); ctx.fill(); ctx.restore();
      const sprite = art.ready && (p.kind==='shield' ? art.img.shield : p.kind==='speed' ? art.img.speedorb : (p.kind==='star'||!p.kind) ? art.img.star : null);
      if (sprite && sprite.complete){
        const d=p.r*2.6;
        ctx.save(); ctx.translate(x,y+bob); ctx.drawImage(sprite,-d/2,-d/2,d,d); ctx.restore();
        continue;
      }
      const col = p.kind==='shield' ? '#43e0cf' : (p.kind==='speed' ? '#7cff9f' : '#ffd24d');
      const icon = p.kind==='boost' ? '⚡' : p.kind==='shield' ? '🛡' : p.kind==='speed' ? '✦' : '★';
      ctx.save(); ctx.translate(x,y+bob);
      ctx.fillStyle='rgba(18,8,12,.65)'; ctx.beginPath(); ctx.arc(0,0,p.r,0,6.28); ctx.fill();
      ctx.lineWidth=4; ctx.globalAlpha=0.28; ctx.strokeStyle=col; ctx.beginPath(); ctx.arc(0,0,p.r,0,6.28); ctx.stroke();
      ctx.globalAlpha=1; ctx.lineWidth=2.5; ctx.strokeStyle=col; ctx.beginPath(); ctx.arc(0,0,p.r,0,6.28); ctx.stroke();
      ctx.fillStyle=col; ctx.font='700 15px system-ui, sans-serif'; ctx.textAlign='center'; ctx.textBaseline='middle';
      ctx.fillText(icon, 0, 1);
      ctx.restore();
    }
  }
  function drawSprintLine(){
    const y=worldToY(SPRINT_START); if (y<-24||y>H+24) return;
    const half=wallHalf(SPRINT_START);
    ctx.save(); ctx.strokeStyle='#ffd24d'; ctx.lineWidth=4; ctx.setLineDash([14,10]); ctx.shadowColor='#ffd24d'; ctx.shadowBlur=16;
    ctx.beginPath(); ctx.moveTo(cx-half,y); ctx.lineTo(cx+half,y); ctx.stroke(); ctx.setLineDash([]);
    ctx.font='800 14px "Trebuchet MS", system-ui, sans-serif'; ctx.textAlign='center'; ctx.fillStyle='#ffd24d';
    ctx.fillText('⚡ SPRINT ⚡', cx, y-9); ctx.restore();
  }
  // Endless: the glowing gate the player flies through at the next checkpoint.
  function drawCheckpoints(){
    if (!art.ready || !art.img.checkpoint_ring || !art.img.checkpoint_ring.complete) return;
    const y=worldToY(G.nextCheckpoint); if (y<-80||y>H+80) return;
    const half=wallHalf(G.nextCheckpoint);
    const w=Math.min(half*2.1, 360), h=w*(270/900);
    ctx.save(); ctx.globalAlpha=0.96; ctx.drawImage(art.img.checkpoint_ring, cx-w/2, y-h/2, w, h); ctx.restore();
  }
  // The ovum. egg_rays.png is intentionally NEVER drawn (see
  // docs/gameplay/FINISH_ABSORPTION_ANIMATION.md) — only egg + a restrained halo
  // pulse, plus finish-time deformation + procedural ripples when `ff` is present.
  function drawEgg(ff){
    const y = ff ? ff.eggY : worldToY(LEVEL_LENGTH);
    if (!ff && y>H+180) return; const R=72;
    if (ff) G._eggFrames = (G._eggFrames|0) + 1;   // the ovum is drawn on every finish frame (never hidden)
    const sx = ff ? ff.eggSX : 1, sy = ff ? ff.eggSY : 1;
    if (art.ready && art.img.egg && art.img.egg.complete){
      ctx.save(); ctx.translate(cx,y);
      const eggD=150, haloD=eggD*3;
      if (art.img.egg_halo && art.img.egg_halo.complete){
        const hs = ff ? ff.haloScale : (0.92+0.08*Math.sin(now()*0.003));
        const pz=hs*haloD; ctx.globalAlpha = ff ? ff.haloAlpha : 0.9; ctx.drawImage(art.img.egg_halo,-pz/2,-pz/2,pz,pz);
      }
      ctx.globalAlpha=1; ctx.save(); ctx.scale(sx,sy); ctx.drawImage(art.img.egg,-eggD/2,-eggD/2,eggD,eggD); ctx.restore();
      if (ff) drawFinishRipples(ff);
      ctx.restore(); return;
    }
    ctx.save(); ctx.translate(cx,y);
    // radiant halo (no sun rays)
    const halo=ctx.createRadialGradient(0,0,R*0.5,0,0,R*2.8); halo.addColorStop(0,'rgba(255,205,120,.6)'); halo.addColorStop(1,'rgba(255,205,120,0)');
    ctx.globalAlpha = ff ? ff.haloAlpha : 1;
    ctx.fillStyle=halo; ctx.beginPath(); ctx.arc(0,0,R*2.8*(ff?ff.haloScale:1),0,6.28); ctx.fill();
    ctx.globalAlpha=1;
    ctx.save(); ctx.scale(sx,sy);
    const eg=ctx.createRadialGradient(-R*0.3,-R*0.38,R*0.2,0,0,R); eg.addColorStop(0,'#fff6e2'); eg.addColorStop(0.6,'#ffd98a'); eg.addColorStop(1,'#e79a3c');
    ctx.fillStyle=eg; ctx.beginPath(); ctx.ellipse(0,0,R*0.82,R,0,0,6.28); ctx.fill();
    ctx.fillStyle='rgba(255,255,255,.6)'; ctx.beginPath(); ctx.ellipse(-R*0.28,-R*0.36,R*0.15,R*0.24,-0.5,0,6.28); ctx.fill();
    ctx.restore();
    if (ff) drawFinishRipples(ff);
    ctx.restore();
  }
  function drawRivalGhost(){
    if (MP.active || G.mode!=='level' || G.rival.finished || G._soloPractice) return;
    const y=worldToY(G.rival.world); if (y<-40||y>H+40) return;
    const x=cx + 0.45*(wallHalf(G.rival.world)-22);
    if (G.ghost){
      // your personal best = pale teal "ghost of you"; a friend's challenge = blue
      if (G.isPersonalBest) drawSpermShape(x,y,0.8,'#d6fff6','#43e0cf',0.42, now()*0.01, false);
      else drawSpermShape(x,y,0.8,'#dbeaff','#9ec4ff',0.45, now()*0.01, false);
    } else drawSpermShape(x,y,0.78,'#ffb9ae','#ff6a5c',0.55, now()*0.01, false);          // AI rival
  }
  // Sprite render box: how many logical px one rig-canvas px maps to. Tunable —
  // bigger = bigger Spermy. (rig canvas is 512x768.)
  const SPRITE_SCALE = 0.13;
  function faceFor(){
    if (G.state==='charging') return art.img.face_charging;
    if (G.hitFlash > 0.4) return art.img.face_hit;
    if (G.state==='playing') return art.img.face_determined;
    return art.img.face_idle;
  }
  // The lively procedural tail — an animated glowing flagellum that reacts to
  // speed/charge. Drawn as a TAPERED ribbon (thick where it meets the body,
  // whip-thin at the tip) so it reads like a real sperm tail. Behind the body.
  function drawTailProc(x, y, glowCol, phase){
    ctx.save(); ctx.translate(x, y);
    const baseA = ctx.globalAlpha;   // fade with the ambient/parent alpha (1 in normal play; <1 during the finish suction)
    let amp = 5 + (G.speed/CRUISE_CAP)*5 + G.flick*3;
    if (G.state==='charging') amp = 6 + G.charge*9;
    amp = Math.min(amp, 10);                 // cap so the wag stays tidy at high speed
    const N=22, TOP=6, LEN=62, BASE_HW=8;   // start y, length, base half-width
    const c = [];
    for (let i=0;i<=N;i++){ const t=i/N; c.push([Math.sin(phase - t*7)*amp*t, TOP + t*LEN, t]); }
    const left=[], right=[];
    for (let i=0;i<=N;i++){
      const p=c[i], a=c[Math.min(N,i+1)], b=c[Math.max(0,i-1)];
      let tx=a[0]-b[0], ty=a[1]-b[1]; const l=Math.hypot(tx,ty)||1; const nx=-ty/l, ny=tx/l;   // unit normal
      const hw = BASE_HW*(1-p[2])*(1-p[2]) + 0.8;   // quadratic taper: thick base -> ~0.8px tip
      left.push([p[0]+nx*hw, p[1]+ny*hw]); right.push([p[0]-nx*hw, p[1]-ny*hw]);
    }
    const ribbon = () => { ctx.beginPath(); ctx.moveTo(left[0][0],left[0][1]); for (const p of left) ctx.lineTo(p[0],p[1]); for (let i=right.length-1;i>=0;i--) ctx.lineTo(right[i][0],right[i][1]); ctx.closePath(); };
    ctx.shadowColor=glowCol; ctx.shadowBlur=12;
    ctx.fillStyle=glowCol; ctx.globalAlpha=baseA*0.4; ribbon(); ctx.fill();     // soft glow
    ctx.shadowBlur=0;
    ctx.globalAlpha=baseA; ctx.fillStyle=glowCol; ribbon(); ctx.fill();       // solid body
    // glossy centre highlight for a bit of shine
    ctx.strokeStyle='rgba(230,255,252,.55)'; ctx.lineCap='round'; ctx.lineWidth=1.6;
    ctx.beginPath(); ctx.moveTo(c[0][0],c[0][1]); for (let i=1;i<N-2;i++) ctx.lineTo(c[i][0],c[i][1]); ctx.stroke();
    ctx.restore();
  }
  function drawSpermSprite(x, y){
    // 1) lively animated tail (state-coloured), behind everything
    const glow = G.state==='charging' ? '#7cff9f' : (G.boosting>0 ? '#ffd24d' : '#43e0cf');
    drawTailProc(x, y, glow, G.tailPhase);
    // 2) shaded body + face + equipped head cosmetics, aligned to body_center
    const rig = art.rig; const A = rig.anchors; const S = SPRITE_SCALE;
    const bc = A.body_center || { x: rig.canvas.width/2, y: rig.canvas.height/2 };
    const dw = rig.canvas.width*S, dh = rig.canvas.height*S;
    const dx = x - bc.x*S, dy = y - bc.y*S;
    const layer = img => { if (img && img.complete) ctx.drawImage(img, dx, dy, dw, dh); };
    const eq = art.equipped;
    layer(art.img.body);
    layer(faceFor());
    if (eq.glasses && art.img[eq.glasses]) layer(art.img[eq.glasses]);   // z40
    if (eq.mouth   && art.img[eq.mouth])   layer(art.img[eq.mouth]);     // z50
    if (eq.hat     && art.img[eq.hat])     layer(art.img[eq.hat]);       // z60
    if (eq.aura    && art.img[eq.aura])    layer(art.img[eq.aura]);      // z70
  }
  // Protective bubble shown while a shield is active — it absorbs the next hit (no
  // speed loss). Glossy teal sphere around Spermy.
  function drawShieldBubble(x, y){
    const br = 44, pulse = 1 + 0.04*Math.sin(now()*0.006);
    const r = br*pulse;
    ctx.save();
    const g = ctx.createRadialGradient(x, y, r*0.45, x, y, r);
    g.addColorStop(0, 'rgba(67,224,207,0)'); g.addColorStop(0.78, 'rgba(67,224,207,.07)'); g.addColorStop(1, 'rgba(67,224,207,.24)');
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, r, 0, 6.28); ctx.fill();
    ctx.strokeStyle = 'rgba(120,245,232,.9)'; ctx.lineWidth = 2.5; ctx.shadowColor = '#43e0cf'; ctx.shadowBlur = 12;
    ctx.beginPath(); ctx.arc(x, y, r, 0, 6.28); ctx.stroke(); ctx.shadowBlur = 0;
    ctx.fillStyle = 'rgba(255,255,255,.4)'; ctx.beginPath(); ctx.ellipse(x - r*0.34, y - r*0.42, r*0.14, r*0.26, -0.5, 0, 6.28); ctx.fill();
    ctx.restore();
  }
  function drawSperm(){
    const showAtStart = (G.state==='charging' || G.state==='playing' || G.state==='ready');
    if (!showAtStart) return;
    const x=spermScreenX();
    if (art.ready && art.rig && art.img.body){ drawSpermSprite(x, spermY); }
    else {
      const glow = G.state==='charging' ? '#7cff9f' : (G.boosting>0 ? '#ffd24d' : '#43e0cf');
      drawSpermShape(x, spermY, 1, '#fbf0e0', glow, 1, G.tailPhase, true);
    }
    if (G.shieldActive) drawShieldBubble(x, spermY);
  }
  function drawSpermShape(x,y,scale,headCol,glowCol,alpha,phase,eyes){
    ctx.save(); ctx.globalAlpha=alpha; ctx.translate(x,y); ctx.scale(scale,scale);
    let amp = 6 + (G.speed/CRUISE_CAP)*10 + G.flick*8;
    if (G.state==='charging') amp = 6 + G.charge*16;   // frantic wiggle while charging
    const tail = (w) => { ctx.beginPath(); ctx.moveTo(0,10); for (let i=0;i<=16;i++){ const t=i/16; ctx.lineTo(Math.sin(phase - t*7)*amp*t, 10+t*50); } ctx.lineWidth=w; ctx.stroke(); };
    ctx.strokeStyle=glowCol; ctx.lineCap='round';
    if (eyes){ ctx.shadowColor=glowCol; ctx.shadowBlur=14; }   // expensive glow only for your own sperm
    ctx.globalAlpha=alpha*0.5; tail(7);           // soft wide glow
    ctx.globalAlpha=alpha; tail(4);               // bright core
    ctx.shadowBlur=0;
    if (eyes){ ctx.fillStyle='rgba(200,245,240,.5)'; for (let i=2;i<=6;i++){ const t=i/7; const bx=Math.sin(phase-t*7)*amp*t+(i%2?6:-6), by=10+t*50; ctx.beginPath(); ctx.arc(bx,by,Math.max(0.6,2.4-t*2),0,6.28); ctx.fill(); } }
    // head
    const hg=ctx.createRadialGradient(-5,-7,3,0,0,18); hg.addColorStop(0,'#ffffff'); hg.addColorStop(1,headCol);
    ctx.fillStyle=hg; if (eyes){ ctx.shadowColor=glowCol; ctx.shadowBlur=16; } ctx.beginPath(); ctx.ellipse(0,-2,14,18,0,0,6.28); ctx.fill(); ctx.shadowBlur=0;
    ctx.fillStyle='rgba(255,255,255,.55)'; ctx.beginPath(); ctx.ellipse(-5,-9,3.2,5,-0.4,0,6.28); ctx.fill();
    if (eyes){
      const look = Math.max(-2.5,Math.min(2.5,G.steer*3));
      for (const s of [-1,1]){
        ctx.fillStyle='#fff'; ctx.beginPath(); ctx.arc(s*5,-6,5,0,6.28); ctx.fill();
        ctx.fillStyle='#2a1a12'; ctx.beginPath(); ctx.arc(s*5+look,-4.5,2.3,0,6.28); ctx.fill();
        ctx.fillStyle='#fff'; ctx.beginPath(); ctx.arc(s*5+look-0.8,-5.4,0.8,0,6.28); ctx.fill();
        ctx.strokeStyle='#c49a6c'; ctx.lineWidth=1.8; ctx.lineCap='round'; ctx.beginPath(); ctx.moveTo(s*5-4,-12.5); ctx.lineTo(s*5+4,-11.3); ctx.stroke();
      }
    }
    ctx.restore();
  }
  function drawBanner(){
    if (!G.banner) return;
    const age = now()-G.banner.t; if (age>1400){ G.banner=null; return; }
    const k = age/1400; const alpha = k<0.15 ? k/0.15 : 1-(k-0.15)/0.85;
    ctx.save(); ctx.globalAlpha=Math.max(0,alpha); ctx.textAlign='center'; ctx.textBaseline='middle';
    ctx.font='800 clamp(26px,7vw,38px) "Trebuchet MS", system-ui, sans-serif';
    ctx.fillStyle='#fbf0e0'; ctx.shadowColor='#43e0cf'; ctx.shadowBlur=24;
    ctx.fillText(G.banner.text, W/2, H*0.33 - k*22); ctx.restore();
  }

  // ---------- Loop ----------
  let last=0;
  function loop(t){
    if (!last) last=t;
    let dt=(t-last)/1000; last=t; if (dt>0.05) dt=0.05; if (dt<0) dt=0;
    if (!W || !H) resize();
    if ((loop._n=(loop._n||0)+1) % 10 === 0) updateDiag();
    if (G.state==='ready'){
      const el=t-countT; const shown=3-Math.floor(el/700);
      if (shown!==countN){ countN=shown;
        if (countN>0){ $('countBig').textContent=String(countN); $('countBig').style.animation='none'; void $('countBig').offsetWidth; $('countBig').style.animation=''; }
        else if (countN===0){ $('countBig').textContent='GO'; } }
      if (el>2100){ $('count').classList.add('hidden'); G.state='charging'; G.charge=0; G.chargeInputT=t; banner('REV UP! 🔋'); emitAudio('charge_start'); setMusicState('charging'); }
    } else if (G.state==='charging'){ chargeUpdate(dt, t); }
    else if (G.state==='playing'){ update(dt, t); }
    else if (G.state==='finishing'){ updateFinishAnim(); }   // cosmetic only — no sim, no input
    // Presentation phase: HUD (DOM) is written here, never from inside the sim tick.
    if (G.state==='charging' || G.state==='playing') syncHUD();
    // Adaptive music: fade the speed layer with normalized speed (ignored unless
    // the race bed is in the 'race_fast' state; the sprint layer is event-driven).
    if (G.state==='playing' && !G.sprint) setRaceSpeed(Math.min(1, G.speed/OVER_CAP));
    render();
    requestAnimationFrame(loop);
  }

  // ---------- Customize screen ----------
  let custSlot = 'hat';
  function updateCustPreview(){
    const setImg = (id, key) => { const el=$(id); if(!el) return; const im = key && art.img[key]; if (im){ el.src=im.src; el.style.display=''; } else { el.style.display='none'; } };
    setImg('custBody','body');
    const face = art.img.face_idle; if (face && $('custFace')){ $('custFace').src=face.src; $('custFace').style.display=''; }
    setImg('custGlasses', art.equipped.glasses);
    setImg('custMouth',   art.equipped.mouth);
    setImg('custHat',     art.equipped.hat);
  }
  function buildCustGrid(){
    document.querySelectorAll('#custTabs button').forEach(b => b.classList.toggle('sel', b.dataset.slot===custSlot));
    const grid = $('custGrid'); if (!grid) return; grid.innerHTML='';
    const mkItem = (sel, inner, onclick, cls) => { const b=document.createElement('button'); b.className='cust-item'+(sel?' sel':'')+(cls?' '+cls:''); b.innerHTML=inner; b.onclick=onclick; grid.appendChild(b); };
    mkItem(art.equipped[custSlot]==null, '<div class="ci-thumb ci-none">✕</div><div class="ci-name">None</div>',
      () => { equip(custSlot, null); buildCustGrid(); updateCustPreview(); });
    art.cosmetics.filter(c => c.slot===custSlot).forEach(c => {
      const im = art.img[c.id];
      mkItem(art.equipped[custSlot]===c.id, `<div class="ci-thumb"><img src="${im?im.src:''}" alt=""></div><div class="ci-name">${c.name}</div>`,
        () => { equip(custSlot, c.id); buildCustGrid(); updateCustPreview(); }, 'r-'+c.rarity);
    });
  }
  function openCustomize(){
    if (!art.ready){ toast('Loading Spermy…'); return; }
    $('start').classList.add('hidden'); $('customize').classList.remove('hidden');
    buildCustGrid(); updateCustPreview();
  }
  function closeCustomize(){ $('customize').classList.add('hidden'); $('start').classList.remove('hidden'); }
  if ($('custPanel')) $('custPanel').onclick = openCustomize;
  if ($('custBack'))  $('custBack').onclick  = closeCustomize;
  document.querySelectorAll('#custTabs button').forEach(b => b.onclick = () => { custSlot=b.dataset.slot; buildCustGrid(); });

  // ---------- Boot ----------
  setLevelLength(5000); resize(); selectMode('level'); updateHint(); loadGhostFromHash();
  try { G.muted = getAudioSettings().muted; $('btnMute').textContent = G.muted ? '🔇' : '🔊'; } catch(e){}
  setMusicState('menu');   // logical menu state; becomes audible once the context is unlocked
  try { const _c = localStorage.getItem('oiam_run'); if (_c) G.lastGhostCode = _c; } catch(e){}
  $('finePrint').textContent = detectControls() ? 'On iPhone you may get a one-time "allow motion" prompt — tap Allow.' : 'No motion sensor detected — keyboard / touch controls will be used.';
  requestAnimationFrame(loop);

  // Test/diagnostic handle. Not a global; production simply ignores it.
  return { G, MP, tuning, loop, resize, competitors, setLevelLength, encodeGhost, decodeGhost, ghostWorldAt, setGhost, encodeChallenge, decodeChallenge, setChallenge, ingestPeerState, mpPlacement, finishFrame };
}
