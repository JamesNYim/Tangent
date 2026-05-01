# Database Schema

## Overview

Tangent stores conversations as a graph using a relational database.

Instead of storing nested structures, the schema uses **self-referential relationships** to represent message connections.

This allows:
- branching conversations
- efficient storage
- flexible traversal

---

## Core Tables

Tangent uses three main tables:

- `users`
- `conversations`
- `messages`

---

## Users Table

```sql
users (
  id SERIAL PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  hashed_password TEXT NOT NULL,
  created_at TIMESTAMP
)
````

### Purpose

* Stores account information
* Links to conversations

---

## Conversations Table

```sql
conversations (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id),
  title TEXT,
  created_at TIMESTAMP
)
```

### Relationships

* One user → many conversations
* One conversation → many messages

---

## Messages Table

This is the most important table in the system.

```sql
messages (
  id SERIAL PRIMARY KEY,
  conversation_id INTEGER REFERENCES conversations(id),

  parent_msg_id INTEGER REFERENCES messages(id),
  branch_from_message_id INTEGER REFERENCES messages(id),

  branch_from_text TEXT,

  role TEXT,
  content TEXT,

  created_at TIMESTAMP
)
```

---

## Key Fields

### `parent_msg_id`

* Points to the previous message in the path
* Defines the core graph structure

```txt
1 → 2 → 3
```

---

### `branch_from_message_id`

* Indicates where a branch originated
* Used for UI context, not structure

```txt
1 → 2 → 3
      ↘
       4
```

---

### `branch_from_text`

* Stores highlighted text used to create a branch
* Preserves semantic intent

---

## Graph Representation

The database models a **tree using a self-referential foreign key**.

Each message:

* has at most one parent
* can have multiple children

---

### Example Data

```sql
id | parent_msg_id
---|---------------
1  | NULL
2  | 1
3  | 2
4  | 2
```

Graph:

```txt
1 → 2 → 3
      ↘
       4
```

---

## Relationships (SQLAlchemy)

In the backend, this is implemented using self-referential relationships.

### Example

```python
class Message(Base):
    __tablename__ = "messages"

    id = Column(Integer, primary_key=True)

    parent_msg_id = Column(Integer, ForeignKey("messages.id"))
    branch_from_message_id = Column(Integer, ForeignKey("messages.id"))

    parent = relationship(
        "Message",
        remote_side=[id],
        foreign_keys=[parent_msg_id],
        backref="children"
    )
```

---

## Important Issue (From This Project)

### Problem

SQLAlchemy raised:

```txt
Could not determine join condition between parent/child tables
```

---

### Cause

There are **multiple foreign keys referencing the same table**:

* `parent_msg_id`
* `branch_from_message_id`

SQLAlchemy cannot automatically determine which one defines the relationship.

---

### Fix

Explicitly specify `foreign_keys`:

```python
parent = relationship(
    "Message",
    remote_side=[id],
    foreign_keys=[parent_msg_id]
)
```

---

## Why This Schema Works

### 1. Simple Structure

* No separate "branch" table
* No nested JSON structures

Everything is represented through:

* message rows
* parent relationships

---

### 2. Flexible Graph

Supports:

* multiple branches
* nested branches
* unlimited depth

---

### 3. Efficient Storage

Each message stores only:

* its parent
* optional branch metadata

No duplication of conversation paths.

---

## Design Decisions

### 1. Separate Structure vs Context

* `parent_msg_id` → structure
* `branch_from_message_id` → context

This keeps the graph clean while supporting UI needs.

---

### 2. No Explicit Tree Storage

Instead of storing full paths:

* paths are reconstructed dynamically

This avoids:

* data duplication
* complex updates

---

### 3. Allow Nullable Parent

Root messages have:

```sql
parent_msg_id = NULL
```

This allows:

* conversation entry points

---

## Indexing (Recommended)

For performance:

```sql
CREATE INDEX idx_messages_conversation_id ON messages(conversation_id);
CREATE INDEX idx_messages_parent_msg_id ON messages(parent_msg_id);
```

This improves:

* traversal
* lookup speed

---

## Relationship to Other Systems

* **Graph Traversal**
  → uses `parent_msg_id` to reconstruct paths

* **Branching Flow**
  → uses `branch_from_message_id`

* **Frontend State**
  → depends on message relationships

---

## Summary

Tangent’s database schema models conversations as a graph using self-referential relationships.

By storing:

* parent pointers for structure
* branch metadata for context

the system supports complex branching behavior while keeping the schema simple and efficient.

This design enables Tangent to move beyond linear chat into structured exploration of ideas.
