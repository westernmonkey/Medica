# Medica engineering rules

Read this file before writing or editing code. Keep solutions as small and readable as possible.

## Before implementation

For every requested code change:

1. Describe the visible behavior.
2. Name the trust boundary and untrusted inputs.
3. State the empty, malformed, unavailable, and partial-failure behavior.
4. Identify sensitive data and who may read it.
5. Check that work stays bounded for realistic data sizes.
6. Ask the user: **Should I start now?** Do not edit code until the user approves. A user message that explicitly says to start applies to that implementation only.

If a design choice materially changes behavior, ask one precise question. Otherwise choose the safe, simple default and state it.

## Implementation defaults

- Simple beats clever. Prefer small functions and existing project patterns.
- Validate untrusted values at the boundary. Reject invalid types, formats, lengths, and ranges.
- Never use renderer or browser input directly as a filesystem path, identity, or authorization decision.
- Default to deny when credentials or permissions are missing.
- Keep secrets out of client code and version control.
- Render user data with safe text APIs. Avoid `innerHTML` for untrusted content.
- Surface honest errors. No empty catches or fake success states.
- Treat null, empty, missing, malformed, and unavailable data as normal cases.
- Design multi-step writes so failure does not silently leave corrupt or misleading state.
- Bound retries, list sizes, payload sizes, and per-request work.
- Avoid dead code, speculative abstractions, and comments that merely narrate code.
- Comments should explain a constraint, trust decision, or tradeoff.
- Log diagnostic context without logging private post content, credentials, or tokens.

## Electron and local posts

- The Electron IPC bridge is a trust boundary. Validate IPC payloads in the main process or storage boundary.
- Keep post paths below the configured MedNotes data root.
- Normal deletion is reversible through Trash.
- “Delete forever” must remove every application-managed copy and must never report success after a partial failure.
- Active posts are the source used by the UI and search. Recovery is a synchronized safety copy. Trash is excluded from normal reads and search.
- Tests must use `MEDNOTES_HOME` and must never write into the user’s real post folders.

## Completion checklist

- Happy path works.
- Empty and malformed input is handled.
- Expected failures have specific user-facing states.
- Unexpected failures are surfaced safely.
- Untrusted identifiers cannot escape their allowed boundary.
- Multi-step writes have defined rollback or retry behavior.
- Sensitive data is not logged.
- Relevant unit and real UI tests pass.
- Any remaining shortcut is named explicitly in the final response.

Update this document when the project adopts a new recurring engineering rule or trust boundary.
