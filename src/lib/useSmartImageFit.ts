// src/lib/useSmartImageFit.ts
import { useEffect } from 'react';

/**
 * Detects portrait/tall images rendering inside wide, fixed-aspect
 * containers (hero slides, story cards, voting carousels, etc.) and
 * switches them from cover->contain with a blurred backdrop fill,
 * instead of an aggressive crop. Works on every <img> in the document,
 * including ones added after mount (modals, carousels), no markup
 * changes required.
 */
export function useSmartImageFit() {
  useEffect(() => {
    const seen = new WeakSet<HTMLImageElement>();

    function process(img: HTMLImageElement) {
      if (seen.has(img) || !img.naturalWidth || !img.naturalHeight) return;
      seen.add(img);

      const box = img.parentElement;
      if (!box) return;
      const boxRatio = box.clientWidth / box.clientHeight;
      const imgRatio = img.naturalWidth / img.naturalHeight;

      // Only intervene when a portrait-ish image is forced into a
      // notably wider box (the "9x16 in a 16x9 slot" case).
      const isPortraitish = imgRatio < 0.85;
      const boxIsWide = boxRatio > 1.15;

      if (isPortraitish && boxIsWide) {
        img.dataset.fit = 'contain';

        // Blurred backdrop using the same image, positioned behind it,
        // so letterboxing doesn't look like dead space.
        if (!box.querySelector(':scope > .smart-fit-bg') && getComputedStyle(box).position !== 'static') {
          const bg = document.createElement('div');
          bg.className = 'smart-fit-bg';
          bg.style.cssText = `
            position:absolute; inset:0; z-index:0;
            background-image:url('${img.currentSrc || img.src}');
            background-size:cover; background-position:center;
            filter:blur(18px) brightness(.55); transform:scale(1.15);
          `;
          box.insertBefore(bg, img);
          img.style.position = 'relative';
          img.style.zIndex = '1';
        }
      }
    }

    function scan(root: ParentNode) {
      root.querySelectorAll('img').forEach((el) => {
        const img = el as HTMLImageElement;
        if (img.complete) process(img);
        else img.addEventListener('load', () => process(img), { once: true });
      });
    }

    scan(document);

    const mo = new MutationObserver((muts) => {
      muts.forEach((m) =>
        m.addedNodes.forEach((n) => {
          if (n instanceof HTMLImageElement) {
            if (n.complete) process(n);
            else n.addEventListener('load', () => process(n), { once: true });
          } else if (n instanceof HTMLElement) {
            scan(n);
          }
        })
      );
    });
    mo.observe(document.body, { childList: true, subtree: true });

    return () => mo.disconnect();
  }, []);
}