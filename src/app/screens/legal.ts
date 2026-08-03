/**
 * Terms / Privacy / Imprint as a scrollable in-app overlay. Content is static
 * user-facing copy from legalContent.ts (kept in sync with docs/legal/*.md).
 */
import { LEGAL_DOCS, type LegalDocId } from './legalContent';

export function openLegal(which: LegalDocId): void {
  const doc = LEGAL_DOCS[which];
  if (!doc) return;
  const root = document.createElement('div');
  root.className = 'settings-overlay legal-overlay';
  root.innerHTML = `
    <div class="settings-sheet legal-sheet" role="dialog" aria-label="${doc.title}">
      <h2>${doc.title}</h2>
      <div class="legal-body">${doc.html}</div>
      <button class="settings-close" data-act="close">Close</button>
    </div>`;
  root.addEventListener('click', (e) => {
    const el = e.target as HTMLElement;
    if (el === root || el.closest('[data-act="close"]')) root.remove();
  });
  document.body.appendChild(root);
}
