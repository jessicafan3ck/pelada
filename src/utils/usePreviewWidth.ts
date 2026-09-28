import { useEffect, useState } from 'react';

/**
 * Card-preview width that fits the viewport on phones and caps at `max` on
 * desktop. The 9:16 previews are rendered at a fixed px width, so without this
 * they overflow a ~390px screen.
 */
export function usePreviewWidth(max: number, gutter = 48): number {
  const calc = () => (typeof window === 'undefined' ? max : Math.min(max, window.innerWidth - gutter));
  const [w, setW] = useState<number>(calc);
  useEffect(() => {
    const onResize = () => setW(calc());
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [max, gutter]);
  return Math.max(220, w);
}
