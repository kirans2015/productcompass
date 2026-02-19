

# Fix: Delete OAuth tokens on sign-out

## Problem
When you sign out and sign back in, the old Google API tokens remain in the `oauth_tokens` table. The Dashboard checks this table, finds existing tokens, and skips the consent popup -- even though those tokens may be stale or belong to a previous session.

## Solution
Delete the user's `oauth_tokens` rows during sign-out, and also clear the local `pm-compass-indexed` flag so document indexing re-runs on the next sign-in.

## Changes

### `src/contexts/AuthContext.tsx` (signOut function, ~line 51-66)
- Before clearing the session, delete the user's rows from `oauth_tokens` using `supabase.from("oauth_tokens").delete().eq("user_id", user.id)`
- Also remove `localStorage` items: `pm-compass-indexed` and `pm-compass-recent-searches`

### No other files need changes
The Dashboard auto-popup logic is correct -- it just never fires because old tokens are never cleaned up.

## Technical details

Updated `signOut` function (in `AuthContext.tsx`):

```typescript
const signOut = async () => {
  // Delete user's oauth tokens so next sign-in re-triggers consent
  if (user?.id) {
    supabase.from("oauth_tokens").delete().eq("user_id", user.id).then(() => {});
  }

  setUser(null);
  setSession(null);

  supabase.auth.signOut({ scope: 'local' }).catch(() => {});

  // Clear local flags
  localStorage.removeItem("pm-compass-indexed");
  localStorage.removeItem("pm-compass-recent-searches");

  const keys = Object.keys(localStorage);
  keys.forEach(key => {
    if (key.startsWith('sb-')) {
      localStorage.removeItem(key);
    }
  });
};
```

