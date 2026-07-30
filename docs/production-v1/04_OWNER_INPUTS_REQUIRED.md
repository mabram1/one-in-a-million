# Kaj mora zagotoviti lastnik projekta

Claude lahko pripravi kodo in migracije, ne more pa sam ustvariti ali potrditi
naslednjih zunanjih računov in pravnih odločitev.

## Pred začetkom Auth faze

- [ ] potrjeno produkcijsko ime aplikacije;
- [ ] potrjen Android package ID;
- [ ] produkcijski Supabase projekt;
- [ ] Google Cloud OAuth projekt;
- [ ] Android OAuth client s pravilnim package ID in SHA-1/SHA-256;
- [ ] Web OAuth client za Supabase;
- [ ] support email;
- [ ] domena za auth redirecte;
- [ ] odločitev, ali email uporablja magic link ali 6-mestni OTP.

Privzeta odločitev v načrtu: email OTP/magic link brez gesla.

## Pred Billing fazo

- [ ] Google Play Console developer račun;
- [ ] aplikacija ustvarjena v Play Console;
- [ ] `million_club` subscription;
- [ ] `monthly` in `yearly` base plan;
- [ ] lokalizirane cene;
- [ ] license tester Google računi;
- [ ] Google Play Developer API dostop;
- [ ] service account z najmanjšimi potrebnimi pravicami;
- [ ] RTDN/Pub/Sub konfiguracija;
- [ ] potrjena mesečna in letna cena.

Privzeta odločitev:

- `€2.99 / mesec`;
- `€19.99 / leto`;
- brez triala ob prvem izidu.

## Pred javnim prikazom selfijev

- [ ] odločitev, ali drugi igralci sploh vidijo uporabnikov obraz;
- [ ] moderation in report proces;
- [ ] pravila za mladoletne;
- [ ] retention politika;
- [ ] posodobljena Privacy Policy.

Privzeta varna odločitev: obraz vidi samo lastnik; drugi vidijo standardni face.

## Pred Store objavo

- [ ] Privacy Policy URL;
- [ ] Terms of Service URL;
- [ ] Delete Account URL;
- [ ] support URL;
- [ ] support email;
- [ ] final app icon;
- [ ] feature graphic;
- [ ] 6–8 screenshotov;
- [ ] kratek in dolg opis;
- [ ] content-rating odgovori;
- [ ] Data safety odgovori;
- [ ] država in davčna nastavitev ponudnika.

## Odločitve, ki jih ni treba ponovno odpirati

- TypeScript + Canvas2D, brez Phaserja;
- motion je uradna tekmovalna kategorija;
- desktop keyboard ni v isti lestvici;
- Practice je neomejen;
- Free ima tri competitive dirke na dan;
- Premium ne daje gameplay prednosti;
- coins/gems ostanejo, vendar se ob prvem izidu za pravi denar prodaja samo
  naročnina;
- original selfija se ne shranjuje.

