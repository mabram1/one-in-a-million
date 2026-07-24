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
import { tuning } from '../config/tuning';

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
    canalSeed:0,
    distance:0, prevDistance:0, speed:0,
    xNorm:0, steer:0, steerTarget:0,
    strokes:[], boostOn:false, sprint:false,
    boostCharges:items.startingBoostCharges, shieldCharges:items.startingShieldCharges, shieldActive:false, boosting:0,
    charge:0, chargeInputT:0,
    topSpeed:0, hits:0, elapsed:0,
    obstacles:[], pickups:[], score:0, nextSpawn:0, particles:[],
    ghost:null, ghostTime:0, ghostRec:[], _ghostTimer:0, lastGhostCode:'',
    hitFlash:0, shake:0, tailPhase:0, flick:0,
    rival:{ world:0, speed:0, target:60, finished:false, finishT:0, retarget:0 },
    finished:false, win:false, muted:false,
    banner:null, _lastStroke:0,
    motion:{ active:false, base:0, lp:0, grav:0, prevMag:null, permission:'—', events:0 },
    ptr:{ down:false },
  };

  // ---------- Sizing ----------
  function resize(){
    const r = canvas.getBoundingClientRect();
    W = r.width; H = r.height;
    dpr = Math.min(window.devicePixelRatio || 1, 2.5);
    canvas.width = Math.round(W*dpr); canvas.height = Math.round(H*dpr);
    ctx.setTransform(dpr,0,0,dpr,0,0);
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
    half *= 1 - trackGeneration.narrowAmount*Math.pow(Math.min(1, worldY/LEVEL_LENGTH), trackGeneration.narrowPower);   // stays wide early, narrows mostly toward the egg
    return Math.max(maxHalf*trackGeneration.minHalfFraction, half);
  }
  const yToWorld = y => G.distance + (spermY - y)/PX_PER_UNIT;
  const worldToY = w => spermY - (w - G.distance)*PX_PER_UNIT;

  // ---------- Audio ----------
  let actx=null, noiseBuf=null;
  function initAudio(){
    if (actx) return;
    try{
      actx = new (window.AudioContext||window.webkitAudioContext)();
      const n = actx.sampleRate*0.4; noiseBuf = actx.createBuffer(1,n,actx.sampleRate);
      const d = noiseBuf.getChannelData(0);
      for (let i=0;i<n;i++) d[i]=(Math.random()*2-1)*(1-i/n);
    }catch(e){ actx=null; }
  }
  function playStroke(intensity){
    if (!actx || G.muted) return;
    const src=actx.createBufferSource(); src.buffer=noiseBuf;
    const bp=actx.createBiquadFilter(); bp.type='bandpass'; bp.frequency.value=480+intensity*900; bp.Q.value=0.8;
    const g=actx.createGain(); const v=0.05+intensity*0.12, t=actx.currentTime;
    g.gain.setValueAtTime(0.0001,t); g.gain.exponentialRampToValueAtTime(v,t+0.02); g.gain.exponentialRampToValueAtTime(0.0001,t+0.22);
    src.connect(bp); bp.connect(g); g.connect(actx.destination); src.start(t); src.stop(t+0.24);
  }
  function playHit(){
    if (!actx || G.muted) return;
    const o=actx.createOscillator(), g=actx.createGain(), t=actx.currentTime;
    o.type='sine'; o.frequency.setValueAtTime(190,t); o.frequency.exponentialRampToValueAtTime(46,t+0.3);
    g.gain.setValueAtTime(0.28,t); g.gain.exponentialRampToValueAtTime(0.0001,t+0.34);
    o.connect(g); g.connect(actx.destination); o.start(t); o.stop(t+0.36);
  }
  function playPickup(p){
    if (!actx || G.muted) return;
    const o=actx.createOscillator(), g=actx.createGain(), t=actx.currentTime;
    o.type='triangle'; o.frequency.setValueAtTime(560*p,t); o.frequency.exponentialRampToValueAtTime(1120*p,t+0.11);
    g.gain.setValueAtTime(0.0001,t); g.gain.exponentialRampToValueAtTime(0.16,t+0.02); g.gain.exponentialRampToValueAtTime(0.0001,t+0.2);
    o.connect(g); g.connect(actx.destination); o.start(t); o.stop(t+0.22);
  }
  function playLaunch(){
    if (!actx || G.muted) return;
    const o=actx.createOscillator(), g=actx.createGain(), t=actx.currentTime;
    o.type='sawtooth'; o.frequency.setValueAtTime(120,t); o.frequency.exponentialRampToValueAtTime(720,t+0.35);
    g.gain.setValueAtTime(0.0001,t); g.gain.exponentialRampToValueAtTime(0.22,t+0.05); g.gain.exponentialRampToValueAtTime(0.0001,t+0.5);
    o.connect(g); g.connect(actx.destination); o.start(t); o.stop(t+0.52);
  }

  // ---------- Strokes ----------
  function registerStroke(intensity){
    const t = now();
    if (t - G._lastStroke < REFRACTORY) return;
    G._lastStroke = t;
    G.flick = Math.min(1, G.flick+0.6);
    if (navigator.vibrate) navigator.vibrate(12);
    playStroke(Math.min(1, intensity||0.6));
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
  window.addEventListener('keydown', e => {
    if (e.repeat) return;
    if (e.code==='ArrowLeft'||e.code==='KeyA'){ G.steerTarget=-1; }
    else if (e.code==='ArrowRight'||e.code==='KeyD'){ G.steerTarget=1; }
    else if (e.code==='Space'){ e.preventDefault(); if (G.state==='playing'||G.state==='charging') registerStroke(0.8); }
  });
  window.addEventListener('keyup', e => {
    if ((e.code==='ArrowLeft'||e.code==='KeyA') && G.steerTarget<0) G.steerTarget=0;
    if ((e.code==='ArrowRight'||e.code==='KeyD') && G.steerTarget>0) G.steerTarget=0;
  });
  $('strokepad').addEventListener('pointerdown', e => { e.preventDefault(); if (G.state==='playing'||G.state==='charging') registerStroke(0.85); });
  canvas.addEventListener('pointerdown', e => { if (G.motion.active) return; G.ptr.down=true; steerFromPointer(e); });
  canvas.addEventListener('pointermove', e => { if (G.ptr.down) steerFromPointer(e); });
  window.addEventListener('pointerup', () => { if (G.ptr.down){ G.ptr.down=false; G.steerTarget=0; } });
  function steerFromPointer(e){ const r=canvas.getBoundingClientRect(); G.steerTarget=Math.max(-1,Math.min(1,(e.clientX-r.left - W/2)/(W*0.34))); }

  // ---------- Banner ----------
  function banner(text){ G.banner = { text, t: now() }; }

  // ---------- Ghost race (async multiplayer) ----------
  // Records the player's distance every 0.1s, encodes it into a shareable code so a
  // friend can race against this exact run as a "ghost". No server needed.
  const B64 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';
  function encodeGhost(dists){
    let out='', prev=0;
    for (const d of dists){ const r=Math.round(d); let delta=Math.max(0,Math.min(63, r-prev)); out+=B64[delta]; prev+=delta; }
    return out;
  }
  function decodeGhost(str){
    const dists=[]; let cur=0;
    for (const ch of str){ const v=B64.indexOf(ch); if (v<0) continue; cur+=v; dists.push(cur); }
    return dists;
  }
  function ghostWorldAt(t){
    const a=G.ghost; if (!a || !a.length) return 0;
    const idx=t/0.1, i=Math.floor(idx);
    if (i>=a.length-1) return a[a.length-1];
    const f=idx-i; return a[i]*(1-f)+a[i+1]*f;
  }
  function setGhost(dists){
    if (!dists || dists.length<3) return false;
    G.ghost = dists;
    setLevelLength(dists[dists.length-1]);   // match the friend's track length
    let gt = dists.length*0.1;
    for (let i=0;i<dists.length;i++){ if (dists[i]>=LEVEL_LENGTH){ gt=i*0.1; break; } }
    G.ghostTime = gt;
    selectMode('level');
    const b=$('challengeBadge'); if (b){ b.classList.remove('hidden'); b.innerHTML = '⚔ Challenge — beat <b>'+gt.toFixed(1)+'s</b> to the egg'; }
    return true;
  }
  function loadGhostFromHash(){
    const m = (location.hash||'').match(/g=([A-Za-z0-9\-_]+)/);
    if (m){ try { setGhost(decodeGhost(m[1])); } catch(e){} }
  }

  // ---------- Live multiplayer (serverless P2P rooms via Trystero) ----------
  const MP = { active:false, transport:'', room:null, client:null, ch:null, id:'', code:'', name:'', peers:{}, send:null, sendGo:null, started:false, _sendT:0 };
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
        if (!payload || !payload.id || payload.id===MP.id) return;
        const p = MP.peers[payload.id] || (MP.peers[payload.id]={});
        p.td=payload.d; p.tx=payload.x; if (p.d==null){ p.d=p.td; p.x=p.tx; }   // smoothed toward target
        p.n=payload.n; p.fin=payload.fin; p.ft=payload.ft; p.t=now();
      });
      ch.on('broadcast', { event:'go' }, ({ payload }) => { if (!MP.started) beginLiveRace(payload && payload.m); });
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
      getState((d, id) => { const p = MP.peers[id] || (MP.peers[id]={}); p.td=d.d; p.tx=d.x; if (p.d==null){ p.d=p.td; p.x=p.tx; } p.n=d.n; p.fin=d.fin; p.ft=d.ft; p.t=now(); });
      getGo((d) => { if (!MP.started) beginLiveRace(d && d.m); });
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
    MP.active=false; MP.transport=''; MP.room=null; MP.ch=null; MP.client=null; MP.peers={}; MP.started=false;
    $('lobby').classList.add('hidden'); $('start').classList.remove('hidden');
  }
  let mpM = 600;   // multiplayer track length (metres), chosen in the lobby
  function beginLiveRace(m){ MP.started=true; G.ghost=null; setLevelLength((m||mpM||600)*PX_PER_UNIT); $('lobby').classList.add('hidden'); selectMode('level'); beginPlay(); }
  function broadcastState(){ if (!MP.active || !MP.send) return; MP.send({ d:Math.round(G.distance), x:+G.xNorm.toFixed(2), n:MP.name, fin:G.finished?1:0, ft:+G.elapsed.toFixed(1) }); }
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
    for (let i=0;i<trackGeneration.particleCount;i++) G.particles.push({ w:G.distance + Math.random()*(H/PX_PER_UNIT+60), lane:(Math.random()*2-1), s:1+Math.random()*2.4, sway:Math.random()*6.28 });
  }
  function spawnAhead(){
    const horizon = G.distance + H/PX_PER_UNIT + 40;
    const spawnLimit = (G.mode==='level') ? SPRINT_START : Infinity; // clear straight for the sprint
    while (G.nextSpawn < horizon){
      const prog = Math.min(1, G.nextSpawn/LEVEL_LENGTH);   // 0 at the wide start -> 1 at the narrow egg
      const gap = Math.min(trackGeneration.gapMax, trackGeneration.gapBase + G.nextSpawn*trackGeneration.gapPerWorldUnit);    // dense at the start, sparser toward the end
      if (G.nextSpawn > trackGeneration.graceUntilUnits && G.nextSpawn < spawnLimit){
        if (Math.random() < trackGeneration.cellProbability){
          const n = 1 + (Math.random() < trackGeneration.clusterProbability*(1-prog) ? 1 : 0);        // clusters early, singles late
          const size = (trackGeneration.cellSizeBase + Math.random()*trackGeneration.cellSizeRandom) * (1 - trackGeneration.cellShrinkByProgress*prog);         // obstacles shrink toward the end
          for (let i=0;i<n;i++) G.obstacles.push({ type:'cell', world:G.nextSpawn + i*trackGeneration.clusterSpacingUnits, lane:(Math.random()*trackGeneration.cellLaneSpread-trackGeneration.cellLaneSpread/2), r:size, hit:false, ph:Math.random()*6.28 });
        } else {
          G.obstacles.push({ type:'band', world:G.nextSpawn, gapLane:(Math.random()*trackGeneration.bandLaneSpread-trackGeneration.bandLaneSpread/2), gapHalf:Math.min(trackGeneration.bandGapMax, trackGeneration.bandGapBase + prog*trackGeneration.bandGapByProgress), hit:false });
        }
        if (Math.random() < trackGeneration.pickupProbability){   // a collectible sitting in the open lane
          const roll=Math.random(); const kind = roll<0.5?'star':roll<0.7?'boost':roll<0.9?'shield':'speed';
          G.pickups.push({ kind, world:G.nextSpawn + gap*0.5, lane:(Math.random()*1.5-0.75), r:trackGeneration.cellSizeBase, taken:false, ph:Math.random()*6.28 });
        }
      }
      // only a rare wide-open "breather" for variety
      G.nextSpawn += (Math.random() < trackGeneration.breatherProbability) ? gap*trackGeneration.breatherMultiplier : gap;
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
    initAudio(); if (actx && actx.state==='suspended') actx.resume();
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
    $('kTime').textContent = G.mode==='level' ? 'Time' : 'Best m';
    $('btnQuit').textContent = G.mode==='endless' ? '⏹' : '✕';
    if (G.mode==='level'){ $('sprintMark').style.top = (100 - SPRINT_START/LEVEL_LENGTH*100) + '%'; }
    startCountdown();
  }
  $('againBtn').onclick = beginPlay;
  document.querySelectorAll('#distChips .chip').forEach(ch => { ch.onclick = () => { practiceM = +ch.dataset.m; document.querySelectorAll('#distChips .chip').forEach(c=>c.classList.toggle('sel', c===ch)); }; });
  $('practicePlay').onclick = () => { setLevelLength(practiceM * PX_PER_UNIT); selectMode('level'); beginPlay(); };
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
    const m = code.match(/g=([A-Za-z0-9\-_]+)/); const raw = m ? m[1] : code.trim();
    if (setGhost(decodeGhost(raw))) toast('Challenge loaded ⚔ — race the ghost!'); else toast("Hmm, that code didn't work");
  }
  $('challengeBtn').onclick = shareChallenge;
  $('challengePaste').onclick = enterChallenge;
  $('serverCfg').onclick = setSupaCfg;
  document.querySelectorAll('#mpChips .chip').forEach(ch => { ch.onclick = () => { mpM = +ch.dataset.m; document.querySelectorAll('#mpChips .chip').forEach(c=>c.classList.toggle('sel', c===ch)); }; });
  $('lobbyStart').onclick = () => { if (!MP.isHost) return; if (MP.sendGo){ try{ MP.sendGo({ m: mpM }); }catch(e){} } beginLiveRace(mpM); };
  $('lobbyLeave').onclick = leaveLobby;

  function resetRun(){
    try{ clearInterval(MP._finT); }catch(e){}
    Object.assign(G, { distance:0, prevDistance:0, speed:0, xNorm:0, steer:0, steerTarget:0,
      strokes:[], boostOn:false, sprint:false, charge:0, chargeInputT:0,
      topSpeed:0, hits:0, elapsed:0, obstacles:[], pickups:[], score:0, nextSpawn:0,
      hitFlash:0, shake:0, tailPhase:0, flick:0, bestDist:0, finished:false, win:false, banner:null,
      boostCharges:items.startingBoostCharges, shieldCharges:items.startingShieldCharges, shieldActive:false, boosting:0,
      ghostRec:[], _ghostTimer:0, lastGhostCode:'',
      canalSeed: Math.random()*1000 });
    G.motion.prevMag=null; G.motion.base=G.motion.lp;
    G.rival = { world:0, speed:0, target:0.7*CRUISE_CAP, finished:false, finishT:0, retarget:0 };
    seedParticles();
  }

  let countT=0, countN=3;
  function startCountdown(){ G.state='ready'; countN=3; countT=now(); $('count').classList.remove('hidden'); $('countBig').textContent='3'; }

  function launch(){
    const c = G.charge;
    const inZone = c>=CHG_ZONE_LO && c<=CHG_ZONE_HI;
    if (inZone){ G.speed = OVER_CAP; banner('PERFECT LAUNCH! 🚀'); }
    else if (c > CHG_ZONE_HI){ G.speed = CRUISE_CAP*launchCfg.fizzleFraction; banner('OVERCOOKED 💥'); }
    else { G.speed = CRUISE_CAP*(launchCfg.weakBase + launchCfg.weakScale*c); banner('LAUNCH!'); }
    G.shake = 1; G.flick = 1; G.charge = 0; G.strokes = [];
    if (navigator.vibrate) navigator.vibrate(inZone ? [40,25,60] : 30);
    playLaunch();
    G.state = 'playing';
  }

  function quitRun(){ if (G.state==='playing'||G.state==='charging') endRun(G.mode==='endless'); }
  $('btnQuit').onclick = quitRun;
  $('btnMute').onclick = () => { G.muted=!G.muted; $('btnMute').textContent = G.muted?'🔇':'🔊'; };
  $('btnCenter').onclick = () => { G.motion.base = G.motion.lp; banner('Centered ⟲'); };
  $('btnBoost').onclick = () => { if (G.state==='playing' && !G.sprint && G.boostCharges>0 && G.boosting<=0){ G.boostCharges--; G.boosting=items.boostDurationSeconds; G.speed=OVER_CAP; G.flick=1; banner('BOOST! ⚡'); if(navigator.vibrate)navigator.vibrate(30); playLaunch(); } };
  $('btnShield').onclick = () => { if (G.state==='playing' && G.shieldCharges>0 && !G.shieldActive){ G.shieldCharges--; G.shieldActive=true; banner('SHIELD UP 🛡'); if(navigator.vibrate)navigator.vibrate(15); } };

  function endRun(finishedGoal){
    G.state='end'; G.finished=true;
    const rivalDist = Math.min(G.rival.world, LEVEL_LENGTH);
    let title, sub, cls='';
    if (MP.active){
      broadcastState();
      // keep announcing our finish time — others still racing must learn it to place correctly
      try{ clearInterval(MP._finT); }catch(e){}
      MP._finT = setInterval(() => { if (MP.active) broadcastState(); else clearInterval(MP._finT); }, networkInterpolation.finishRebroadcastMs);
      const others=Object.values(MP.peers);
      const before=others.filter(p=>p.fin && p.ft!=null && p.ft <= G.elapsed).length;
      const place=before+1, total=others.length+1;
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
    } else {
      G.win = G.distance >= rivalDist;
      title = G.win ? 'New record pace!' : 'Rival went further';
      sub = G.win ? 'You out-swam your rival.' : `Rival reached ${Math.round(rivalDist/PX_PER_UNIT)} m.`;
      cls = G.win ? 'win' : '';
    }
    const rt=$('resultTitle'); rt.textContent=title; rt.className='result '+cls;
    $('resultSub').textContent = sub;
    const m = v => Math.round(v/PX_PER_UNIT);
    $('endStats').innerHTML =
      `<div class="row"><span class="k">Score</span><span class="v">${Math.floor(G.score).toLocaleString()}</span></div>`+
      `<div class="row"><span class="k">Distance</span><span class="v">${m(G.distance)} m</span></div>`+
      `<div class="row"><span class="k">Time</span><span class="v">${G.elapsed.toFixed(1)} s</span></div>`+
      `<div class="row"><span class="k">Bumps</span><span class="v">${G.hits}</span></div>`;
    // build a shareable "challenge" code from this run so a friend can race your ghost
    const cbtn=$('challengeBtn');
    if (G.mode==='level' && finishedGoal && G.ghostRec.length>5){
      G.lastGhostCode = encodeGhost(G.ghostRec);
      try { localStorage.setItem('oiam_run', G.lastGhostCode); } catch(e){}   // so the start-screen button works next time
      if (cbtn){ cbtn.classList.remove('hidden'); cbtn.textContent='⚔ Challenge a friend'; }
    } else if (cbtn){ cbtn.classList.add('hidden'); }
    $('hud').classList.add('hidden'); $('race').classList.add('hidden'); $('count').classList.add('hidden');
    $('end').classList.remove('hidden');
  }

  // ---------- Charge update ----------
  function chargeUpdate(dt, t){
    const active = (t - G.chargeInputT) < CHG_ACTIVE_MS;   // currently shaking hard enough
    if (active) G.charge = Math.min(CHG_MAX, G.charge + CHG_RATE*dt);  // smooth, ~5s to fill
    if (G.charge >= CHG_MAX){ launch(); return; }                     // held too long -> fizzle
    if (!active && G.charge > launchCfg.minReleaseCharge && (t - G.chargeInputT) > CHG_RELEASE_MS){ launch(); return; }
    G.tailPhase += dt*8;
    syncHUD();
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
      G.sprint = true; banner('⚡ FINAL SPRINT! ⚡'); G.boosting = 0;   // no carried-over boost into the sprint
      G.obstacles = G.obstacles.filter(o => o.world < SPRINT_START);
      G.pickups = G.pickups.filter(p => p.world < SPRINT_START);        // no boosters in the sprint arena
    }

    // momentum: shaking pushes speed UP gently (smooth, never snaps); always bleeds slowly.
    const ceil = (G.boostOn || G.sprint || G.boosting>0) ? OVER_CAP : CRUISE_CAP;
    const thrust01 = Math.min(1, rate/DRIVE_RATE);
    const accel = ACCEL_UP;   // no sprint accel bonus — full speed must be earned by hammering hard
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

    for (const p of G.particles){ if (p.w < G.distance-10) p.w += H/PX_PER_UNIT + 60 + Math.random()*40; p.sway += dt*2; }

    if (G.mode==='level' && G.distance >= LEVEL_LENGTH && !G.finished){ G.distance=LEVEL_LENGTH; endRun(true); }
    if (G.mode==='endless' && G.distance > G.bestDist) G.bestDist = G.distance;

    if (MP.active){ MP._sendT += dt; if (MP._sendT >= networkInterpolation.sendIntervalSeconds){ MP._sendT=0; broadcastState(); } prunePeers(); smoothPeers(dt); }

    syncHUD();
  }

  function softWallBump(){ if (G.speed > CRUISE_CAP*collision.wallBumpMinSpeedFraction){ G.speed *= collision.wallBumpMultiplier; G.shake=Math.min(1,G.shake+0.25); if (navigator.vibrate) navigator.vibrate(18); } }
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
    if (G.shieldActive){ G.shieldActive=false; G.shake=Math.min(1,G.shake+0.3); banner('BLOCKED 🛡'); if (navigator.vibrate) navigator.vibrate(12); return; }
    G.hits++; G.speed *= HIT_PENALTY; G.hitFlash=1; G.shake=1; if (navigator.vibrate) navigator.vibrate([30,20,30]); playHit();
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
    p.taken=true; G.flick=Math.min(1,G.flick+0.4); if (navigator.vibrate) navigator.vibrate(10);
    if (p.kind==='star'){ G.score+=items.starScore; playPickup(1.0); }
    else if (p.kind==='boost'){ G.boostCharges=Math.min(items.maxCharges,G.boostCharges+1); banner('⚡ +1'); playPickup(1.3); }
    else if (p.kind==='shield'){ G.shieldCharges=Math.min(items.maxCharges,G.shieldCharges+1); banner('🛡 +1'); playPickup(0.8); }
    else { G.boosting=Math.max(G.boosting,items.speedOrbDurationSeconds); G.speed=Math.max(G.speed,OVER_CAP); G.score+=items.speedOrbScore; banner('SPEED! ✦'); playPickup(1.6); }
  }

  function updateRival(dt, t){
    if (MP.active) return;   // live peers replace the AI rival
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
      if (G.mode==='level') $('hTime').innerHTML = G.elapsed.toFixed(1)+'<small>s</small>';
      else $('hTime').innerHTML = Math.round(G.bestDist/PX_PER_UNIT)+'<small>m</small>';
      const bt=$('boostTag');
      bt.classList.toggle('on', G.boostOn || G.sprint);
      bt.classList.toggle('sprint', G.sprint);
      bt.textContent = G.sprint ? '⚡ FINAL SPRINT — GO GO GO ⚡' : '◆ Perfect rhythm — boost ◆';
    }
    // items
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
    ctx.save();
    if (G.shake>0){ ctx.translate((Math.random()*2-1)*G.shake*7, (Math.random()*2-1)*G.shake*7); }
    const bg = ctx.createRadialGradient(cx,H*0.12,H*0.05, cx,H*0.42,H*0.95);
    bg.addColorStop(0,'#5c1122'); bg.addColorStop(0.42,'#3a0d18'); bg.addColorStop(1,'#120407');
    ctx.fillStyle=bg; ctx.fillRect(-12,-12,W+24,H+24);
    // warm "light at the end" toward the egg, brightening as you get closer
    const glowI = (G.mode==='level' && (G.state==='playing'||G.state==='charging')) ? Math.min(0.5, 0.14 + G.distance/LEVEL_LENGTH*0.5) : 0.16;
    const gl = ctx.createRadialGradient(cx,H*0.09,0, cx,H*0.09,H*0.55);
    gl.addColorStop(0,`rgba(255,188,110,${glowI})`); gl.addColorStop(1,'rgba(255,188,110,0)');
    ctx.fillStyle=gl; ctx.fillRect(0,0,W,H);

    drawWalls(); drawParticles(); drawObstacles(); drawPickups();
    if (G.mode==='level'){ drawSprintLine(); drawEgg(); }
    drawRivalGhost(); if (MP.active) drawPeers(); drawSperm();
    ctx.restore();

    drawCompetitorMarkers();
    if (G.hitFlash>0){ ctx.fillStyle=`rgba(255,80,70,${G.hitFlash*0.32})`; ctx.fillRect(0,0,W,H); }
    const sf = G.speed/CRUISE_CAP;
    if (sf>0.02){ const v=ctx.createRadialGradient(cx,spermY,H*0.2,cx,spermY,H*0.78); v.addColorStop(0,'rgba(0,0,0,0)'); v.addColorStop(1,`rgba(67,224,207,${Math.min(0.16,sf*0.11)})`); ctx.fillStyle=v; ctx.fillRect(0,0,W,H); }
    drawBanner();
  }

  function drawWalls(){
    const step=10, left=[], right=[];
    for (let y=-step; y<=H+step; y+=step){ const half=wallHalf(yToWorld(y)); left.push([cx-half,y]); right.push([cx+half,y]); }
    ctx.fillStyle=GFX.wallL; ctx.beginPath(); ctx.moveTo(-10,-10);
    for (const p of left) ctx.lineTo(p[0],p[1]); ctx.lineTo(-10,H+10); ctx.closePath(); ctx.fill();
    ctx.fillStyle=GFX.wallR; ctx.beginPath(); ctx.moveTo(W+10,-10);
    for (const p of right) ctx.lineTo(p[0],p[1]); ctx.lineTo(W+10,H+10); ctx.closePath(); ctx.fill();
    // glossy inner edge — layered strokes instead of shadowBlur (far cheaper, same look)
    ctx.lineWidth=7; ctx.strokeStyle='rgba(255,120,150,.22)';
    ctx.beginPath(); ctx.moveTo(left[0][0],left[0][1]); for (const p of left) ctx.lineTo(p[0],p[1]); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(right[0][0],right[0][1]); for (const p of right) ctx.lineTo(p[0],p[1]); ctx.stroke();
    ctx.lineWidth=2.5; ctx.strokeStyle='rgba(255,185,200,.75)';
    ctx.beginPath(); ctx.moveTo(left[0][0],left[0][1]); for (const p of left) ctx.lineTo(p[0],p[1]); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(right[0][0],right[0][1]); for (const p of right) ctx.lineTo(p[0],p[1]); ctx.stroke();
    // depth: shadow cast inward from the walls, plus corner vignette
    ctx.fillStyle=GFX.edge; ctx.fillRect(0,0,W,H);
    ctx.fillStyle=GFX.vig;  ctx.fillRect(0,0,W,H);
  }
  function drawParticles(){
    // ambient red blood cells — flat fills (a gradient per cell per frame was the Android bottleneck)
    ctx.globalAlpha=0.5;
    for (const p of G.particles){
      const y=worldToY(p.w); if (y<-14||y>H+14) continue;
      const half=wallHalf(p.w)-8; const x=cx+p.lane*half+Math.sin(p.sway)*5; const r=p.s*2.4;
      ctx.fillStyle='#c8404c'; ctx.beginPath(); ctx.ellipse(x,y,r,r*0.82,0,0,6.28); ctx.fill();
      ctx.fillStyle='#7c1a24'; ctx.beginPath(); ctx.arc(x,y,r*0.42,0,6.28); ctx.fill();
    }
    ctx.globalAlpha=1;
  }
  function drawObstacles(){
    for (const o of G.obstacles){
      const y=worldToY(o.world); if (y<-60||y>H+60) continue;
      if (o.type==='cell'){
        const x=cx+o.lane*(wallHalf(o.world)-o.r);
        ctx.save(); ctx.translate(x,y);
        const grd=ctx.createRadialGradient(-o.r*0.3,-o.r*0.3,o.r*0.2,0,0,o.r);
        grd.addColorStop(0,o.hit?'#c9b7a8':'#f3e7d6'); grd.addColorStop(1,o.hit?'#8a7566':'#c9a98f');
        ctx.fillStyle=grd;
        ctx.beginPath(); for (let a=0;a<6.28;a+=0.4){ const rr=o.r*(0.86+0.14*Math.sin(a*3+o.ph)); const px=Math.cos(a)*rr, py=Math.sin(a)*rr; a===0?ctx.moveTo(px,py):ctx.lineTo(px,py); } ctx.closePath(); ctx.fill();
        const ng=ctx.createRadialGradient(o.r*0.05,0,o.r*0.1, o.r*0.15,o.r*0.1,o.r*0.45);
        ng.addColorStop(0,'#a06bc0'); ng.addColorStop(1,'#5e3480');
        ctx.fillStyle=ng; ctx.beginPath(); ctx.arc(o.r*0.15,o.r*0.1,o.r*0.42,0,6.28); ctx.fill();
        ctx.fillStyle='rgba(255,255,255,.35)'; ctx.beginPath(); ctx.arc(o.r*0.02,o.r*-0.05,o.r*0.14,0,6.28); ctx.fill(); ctx.restore();
      } else {
        const half=wallHalf(o.world), gcx=cx+o.gapLane*(half*0.8), gw=o.gapHalf*half;
        ctx.fillStyle=o.hit?'rgba(120,60,80,.5)':'rgba(150,30,60,.85)';
        ctx.fillRect(cx-half,y-9,(gcx-gw)-(cx-half),18); ctx.fillRect(gcx+gw,y-9,(cx+half)-(gcx+gw),18);
        ctx.strokeStyle='rgba(67,224,207,.5)'; ctx.lineWidth=2; ctx.beginPath(); ctx.moveTo(gcx-gw,y); ctx.lineTo(gcx+gw,y); ctx.stroke();
      }
    }
  }
  function drawPickups(){
    for (const p of G.pickups){
      if (p.taken) continue;
      const y=worldToY(p.world); if (y<-22||y>H+22) continue;
      const x=cx+p.lane*(wallHalf(p.world)-p.r), bob=Math.sin(now()*0.004+p.ph)*3;
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
  function drawEgg(){
    const y=worldToY(LEVEL_LENGTH); if (y>H+180) return; const R=72;
    ctx.save(); ctx.translate(cx,y);
    // radiant halo + rotating sun rays
    const halo=ctx.createRadialGradient(0,0,R*0.5,0,0,R*2.8); halo.addColorStop(0,'rgba(255,205,120,.6)'); halo.addColorStop(1,'rgba(255,205,120,0)');
    ctx.fillStyle=halo; ctx.beginPath(); ctx.arc(0,0,R*2.8,0,6.28); ctx.fill();
    const rot=(now()*0.0004)%6.283; ctx.globalAlpha=0.28; ctx.fillStyle='rgba(255,228,150,.9)';
    for (let i=0;i<12;i++){ ctx.save(); ctx.rotate(rot+i*6.283/12); ctx.beginPath(); ctx.moveTo(-9,-R*1.15); ctx.lineTo(9,-R*1.15); ctx.lineTo(0,-R*2.7); ctx.closePath(); ctx.fill(); ctx.restore(); }
    ctx.globalAlpha=1;
    const eg=ctx.createRadialGradient(-R*0.3,-R*0.38,R*0.2,0,0,R); eg.addColorStop(0,'#fff6e2'); eg.addColorStop(0.6,'#ffd98a'); eg.addColorStop(1,'#e79a3c');
    ctx.fillStyle=eg; ctx.beginPath(); ctx.ellipse(0,0,R*0.82,R,0,0,6.28); ctx.fill();
    ctx.fillStyle='rgba(255,255,255,.6)'; ctx.beginPath(); ctx.ellipse(-R*0.28,-R*0.36,R*0.15,R*0.24,-0.5,0,6.28); ctx.fill();
    ctx.restore();
  }
  function drawRivalGhost(){
    if (MP.active || G.mode!=='level' || G.rival.finished) return;
    const y=worldToY(G.rival.world); if (y<-40||y>H+40) return;
    const x=cx + 0.45*(wallHalf(G.rival.world)-22);
    if (G.ghost) drawSpermShape(x,y,0.8,'#dbeaff','#9ec4ff',0.45, now()*0.01, false);   // friend's ghost
    else drawSpermShape(x,y,0.78,'#ffb9ae','#ff6a5c',0.55, now()*0.01, false);          // AI rival
  }
  function drawSperm(){
    const showAtStart = (G.state==='charging' || G.state==='playing' || G.state==='ready');
    if (!showAtStart) return;
    const x=spermScreenX();
    const glow = G.state==='charging' ? '#7cff9f' : (G.boosting>0 ? '#ffd24d' : '#43e0cf');
    drawSpermShape(x, spermY, 1, '#fbf0e0', glow, 1, G.tailPhase, true);
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
      if (el>2100){ $('count').classList.add('hidden'); G.state='charging'; G.charge=0; G.chargeInputT=t; banner('REV UP! 🔋'); }
    } else if (G.state==='charging'){ chargeUpdate(dt, t); }
    else if (G.state==='playing'){ update(dt, t); }
    render();
    requestAnimationFrame(loop);
  }

  // ---------- Boot ----------
  setLevelLength(5000); resize(); selectMode('level'); updateHint(); loadGhostFromHash();
  try { const _c = localStorage.getItem('oiam_run'); if (_c) G.lastGhostCode = _c; } catch(e){}
  $('finePrint').textContent = detectControls() ? 'On iPhone you may get a one-time "allow motion" prompt — tap Allow.' : 'No motion sensor detected — keyboard / touch controls will be used.';
  requestAnimationFrame(loop);

  // Test/diagnostic handle. Not a global; production simply ignores it.
  return { G, MP, tuning, loop, resize, competitors, setLevelLength, encodeGhost, decodeGhost, ghostWorldAt, setGhost };
}
