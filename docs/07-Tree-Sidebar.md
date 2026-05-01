# Tree Sidebar UI

## Overview

The Tree Sidebar is a visual representation of the conversation graph.

It allows users to:
- understand the structure of their conversation
- see where branches occur
- navigate between different paths

Each node represents a message, and edges represent parent-child relationships.

---

## Purpose

Traditional chat interfaces have simple structure.

Tangent by nature is more complex.

The Tree Sidebar exists to organize thoughts:

- Where did this idea come from?
- What other paths exist?
- How did the conversation branch?

It transforms the conversation from a list into a **navigable graph**.

---

## Layout

The Tree Sidebar is rendered as a vertical panel alongside the main chat.

```txt
[ Tree Sidebar ] | [ Chat / Branch UI ]
````

It contains:

* nodes (messages)
* connecting lines
* branch splits

---

## Node Representation

Each message is rendered as a node.

A node visually indicates:

* position in the conversation
* whether it is part of the current path
* whether it is a branch point

---

## Graph Structure

The sidebar reflects the same structure defined by:

```js
parent_msg_id
```

Example:

```txt
1
|
2 - 4
|   |
|   5
|
3
```

---

## Children Mapping

The Tree Sidebar relies on a `childrenMap`:

```js
function buildChildrenMap(messages) {
  const map = new Map();

  for (const msg of messages) {
    const parentId = msg.parent_msg_id;

    if (!map.has(parentId)) {
      map.set(parentId, []);
    }

    map.get(parentId).push(msg);
  }

  return map;
}
```

This allows the UI to:

* detect branches
* render splits
* position nodes correctly

---

## Active Path Highlighting

The currently selected conversation path is derived from:

```js
getPathToRoot(messages, selectedLeafId)
```

Nodes in this path are visually highlighted.

This gives users a clear sense of:

* where they are in the graph
* which branch they are currently viewing

---
## Scroll-Based Node Detection

To determine which message is currently “in focus” while scrolling, the Tree Sidebar uses a **detect point** instead of relying on clicks.

The detect point is a fixed vertical position within the scroll container. As the user scrolls, each message is measured relative to this point, and the closest one is selected.

---

### Core Idea

Instead of only checking the top of each message, we treat each message as a **range (top → bottom)**.

- If the detect point is *inside* a message → that message is considered active
- Otherwise → we measure the distance to the nearest edge

---

### Implementation

```js
const rect = el.getBoundingClientRect();
let distance;

if (detectPoint >= rect.top && detectPoint <= rect.bottom) {
  // Detect point is inside the message
  distance = 0;
} 
else {
  // Measure distance to the closest edge
  const distanceToTop = Math.abs(rect.top - detectPoint);
  const distanceToBottom = Math.abs(rect.bottom - detectPoint);

  distance = Math.min(distanceToTop, distanceToBottom);
}

if (distance < closestDistance) {
  closestDistance = distance;
  closestId = msg.id;
}
````

---

### Why This Works

This approach fixes several issues that come from only checking `rect.top`:

#### 1. Tall Messages

Without this logic:

* A large message would only be detected when its **top** reaches the detect point

With this logic:

* The message is detected as soon as the detect point enters its bounds

---

#### 2. Smooth Scrolling Behavior

* Messages “activate” naturally as you scroll through them
* No sudden jumps between nodes
* The active message follows the user’s reading position

---

#### 3. Edge Handling (Top / Bottom)

* Messages at the very top or bottom of the viewport are still detectable
* The system always selects the closest visible message

---

### Mental Model

Think of each message as a vertical block:

```txt
[ Message A ]
[ Message B ]   ← detect point
[ Message C ]
```

* If the detect point is inside **Message B** → it is selected
* Otherwise → whichever message edge is closest wins

---

### Result

This creates a more accurate and intuitive mapping between:

* scroll position
* active message
* tree sidebar highlighting

It ensures that the UI reflects what the user is actually looking at—not just which element happened to cross a single pixel threshold.
---
## Interaction Model

Users interact with the Tree Sidebar by:

* scrolling → changes active node
* clicking nodes (future/optional)
* visually tracking branches

---

## Design Decisions

### 1. Visual Tree Instead of List

A list hides structure.
A tree exposes relationships.

---

### 2. Scroll-Based Focus Instead of Click-Based

Scrolling feels more natural for long conversations.

It reduces:

* clicking friction
* mental overhead

---

### 3. Derived State

The Tree Sidebar does not store its own state.

It derives everything from:

* `messages`
* `childrenMap`
* `selectedLeafId`

---

## Future Improvements
* Hover previews of branches
* Collapsible branches
---

## Summary

The Tree Sidebar is the visual backbone of Tangent.

It transforms conversation data into a structure users can see and navigate.

Combined with branching and dual-focus UI, it allows users to:

* understand how ideas evolve
* explore alternative paths
* move through conversations non-linearly
