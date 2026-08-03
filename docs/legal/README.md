# Legal documents — DRAFTS (must be lawyer-reviewed)

These are **starting drafts** tailored to how *One in a Million* actually handles
data and payments. They are **not legal advice** and **must be reviewed by a
qualified lawyer** before you publish them — especially because the app will take
**payments** and serves users in the **EU/EEA (GDPR)** and possibly Switzerland
(FADP). A game can also attract **minors**, which adds obligations.

## Files
- `PRIVACY_POLICY.md` — what data is collected, why, who processes it, user rights.
- `TERMS_OF_SERVICE.md` — rules of use, accounts, payments/refunds, liability.
- `IMPRINT.md` — provider identification (EU/CH requirement for commercial sites).

## Placeholders you MUST fill in (search for `[[ ]]`)
- `[[LEGAL_NAME]]` — the legal entity or sole trader name that operates the game.
- `[[LEGAL_FORM]]` — e.g. *samostojni podjetnik (s.p.)*, d.o.o., or private individual.
- `[[ADDRESS]]` — registered business address.
- `[[TAX_ID]]` — davčna številka / VAT ID (if VAT-registered).
- `[[CONTACT_EMAIL]]` — e.g. support@… (currently the project uses support@websamurai.ch).
- `[[JURISDICTION]]` — governing law + courts (Slovenia? Switzerland? decide with counsel).
- `[[COMPANY_REGISTER]]` — register + number, if applicable (AJPES for SLO).
- `[[EFFECTIVE_DATE]]`.

## Decisions to confirm with your accountant / lawyer before going live
1. **Business form** — regular paid subscriptions usually require an **s.p.** or company
   (not a private individual) for tax; Stripe payouts need a tax identity.
2. **VAT/DDV** — selling digital subscriptions to EU consumers triggers **VAT OSS** (VAT
   at the buyer's country rate). Plan to enable **Stripe Tax**.
3. **Jurisdiction** — the contact email is `.ch` (Switzerland) but earlier notes said
   Slovenia. SLO → GDPR + slovenska zakonodaja; CH → FADP. This changes the documents.
4. **Minors** — decide a minimum age (commonly 16 in the EU for consent, or with
   parental consent) and reflect it in both documents.
5. **Refunds** — EU consumers have a 14-day withdrawal right for digital services unless
   they expressly consent to immediate performance and waive it. Decide your flow.

## App wiring (next step, after you approve the text)
- Serve `/terms` and `/privacy` pages (in-app + web), linked from the account gate and
  a hub footer.
- Add a **consent checkbox** ("I agree to the Terms and Privacy Policy") to sign-up.
- Add the **Imprint** link in the footer.
