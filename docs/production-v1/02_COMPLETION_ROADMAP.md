# Completion roadmap

## Definicija produkcijsko dokončane igre

Igra je pripravljena za javni Android izid, ko:

- se nov uporabnik lahko prijavi ali nadaljuje kot Guest;
- razume shake, GO zone in tilt brez zunanje razlage;
- lahko odigra vse načine brez blokirajoče napake;
- ima dosleden Main Hub, Store, Profile, Daily in Leaderboard;
- daily quota in Premium delujeta strežniško;
- nakupi se varno preverjajo in obnovijo;
- uradni rezultati ne mešajo motion, touch in keyboard;
- račun in podatke je mogoče izbrisati;
- release AAB prestane Play internal/closed test;
- privacy, Data safety in store listing so dokončani;
- crash-free in osnovni performance cilji so doseženi na realnih telefonih.

## Phase A — utrditev app shella

### Naloge

- Main Hub v2 postane privzeti landing.
- Classic menu ostane samo začasen debug fallback.
- Uvede se majhen typed router za:
  - splash;
  - auth;
  - home;
  - customize;
  - store;
  - profile;
  - leaderboard;
  - daily;
  - settings;
  - paywall;
  - race.
- Store/Profile/Daily gumbi ne kažejo več `coming soon`.
- App shell spoštuje safe area, back button in obnovitev stanja po background/resume.
- Zunanji Supabase CDN import se odstrani; dependency se pinna v build.
- Napake se prikažejo skozi enoten error/toast sistem.

### Acceptance

- `?hub=v2` ni več potreben.
- Browser refresh na podprti poti obnovi ustrezen zaslon.
- Android back ne zapre aplikacije sredi notranje navigacije.
- Stara igra in vsi characterization testi ostanejo nespremenjeni.

## Phase B — Auth in cloud profil

### Naloge

- Supabase Auth:
  - anonymous Guest session;
  - Google sign-in;
  - email OTP/magic link;
  - sign-out;
  - account linking/Guest upgrade.
- Deep links za OAuth in magic link v Capacitorju.
- Tabele in RLS iz `03_BACKEND_BILLING_SECURITY.md`.
- Lokalni profile v1 se migrira v cloud profil brez izgube.
- Offline cache ostane, vendar server zmaga pri entitlementih in denarnici.
- Profile zaslon:
  - avatar/Champ preview;
  - display name;
  - level in XP;
  - wallet;
  - statistika;
  - subscription status;
  - sign-in/sign-out;
  - delete account.

### Acceptance

- Guest začne brez obrazca.
- Google in email login delujeta v debug APK ter release candidate AAB.
- Ponovna namestitev po prijavi obnovi profil.
- Dva odjemalca ne moreta podvojiti rewarda z istim `eventId`.
- RLS test potrdi, da uporabnik ne vidi ali spreminja tujega profila.

## Phase C — rezultati, kvota in lestvice

### Naloge

- Strežniški RPC `start_competitive_attempt`.
- Tri dnevne dirke za Guest/Free.
- Premium bypass prek entitlementa.
- Rezervacija in poraba attempta z idempotency key.
- Submit rezultata s kontrolo input class, tuning in replay verzije.
- Leaderboard:
  - Daily;
  - Weekly;
  - All Time;
  - Friends/Challenge pozneje;
  - motion in touch ločena.
- Desktop rezultat je vedno Demo.
- Results zaslon pokaže:
  - eligibility;
  - preostale dirke;
  - novi personal best;
  - reward;
  - Premium CTA, ko je kvota porabljena.

### Acceptance

- Lokalna ura ali sprememba časovnega pasu ne obnovi kvote.
- Isto zahtevo je mogoče varno ponoviti brez dvojne porabe.
- Omrežna napaka pred veljavnim startom ne porabi kredita.
- Keyboard rezultat se ne pojavi na motion lestvici.

## Phase D — Store in ekonomija

### Naloge

- Produkcijski Store zaslon:
  - Featured;
  - Hats;
  - Glasses;
  - Mouth;
  - Trails;
  - Owned.
- Customize zaslon uporablja isti katalog in ownership.
- Nakup z coins/gems gre prek strežniškega RPC.
- Equip je sinhroniziran in ima optimistic UI z rollbackom.
- Dnevni login reward in osnovni daily quest.
- Economy dogodki za meritve:
  - currency earned;
  - currency spent;
  - item viewed;
  - item purchased/equipped.

### Acceptance

- Klient ne more sam povečati walleta.
- Hkratna nakupa ne povzročita negativnega stanja.
- Že kupljen item se ne zaračuna drugič.
- Offline uporabnik lahko uporablja že cached owned dodatke, ne more pa opraviti
  novega nakupa brez strežniške potrditve.

## Phase E — Google Play naročnina

### Naloge

- Abstrakcija `BillingAdapter`.
- Android implementacija za Google Play Billing.
- Produkt `million_club`, base plana `monthly` in `yearly`.
- Paywall z jasnimi:
  - ugodnostmi;
  - ceno in obdobjem;
  - auto-renew razlago;
  - Terms in Privacy povezavama;
  - Restore/Check purchases;
  - Manage subscription.
- Purchase token se pošlje varnemu backendu.
- Backend preveri nakup z Google Play Developer API.
- RTDN posodablja renew, grace, hold, cancel, expire, refund in revoke.
- Entitlement se nikoli ne zaupa samo lokalnemu `isPremium`.

### Acceptance

- License tester lahko kupi, obnovi in prekliče plan.
- Pending nakup ne odklene Premium.
- Refund/revoke odstrani Premium po strežniški potrditvi.
- Reinstall obnovi aktivno naročnino.
- Brez omrežja se uporabi kratko, časovno omejeno cached entitlement stanje.

## Phase F — Face Your Destiny

### Naloge

- camera/gallery permission z razlago ob dejanju;
- EXIF/orientation normalizacija;
- varen crop/zoom editor;
- teardrop maska, feather, color grade in gloss;
- lokalna hramba obdelanega overlayja;
- delete/reset;
- opcijski private cloud sync obdelane slike;
- drugi igralci do moderation v1 vidijo standardni face.

### Acceptance

- originalna fotografija se ne shrani;
- funkcija deluje offline;
- velika fotografija ne povzroči memory crasha;
- uporabnik lahko rezultat izbriše;
- custom face ne spremeni hitboxa ali rig anchorjev.

## Phase G — produkcijska kakovost in objava

### Tehnično

- odstraniti preostale runtime CDN dependencyje;
- production env in secrets;
- Sentry ali primerljiv crash reporting;
- osnovna privacy-preserving analitika;
- performance profiling na low/mid/high Android;
- lifecycle testi: background, call interruption, lock screen, rotation lock;
- network loss testi;
- accessibility: touch targeti, contrast, reduced motion, screen labels;
- audio/haptic nastavitve;
- rate limiting in abuse zaščita;
- backup/restore DB ter migration runbook.

### Play Store

- production app icon in adaptive icon;
- 6–8 screenshots in feature graphic;
- kratek/dolg opis;
- content rating;
- privacy policy;
- Terms of Service;
- Data safety obrazec;
- account deletion javna URL stran;
- subscription disclosure;
- support email in support URL;
- signed AAB, Play App Signing;
- internal test, closed test in staged rollout.

### Release gates

- `npm run verify` zelen;
- Supabase migration test zelen;
- billing test matrix zelen;
- brez P0/P1 bugov;
- najmanj 20 realnih testnih dirk na vsaj treh Android napravah;
- crash-free sessions cilj ≥ 99.5 % v closed testu;
- p95 frame time brez opaznega poslabšanja glede na baseline;
- lastnik pisno potrdi paywall, cene, Privacy in store listing.

## Kaj ni del prve javne različice

- battle pass;
- real-money coin/gem paketi;
- javno prikazovanje uporabniških fotografij brez moderation sistema;
- iOS native billing;
- pet popolnoma novih biomeov;
- kompleksna clans/guilds funkcija;
- migracija na Phaser ali drug game engine.

