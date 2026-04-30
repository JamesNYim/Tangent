# Project Goals

## Motivation

Most AI chat interfaces are designed around a linear conversation model:

User → AI → User → AI

While this works for simple interactions, it breaks down when exploring complex ideas. If a user wants to try a different approach, ask a variation of a question, or rethink part of the conversation, they are forced to either:
- overwrite the current direction, or
- start a completely new chat

This makes it difficult to compare ideas or revisit alternative lines of reasoning.

---

## Problem

Real problem-solving is not linear.

When working through a problem, people naturally:
- consider multiple approaches
- test different assumptions
- explore alternatives before deciding on a direction

Traditional chat interfaces do not support this workflow. They force users into a single path, making it hard to:
- compare different solutions
- track how ideas evolved
- return to earlier decision points

---

## Goals

### 1. Enable Branching from Any Point
Allow users to branch from any message in a conversation.

This makes it possible to:
- try alternative prompts
- explore different solutions
- revisit earlier ideas without losing progress

---

### 2. Support Side-by-Side Comparison
Make it easy to view and compare different branches of a conversation.

Instead of committing to one path, users can:
- develop multiple approaches in parallel
- evaluate tradeoffs between ideas
- explore what ifs and compare

---

### 3. Preserve Conversation Structure
Store conversations as a tree (graph) instead of a linear list.

This ensures:
- all branches remain connected to their origin
- users can navigate the full history of their thinking
- no information is lost when exploring tangents

---

### 4. Maintain Context While Exploring
Allow users to branch without losing the context of the original conversation.

Each branch retains:
- its parent message
- optional highlighted context
- its own independent continuation

---

### 5. Make Structure Visible
Provide a visual representation of the conversation graph.

This helps users:
- understand where branches occur
- navigate between ideas
- see how different paths relate to each other

---

## Summary

Tangent is designed to turn AI chat into a tool for exploring and comparing ideas.

Instead of forcing users down a single conversational path, it allows them to:
- branch freely
- explore alternatives
- and evaluate different approaches side-by-side

The goal is not just to get an answer, but to understand the range of possible solutions.
