import { createRoot, type Root } from 'react-dom/client';
import { useEffect, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

export type PdfLang = 'en' | 'am';

interface PickerProps {
  defaultLang: PdfLang;
  onResolve: (val: PdfLang | null) => void;
}

const PdfLanguagePicker = ({ defaultLang, onResolve }: PickerProps) => {
  const [open, setOpen] = useState(true);
  const [picked, setPicked] = useState<PdfLang | null>(null);

  const choose = (val: PdfLang | null) => {
    setPicked(val);
    setOpen(false);
  };

  // Resolve after exit animation so the dialog can unmount cleanly.
  useEffect(() => {
    if (open) return;
    const id = window.setTimeout(() => onResolve(picked), 150);
    return () => window.clearTimeout(id);
  }, [open, picked, onResolve]);

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) choose(null); }}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="text-center">Choose PDF language</DialogTitle>
          <DialogDescription className="text-center">የፒዲኤፍ ቋንቋ ይምረጡ</DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-3 pt-2">
          <Button
            type="button"
            variant={defaultLang === 'en' ? 'default' : 'outline'}
            onClick={() => choose('en')}
          >
            English
          </Button>
          <Button
            type="button"
            variant={defaultLang === 'am' ? 'default' : 'outline'}
            onClick={() => choose('am')}
          >
            አማርኛ
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

/**
 * Imperative API that mounts a shadcn Dialog asking the user whether to
 * download the PDF in English or Amharic. Resolves with the chosen language
 * or `null` if cancelled. Safe to call from any event handler.
 */
export const pickPdfLanguage = (defaultLang: PdfLang = 'en'): Promise<PdfLang | null> =>
  new Promise((resolve) => {
    if (typeof window === 'undefined') return resolve(null);
    const host = document.createElement('div');
    document.body.appendChild(host);
    let root: Root | null = createRoot(host);

    const cleanup = (val: PdfLang | null) => {
      resolve(val);
      // Unmount on a microtask break so React finishes the close transition.
      window.setTimeout(() => {
        try { root?.unmount(); } catch { /* ignore */ }
        root = null;
        host.remove();
      }, 50);
    };

    root.render(<PdfLanguagePicker defaultLang={defaultLang} onResolve={cleanup} />);
  });