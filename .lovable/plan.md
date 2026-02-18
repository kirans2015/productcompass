

# Fix Google Sign-In on Published URL

## Problem
Google sign-in works on the preview URL but fails on the published URL (`https://productcompass.lovable.app`). After the Google OAuth flow completes, users are not being properly redirected or authenticated.

## Root Cause
The `redirect_uri` is set to `window.location.origin + "/auth/callback"`, but the Lovable Cloud auth bridge handles the OAuth callback internally at a special route (`/~oauth`). The `redirect_uri` should point to the page where the user should land **after** authentication is complete -- not a dedicated callback page. Since `PublicRoute` on `/` already redirects authenticated users to `/dashboard`, the simplest fix is to redirect back to `window.location.origin`.

## Changes

### 1. Update `redirect_uri` in Landing.tsx (line 27)
Change `redirect_uri` from `window.location.origin + "/auth/callback"` to `window.location.origin`.

### 2. Update `redirect_uri` in Onboarding.tsx (line 76)
Same change -- use `window.location.origin` instead of `window.location.origin + "/auth/callback"`.

### How It Works After the Fix
1. User clicks "Get Started with Google"
2. Lovable auth bridge handles the Google OAuth flow
3. After success, the browser returns to `window.location.origin` (the landing page)
4. `AuthContext` detects the new session via `onAuthStateChange`
5. `PublicRoute` sees the authenticated user and redirects to `/dashboard`

### Files Changed
| File | Change |
|------|--------|
| `src/pages/Landing.tsx` | Update `redirect_uri` to `window.location.origin` |
| `src/pages/Onboarding.tsx` | Update `redirect_uri` to `window.location.origin` |

