# Legal documents — One in a Million

Self-prepared drafts tailored to how the Game actually handles data and payments. **Not
legal advice.** You've chosen to operate as a **private individual in Switzerland**; the
documents are filled in accordingly.

## Files
- `PRIVACY_POLICY.md` — GDPR/FADP privacy policy.
- `TERMS_OF_SERVICE.md` — rules of use, accounts, subscriptions/refunds, liability.
- `IMPRINT.md` — provider identification.

## Operator details (filled in)
- **Name:** Matija Abram — private individual
- **Country:** Switzerland
- **Contact:** oneinamillion@skilliyo.com
- **Governing law:** Swiss law

## ⚠️ Still required before publishing
1. **Postal address** — replace `[[ADDRESS]]` in all three files. A commercial service's
   imprint legally needs a real street address (Swiss law + EU e-Commerce Directive).
2. **Supabase region** — one `[[ ]]` in the privacy policy (§3): state where the Supabase
   project is hosted (e.g. EU).

## Practical tax notes (not legal advice)
- **Switzerland:** operating as a private individual is fine below **CHF 100,000** turnover;
  above it you must register (Einzelunternehmen) and for Swiss VAT (MWST).
- **EU customers:** EU VAT applies to digital subscriptions **from the first sale** (non-Union
  OSS). Enable **Stripe Tax** so VAT is charged/reported automatically.

## App wiring (next step)
Once you add the address, I can:
- Serve `/terms` and `/privacy` pages (in-app + web), linked from the account gate + a hub footer.
- Add a **consent checkbox** ("I agree to the Terms and Privacy Policy") to sign-up.
- Add the **Imprint** link in the footer.
