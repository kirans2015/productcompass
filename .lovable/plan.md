

## Add "Usage This Month" Section to Settings

Add a new section after "Indexing Status" displaying usage counts and a beta badge.

### Changes

**`src/pages/Settings.tsx`**
- Insert a new "USAGE THIS MONTH" section after the Indexing Status `<hr>` and before the Account section
- Display "32 searches" and "8 meeting preps" as simple text rows with labels
- Add a `PMBadge` with variant "success" (green pill) showing "Beta — Unlimited access"
- Import `PMBadge` from `@/components/ui/pm-badge`

### Structure

```text
USAGE THIS MONTH
+--------------------------------------+
| Searches              32             |
| Meeting preps          8             |
|                                      |
| [Beta — Unlimited access]  (badge)   |
+--------------------------------------+
```

### Technical Details
- Uses the existing `PMBadge` component with `variant="success"` for the green pill style
- Follows the same card pattern as other Settings sections (`p-4 bg-card border border-border rounded-md`)
- Usage stats displayed as flex rows with label on the left and count on the right, matching the Account section's layout

