
# Fix: Replace Popup With Full-Page Redirect for Google API Tokens

## Problem
After signing out and back in, only the first Google authorization (Lovable app) appears. The second one (Google API token consent) never shows because it uses a popup (`acquireGoogleTokensPopup`) which browsers silently block -- especially right after a redirect.

## Solution
Replace the popup with a full-page redirect using the existing `startGoogleTokenRedirect()` function. This makes the second consent feel like a seamless continuation of sign-in.

## Changes

### `src/pages/Dashboard.tsx`
- Change the import from `acquireGoogleTokensPopup` to `startGoogleTokenRedirect`
- In the auto-trigger `useEffect` (lines 88-98), replace the popup call with a redirect:

```typescript
if (!hasTokens && !autoPopupTriggered.current) {
  autoPopupTriggered.current = true;
  try {
    await startGoogleTokenRedirect();
    return; // page is navigating away
  } catch (err) {
    console.error("[Dashboard] Auto Google redirect failed:", err);
  }
}
```

- Keep the manual "Connect Google" banner button using `acquireGoogleTokensPopup` as a fallback (for users who return to dashboard later)
- Update the import line to include both `startGoogleTokenRedirect` and `acquireGoogleTokensPopup`

### No other files need changes
`startGoogleTokenRedirect()` and `AuthCallback.tsx` already handle the full-page redirect flow and token exchange correctly.
