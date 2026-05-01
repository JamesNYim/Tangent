# Branching Conversation Flow

## Overview

Branching is the core interaction in Tangent.

It allows users to take any message in a conversation and explore an alternative direction without losing the original path.

This document describes the full lifecycle of a branch:
- how it is created
- how it is stored
- how it is rendered
- how users interact with it

---

## What is a Branch?

A branch is a new conversation path that originates from an existing message.

```
1 → 2 → 3 → 4
        ↘
         5 → 6
````

* `5` is the start of a branch
* `3` is the branch point

---

## Branch Creation Flow

### Step 1: User Action

A branch can be created by:

* Clicking a "branch" button on a message
* Highlighting text within a message and branching from it

---

### Step 2: Frontend State Setup

When a branch is initiated, the frontend sets up a `branchPanel` state:

```
setBranchPanel({
  trunkLeafId: mainLeafId,
  branchLeafId: message.id,
  branchPointId: message.id,
  input: "",
  branchFromText: selectedText,
  hasStarted: false,
});
```

---

### Key Fields

* `branchPointId` → where the branch originates
* `branchLeafId` → current position in the branch
* `trunkLeafId` → reference to the main conversation
* `branchFromText` → optional highlighted context

---

## Step 3: Sending the First Branch Message

When the user submits input:

```js id="7xk1pe"
POST /conversations/:id/messages
```

Request body:

```
{
  "content": "...",
  "parent_msg_id": branchLeafId,
  "branch_from_message_id": branchPointId,
  "branch_from_text": branchFromText
}
```

---

### Important Behavior

* `parent_msg_id` determines structure
* `branch_from_message_id` records where the branch started
* `branch_from_text` preserves context

---

## Step 4: Backend Processing

The backend:

1. Creates a user message
2. Sends content to the AI model
3. Creates an AI response message
4. Stores both messages in the database

Both messages are linked using:

```
parent_msg_id
```

---

## Step 5: Frontend State Update

After receiving the response:

```
setMessages((prev) => [
  ...prev,
  data.user_message,
  data.ai_message,
]);

setBranchPanel((prev) => ({
  ...prev,
  branchLeafId: data.ai_message.id,
  input: "",
  hasStarted: true,
}));
```

---

## Step 6: Rendering the Branch

To display the branch:

1. Use `branchLeafId`
2. Call `getPathToRoot(messages, branchLeafId)`
3. Render the resulting path

This produces a linear view of the branch.

---

## Opening an Existing Branch

When a user clicks an existing branch:

### Step 1: Identify the Branch Child

Using `childrenMap`:

```
const children = childrenMap.get(message.id);
```

---

### Step 2: Find the Latest Leaf

```
const leafId = findLatestBranchLeaf(childId, childrenMap);
```

---

### Step 3: Set Branch State

```
setBranchPanel({
  trunkLeafId: currentLeafId,
  branchLeafId: leafId,
  branchPointId: message.id,
  input: "",
  branchFromText: null,
  hasStarted: true,
});
```

---

### Result

The UI now shows:

* the main conversation (trunk)
* the selected branch (tangent)

---

## Branching from a Branch

Tangent supports nested branching.

```
1 → 2 → 3
      ↘ 4 → 5
            ↘ 6 → 7
```

Each new branch:

* behaves exactly the same
* uses the current message as the new branch point

No special logic is required—this naturally emerges from the graph structure.

---

## Dual-Focus Rendering

When a branch is open, the UI renders:

### Left Panel (Trunk)

```
getPathToRoot(messages, trunkLeafId)
```

---

### Right Panel (Branch)

```
getPathToRoot(messages, branchLeafId)
```

---

This allows users to compare:

* original conversation
* alternative direction

---

## Key Design Decisions

### 1. Branches Are Not Separate Conversations

Branches remain part of the same conversation graph.

This allows:

* shared context
* easy navigation
* consistent history

---

### 2. Branch State Is UI-Driven

The backend does not track "active branches."

Instead:

* the frontend controls which path is visible
* the graph remains the source of truth

---

### 3. First Message Defines the Branch

A branch is not a special object.

It is simply:

* a message whose `branch_from_message_id` is set

Everything else follows from graph traversal.

---

## Common Edge Cases

### Branch with No Messages Yet

* Occurs when user opens a branch but hasn’t sent input
* UI must still render the branch panel

---

### Reopening a Branch

* Must find the latest leaf
* Not just the first child

---

### Branching from Highlighted Text

* `branch_from_text` must be preserved
* Should not be lost after first message

---

## Summary

Branching in Tangent is a combination of:

* user interaction (click / highlight)
* frontend state (`branchPanel`)
* backend message creation
* graph traversal

This system allows users to:

* explore alternative ideas
* compare different approaches
* navigate complex conversations

Branching is not a separate feature—it is the core interaction model of Tangent.

