# Tangent
## A chat designed for learning and research
> **A research workspace where AI conversations branch like a tree so we never lose context while exploring ideas.**

- Highlight text in a conversation
- Start a **new branch conversation**
- Keep the original context visible
- Explore tangents without losing the main thread

Think of it like:

- **Git branching for conversations**
- **Threaded comments for AI responses**
- **A research workspace for AI chats**

Key concept:

> Conversations become a **tree instead of a single scroll feed**

---
# Tools used
### Frontend
- React
- Typescript
- Tailwind or simple CSS

### Backend
- Python
- FastAPI

### Database
- PostgreSQL

### Infrastructure
- Docker
- (Cloud service / own hosting)

### AI
- OpenAI API (or provider abstraction)

# Project Roadmap
## Phase 1 — System Foundations

This phase focuses on building the **basic system architecture**.
### What I Will Learn

##### Basic web architecture:

```
Frontend (React)
|
v
Backend API (FastAPI)
|
v
Database (PostgreSQL)
```
##### Concepts:
- REST APIs
- Client-server architecture
- Authentication
- State management
- Database schema design

## Phase 2 - Core Chat System
This is how we will talk with Tangent

### Features
- Create conversation
- Send message
- AI response
- Display conversation history

### Data models 
```
users
-----
id
email
api_key(optional)
created_at
```
```
conversations
-------------
id
user_id
title
created_at
```
```
traditional messages structure
--------
id
conversation_id
role (user / assistant)
content
created_at
```
### What I will learn

**AI integration concepts:**
- Prompt construction
- Message history formatting
- Token limits
- Streaming responses

## Phase 3 — Conversation Tree Architecture
This is the core innovation of the project

Instead of:
```
message -> message -> message -> ...
```

Tangent will have
```
message
 ├─ branch 
 │   └─ message
 │       └─ message
 └─ branch
     └─ message
```

**New Database Structure**

Messages now become a tree.

```
our messages data structure
--------

id
conversation_id
parent_message_id
role
content
branch_from_text
created_at
```
>Key idea:
`parent_message_id`

**This lets messages branch.**

### What I will Learn
- Tree data structures
- Graph-like relationships
- Recursive queries
- UI state graphs

## Phase 4 - Highlight + Branch Feature
This is where we implement our product feature

User flow:
```
user highlights text
|
v
click "create new branch"
|
v
new chat panel opens side by side
|
v
branch references original message
```
#### Libraries that may help:
- react-resizable-panels
- tiptap (optional rich text)
- Zustand or React Context

### What I will Learn
**Frontend concepts:**
- text selection APIs
- UI state synchronization
- managing multiple chat sessions
- component architecture

## Phase 5 - Multi Panel UI
UI becomes a workspace rather than a chat room

Example layout:
```
----------------------------------------
| Main Chat | Branch Chat | Branch 2 |
----------------------------------------
| Message   | Branch from | deeper   |
| Message   | this point  | tangent  |
----------------------------------------
```

#### Important problems to solve
- navigation
- how is context used
- visualizing the conversation tree

### What I will Learn
**Advanced UI design:**
- workspace interfaces
- knowledge tools UX
- context visualization

## Phase 6 - Context Management
One major AI problem
> How does Tangent know the right context for the branch?

We will have to decide:
When a branch starts, what information is included?
1. Entire Conversation
2. Messages up to a branch
3. Highlighted Text Only

### What I Will Learn
**AI engineering concepts:**
- Context Windows
- Prompt Construction
- Conversation Summarization
- Token Budgeting

## Phase 7 - AI Provider 
This is how we will connect to AI providers

- To start we want users to bring in their own API key.
- We can later implement a "shared" key.

**Send Message API**
```
AI Service
sendMessage(provider, key, messages)
```

**Providers**
- Will start with OpenAI or Anthropic (leaning towards Anthropic as of 03/2026)

### What I Will learn
- How to use AI Provider APIs

## Phase 8 - Workspace Features
Once the core innovation is implemented, we can add features.
**It is important to remember to keep this short. It should complement our tree conversation for learning**

#### Potential Features
- Collapsing Branches
- Jump to original contect
- Rename branches
- Conversation search

## Phase 9 - Learning Features
This is where the app is useful for learning in addition to conversation

#### Potential Features
- Highlight explanations
- Attach notes
- Save useful answers
- Create research trees

## Phase 10 - Money Money Money
We make money

### Possible Model:

#### Free Tier:
- Bring own key
- Unlimited Branches? (How expensive will they be?)
- Workspace features
- Learning features

#### Paid Tier
- Using shared key
- Paid per month (SaaS)

# Core Technical Skills I Will Learn
## Frontend
**React architecture**
- props
- hooks
- state
- component composition

**Advanced UI**
- split layouts
- dynamic panels
- tree visualization

## Backend
**FastAPI**
- routing
- dependency injection
- authentication

**Database**
- relational schema design
- foreign keys
- indexing
- recursive relationships

**AI Engineering**
- prompt formatting
- token budgeting
- context management
- streaming responses

**Systems Design**
- abstraction layers
- API boundaries
- state synchronization
- distributed systems thinking

# The Hardest Part
1. Tree-based conversation
2. Multi-chat UI State
3. AI Context Reconstruction

# The Big Idea
Current AI chat is bad for learning because
```
conversation = single scroll
```

This project aims to change it to
```
conversation = knowledge tree
```
