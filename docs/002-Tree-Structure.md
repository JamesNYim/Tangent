# Tree & Graph Structure

## Overview

Tangent represents conversations as a **tree-structured graph** instead of a linear list.

Each message is a node, and relationships between messages define the flow of the conversation.

This structure enables:
- branching at any point
- multiple parallel conversation paths
- dynamic reconstruction of any thread

---

## From Linear to Tree

Traditional chat:

```txt
1 → 2 → 3 → 4 → 5
````

Tangent:

```txt
1 → 2 → 3 → 4
        ↘
         5 → 6
```

A single message can now lead to multiple future paths.

---

## Graph Model

Tangent uses a **directed graph with tree-like constraints**:

* Each node (message) has **at most one parent**
* Each node can have **multiple children**
* The graph is **acyclic** (no loops)

This effectively forms a **tree rooted at the first message**.

---

## Node Definition

Each node represents a message:

```ts
type Message = {
  id: number;
  parent_msg_id: number | null;
}
```

---

## Parent → Child Relationships

The structure is defined entirely through `parent_msg_id`.

Example:

```txt
msg1 → msg2 → msg3
```

```js
msg2.parent_msg_id = msg1.id
msg3.parent_msg_id = msg2.id
```

---

## Branching

A branch occurs when multiple messages share the same parent.

```txt
            msg3
            /
msg1 - msg2
            \
            msg4
```

Here:

```js
msg3.parent_msg_id = msg2.id
msg4.parent_msg_id = msg2.id
```

This makes `msg2` a **branch point**.

---

## Branch Point Definition

A message is considered a branch point if:

```js
children.length > 1
```

This is derived at runtime using a `childrenMap`.

---

## Children Map

To efficiently traverse the graph downward, Tangent builds a lookup map:

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

This allows:

```js
childrenMap.get(messageId)
```

to return all direct children.

---

## Tree Visualization

The graph can be visualized like this:

```txt
1
|
2 - 4
|
|
|
3
```

Where:

* vertical lines = continuation of the current path
* horizontal lines = start of a new branch

---

## Paths vs Tree

Important distinction:

* The **tree** contains *all messages*
* A **path** is a single traversal from root → leaf

Example tree:

```txt
1 → 2 → 3
      ↘
       4 → 5
```

Possible paths:

```txt
Path A: 1 → 2 → 3  
Path B: 2 → 4 → 5
```

---

## Leaf Nodes

A leaf node is a message with no children.

```js
childrenMap.get(id)?.length === 0
```

Leaf nodes represent the **end of a conversation path**.

---

## Rendering Strategy

The UI does not render the full tree at once.

Instead, it renders a **single path at a time**:

1. Select a leaf node
2. Walk upward using `parent_msg_id`
3. Reverse the result
4. Render as a linear conversation

This keeps the UI simple while preserving the full graph structure.

---

## Key Insight

The tree structure allows Tangent to separate:

* **Storage** → full graph of all possibilities
* **View** → a selected path through that graph

This is what enables:

* branching without duplication
* keeping a complex tree of ideas navigable
* comparing different conversation paths

---

## Design Tradeoffs

### Why not store full trees?

Storing nested structures would:

* be harder to update
* complicate branching
* reduce flexibility

Using parent pointers keeps the model simple and composable.

---

### Why not allow multiple parents?

Allowing multiple parents would create a general graph, but:

* traversal becomes more complex
* UI becomes harder to reason about
* cycles could occur

Restricting to one parent ensures a clean tree.

---

## Summary

Tangent models conversations as a tree:

* Each message has one parent
* Messages can have multiple children
* Branches emerge naturally from shared parents

This structure enables:

* branching conversations
* parallel exploration
* dynamic reconstruction of any conversation path

**It is the foundation of Tangent’s non-linear AI interface.**

