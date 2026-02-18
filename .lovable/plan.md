

## Remove X Close Button from Feedback Modal

Remove the built-in X (close) button from the `PMModal` component when used in the `FeedbackModal`, keeping only the Cancel button.

### Approach

Since the X button is rendered inside `PMModal` itself (`src/components/ui/pm-modal.tsx`), and other parts of the app may use `PMModal` with the X button, the cleanest approach is to add an optional `showCloseButton` prop (defaulting to `true`) to `PMModal`, and pass `showCloseButton={false}` from `FeedbackModal`.

### Changes

**1. `src/components/ui/pm-modal.tsx`**
- Add optional `showCloseButton?: boolean` prop (default: `true`)
- Conditionally render the X button based on this prop

**2. `src/components/search/FeedbackModal.tsx`**
- Pass `showCloseButton={false}` to `PMModal`

