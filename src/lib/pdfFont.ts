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
  const res = await fetch(FONT_URL);
  if (!res.ok) throw new Error(`Failed to fetch Amharic font (${res.status})`);
  const buf = await res.arrayBuffer();
  return arrayBufferToBase64(buf);
};

/**
 * Lazily downloads and registers the Noto Sans Ethiopic font on the given jsPDF
 * document so Amharic glyphs render correctly. The downloaded bytes are cached
 * across calls; only the per-document registration is repeated.
 */
export const ensureEthiopicFont = async (doc: jsPDF): Promise<void> => {
  if (!fontBase64Promise) fontBase64Promise = loadBase64();
  const b64 = await fontBase64Promise;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const d = doc as any;
  d.addFileToVFS(`${ETHIOPIC_FONT}.ttf`, b64);
  d.addFont(`${ETHIOPIC_FONT}.ttf`, ETHIOPIC_FONT, 'normal');
};