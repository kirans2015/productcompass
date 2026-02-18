

## Add Document Details Slide-Out Panel

Create a slide-out panel that appears from the right when "View Details" is clicked on a search result card.

### New Component

**`src/components/search/DocumentDetailPanel.tsx`**
- A right-side slide-out panel using the existing `Sheet` component from `@/components/ui/sheet`
- Props: `doc: DocumentResult | null`, `open: boolean`, `onClose: () => void`, `query: string`
- Panel contents from top to bottom:
  1. **Header**: File type icon + document title + close X button (provided by Sheet)
  2. **Metadata row**: Match percentage badge (PMBadge), owner name, last edited date, folder location (mock: e.g. "My Drive / Product")
  3. **"Why this matched" section**: Label heading, then 2-3 excerpt cards — each in a light gray rounded card (`bg-muted`) with a small `Quote` icon from lucide-react and a text passage. Excerpts will be mock data added to the `DocumentResult` interface or defined inline per document.
  4. **Footer**: A full-width blue "Open in Google Drive" PMButton with `ExternalLink` icon

### Changes to Existing Files

**`src/pages/Search.tsx`**
- Add `selectedDoc` state (`DocumentResult | null`) to track which document's panel is open
- Wire the "View Details" button's `onClick` to set `selectedDoc` to that document
- Render `DocumentDetailPanel` at the bottom of the component, passing `open={!!selectedDoc}`, `doc={selectedDoc}`, `onClose={() => setSelectedDoc(null)}`, and `query`
- Add mock excerpt data to `mockDocumentResults` (new `excerpts: string[]` field on the interface) so each document has 2-3 relevant passages

### Technical Details

- Uses the existing `Sheet`/`SheetContent` component with `side="right"` for the slide-out behavior and built-in close X button
- Adds `Quote` icon import from `lucide-react`
- Extends `DocumentResult` interface with optional `excerpts` and `folder` fields
- No new dependencies required

