import { useEffect } from 'react';

const FALLBACK_SVG =
  'data:image/svg+xml;charset=UTF-8,' +
  encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 600">' +
      '<rect width="600" height="600" fill="#141414"/>' +
      '<text x="300" y="300" font-family="Georgia,serif" font-size="64" font-weight="700" fill="#C9A84C" text-anchor="middle" dominant-baseline="middle">P&amp;S</text>' +
      '</svg>'
  );

/**
 * Listens for image load failures anywhere in the document (capture phase,
 * since the native `error` event on <img> does not bubble) and swaps the
 * broken image to an inline branded placeholder. Covers images rendered
 * after mount too (modals, lightbox, dynamically added cards), with zero
 * external dependency.
 */
export function useImageFallback() {
  useEffect(() => {
    const handler = (e: Event) => {
      const target = e.target as HTMLElement;
      if (!target || target.tagName !== 'IMG') return;
      const img = target as HTMLImageElement;
      if (img.dataset.fallbackApplied) return;
      img.dataset.fallbackApplied = '1';
      img.src = FALLBACK_SVG;
      img.style.objectFit = 'cover';
    };
    document.addEventListener('error', handler, true);
    return () => document.removeEventListener('error', handler, true);
  }, []);
}
