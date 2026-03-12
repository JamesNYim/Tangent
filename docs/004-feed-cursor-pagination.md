# ADR-004: Use `id` as Feed Sort Key and Pagination Cursor (Instead of `created_at`)

Date: 2026-02-26  

## Context

TheFeed needs a Home feed that:
- Loads posts in pages (infinite scroll / "load more")
- Can check for newer posts (polling now; possible SSE/WebSocket later)
- Avoids duplicate/skip issues while new posts are inserted

A common approach is cursor pagination using `(created_at, id)` as the stable ordering key. However, this requires:
- Tuple comparisons in SQL
- Encoding/decoding an opaque cursor token containing multiple values
- More complex backend response models and client logic

At the current stage of TheFeed, the priority is building a correct end-to-end feed quickly while keeping implementation complexity low and learning the fundamentals.

## Decision

We will sort posts by **descending `id`** and use **`id` as the cursor** for pagination and live updates.

- Feed page (older posts):
  - `GET /posts?limit=20&cursor=<last_seen_id>`
  - SQL: `WHERE p.id < :cursor_id ORDER BY p.id DESC LIMIT :limit`

- New posts since newest (polling):
  - `GET /posts/latest?since_id=<newest_id>`
  - SQL: `WHERE p.id > :since_id ORDER BY p.id DESC LIMIT :limit`

We will treat `id` as the timeline ordering key.

## Rationale

### Simplicity and learning value
- Using only `id` avoids cursor token encoding/decoding logic.
- SQL is simpler and easier to reason about during early development.
- Keeps the API contract small and easy to debug (cursor is just an integer).

### Correctness for current constraints
- TheFeed currently uses a single Postgres database with auto-increment integer IDs.
- New posts are created via normal inserts and `id` increases monotonically.
- Under these constraints, `id DESC` is a reliable proxy for “newest first”.

### Faster path to a working live feed
- Polling for new posts becomes straightforward with `since_id`.
- Infinite scroll becomes straightforward with `cursor_id`.

## Consequences

### Positive
- Minimal backend changes required compared to `(created_at, id)` cursors.
- Easier debugging (cursor values are human-readable).
- Less risk of implementation mistakes during early iteration.

### Negative / Tradeoffs
- `id` ordering assumes "higher id == newer post". This is true for our current setup but may not hold if:
  - We backfill/import old posts later (new inserts with old `created_at`)
  - We change ID generation (UUIDs, distributed IDs, sharding)
  - We introduce different feed ranking (e.g., "top", "recommended")

- Sorting by `created_at` is more semantically correct and flexible long-term.
- If we ever need strict chronological ordering independent of insert order, we must migrate.

## Alternatives Considered

1. **Sort by `created_at` and paginate using `(created_at, id)`**
   - Pros: Most robust; stable under backfills; aligns with chronological time; supports different ID strategies.
   - Cons: More complex cursor handling (token encoding/decoding), more complex SQL, more complexity for an early-stage learning project.

2. **Sort by `created_at` only**
   - Pros: Conceptually simple.
   - Cons: Unsafe when multiple posts share the same timestamp; can cause duplicates/missed posts without a tie-breaker (usually `id`).

3. **Offset pagination**
   - Pros: Easiest to implement.
   - Cons: Can duplicate/skip items when new posts arrive; slower at large offsets.

## Implementation Notes

- Ensure the feed query uses:
  - `ORDER BY p.id DESC`
- Add an index if needed (usually primary key already covers this):
  - `p.id` is indexed as the primary key by default.

## Future Improvement

If/when TheFeed needs:
- backfills/imports,
- strict time semantics,
- or non-chronological ranking,

we will migrate the feed ordering and cursors to `(created_at, id)` with cursor tokens and tuple comparisons:
- `ORDER BY p.created_at DESC, p.id DESC`
- older: `WHERE (p.created_at, p.id) < (:cursor_created_at, :cursor_id)`
- newer: `WHERE (p.created_at, p.id) > (:since_created_at, :since_id)`
