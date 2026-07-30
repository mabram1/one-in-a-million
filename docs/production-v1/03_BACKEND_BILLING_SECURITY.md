# Backend, billing in varnostni načrt

## 1. Arhitekturno pravilo

Klient sme predlagati dogodek, ne sme pa sam razglasiti:

- novega wallet stanja;
- lastništva plačljivega dodatka;
- Premium entitlementa;
- porabe ali obnove dnevne kvote;
- uradnega leaderboard rezultata.

Te odločitve potrdi Supabase/Postgres oziroma billing verification backend.

## 2. Predlagane tabele

### `profiles`

- `user_id uuid primary key references auth.users`
- `display_name text`
- `level int`
- `xp bigint`
- `created_at timestamptz`
- `updated_at timestamptz`
- `deleted_at timestamptz null`

### `wallets`

- `user_id uuid primary key`
- `coins bigint check (coins >= 0)`
- `gems bigint check (gems >= 0)`
- `version bigint`
- `updated_at timestamptz`

Direkten client update ni dovoljen. Spremembe samo prek security-definer RPC, ki
preveri razlog, idempotency key in omejitve.

### `inventory`

- `user_id uuid`
- `item_id text`
- `acquired_at timestamptz`
- `source text`
- `transaction_id uuid`
- unique `(user_id, item_id)`

### `loadouts`

- `user_id uuid primary key`
- `hat_id text null`
- `glasses_id text null`
- `mouth_id text null`
- `trail_id text null`
- `skin_id text null`
- `updated_at timestamptz`

### `economy_ledger`

- `id uuid primary key`
- `user_id uuid`
- `idempotency_key text`
- `currency text`
- `delta bigint`
- `reason text`
- `metadata jsonb`
- `created_at timestamptz`
- unique `(user_id, idempotency_key, currency)`

Ledger je revizijska sled. Wallet je materializirano trenutno stanje.

### `daily_usage`

- `user_id uuid`
- `usage_date date`
- `competitive_started int`
- `updated_at timestamptz`
- primary key `(user_id, usage_date)`

Datum določi Postgres z UTC, ne klient.

### `race_attempts`

- `id uuid primary key`
- `user_id uuid`
- `mode text`
- `input_class text`
- `track_id text`
- `seed bigint`
- `tuning_version text`
- `status text`
- `started_at timestamptz`
- `finished_at timestamptz null`
- `result_id uuid null`
- `idempotency_key text`
- unique `(user_id, idempotency_key)`

### `race_results`

- `id uuid primary key`
- `attempt_id uuid unique`
- `user_id uuid`
- `mode text`
- `input_class text`
- `platform text`
- `track_id text`
- `seed bigint`
- `distance int`
- `time_ms int`
- `score int`
- `tuning_version text`
- `replay_version int`
- `build_version text`
- `integrity_status text`
- `created_at timestamptz`

### `entitlements`

- `user_id uuid`
- `entitlement_id text`
- `source text`
- `product_id text`
- `base_plan_id text null`
- `purchase_token_hash text null`
- `status text`
- `valid_until timestamptz null`
- `last_verified_at timestamptz`
- `updated_at timestamptz`
- primary key `(user_id, entitlement_id)`

### `billing_events`

- `provider_event_id text primary key`
- `user_id uuid null`
- `event_type text`
- `payload jsonb`
- `processed_at timestamptz null`
- `error text null`
- `created_at timestamptz`

Surovi tokeni in service-account credentiali ne gredo v klient ali navadne javne
tabele.

### `custom_faces`

Samo če lastnik potrdi cloud sync:

- `user_id uuid primary key`
- `storage_path text`
- `visibility text default 'private'`
- `updated_at timestamptz`

Bucket je private. Original selfie se nikoli ne uploada.

## 3. Obvezni RPC/Edge Function tokovi

- `upgrade_guest_profile`
- `start_competitive_attempt`
- `submit_race_result`
- `claim_race_reward`
- `purchase_cosmetic`
- `equip_cosmetic`
- `claim_daily_reward`
- `verify_google_play_purchase`
- `delete_my_account`

Vsak mutacijski tok potrebuje:

- authenticated user;
- idempotency key;
- validacijo inputa;
- transakcijo;
- rate limit;
- strukturiran error code;
- audit zapis.

## 4. RLS minimum

- uporabnik lahko bere svoj profil, wallet, inventory, loadout, usage in entitlement;
- uporabnik lahko prek dovoljenih stolpcev spremeni samo display name;
- wallet, ledger, entitlement in uradni rezultat niso neposredno zapisljivi s klienta;
- javni leaderboard je view, ki ne izpostavi emaila ali auth metadata;
- custom face je private in podpisan URL je kratkoživ;
- admin/service role ključ obstaja samo v backend secretih.

Dodati je treba avtomatske RLS teste za:

1. lasten read;
2. tuj read je zavrnjen;
3. direkten wallet update je zavrnjen;
4. direkten entitlement insert je zavrnjen;
5. dovoljen RPC uspe;
6. ponovljen idempotency key ne podvoji učinka.

## 5. Google Play Billing

Za Play-distributed Android aplikacijo digitalna naročnina uporablja Google Play
Billing. Regionalnih alternativnih billing programov ne uvajamo v MVP.

Uradne reference:

- https://support.google.com/googleplay/android-developer/answer/9858738
- https://developer.android.com/google/play/billing/integrate
- https://developer.android.com/google/play/billing/subscriptions

### Purchase tok

1. aplikacija prebere ponudbo iz Google Play;
2. uporabnik potrdi nakup v Google UI;
3. klient prejme purchase token;
4. token pošlje `verify_google_play_purchase`;
5. backend token preveri z Google Play Developer API;
6. entitlement se dodeli samo za stanje `PURCHASED`;
7. nakup se acknowledge-a v zahtevanem roku;
8. klient osveži entitlement iz Supabase;
9. RTDN pozneje vzdržuje lifecycle.

### Lifecycle stanja

- active;
- grace_period;
- on_hold;
- paused, če ga ponudba uporablja;
- canceled_but_active;
- expired;
- refunded;
- revoked;
- pending.

`pending` ne odklene Premium. Cancel ne odstrani dostopa pred koncem že plačanega
obdobja. Refund/revoke sledi potrjenemu provider stanju.

## 6. Account deletion

Ker aplikacija omogoča ustvarjanje računa, potrebuje:

- vidno možnost v Profile/Settings;
- ponovno potrditev;
- preklic oziroma navodilo za upravljanje aktivne naročnine;
- izbris ali anonimizacijo pripadajočih osebnih podatkov;
- javno spletno URL stran za zahtevo za izbris;
- jasno navedene izjeme hrambe za fraud, računovodstvo ali pravno obveznost.

Google zahteva in-app pot in spletno povezavo:

https://support.google.com/googleplay/android-developer/answer/13327111

## 7. Secrets in okolja

Okolja:

- local;
- staging;
- production.

V git smejo:

- Supabase URL;
- anon/publishable key;
- javni Google client ID.

V git ne smejo:

- Supabase service role;
- Google Play service-account JSON;
- webhook/RTDN secrets;
- signing keystore;
- upload key password;
- Stripe secret, če se pozneje uvede web billing.

