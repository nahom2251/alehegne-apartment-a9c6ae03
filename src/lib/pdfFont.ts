import type jsPDF from 'jspdf';

// Noto Sans Ethiopic Regular (covers Amharic glyphs). Hosted on jsDelivr.
const FONT_URL =
  'https://cdn.jsdelivr.net/gh/notofonts/notofonts.github.io@main/fonts/NotoSansEthiopic/unhinted/ttf/NotoSansEthiopic-Regular.ttf';

export const ETHIOPIC_FONT = 'NotoEthiopic';

let fontBase64Promise: Promise<string> | null = null;

const arrayBufferToBase64 = (buf: ArrayBuffer): string => {
  const bytes = new Uint8Array(buf);
  let binary = '';
  const CHUNK = 0x8000;
  for (let i = 0; i < bytes.length; i += CHUNK) {
    binary += String.fromCharCode.apply(
      null,
      Array.from(bytes.subarray(i, i + CHUNK)) as unknown as number[],
    );
  }
  return btoa(binary);
};

const loadBase64 = async (): Promise<string> => {
  const urls = [
    FONT_URL,
    'https://cdn.jsdelivr.net/npm/@fontsource/noto-sans-ethiopic@5.0.0/files/noto-sans-ethiopic-ethiopic-400-normal.woff',
  ];
  let lastErr: unknown = null;
  for (const url of urls) {
    try {
      const res = await fetch(url, { cache: 'force-cache' });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const buf = await res.arrayBuffer();
      return arrayBufferToBase64(buf);
    } catch (e) {
      lastErr = e;
    }
  }
  throw new Error(`Failed to fetch Amharic font: ${String(lastErr)}`);
};

/**
 * Lazily downloads and registers the Noto Sans Ethiopic font on the given jsPDF
 * document so Amharic glyphs render correctly. The downloaded bytes are cached
 * across calls; only the per-document registration is repeated.
 */
export const ensureEthiopicFont = async (doc: jsPDF): Promise<void> => {
  if (!fontBase64Promise) {
    fontBase64Promise = loadBase64().catch((e) => {
      // Don't cache failures — next call retries.
      fontBase64Promise = null;
      throw e;
    });
  }
  const b64 = await fontBase64Promise;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const d = doc as any;
  d.addFileToVFS(`${ETHIOPIC_FONT}.ttf`, b64);
  d.addFont(`${ETHIOPIC_FONT}.ttf`, ETHIOPIC_FONT, 'normal');
};