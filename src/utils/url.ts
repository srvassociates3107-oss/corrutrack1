/**
 * Returns the public shareable URL for the application so that QR codes,
 * WhatsApp customer tracking links, and mobile PWA installation links
 * work on external phones without hitting AI Studio's private `ais-dev-` 403 Forbidden guard.
 *
 * In AI Studio Cloud Run environments:
 * - `https://ais-dev-...` is the private developer preview container (requires active AI Studio creator session cookie; returns 403 Forbidden on other devices/phones).
 * - `https://ais-pre-...` is the Shared App URL intended for opening on mobile phones, external browsers, or customer links.
 */
export function getPublicAppOrigin(): string {
  if (typeof window === 'undefined') return '';
  const origin = window.location.origin;
  // Automatically convert private `ais-dev-` preview origin to the public/shared `ais-pre-` origin
  if (origin.includes('://ais-dev-')) {
    return origin.replace('://ais-dev-', '://ais-pre-');
  }
  return origin;
}

export function getPrivateDevAppOrigin(): string {
  if (typeof window === 'undefined') return '';
  return window.location.origin;
}

export function isAiStudioDevOrigin(): boolean {
  if (typeof window === 'undefined') return false;
  return window.location.origin.includes('://ais-dev-');
}
