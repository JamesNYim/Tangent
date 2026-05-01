# Dual-Focus Layout

## Overview

The Dual-Focus Layout is the core UI pattern in Tangent.

It allows users to view:
- the original conversation (trunk)
- an alternative path (branch)

side-by-side.

```txt
[ Trunk Conversation ] | [ Branch Conversation ]
````

This transforms the interface from a single-threaded chat into a tool for **comparing ideas and exploring alternatives in parallel**.

---

## Purpose

Traditional AI chat forces users to choose one direction.

If you want to try a different approach, you must:

* overwrite the current path, or
* start a new conversation

Tangent removes this constraint.

The Dual-Focus Layout enables users to:

* explore a new idea without losing the original
* compare different responses directly
* understand tradeoffs between approaches

---

## Layout Structure

When no branch is open:

```txt
[ Main Conversation ]
```

When a branch is open:

```txt
[ Trunk (Main Path) ] | [ Branch (Tangent Path) ]
```

* Left pane → original conversation
* Right pane  active branch

---

## State Control

The layout is controlled by `branchPanel`.

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

## Rendering Logic

### Trunk (Left Panel)

The trunk always represents the original path:

```js
const trunkMessages = getPathToRoot(messages, trunkLeafId);
```

* Does not change while exploring a branch
* Provides stable context

---

### Branch (Right Panel)

The branch represents the alternative path:

```js
const branchMessages = getPathToRoot(messages, branchLeafId);
```

* Updates as the user sends messages in the branch
* Evolves independently from the trunk

---

## Opening the Dual-Focus Layout

The layout is activated when a branch is opened.

### Trigger

* Clicking a branch button on a message
* Selecting an existing branch

---

### Initialization

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

When creating a new branch:

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

### Initial UI State

Before the first message:

* Right panel is visible
* No branch messages yet
* Optional highlighted context is shown

---

## Comparison Behavior

The Dual-Focus Layout enables direct comparison:

| Trunk              | Branch               |
| ------------------ | -------------------- |
| Original prompt    | Modified prompt      |
| Original response  | Alternative response |
| Baseline reasoning | New reasoning        |

This is the **core value of Tangent**:

> Not just continuing a conversation, but comparing where it could go.

---

## Interaction Flow

### 1. User opens a branch

* Dual layout appears

### 2. User sends messages in branch

* Only the branch panel updates

### 3. User observes differences

* Both paths remain visible

### 4. User can close branch

* Layout returns to single view

---

## Closing the Branch

When the branch is closed:

```js
setBranchPanel(null);
```

UI returns to:

```txt
[ Main Conversation ]
```

---

## Nested Branching

Branches can be created from within branches.

```txt
Main → A → B
        ↘ C → D
              ↘ E → F
```

The Dual-Focus Layout still applies:

* Left = previous path
* Right = new branch

---

## Key Design Decisions

### 1. Separate Leaf IDs

* `trunkLeafId` and `branchLeafId` are independent
* Prevents state conflicts
* Allows true parallel exploration

---

### 2. Context Trunk

* The trunk ensures a stable reference point

---

### 3. UI-Driven State

* Backend does not track “active branches”
* The frontend determines what is shown

---

## UX Considerations

### Clarity

* Users must always know which pane is which
* Clear visual distinction between trunk and branch

---

### Context Preservation

* Branch always references where it started
* Optional highlighted text reinforces intent

---

### Non-Destructive Exploration

* Users can experiment freely
* Original conversation is never lost

---

## Common Issues

### Trunk Updates Unexpectedly

**Cause:** shared state or incorrect leaf ID
**Fix:** ensure trunk and branch use separate IDs

---

### Branch Appears Empty

**Cause:** incorrect `branchLeafId`
**Fix:** ensure correct initialization or leaf detection

---

### Confusing Context

**Cause:** missing branch origin info
**Fix:** display `branchPointId` or `branchFromText`

---

## Summary

The Dual-Focus Layout is what makes Tangent fundamentally different from traditional chat interfaces.

By showing two conversation paths at once, it allows users to:

* explore alternatives without losing context
* compare different ideas side-by-side
* think in parallel instead of sequentially

It turns AI chat from a linear interaction into a structured exploration of ideas.

