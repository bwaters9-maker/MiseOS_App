/**
 * src/lib/appParams.ts
 * Single source of truth for the app's own product-brand strings —
 * distinct from RestaurantProfile.name, which is the chef's restaurant
 * identity and belongs to guest-facing surfaces like GuestMenuPreview.
 */

export const APP_NAME = 'IncendiumPhi';
export const APP_TAGLINE = 'Culinary Chaos Decoded.';
export const APP_SHORT_DESC = 'Back of House System';

// The two-tone wordmark lockup (AppHeader.tsx, SignIn.tsx) splits APP_NAME
// into a saffron-accented half and a navy base half. These two constants
// concatenate back to APP_NAME — keep them in sync if the name ever changes.
export const APP_NAME_ACCENT = 'Incendium';
export const APP_NAME_BASE = 'Phi';
