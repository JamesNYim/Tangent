# Backend API Design

## Overview

Tangent’s backend provides a REST API that supports:

- conversation management
- message creation
- branching logic
- AI response generation

The API is designed around a key idea:

> Conversations are stored as a graph, but exposed as simple endpoints.

---

## Core Principles

### 1. Simple Endpoints, Complex Behavior

The API remains minimal:
- no explicit “branch” endpoints
- no special tree APIs

Branching is handled implicitly through:
- `parent_msg_id`
- `branch_from_message_id`

---

### 2. Stateless Requests

Each request contains all necessary context:
- which conversation
- where in the graph to attach
- optional branch metadata

---

### 3. Backend as Source of Truth

The backend:
- validates relationships
- persists graph structure
- returns authoritative message data

---

## Endpoints

---

## Create Conversation

```http
POST /conversations
````

### Request

```json 
{
  "title": "New Conversation"
}
```

### Response

```json
{
  "id": 1,
  "title": "New Conversation"
}
```

---

## Get Conversations

```http
GET /conversations
```

### Response

```json
[
  { "id": 1, "title": "Chat 1" },
  { "id": 2, "title": "Chat 2" }
]
```

---

## Get Messages

```http
GET /conversations/:id/messages
```

### Response

```json
[
  {
    "id": 1,
    "parent_msg_id": null,
    "content": "Hello"
  },
  {
    "id": 2,
    "parent_msg_id": 1,
    "content": "Hi there"
  }
]
```

---

## Send Message

```http
POST /conversations/:id/messages
```

This is the most important endpoint.

It handles:

* normal message continuation
* branching
* AI response generation

---

## Request Structure

```json
{
  "content": "Explain binary search",
  "parent_msg_id": 2,
  "branch_from_message_id": 2,
  "branch_from_text": "binary search"
}
```

---

## Field Meaning

### `content`

* user input (may include highlighted context)

---

### `parent_msg_id`

* determines where the message attaches in the graph
* defines conversation structure

---

### `branch_from_message_id`

* indicates the origin of the branch
* used for UI context

---

### `branch_from_text`

* optional highlighted text
* preserves semantic intent

---

## Backend Flow

### Step 1: Validate Conversation

* ensure `conversation_id` exists
* ensure `parent_msg_id` is valid (if provided)

---

### Step 2: Create User Message

```txt
User message is inserted into database
```

---

### Step 3: Generate AI Response

* send `content` to AI provider
* receive response text

---

### Step 4: Create AI Message

```txt 
AI message is inserted with:
parent_msg_id = user_message.id
```

---

### Step 5: Return Response

```json 
{
  "user_message": { ... },
  "ai_message": { ... }
}
```

---

## Branching Behavior

Branching is not a separate endpoint.

It is defined by:

```txt 
parent_msg_id + branch_from_message_id
```

---

### Example

```txt 
1 → 2 → 3
      ↘
       4
```

Request:

```json 
{
  "content": "Alternative idea",
  "parent_msg_id": 2,
  "branch_from_message_id": 2
}
```

Result:

* message 4 becomes a new child of message 2
* a branch is created naturally

---

## Why This Design Works

### 1. No Special Branch Logic Needed

The graph structure emerges naturally from:

* parent-child relationships

---

### 2. Flexible and Extensible

Supports:

* multiple branches
* nested branches
* unlimited depth

Without changing API design

---

### 3. Frontend-Driven UI

The backend:

* does not track active paths
* does not manage UI state

It simply:

* stores messages
* returns graph data

---

## Error Handling

### Invalid Parent

```txt 
parent_msg_id does not exist
```

→ return 400

---

### Invalid Conversation

```txt 
conversation_id not found
```

→ return 404

---

### Empty Content

```txt 
content is empty
```

→ return 400

---

## Design Decisions

### 1. Combine User + AI Message in One Request

Instead of:

* separate endpoints

We:

* create both in one call

This ensures:

* consistent pairing
* simpler frontend logic

---

### 2. No Separate Branch Entity

Branches are not stored explicitly.

They are inferred from:

* shared parent nodes

---

### 3. Return Full Message Objects

Frontend receives:

* complete message data
* no need for additional fetch

---

## Relationship to Frontend

Frontend responsibilities:

* decide `parent_msg_id`
* manage `branchPanel`
* render paths via traversal

Backend responsibilities:

* validate structure
* persist data
* generate AI responses

---

## Summary

Tangent’s backend API is intentionally simple:

* minimal endpoints
* no explicit branching APIs
* graph structure encoded in message relationships

This design allows the system to support complex branching behavior without adding complexity to the API.

The result is a flexible, scalable backend that cleanly supports a non-linear conversation model.

