# Tangent AI – Project Overview

## What is Tangent?

Tangent is a full-stack AI chat application that rethinks how conversations are structured and explored.

Unlike traditional chat interfaces (such as ChatGPT), which enforce a strictly linear message flow, Tangent allows conversations to branch. Users can create alternate paths (“tangents”) from any message, enabling deeper exploration of ideas without losing the original context.

---

## The Core Idea

Most AI chat interfaces look like this:
```
(msg 1)
  |
(msg 2)
  |
(msg 3)
```

This creates a single linear thread where exploring a new idea often means abandoning or cluttering the original conversation.

Tangent introduces a **tree-based conversation model**:

From any message, users can:
- Continue the main conversation
- Branch off into a new path
- Explore multiple alternative directions simultaneously

```
(msg 1)
  |
(msg 2) - (msg 5) 
  |         |
(msg 3)   (msg 6) - ...
  |         |
(msg 4)    ...
  |
...
```

---

## Key Features

### 1. Branching Conversations
Users can create a new branch from:
- Any message bubble
- Highlighted text within a message

Each branch becomes its own conversational path while still being linked to its origin.

---

### 2. Dual-Focus Interface
Tangent allows users to view:
- A main conversation (trunk)
- A tangent conversation (branch)

This enables side-by-side reasoning and comparison without losing context.

---

### 3. Tree Visualization
A visual tree structure represents the conversation graph:
- Nodes = messages
- Edges = parent-child relationships
- Branch points = messages with multiple children

This helps users understand how their conversation has evolved.

---

### 4. Context Preservation
Branches retain:
- The message they originated from
- Optional highlighted context
- Their own independent message history

This allows users to explore ideas deeply without polluting the main thread.

---

## Why This Matters

Traditional chat interfaces force users into a tradeoff:
- Stay focused but lose exploration
- Explore freely but lose structure

Tangent removes this tradeoff by:
- Preserving structure (tree model)
- Enabling exploration (branching)
- Maintaining clarity (visual + dual focus UI)

---

## High-Level Architecture

Tangent is built as a full-stack application:

### Frontend
- React-based UI
- Dynamic layout with multiple panels (main chat, branch view, tree sidebar)
- State-driven rendering of conversation paths

### Backend
- REST API for conversations and messages
- Handles message creation, branching, and retrieval

### Database
- Messages stored as a graph using:
  - `parent_msg_id`

---

## Design Philosophy

Tangent is built around a few core principles:

- **Conversations are not linear**
- **Users should never lose context**
- **Exploration should feel natural**
- **Structure should be easily navigable**

---

## Summary

Tangent transforms AI chat from a linear conversation into a space for comparing ideas.

Instead of committing to a single path, users can explore multiple approaches side-by-side branching from any message to test alternatives, ask different questions, or rethink assumptions.

The goal isn’t just to continue the conversation, but to understand the range of possible directions it could take.

