# One in a Million — pot do produkcijske različice

Status dokumenta: izvedbeni načrt  
Datum: 2026-07-30  
Tehnologija: Vite + TypeScript + Canvas2D + Capacitor + Supabase  
Primarna platforma: Android, portrait, upravljanje s senzorji

## Namen

Ta mapa je nov operativni vir resnice za dokončanje produkta. Ne nadomešča:

- `DESIGN_ASSET_SPEC.md` za grafične datoteke;
- `docs/handbook/` za oblikovalska in razvojna pravila;
- `src/game/config/tuning.ts` za zaščitene igralne vrednosti;
- obstoječih characterization testov za zaščiten občutek igre.

Ta mapa določa, kaj je še treba zgraditi, v kakšnem vrstnem redu in kaj pomeni
»pripravljeno za objavo«.

## Kaj je bilo preverjeno v projektu

Že obstaja:

- delujoča igra v TypeScriptu in Canvas2D;
- Vite build, Vitest testi in Capacitor Android ovojnica;
- motion, touch in keyboard upravljanje;
- Practice, Multiplayer, Challenge in Endless;
- seedane proge in verzioniran replay/challenge format;
- osnovna zaščita multiplayer rezultatov;
- Phase 2/3 art, Spermy rig, customization in gameplay sprite-i;
- novi tunelski background;
- onboarding oziroma How to Play;
- lokalni profil, XP, coins, gems, katalog in persistence osnova;
- Main Hub v2, vendar je še opt-in prek `?hub=v2`;
- osnovni economy domain in testi.

Še ni produkcijsko dokončano:

- Main Hub v2 kot privzeti in zanesljiv app shell;
- dejanski Store, Profile, Daily Challenge in Leaderboard zasloni;
- Supabase Auth: Google, email OTP/magic link in nadgradnja Guest računa;
- sinhroniziran cloud profil z Row Level Security;
- strežniško avtoritativna denarnica, inventar in dnevna kvota;
- tri brezplačne tekmovalne dirke na dan;
- Google Play Billing naročnina in strežniško preverjanje;
- obnova nakupov, preklici, refund/revocation ter RTDN;
- produkcijski privacy/delete-account tokovi;
- uporabnikov obraz v glavi lika;
- signed Android App Bundle in Play Store produkcijska priprava;
- telemetry, crash reporting in release QA na resničnih telefonih.

## Zavezujoče produktne odločitve

1. Phaser se ne uvaja.
2. Občutek vožnje, tuning, trki in motion upravljanje so zaščiteni.
3. Practice ostane neomejen, da se uporabnik lahko nauči igrati.
4. Guest in prijavljen Free uporabnik dobita tri tekmovalne dirke dnevno.
5. Uradni rezultati so samo `mobile_motion`.
6. `mobile_touch` ima ločeno kategorijo.
7. `desktop_keyboard` je Demo/Practice in ne daje uradnih rekordov ali trajnih nagrad.
8. Naročnina ne daje hitrosti ali druge tekmovalne prednosti.
9. Android naročnina uporablja Google Play Billing.
10. Fotografija obraza se privzeto obdeluje lokalno in se ne objavi drugim igralcem.

## Dokumenti

- `01_PRODUCT_DECISIONS.md` — dostop, naročnina, valuta, rezultati in selfie.
- `02_COMPLETION_ROADMAP.md` — faze, naloge in acceptance criteria.
- `03_BACKEND_BILLING_SECURITY.md` — Supabase, RLS, kvota in Google Play Billing.
- `04_OWNER_INPUTS_REQUIRED.md` — stvari, ki jih mora zagotoviti lastnik projekta.
- `CLAUDE_MASTER_PROMPT.md` — prompt za Claude Code.

## Pravilo izvedbe

Claude ne sme implementirati vseh faz v enem velikem posegu. Vsaka faza mora:

1. ohraniti zaščitene characterization teste;
2. dodati lastne teste;
3. uspešno opraviti `npm run verify`;
4. biti preverjena na Android telefonu, kadar posega v senzorje, deep link ali billing;
5. imeti kratek zapis, kaj se je spremenilo in kaj še čaka.

