# Branch Window UI

## Overview

The Branch Window is a secondary chat panel that allows users to explore an alternative conversation path while keeping the original conversation visible.

It is the core UI component that enables **side-by-side comparison of ideas**.

When a branch is opened, the interface shifts from a single chat view to a **dual-focus layout**:

```txt
[ Main Conversation ]   |   [ Branch Conversation ]
````

---

## Purpose

The Branch Window exists to solve a key limitation of traditional AI chat:

> You cannot explore an alternative without losing your current path.

Instead of replacing the current conversation, Tangent allows users to:

* keep the original context visible
* explore a different direction in parallel
* compare outputs and reasoning side-by-side

---

## Layout Structure

The UI is split into two panes:

### Left Pane — Trunk (Main Conversation)

* Displays the original conversation path
* Derived from `trunkLeafId`
* Remains unchanged when exploring branches

---

### Right Pane — Branch (Tangent)

* Displays the active branch path
* Derived from `branchLeafId`
* Updates as the user interacts within the branch

---

## State Model

The Branch Window is controlled by a single state object:

```js
branchPanel = {
  trunkLeafId,
  branchLeafId,
  branchPointId,
  input,
  branchFromText,
  hasStarted
}
```

---

## Field Breakdown

### `trunkLeafId`

* Represents the latest message of the main conversation
* Used to render the left panel

---

### `branchLeafId`

* Represents the latest message of the branch
* Used to render the right panel

---

### `branchPointId`

* The message where the branch originated
* Used for:

  * labeling the branch
  * maintaining context

---

### `branchFromText`

* Optional highlighted text used to start the branch
* Displayed at the top of the branch panel

---

### `hasStarted`

* Indicates whether the branch has messages yet
* Used to conditionally render UI elements

---

## Rendering Logic

### Trunk Path

```js
const trunkMessages = getPathToRoot(messages, trunkLeafId);
```

---

### Branch Path

```js
const branchMessages = getPathToRoot(messages, branchLeafId);
```

---

## Opening a Branch

### Trigger

A branch can be opened by:

* clicking a branch button on a message
* selecting an existing branch from the tree

---

### Behavior

When opening a branch:

1. Identify the branch point (`message.id`)
2. Determine the correct leaf node:

   * if existing → use `findLatestBranchLeaf`
   * if new → use the current message
3. Initialize `branchPanel`

---

### Example

```js
setBranchPanel({
  trunkLeafId: mainLeafId,
  branchLeafId: leafId,
  branchPointId: message.id,
  input: "",
  branchFromText: null,
  hasStarted: true,
});
```

---

## Starting a New Branch

If the user creates a new branch:

```js
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

### UI Behavior

Before the first message is sent:

* the branch panel is visible
* no messages are rendered yet
* optional context (highlighted text) is shown

---

## Sending Messages in a Branch

When a message is sent:

1. The request includes:

   * `parent_msg_id = branchLeafId`
   * `branch_from_message_id = branchPointId`

2. Backend returns:

   * user message
   * AI response

3. State updates:

```js
setBranchPanel((prev) => ({
  ...prev,
  branchLeafId: data.ai_message.id,
  input: "",
  hasStarted: true,
}));
```

---

## Closing the Branch Window

When the branch is closed:

* `branchPanel` is set to `null`
* UI returns to single-pane mode

```txt
[ Main Conversation ]
```

---

## Nested Branching

The Branch Window supports branching from within a branch.

```txt
Main → A → B
        ↘ C → D
              ↘ E → F
```

Each branch:

* behaves identically
* uses the current message as a new `branchPointId`

No additional UI structure is required—this emerges from the graph.

---

## UX Considerations

### 1. Context Awareness

* Users should always know:

  * where the branch started
  * what they are comparing

---

### 2. Visual Separation

* Clear distinction between trunk and branch
* Prevents confusion when reading side-by-side

---

### 3. Non-Destructive Exploration

* Opening a branch does not modify the main conversation
* Users can explore freely without losing progress

---

### 4. Fast Switching

* Branches should open instantly
* No heavy recomputation or refetching

---

## Common Issues

### Incorrect Branch Context

* Cause: wrong `branchPointId`
* Fix: ensure branch always originates from clicked message

---

### Branch Not Showing Messages

* Cause: incorrect `branchLeafId`
* Fix: use `findLatestBranchLeaf`

---

### Trunk Updating Unexpectedly

* Cause: shared state mutation
* Fix: ensure trunk and branch use separate leaf IDs

---

## Summary

The Branch Window transforms Tangent from a single-threaded chat into a multi-path thinking tool.

By rendering two conversation paths simultaneously, it allows users to:

* explore alternatives
* compare ideas
* maintain context

It is the core UI abstraction that makes branching usable.
