# Highlight → Branch

## Overview

Tangent allows users to create a branch from **specific highlighted text within a message**, not just the message as a whole.

This enables more precise exploration by letting users branch from:
- a specific idea
- a sentence
- a question inside a response

Instead of branching from *“this message”*, users can branch from:
> “this exact part of the message”

---

## Purpose

In traditional chat:

- You can highlight messages for context
- But it then gets lost in the linear conversation

In Tangent:

- Users can isolate a specific piece of context
- Branches can be anchored to that context
- Exploration becomes more targeted

---

## User Flow

### Step 1: Highlight Text

The user selects a portion of text inside a message:

```txt id="ex1a"
AI Response:
"You could use a binary search here, but a hash map might be faster."

User highlights:
"binary search"
````

---

### Step 2: Trigger Branch

User initiates a branch (via button or UI action).

---

### Step 3: Extract Selected Text

Frontend captures the selection:

```js id="d4k8zn"
const selectedText = window.getSelection().toString();
```

---

### Step 4: Normalize Text

To avoid empty or malformed input:

```js id="m7r2pq"
function normalizeSelectedText(text) {
  return text?.trim() || null;
}
```

---

### Step 5: Initialize Branch State

```js id="t9x3df"
setBranchPanel({
  trunkLeafId: mainLeafId ?? message.id,
  branchLeafId: message.id,
  branchPointId: message.id,
  input: "",
  branchFromText: cleanedText,
  hasStarted: false,
});
```

---

## Key Behavior

### `branchFromText`

This is the critical field:

```js id="p1v8zk"
branchFromText: "binary search"
```

It represents:

* the exact context the user is branching from
* the “reason” for the branch

---

## Sending the First Message

When the user sends input in the branch:

### Combined Content

```js id="u6n4ls"
const combinedContent = branchPanel.branchFromText
  ? `Highlighted context: ${branchPanel.branchFromText}\n\nUser input: ${input}`
  : input;
```

---

### API Request

```json id="v3k9bw"
{
  "content": combinedContent,
  "parent_msg_id": branchPanel.branchLeafId,
  "branch_from_message_id": branchPanel.branchPointId,
  "branch_from_text": branchPanel.branchFromText
}
```

---

## Backend Behavior

The backend stores:

* the message content (including highlighted context)
* the `branch_from_text` field
* the graph relationship via `parent_msg_id`

This ensures:

* context is preserved
* the branch remains connected to its origin

---

## UI Rendering

At the top of the branch panel, the highlighted context can be shown:

```txt id="l8q2fw"
Branching from:
"binary search"
```

This helps users remember:

* what they selected
* why the branch exists

---

## Why This Matters

### 1. Precision

Users can branch from:

* a single idea
* not the entire message

---

### 2. Better Exploration

Instead of vague prompts like:

> “Can you explain that?”

Users can ask:

> “What’s the complexity of binary search?”

---

### 3. Context Preservation

The system retains:

* the original message
* the selected portion
* the new branch

---

## Example

```txt id="k5m1az"
Main:
AI: "Use a binary search or hash map"

User highlights: "binary search"

Branch:
User: "Explain time complexity of binary search"
AI: "Binary search runs in O(log n)..."
```

---

## Edge Cases

### Empty Selection

```js id="q4d9yp"
if (!selectedText.trim()) {
  branchFromText = null;
}
```

Falls back to normal branching.

---

### Selection Cleared

If user deselects:

* branch UI should reset
* no lingering context

---

### Multi-line Selection

Handled as a single string:

* may need trimming or formatting

---

## Design Decisions

### 1. Store Highlight Separately

Instead of embedding it only in content:

* `branch_from_text` is stored explicitly
* allows cleaner UI rendering
* avoids parsing later

---

### 2. Combine Context + Input

The first message includes:

* highlighted context
* user input

This ensures:

* the AI has full context
* no ambiguity in prompt

---

### 3. Optional Feature

Highlighting enhances branching but is not required.

Users can still:

* branch normally from any message

---

## Relationship to Other Systems

* **Branching Flow**
  → uses `branchFromText` during creation

* **Branch Window UI**
  → displays highlighted context

* **Graph Structure**
  → unchanged (still uses `parent_msg_id`)

---

## Summary

Highlight-to-branch adds precision to Tangent’s branching system.

By allowing users to branch from specific text, it enables:

* more targeted exploration
* clearer intent
* better AI responses

It turns branching from a structural feature into a semantic one.

