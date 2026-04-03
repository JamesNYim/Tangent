# ADR: Use SQLAlchemy Instead of Raw psycopg2

## Status
Accepted

## Context
The backend needs a consistent way to interact with PostgreSQL for entities such as users, conversations, and messages.

We considered:
- raw `psycopg2`
- SQLAlchemy

Raw `psycopg2` requires manual handling of connections, cursors, SQL strings, transactions, and row mapping. This is explicit, but can become repetitive and harder to maintain as the codebase grows.

SQLAlchemy provides a structured way to define models, manage sessions, and perform database operations in a way that fits well with FastAPI.

## Decision
We will use SQLAlchemy for application database access instead of raw `psycopg2`.

## Rationale
- Keeps database code more organized as the project grows
- Maps application concepts like `User`, `Conversation`, and `Message` directly to Python models
- Integrates cleanly with FastAPI request-based dependency patterns
- Reduces repeated connection, cursor, and query boilerplate
- Makes relationships between tables easier to model and work with
- Provides a better long-term foundation for migrations and future complexity

## Consequences

### Positive
- Cleaner and more maintainable database code
- Easier to scale beyond a few simple queries
- Better structure for related data and reusable patterns

### Negative
- Adds abstraction and ORM concepts to learn
- Makes some database behavior less explicit than raw SQL
- Still requires understanding SQL for debugging and performance

## Alternatives Considered

### Raw psycopg2
Pros:
- More explicit
- Good for learning SQL and low-level database mechanics
- Direct control over queries and transactions

Cons:
- More boilerplate
- Harder to maintain as the application grows
- Relationships and repeated CRUD logic become more cumbersome

## Notes
SQLAlchemy is an organizational and productivity choice, not a replacement for SQL knowledge.
