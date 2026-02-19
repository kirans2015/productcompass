

# Fix: Delete OAuth Tokens on Sign-Out

## Problem
When signing out and back in, old Google API tokens remain in the database, so the Dashboard finds them and skips the consent popup.

## Two changes needed

### 1. Database: Add DELETE policy on `oauth_tokens`
Currently users cannot delete their own rows from this table (no RLS DELETE policy exists). A migration is needed:

```sql
CREATE POLICY "Users can delete their own tokens"
  ON public.oauth_tokens
  FOR DELETE
  USING (auth.uid() = user_id);
```

### 2. Code: Update `src/contexts/AuthContext.tsx`
Update the `signOut` function to delete the user's `oauth_tokens` rows and clear local flags before clearing the session:

```typescript
const signOut = async () => {
  // Delete oauth tokens so next sign-in re-triggers consent
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

### No other files need changes
The Dashboard auto-popup logic is already correct -- it just never fires because old tokens are never cleaned up.

