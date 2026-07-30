# Produktne odločitve v1

## 1. Identiteta in prijava

Na prvem zagonu uporabnik vidi tri možnosti:

- **Continue with Google**
- **Continue with email**
- **Play as Guest**

Email uporablja OTP oziroma magic link. Gesel v prvi različici ne uvajamo.

Guest lahko začne igrati takoj. Prijava se zahteva za:

- uradno lestvico;
- multiplayer z javnim matchmakingom;
- cloud save;
- Challenge link, ki mora preživeti menjavo naprave;
- obnovitev inventarja in Premium dostopa;
- nakup naročnine.

Obstoječ Guest profil se ob prijavi nadgradi oziroma varno združi z računom. Coins,
XP in že odklenjeni dodatki se ne smejo izgubiti. Združitev je idempotentna.

## 2. Brezplačno igranje

### Practice

- neomejeno;
- lahko uporablja motion ali fallback upravljanje;
- ne porablja dnevnih dirk;
- desktop ostane Demo;
- Practice lahko daje majhno količino XP, vendar ne sme biti najboljši način za
  farmanje coins.

### Tri brezplačne tekmovalne dirke

Guest in prijavljen Free uporabnik dobita **3 competitive race credits na koledarski
dan**. Kredit porabijo:

- Multiplayer;
- Challenge Friend, ko začnejo veljaven poskus;
- Daily Challenge, ko začnejo veljaven poskus.

Kredit se ne porabi:

- če se race ne začne zaradi omrežne napake;
- če matchmaking ne najde igralca;
- če aplikacija izgubi dovoljenje za motion pred startom;
- pri Practice;
- pri ogledu tutoriala.

Po začetku veljavne dirke se kredit porabi. Nameren quit ali zaprtje aplikacije ga
ne povrne. Dnevni reset je ob `00:00 UTC`, da je strežniško pravilo enotno.

Strežnik je vir resnice. `localStorage` je samo prikazni cache. Za Guest uporabnika
se uporablja anonimna Supabase identiteta, zato zgolj brisanje lokalnega števca ne
ponastavi kvote.

## 3. Naročnina

Ime: **Million Club**

Začetna ponudba:

- mesečno: `€2.99`;
- letno: `€19.99`;
- brez triala ob prvem javnem izidu; trial se lahko doda po meritvah.

Google Play konfiguracija:

- subscription product ID: `million_club`;
- base plan ID: `monthly`;
- base plan ID: `yearly`.

Ugodnosti:

- neomejene competitive dirke;
- brez oglasov, če jih kasneje uvedemo;
- posebna Premium značka;
- en kuriran kozmetični drop na mesec;
- večji dnevni login bonus;
- posebne barvne variante in traili;
- brez gameplay prednosti.

Premium ne spremeni hitrosti, hitboxa, boosta, shielda, trkov ali rankinga.

## 4. Valute in trgovina

Obdržimo že implementirana coins in gems, da ne razbijemo persistence migracije.

### Coins

- redna zaslužena valuta;
- race rewards, daily quest, level-up;
- večina common/rare dodatkov.

### Gems

- redka valuta;
- level milestones, daily streak in dogodki;
- epic dodatki;
- ob izidu jih ne prodajamo za pravi denar.

Prva monetizirana različica prodaja samo Million Club. Coin/gem pakete dodamo
pozneje, ko so economy podatki stabilni. Tako je billing, refund in balancing
površina manjša.

Vsi dodatki so kozmetični. Že opremljeni dodatki iz stare verzije se ob migraciji
priznajo kot owned.

## 5. Rezultati in lestvice

Vsak rezultat vsebuje:

- `inputClass`: `mobile_motion | mobile_touch | desktop_keyboard`;
- `platform`: `android | ios_web | mobile_web | desktop_web`;
- `mode`;
- `trackId`, `seed`, `distance`;
- `tuningVersion`, `replayVersion`, `buildVersion`;
- čas, score in finish status;
- osnovne integrity signale.

Pravila:

- globalna uradna lestvica uporablja samo `mobile_motion`;
- `mobile_touch` je ločena lestvica;
- `desktop_keyboard` ni uradna lestvica;
- različni `tuningVersion` se ne mešajo;
- sumljiv ali nezdružljiv rezultat se shrani za diagnostiko, ne objavi pa se.

## 6. Uporabnikov obraz v Spermy/Champ glavi

Delovno ime funkcije: **Face Your Destiny**.

Prva različica:

1. uporabnik izbere fotografijo ali kamero;
2. fotografija se popravi za orientacijo;
3. uporabnik ročno približa in premakne obraz;
4. Canvas naredi mehak head-mask crop;
5. doda se top-left highlight, spodnji rim in barvna uskladitev;
6. izvozi se samo obdelan overlay, ne original.

Izhod:

- delovni overlay: 512 × 768 PNG ali notranji WebP ekvivalent;
- multiplayer thumbnail: največ 256 × 256;
- originalna fotografija se po obdelavi zavrže.

Z-order:

```text
tail
base_body
custom_face_photo
face_gloss_overlay
mouth/accessory
glasses
hat
aura/trail
```

Varnost:

- privzeto je custom face viden samo lastniku;
- drugim igralcem se pokaže standardni obraz, dokler ni uveden moderation tok;
- upload v Supabase je opt-in in shrani samo obdelan rezultat v private bucket;
- uporabnik lahko obraz kadarkoli izbriše;
- ne izvajamo prepoznavanja identitete ali biometričnega profiliranja.

## 7. Jezik

MVP podpira:

- angleščino kot primarni jezik;
- slovenščino kot popoln sekundarni jezik.

Ves nov copy mora biti v lokalizacijskih JSON datotekah, ne v TypeScript literalih.

