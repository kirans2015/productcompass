
# Create `index-documents` Edge Function

## Overview
A backend function that fetches a user's Google Drive documents, chunks the text content, generates OpenAI embeddings, and stores everything in the `document_chunks` table for later semantic search.

## How It Works

1. User sends a POST request with their auth token
2. The function looks up the user's Google access token from the database
3. Fetches the 50 most recently modified Google Drive files (Docs, Sheets, Slides, PDFs)
4. For each file (in batches of 5), downloads the text content
5. Splits text into overlapping chunks (~1600 chars each, ~400 char overlap)
6. Generates vector embeddings via OpenAI for each chunk (batched, 20 at a time)
7. Stores chunks in the database, replacing any previous data for that document
8. Returns progress so the app can call again if more documents remain

## Response Format
```json
{
  "processed": 5,
  "remaining": 12,
  "total": 17,
  "status": "in_progress"
}
```

## Error Handling
- Expired Google token returns a 401 error so the app knows to re-authenticate
- If embedding generation fails for a document, it is skipped and processing continues
- PDFs are handled on a best-effort basis

## Technical Details

### New File: `supabase/functions/index-documents/index.ts`

The function will:
- Validate the user's JWT using `supabase.auth.getUser()` (following the existing `store-oauth-tokens` pattern)
- Use a **service role** Supabase client for database writes (to bypass RLS)
- Use the user-scoped client to read `oauth_tokens` (respects RLS)
- Accept an optional `offset` parameter in the request body to support batched processing across multiple calls
- Use `OPENAI_API_KEY` (already configured) for embeddings

### Key implementation details:
- **Chunking**: ~1600 character chunks with ~400 character overlap, document title prepended
- **Embedding batches**: Up to 20 chunks per OpenAI API call
- **Document batches**: 5 documents per function invocation to stay within timeout
- **Upsert strategy**: Delete existing chunks for a document before inserting new ones (within a single document's processing)
- **Google Drive MIME type filter**: `application/vnd.google-apps.document`, `application/vnd.google-apps.spreadsheet`, `application/vnd.google-apps.presentation`, `application/pdf`
- **Export formats**: Docs as `text/plain`, Sheets as `text/csv`, Slides as `text/plain`, PDFs downloaded raw with best-effort text extraction

### Config Update: `supabase/config.toml`
Add the new function entry with `verify_jwt = false` (JWT validated in code).

### Files Changed
| File | Action |
|------|--------|
| `supabase/functions/index-documents/index.ts` | Create |
| `supabase/config.toml` | Modify (add function entry) |
