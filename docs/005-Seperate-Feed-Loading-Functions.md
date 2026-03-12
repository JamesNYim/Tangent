##  ADR-005: Separate feed loading functions (initial load vs load more)
**Date: 2026-03-05**

## Context
TheFeed uses cursor-based pagination for the posts feed.

Backend endpoint:

`GET /posts?limit=<int>&feed_cursor=<int|null>`

Response shape:

`{ feed: Post[], next_cursor: int | null }`

On the frontend, we need to support two actions:

1. Initial feed load / refresh (start from newest posts)

2. Pagination (load older posts and append to the existing list)

Both actions call the same backend endpoint but differ in:

- Whether a feed_cursor is sent
- Whether we replace or append posts in React state
- UI/loading semantics (“Loading…” vs “Loading more…”)

## Decision
We will implement two explicit functions in the Feed component:

`loadFirstPage()` — fetches the newest page and replaces current posts

`loadMore()` — fetches the next page using feed_cursor and appends posts

We choose clarity of intent over a single “generic” loader function.

## Rationale
- Readability / intent: The two operations represent different user actions and state transitions.

- Less conditional branching: Avoids a reset flag and the if (reset) … else … branching inside a generic loader.

- Easier to debug: When something goes wrong (duplicates, missing posts, wrong cursor), it’s immediately clear whether the issue is in initial load or pagination.

- Matches mental model: “Load the feed” and “Load more” are distinct concepts in a feed UI.

## Tradeoffs
- Some code duplication can occur (shared error handling, cursor updates, loading states).

- If more entry points are added later (infinite scroll, pull-to-refresh, retries), we may want to refactor into a shared helper (or a single loadPage function) to reduce duplication.

## Tradeoff Justification
- Code is easier to understand for a learning-focused project.

- Lower cognitive load when reading and modifying the Feed component.

- Clear separation of “replace” vs “append” state updates.

## Implemetation Notes
- Ensure query param name matches the backend: feed_cursor (not cursor).

- Use data.feed for posts and data.next_cursor for pagination.

- `loadFirstPage()` should call `/posts` without `feed_cursor`.

- `loadMore()` should call `/posts?feed_cursor=<next_cursor>` and append results.

## Future Improvement
If the feed grows in complexity (infinite scroll, caching, retries, analytics hooks), consider refactoring:

- shared request logic into a helper (e.g., fetchPage(feed_cursor)), or

- a single generic loader (e.g., loadPage({ reset }))
while keeping call sites clear. ADR-005: Separate feed loading functions (initial load vs load more)

