import { getProfileStore } from '../profileStore';
import { SUPABASE_URL, SUPABASE_ANON_KEY } from '../supabaseConfig';

const ENTRY_KEY = 'oiam_entry_choice';
const DEFAULT_SERVER = { url: SUPABASE_URL, key: SUPABASE_ANON_KEY };

type SupabaseClient = any;
let client: SupabaseClient | null = null;

function locale(): 'sl' | 'en' {
  try { return navigator.language.toLowerCase().startsWith('sl') ? 'sl' : 'en'; } catch { return 'en'; }
}

const COPY = {
  en: { title:'Ready to make a splash?', sub:'Sign in to keep your Champ, rewards and records on every phone.', google:'Continue with Google', email:'Send email sign-in link', guest:'Play as Guest', placeholder:'you@example.com', sent:'Check your email — your magic link is on the way.', unavailable:'Sign-in is still waking up. Try again in a moment.', privacy:'Guest play stays on this device. You can link it later without losing progress.' },
  sl: { title:'Pripravljen na štart?', sub:'Prijavi se, da ohraniš Champa, nagrade in rekorde na vseh telefonih.', google:'Nadaljuj z Googlom', email:'Pošlji povezavo na e-pošto', guest:'Igraj kot gost', placeholder:'ti@primer.si', sent:'Preveri e-pošto — prijavna povezava je na poti.', unavailable:'Prijava se še prebuja. Poskusi znova čez trenutek.', privacy:'Igra gosta ostane na tej napravi. Račun lahko povežeš pozneje brez izgube napredka.' },
};

function serverConfig(): { url:string; key:string } {
  try { const x=JSON.parse(localStorage.getItem('oiam_supa') || 'null'); if (x?.url && x?.key) return x; } catch { /* */ }
  return DEFAULT_SERVER;
}

async function supabase(timeoutMs=5000): Promise<SupabaseClient | null> {
  if (client) return client;
  const cfg=serverConfig();
  if (!cfg.url || !cfg.key) return null;   // no anon key configured -> cloud auth off (createClient throws on an empty key)
  const started=Date.now();
  while (!(window as any).__supa?.createClient && Date.now()-started < timeoutMs) await new Promise((r)=>setTimeout(r,100));
  const factory=(window as any).__supa?.createClient; if (!factory) return null;
  try { client=factory(cfg.url,cfg.key,{ auth:{ persistSession:true, autoRefreshToken:true, detectSessionInUrl:true } }); }
  catch { return null; }
  return client;
}

async function adoptSession(c: SupabaseClient): Promise<boolean> {
  try {
    const { data } = await c.auth.getSession(); const u=data?.session?.user; if (!u) return false;
    const name=u.user_metadata?.full_name || u.user_metadata?.name || u.email?.split('@')[0] || 'Champ';
    getProfileStore().linkAccount(u.id,name); localStorage.setItem(ENTRY_KEY,'linked'); return true;
  } catch { return false; }
}

/** Re-open the account gate later (from Profile) so a Guest can link an account
 *  without losing progress. `force` bypasses the "already chose entry" short-circuit. */
export function openSignIn(): Promise<void> { return showAuthGate({ force: true }); }

export async function showAuthGate(opts: { force?: boolean } = {}): Promise<void> {
  if (document.querySelector('.auth-gate')) return;
  const prior=localStorage.getItem(ENTRY_KEY);
  const c=await supabase(1200);
  if (!opts.force && c && await adoptSession(c)) return;
  if (!opts.force && (prior==='guest' || prior==='linked')) return;

  const t=COPY[locale()]; const root=document.createElement('section');
  root.className='auth-gate'; root.setAttribute('role','dialog'); root.setAttribute('aria-modal','true');
  root.innerHTML=`<div class="auth-card">
    <img class="auth-champ" src="${import.meta.env.BASE_URL}art/splash/champ_hero.png" alt="Champ">
    <h1>${t.title}</h1><p>${t.sub}</p>
    <button class="auth-google" data-auth="google"><span>G</span>${t.google}</button>
    <div class="auth-email"><input type="email" autocomplete="email" placeholder="${t.placeholder}" aria-label="Email"><button data-auth="email">${t.email}</button></div>
    <button class="auth-guest" data-auth="guest">${t.guest}</button>
    <small>${t.privacy}</small><div class="auth-status" role="status"></div>
  </div>`;
  const status=root.querySelector('.auth-status') as HTMLElement;
  const setBusy=(on:boolean)=>root.classList.toggle('busy',on);
  root.addEventListener('click',async(e)=>{
    const b=(e.target as HTMLElement).closest('[data-auth]') as HTMLElement|null; if(!b) return;
    const act=b.dataset.auth;
    if(act==='guest'){
      localStorage.setItem(ENTRY_KEY,'guest'); root.remove();
      window.dispatchEvent(new CustomEvent('oiam:entry-complete'));
      return;
    }
    setBusy(true); status.textContent=''; const cli=await supabase();
    if(!cli){ status.textContent=t.unavailable; setBusy(false); return; }
    try {
      if(act==='google') await cli.auth.signInWithOAuth({ provider:'google', options:{ redirectTo:location.href.split('#')[0] } });
      else {
        const email=(root.querySelector('input[type=email]') as HTMLInputElement).value.trim();
        if(!email){ status.textContent=t.placeholder; setBusy(false); return; }
        const { error }=await cli.auth.signInWithOtp({ email, options:{ emailRedirectTo:location.href.split('#')[0] } });
        if(error) throw error; status.textContent=t.sent;
      }
    } catch(err:any){ status.textContent=err?.message || t.unavailable; }
    setBusy(false);
  });
  document.body.appendChild(root);
}
