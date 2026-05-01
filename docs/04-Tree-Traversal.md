# Graph Traversal

## Overview

Tangent stores conversations as a tree of messages, but the UI presents them as linear paths.

Graph traversal is the process that allows us to:
- reconstruct a conversation path
- navigate between branches
- determine relationships between messages
- render the correct messages in the UI

---

## Core Idea

Instead of storing conversations as pre-built threads, Tangent dynamically reconstructs them.

To render a conversation:

1. Start from a **leaf node** *(the latest message in a branch)*
2. Walk upward through `parent_msg_id`
3. Reverse the result

This produces a linear path for display.

---

## Traversing Upward (Leaf → Root)

This is the most important traversal in the system.

### Goal

Given a message (usually a leaf), reconstruct the full path back to the root.

---

### Implementation

```
function getPathToRoot(messages, leafId) {
  if (!leafId) return [];

  const messagesById = buildMessagesById(messages);
  const path = [];

  let currentNode = messagesById.get(leafId);

  while (currentNode) {
    path.push(currentNode);

    // Checks if the currentNode has a parent and sets the 
    //currentNode to it
    currentNode = current.parent_msg_id
      ? messagesById.get(current.parent_msg_id)
      : null;
  }

  return path.reverse();
}
```

---

### Example

Graph:

```
1 → 2 → 3 → 4
      ↘
       5 → 6
```

Calling:

```
getPathToRoot(messages, 6)
```

Result:

```
[1, 2, 5, 6]
```

This is what gets rendered in the UI and what gets passed onto the AI provider as context.

---

## Traversing Downward (Parent → Children)

To explore branches, we need to move downward in the graph.

### Children Map

We precompute a lookup map:

```
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

---

### Usage

```
const children = childrenMap.get(messageId) || [];
```

This allows us to:
* quickly get information about a node's children
* detect branch points
* list available branches
* navigate to alternative paths

---

## Detecting Branch Points

A branch point is a node with multiple children.

```
function isBranchPoint(childrenMap, messageId) {
  const children = childrenMap.get(messageId) || [];
  return children.length > 1;
}
```

---

## Finding the Latest Leaf of a Branch

When opening a branch, we often want the **deepest node** in that branch.

### Goal

Given a starting node, follow its children until reaching a leaf.

---

### Implementation

```
function findLatestBranchLeaf(startId, childrenMap) {
  let currentId = startId;

  while (true) {
    const children = childrenMap.get(currentId) || [];

    if (children.length === 0) {
      return currentId;
    }

    // Assume last child is the most recent
    currentId = children[children.length - 1].id;
  }
}
```

---

### Why This Matters

When a user opens an existing branch:

* we don’t want to show just the first message
* we want to show the **current end of that branch**

---

## Selecting a Path

At any time, the UI is focused on a single path.

This path is determined by:

* a selected leaf node
* traversal upward to root

Changing the selected leaf = switching paths.

---

## Combining Traversals

Most UI actions involve both directions:

### Example: Opening a Branch

1. User clicks a branch from message `M`
2. Use `childrenMap` to find branch child
3. Use `findLatestBranchLeaf` to get leaf
4. Use `getPathToRoot` to reconstruct full path
5. Render that path

---

## Performance Considerations

### 1. Build Maps Once

Instead of repeatedly searching arrays:

* `messagesById` → O(1) lookup
* `childrenMap` → O(1) child access

---

### 2. Avoid Recomputing Paths

Paths are reconstructed often, so:

* memoization or caching can help
* especially for large conversations

---

### 3. Linear Complexity

Each traversal:

* Upward: O(depth)
* Downward: O(branch length)

This is efficient for typical conversation sizes.

---

## Key Insight

Tangent separates:

* **Graph storage** → full conversation tree
* **Traversal logic** → determines what to show

This allows:

* flexible navigation
* efficient rendering
* dynamic switching between ideas

---

## Summary

Graph traversal is what makes Tangent work.

By combining:

* upward traversal (path reconstruction)
* downward traversal (branch discovery)

Tangent can:

* render any conversation path
* support branching at any point
* let users move between ideas seamlessly

Without traversal, the graph is just data.
Traversal turns it into an interactive experience.
