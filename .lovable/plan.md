
# Fix Auth Redirect Flow

## Problem
After Google sign-in, users are redirected back to the landing page instead of the dashboard. There are also no route guards to protect authenticated/unauthenticated routes.

## Root Cause
The `AuthCallback` page calls `supabase.auth.getSession()` immediately, but the OAuth session may not be fully established yet from the hash fragment. Additionally, no components enforce route protection.

## Plan

### 1. Create a `ProtectedRoute` component
A wrapper that checks auth state and redirects unauthenticated users to `/`.

**New file: `src/components/ProtectedRoute.tsx`**
- Uses `useAuth()` to check `user` and `loading`
- While loading, shows a spinner
- If no user, redirects to `/`
- Otherwise, renders children

### 2. Create a `PublicRoute` component (for Landing page)
A wrapper that redirects authenticated users to `/dashboard`.

**New file: `src/components/PublicRoute.tsx`**
- Uses `useAuth()` to check `user` and `loading`
- While loading, shows a spinner
- If user exists, redirects to `/dashboard`
- Otherwise, renders children

### 3. Fix `AuthCallback.tsx`
The current implementation may check `getSession()` before the OAuth hash is processed. Fix it to:
- Listen for the `onAuthStateChange` event instead of polling `getSession()`
- Navigate to `/dashboard` on `SIGNED_IN` event
- Add a timeout fallback to redirect to `/` if no session after a few seconds

### 4. Update `App.tsx` routes
- Wrap `/` (Landing) with `PublicRoute`
- Wrap `/dashboard`, `/search`, `/meeting-prep/:meetingId`, `/settings` with `ProtectedRoute`
- Leave `/onboarding`, `/auth/callback`, and `*` unwrapped

### 5. Update Landing page
- Add `useAuth` import and redirect logic is handled by `PublicRoute`, so no changes needed in `Landing.tsx` itself.

---

### Technical Details

**ProtectedRoute.tsx:**
```tsx
const { user, loading } = useAuth();
if (loading) return <Loader />;
if (!user) return <Navigate to="/" replace />;
return children;
```

**PublicRoute.tsx:**
```tsx
const { user, loading } = useAuth();
if (loading) return <Loader />;
if (user) return <Navigate to="/dashboard" replace />;
return children;
```

**AuthCallback.tsx fix:**
```tsx
useEffect(() => {
  const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
    if (event === "SIGNED_IN" && session) {
      navigate("/dashboard", { replace: true });
    }
  });
  // Fallback timeout
  const timeout = setTimeout(() => navigate("/", { replace: true }), 5000);
  return () => { subscription.unsubscribe(); clearTimeout(timeout); };
}, [navigate]);
```

### Files Changed
| File | Action |
|------|--------|
| `src/components/ProtectedRoute.tsx` | Create |
| `src/components/PublicRoute.tsx` | Create |
| `src/pages/AuthCallback.tsx` | Modify |
| `src/App.tsx` | Modify |
