

# Auto-trigger Google Consent Popup on Dashboard Load

## What changes
When a user lands on the Dashboard after signing in, the app will automatically check the database for Google API tokens. If none exist, it immediately opens the Google consent popup -- no button click required, no sessionStorage flags.

## Changes

### 1. `src/pages/Dashboard.tsx` -- Simplify the token-check effect (lines 76-97)

Replace the current token-check `useEffect` with simpler logic:
- Query `oauth_tokens` for a row with `provider = "google"`
- If no tokens found, immediately call `acquireGoogleTokensPopup()`
- If the popup succeeds, set `hasGoogleTokens(true)` and show a success toast
- Remove all `sessionStorage` flag checks (`google_tokens_pending`)
- Add a `useRef` guard to prevent double-triggering from React strict mode

### 2. `src/lib/google-auth.ts` -- Clean up `signInWithGoogle` (lines 21-48)

- Remove the `sessionStorage.setItem("google_tokens_pending", "true")` line and its cleanup in error paths
- Keep the function focused on just calling `lovable.auth.signInWithOAuth`

### 3. Keep existing fallback

The "Connect Google" banner stays as-is for cases where the popup is blocked by the browser.

## Flow after changes

```text
User signs in (one popup) --> Lands on /dashboard
  --> useEffect checks oauth_tokens table
  --> No tokens found --> auto-opens Google consent popup
  --> User approves --> tokens stored
  --> hasGoogleTokens = true --> calendar sync + indexing begin
```

If the popup is blocked, the banner appears and the user can click "Connect Google" manually.

## Technical notes
- A `useRef` boolean prevents the popup from firing twice (React strict mode runs effects twice in dev)
- No `sessionStorage` flags are used anywhere in the flow
- Files modified: `src/pages/Dashboard.tsx`, `src/lib/google-auth.ts`
- No backend or database changes needed
