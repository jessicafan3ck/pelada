/**
 * Post-to-social helpers.
 *
 * On a phone we deep-link straight into the native composer (the real demo
 * flow — Instagram's story camera opens instantly); on desktop we fall back to
 * the web uploader.
 */
const isMobile = () => /iphone|ipad|ipod|android/i.test(navigator.userAgent);

/** TikTok: web uploader (desktop-friendly, what the laptop demo uses). */
export function openTikTok(): void {
  window.open('https://www.tiktok.com/upload', '_blank');
}

/** Instagram: straight to the Story camera on a phone, instagram.com otherwise. */
export function openInstagramStory(): void {
  if (isMobile()) {
    window.location.href = 'instagram://story-camera';
  } else {
    window.open('https://www.instagram.com/', '_blank');
  }
}
