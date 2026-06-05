export type PdfLang = 'en' | 'am';

/**
 * Imperative dialog that asks the user whether to download the PDF in English
 * or Amharic. Resolves with the chosen language or `null` if cancelled.
 * Uses vanilla DOM so it can be called from any handler without React context.
 */
export const pickPdfLanguage = (defaultLang: PdfLang = 'en'): Promise<PdfLang | null> =>
  new Promise((resolve) => {
    const overlay = document.createElement('div');
    overlay.className =
      'fixed inset-0 z-[9999] bg-black/50 flex items-center justify-center p-4 animate-in fade-in';
    overlay.setAttribute('role', 'dialog');
    overlay.setAttribute('aria-modal', 'true');
    overlay.innerHTML = `
      <div class="bg-card rounded-lg shadow-xl border border-border w-full max-w-sm p-6 space-y-5">
        <div class="space-y-1 text-center">
          <h2 class="text-lg font-semibold text-foreground">Choose PDF language</h2>
          <p class="text-sm text-muted-foreground">የፒዲኤፍ ቋንቋ ይምረጡ</p>
        </div>
        <div class="grid grid-cols-2 gap-3">
          <button type="button" data-lang="en"
            class="px-4 py-3 rounded-md border ${defaultLang === 'en' ? 'border-primary bg-primary text-primary-foreground' : 'border-border bg-background text-foreground hover:bg-muted'} font-medium text-sm transition">
            English
          </button>
          <button type="button" data-lang="am"
            class="px-4 py-3 rounded-md border ${defaultLang === 'am' ? 'border-primary bg-primary text-primary-foreground' : 'border-border bg-background text-foreground hover:bg-muted'} font-medium text-sm transition">
            አማርኛ
          </button>
        </div>
        <button type="button" data-lang="cancel"
          class="w-full text-xs text-muted-foreground hover:text-foreground">
          Cancel / ሰርዝ
        </button>
      </div>
    `;

    const cleanup = (val: PdfLang | null) => {
      document.removeEventListener('keydown', onKey);
      overlay.remove();
      resolve(val);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') cleanup(null);
    };

    overlay.addEventListener('click', (e) => {
      const target = e.target as HTMLElement;
      if (target === overlay) {
        cleanup(null);
        return;
      }
      const btn = target.closest('[data-lang]') as HTMLElement | null;
      if (!btn) return;
      const v = btn.getAttribute('data-lang');
      if (v === 'en' || v === 'am') cleanup(v);
      else cleanup(null);
    });

    document.addEventListener('keydown', onKey);
    document.body.appendChild(overlay);
  });