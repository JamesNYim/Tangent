# Message Data Model

## Overview

In Tangent, conversations are not stored as a linear list of messages.  
Instead, each message is a node in a graph (tree-like structure), where relationships between messages define the flow of the conversation.

Each message contains metadata that allows it to:
- continue a conversation
- branch into a new path
- explore what-ifs and compare

---

## Message Structure

Each message object contains the following fields:

```ts
type Message = {
  id: number;
  conversation_id: number;

  parent_msg_id: number | null;
  branch_from_message_id: number | null;
  branch_from_text: string | null;

  role: "user" | "assistant";
  content: string;

  created_at: string;
};
````

---

## Field Breakdown

### `id`

* Unique identifier for the message
* Used to reference the message in relationships

---

### `conversation_id`

* Identifies which conversation this message belongs to
* All messages in a tree share the same `conversation_id`

---

### `parent_msg_id`

* Points to the previous message in the current path
* Defines the primary parent-child relationship

#### Example

```
msg1 → msg2 → msg3
```

* `msg2.parent_msg_id = msg1.id`
* `msg3.parent_msg_id = msg2.id`

This is what allows us to reconstruct a conversation path.

---

### `branch_from_message_id`

* Indicates where a branch originated
* Only set when a message starts a new branch

#### Example

```
msg1 → msg2 → msg3
           ↘
            msg4 (branch)
```

* `msg4.parent_msg_id = msg2.id`
* `msg4.branch_from_message_id = msg2.id`

---

### `branch_from_text`

* Stores optional highlighted text used to create a branch
* Helps preserve context for why the branch was created

#### Example

```md
Highlighted context: "What if we used a different algorithm?"
```

This allows the branch to carry intent beyond just the parent message.

---

### `role`

* Indicates who sent the message

Values:

* `"user"`
* `"assistant"`

---

### `content`

* The actual message text
* Can include:

  * user input
  * AI-generated responses
  * combined context (highlight + input)

---

### `created_at`

* Timestamp of when the message was created
* Used for ordering and rendering

---

## Relationships

Messages form a directed graph using `parent_msg_id`.

### Parent → Children

A single message can have multiple children:

```
msg2
 | \
 |  msg4
 |
msg3
```

This is what creates a **branch point**.

---

### Branch Point Definition

A message is considered a branch point if:

```js
children.length > 1
```

This means multiple paths originate from the same message.

---

## Key Design Decisions

### 1. Use Parent References Instead of Storing Trees

Instead of storing nested structures, each message only stores a reference to its parent.

This allows:

* efficient storage
* flexible traversal
* easy branching

---

### 2. Separate `parent_msg_id` and `branch_from_message_id`

Even though they are often the same for a new branch, they serve different purposes:

* `parent_msg_id` → defines structure
* `branch_from_message_id` → defines intent (where the branch started)

This distinction is important for UI rendering and context.

---

### 3. Linear Paths Are Derived, Not Stored

Conversation “threads” are not explicitly stored.

Instead, they are reconstructed by:

* starting from a leaf node
* walking up via `parent_msg_id`
* reversing the result

---

## Example Message Set

```json
[
  { "id": 1, "parent_msg_id": null },
  { "id": 2, "parent_msg_id": 1 },
  { "id": 3, "parent_msg_id": 2 },
  { "id": 4, "parent_msg_id": 2, "branch_from_message_id": 2 }
]
```

Graph:

```
1 → 2 → 3
      ↘
       4
```

---

## Summary

The message data model is the foundation of Tangent’s branching system.

By storing simple parent relationships and optional branch metadata, we can:

* represent conversations as a graph
* support branching at any point
* reconstruct any path dynamically

This enables Tangent to move beyond linear chat into structured exploration of ideas.

