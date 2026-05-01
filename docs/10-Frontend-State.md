# Frontend State Management

## Overview

Tangent’s frontend manages a complex, non-linear UI with multiple synchronized views:

- Main conversation (trunk)
- Branch conversation (tangent)
- Tree sidebar
- Conversation list

Instead of duplicating data, the system relies on **derived state** and a small number of core state variables to control the entire UI.

---

## Core Principle

> The frontend stores minimal state and derives everything else.

Rather than storing:
- full conversation paths
- selected messages
- branch trees

Tangent stores:
- raw messages
- a few identifiers (leaf IDs, selection)

Everything else is computed.

---

## Core State

### Messages

```js
const [messages, setMessages] = useState([]);
````

* Source of truth for the entire conversation graph
* Contains all messages across all branches

---

### Selected Conversation

```js
const [selectedConversationId, setSelectedConversationId] = useState(null);
```

* Determines which conversation is active
* Triggers message fetching

---

### Main Leaf ID

```js
const [mainLeafId, setMainLeafId] = useState(null);
```

* Represents the current position in the main conversation
* Used to render the trunk path

---

### Branch Panel

```js
const [branchPanel, setBranchPanel] = useState(null);
```

Structure:

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

Controls:

* whether a branch is open
* what branch is being viewed
* what context it came from

---

### Input State

```js
const [input, setInput] = useState("");
```

* Main chat input

Branch input is stored inside `branchPanel.input`

---

### UI State

```js
const [sending, setSending] = useState(false);
const [error, setError] = useState("");
```

* Controls async behavior and feedback

---

## Derived State

The power of the system comes from what is **not stored directly**.

---

### Messages By ID

```js
const messagesById = buildMessagesById(messages);
```

* Enables O(1) lookup
* Used for traversal

---

### Children Map

```js
const childrenMap = buildChildrenMap(messages);
```

* Maps parent → children
* Used for:

  * detecting branches
  * navigating downward

---

### Trunk Path

```js
const trunkMessages = getPathToRoot(messages, trunkLeafId);
```

* Derived from `mainLeafId`
* Rendered in left panel

---

### Branch Path

```js
const branchMessages = branchPanel
  ? getPathToRoot(messages, branchPanel.branchLeafId)
  : [];
```

* Derived from `branchLeafId`
* Rendered in right panel

---

## Data Flow

### Sending a Main Message

1. User submits input
2. API request sent
3. Backend returns:

   * user message
   * AI message
4. State update:

```js
setMessages((prev) => [...prev, userMsg, aiMsg]);
setMainLeafId(aiMsg.id);
```

---

### Sending a Branch Message

1. Use `branchPanel.branchLeafId` as parent
2. Include `branch_from_message_id`
3. Backend returns messages
4. Update:

```js
setMessages((prev) => [...prev, userMsg, aiMsg]);

setBranchPanel((prev) => ({
  ...prev,
  branchLeafId: aiMsg.id,
  input: "",
  hasStarted: true,
}));
```

---

## Branch State vs Main State

A key design decision:

* Main conversation and branch do **not share leaf IDs**
* They evolve independently

```txt
Main:   1 → 2 → 3 → 4
               ↘
Branch:         5 → 6
```

---

## Why This Works

### 1. Minimal State

Only a few variables control everything:

* `messages`
* `mainLeafId`
* `branchPanel`

---

### 2. Derived Everything Else

Paths, branches, structure are all computed from:

* `parent_msg_id`
* traversal functions

---

### 3. Single Source of Truth

All conversation data lives in:

```js
messages
```

No duplication.

---

### 4. UI is a Projection of Data

The UI is not storing state—it is rendering a **partial view of the graph**.

---

## Common Pitfalls (From This Project)

### 1. Messages Not Rendering After Reopen

**Cause:**

* wrong `branchLeafId`

**Fix:**

* always resolve latest leaf via traversal

---

### 2. Branch Overwriting Main State

**Cause:**

* shared leaf ID

**Fix:**

* separate `mainLeafId` and `branchLeafId`

---

### 3. UI Desync Between Panels

**Cause:**

* stale state or incorrect dependencies

**Fix:**

* derive everything from `messages` + leaf IDs

---

### 4. Clicking Message Breaks Rendering

**Cause:**

* incorrect selection state update

**Fix:**

* avoid mutating core state during selection

---

## Design Decisions

### 1. No Global State Library

* React state is sufficient
* avoids unnecessary complexity

---

### 2. Graph-Driven UI

* state represents graph position, not UI structure
* UI is derived, not stored

---

### 3. Branch as State Object

Instead of:

* multiple flags
* scattered variables

Everything is contained in:

```js
branchPanel
```

---

## Mental Model

Think of the system as:

```txt
messages (graph)
        ↓
leaf IDs (position)
        ↓
traversal
        ↓
rendered UI
```

---

## Summary

Tangent’s frontend state management is built around:

* minimal stored state
* derived data
* graph-based rendering

This allows the app to:

* support branching conversations
* render multiple paths simultaneously
* stay consistent across complex interactions

The system scales in complexity without becoming fragile because the UI is always derived from a single source of truth.
