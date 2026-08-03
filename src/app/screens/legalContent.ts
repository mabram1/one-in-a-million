/**
 * User-facing legal copy for the in-app Terms / Privacy / Imprint pages.
 *
 * This is the SHIPPED copy. The reference/source versions (for review) live in
 * `docs/legal/*.md` — keep them in sync. To finalise, set LEGAL_ADDRESS to the
 * real postal address (street, postal code, city) — it feeds all three pages.
 */
export const LEGAL_ADDRESS = 'Switzerland';   // TODO: add street, postal code, city
export const LEGAL_EMAIL = 'oneinamillion@skilliyo.com';
export const LEGAL_NAME = 'Matija Abram';
export const LEGAL_DATE = '3 August 2026';

const provider = `${LEGAL_NAME} (private individual), ${LEGAL_ADDRESS}`;

export const PRIVACY_HTML = `
<p class="legal-meta"><b>Effective date:</b> ${LEGAL_DATE}<br>
<b>Controller:</b> ${provider}<br>
<b>Contact:</b> <a href="mailto:${LEGAL_EMAIL}">${LEGAL_EMAIL}</a></p>
<p>This policy explains what personal data <em>One in a Million</em> collects, why, and your
rights. It is written to align with the EU GDPR and the Swiss FADP.</p>
<h3>1. The short version</h3>
<ul>
  <li>You can play as a <b>Guest</b> with <b>no account</b> — that progress stays on your device.</li>
  <li>If you <b>sign in</b>, we store your email, an account id, your display name and your game progress for cross-device sync.</li>
  <li>Your <b>“My Face” photo never leaves your device</b> — processed locally, never uploaded.</li>
  <li>We do <b>not</b> sell your data and do <b>not</b> use third-party advertising or tracking.</li>
</ul>
<h3>2. What we collect and why</h3>
<div class="legal-table"><table>
  <thead><tr><th>Data</th><th>Purpose</th><th>Basis</th></tr></thead>
  <tbody>
    <tr><td>Email address</td><td>Create/secure your account, sync</td><td>Contract</td></tr>
    <tr><td>Account id (Google/Supabase)</td><td>Identify your account</td><td>Contract</td></tr>
    <tr><td>Display name</td><td>Show you in game &amp; multiplayer</td><td>Contract</td></tr>
    <tr><td>Game progress (coins, gems, level, records, cosmetics)</td><td>Save your progress</td><td>Contract</td></tr>
    <tr><td>Multiplayer session (name, race position)</td><td>Run the live race</td><td>Contract</td></tr>
    <tr><td>Technical data (e.g. IP, via providers)</td><td>Deliver &amp; secure the service</td><td>Legitimate interest</td></tr>
    <tr><td>Payment data</td><td>Process your subscription</td><td>Contract</td></tr>
    <tr><td>“My Face” photo</td><td>Personalise your character <b>on your device only</b></td><td>Consent — not sent to us</td></tr>
  </tbody>
</table></div>
<h3>3. Who processes your data</h3>
<p><b>Supabase</b> (database, auth, realtime), <b>Google</b> (only if you use “Sign in with
Google”), <b>Vercel</b> (hosting), and <b>Stripe</b> (payments, once subscriptions launch).
We use data-processing agreements; some processing may occur outside Switzerland/the EEA under
appropriate safeguards (e.g. EU Standard Contractual Clauses).</p>
<h3>4. “My Face” — on-device only</h3>
<p>Your photo is selected, cropped and processed <b>in your browser</b>; the resulting overlay
is stored <b>locally</b> (IndexedDB) and <b>never uploaded</b>. Delete it any time in
Profile → My Face → Delete, or by clearing the app’s site data.</p>
<h3>5. Local storage</h3>
<p>We use your browser’s local storage / IndexedDB to keep guest progress, settings and your
face overlay. These are essential to the Game. No advertising cookies or third-party analytics.</p>
<h3>6. Payments</h3>
<p>Subscriptions are handled by <b>Stripe</b>. We do not receive or store your full card
details; we store only your <b>subscription status</b> to unlock premium features. Applicable
EU VAT is charged at checkout.</p>
<h3>7. Retention</h3>
<p>Account + progress: while your account exists, then deleted/anonymised within 90 days of
deletion. Payment records: as required by tax law. Guest/local data: until you clear it.</p>
<h3>8. Your rights</h3>
<p>You may access, rectify, erase, restrict, port, and object to processing of your data.
Contact <a href="mailto:${LEGAL_EMAIL}">${LEGAL_EMAIL}</a>. You can complain to a supervisory
authority — in Switzerland the FDPIC; in the EU, your national data protection authority.</p>
<h3>9. Children</h3>
<p>The Game is not directed at children under 16. If you are under 16, do not sign in or
subscribe without a parent/guardian.</p>
<h3>10. Changes</h3>
<p>We may update this policy; the effective date shows the latest version and material changes
are announced in-app.</p>
`;

export const TERMS_HTML = `
<p class="legal-meta"><b>Effective date:</b> ${LEGAL_DATE}<br>
<b>Provider:</b> ${provider}<br>
<b>Contact:</b> <a href="mailto:${LEGAL_EMAIL}">${LEGAL_EMAIL}</a></p>
<p>By using <em>One in a Million</em> you agree to these Terms. If you do not agree, do not use the Game.</p>
<h3>1. The service</h3>
<p>A free-to-play arcade game on web and mobile, with optional paid subscriptions / premium
features. We may change, suspend or discontinue features at any time and do not guarantee
uninterrupted service.</p>
<h3>2. Accounts</h3>
<ul>
  <li>Guest play needs no account; guest progress is stored on your device and may be lost if you clear data or switch devices.</li>
  <li>Sign in (Google or email link) to save progress across devices; keep your sign-in method secure.</li>
  <li>Provide accurate information; don’t impersonate others; display names/content must be lawful and non-infringing.</li>
  <li>You must be at least <b>16</b>, or have parental/guardian consent.</li>
</ul>
<h3>3. Acceptable use</h3>
<p>Don’t cheat or manipulate scores/multiplayer, disrupt or attack the service, reverse-engineer
except as permitted by law, use bots, or use the Game unlawfully. We may suspend or terminate
accounts that breach these Terms.</p>
<h3>4. Virtual items</h3>
<p>Coins, gems, cosmetics and levels have <b>no monetary value</b>, cannot be exchanged for cash,
and are licensed for in-game use only. We may adjust, expire or remove them.</p>
<h3>5. Subscriptions, billing &amp; refunds</h3>
<ul>
  <li>Premium may be offered as a <b>subscription</b> billed via <b>Stripe</b> on the web. Prices, features and billing cycle are shown at purchase; VAT/taxes may be added.</li>
  <li>Subscriptions <b>renew automatically</b> until cancelled; you can cancel any time and keep access until the end of the paid period.</li>
  <li><b>EU right of withdrawal:</b> for digital services you normally have 14 days to withdraw, unless you request immediate access and acknowledge you lose that right once performance begins. Starting a subscription counts as that request.</li>
  <li>If in-app purchases are ever offered on Android/iOS, those are billed by the app store under its terms and refund policy.</li>
  <li>Except where required by law, payments are non-refundable once the service is provided.</li>
</ul>
<h3>6. Intellectual property</h3>
<p>The Game, its code, art, characters and branding are owned by us or our licensors. We grant
you a personal, non-exclusive, non-transferable, revocable licence to play for your own
entertainment. You keep rights in content you create (e.g. your “My Face” photo, which stays on
your device); you grant us only the limited rights needed to run features you use.</p>
<h3>7. Multiplayer conduct</h3>
<p>Display names and in-game presence are visible to other players. Don’t submit illegal,
harassing, hateful or infringing content. We may remove content or restrict access to keep the
Game safe.</p>
<h3>8. Disclaimers</h3>
<p>The Game is provided “as is” and “as available”, without warranties to the extent permitted by
law. Nothing here limits your mandatory consumer rights.</p>
<h3>9. Limitation of liability</h3>
<p>To the maximum extent permitted by law, we are not liable for indirect, incidental or
consequential damages, or loss of data/progress. Our total liability for any claim is limited to
the amount you paid in the 12 months before the claim. Mandatory laws are unaffected.</p>
<h3>10. Termination</h3>
<p>You may stop using the Game and delete your account at any time. We may suspend or terminate
access for breach or where required by law.</p>
<h3>11. Governing law</h3>
<p>These Terms are governed by <b>Swiss law</b>, without prejudice to mandatory consumer
protections where you live. EU consumers may also use the EU ODR platform:
<a href="https://ec.europa.eu/consumers/odr" target="_blank" rel="noopener">ec.europa.eu/consumers/odr</a>.</p>
`;

export const IMPRINT_HTML = `
<p class="legal-meta"><b>Service provider</b><br>
${LEGAL_NAME} — private individual<br>
${LEGAL_ADDRESS}</p>
<p><b>Contact:</b> <a href="mailto:${LEGAL_EMAIL}">${LEGAL_EMAIL}</a></p>
<p><b>Responsible for content:</b> ${LEGAL_NAME}</p>
<p><b>VAT / tax:</b> Sales of digital subscriptions to EU consumers are subject to EU VAT,
collected at checkout via Stripe.</p>
<p><b>Online dispute resolution (EU consumers):</b>
<a href="https://ec.europa.eu/consumers/odr" target="_blank" rel="noopener">ec.europa.eu/consumers/odr</a></p>
`;

export const LEGAL_DOCS = {
  terms:   { title: 'Terms of Service', html: TERMS_HTML },
  privacy: { title: 'Privacy Policy',   html: PRIVACY_HTML },
  imprint: { title: 'Imprint',          html: IMPRINT_HTML },
} as const;

export type LegalDocId = keyof typeof LEGAL_DOCS;
