# MindFlow: System Architecture

## Document Purpose

This document explains how MindFlow's microservices architecture works, focusing on service interactions, data flow patterns, and key design decisions. It provides the conceptual foundation for understanding the system without diving into implementation code.

---

## Table of Contents

1. [Architectural Overview](#architectural-overview)
2. [Service Interaction Patterns](#service-interaction-patterns)
3. [CQRS Implementation](#cqrs-implementation)
4. [Event-Driven Architecture](#event-driven-architecture)
5. [Key User Flows](#key-user-flows)
6. [Authentication & Authorization](#authentication--authorization)
7. [Data Consistency Strategy](#data-consistency-strategy)
8. [Scalability & Reliability](#scalability--reliability)
9. [Design Decisions & Trade-offs](#design-decisions--trade-offs)

---

## Architectural Overview

### Architectural Style
MindFlow implements a **microservices architecture** with the following characteristics:

- **Service Independence:** Each service owns its data and can be deployed independently
- **API Gateway Pattern:** GraphQL gateway serves as the single entry point for clients
- **CQRS Pattern:** Separation of write (commands) and read (queries) operations
- **Event-Driven:** Services communicate through asynchronous events
- **Polyglot Persistence:** Different databases for different needs

### High-Level System View

```
┌─────────────────────────────────────────────────────────────────┐
│                    CLIENT APPLICATIONS                           │
│                  (Angular SPA, Mobile Apps)                      │
└───────────────────────────────┬─────────────────────────────────┘
                                │
                                │ HTTPS/WebSocket
                                │
┌───────────────────────────────▼─────────────────────────────────┐
│                      API GATEWAY LAYER                           │
│                                                                  │
│  ┌──────────────────┐          ┌──────────────────┐            │
│  │ GraphQL Gateway  │◄────────►│  WebSocket Hub   │            │
│  │   (Node.js)      │          │    (Node.js)     │            │
│  └──────────────────┘          └──────────────────┘            │
└──────────────┬───────────────────────────┬─────────────────────┘
               │                           │
               │ gRPC/REST                 │ WebSocket
               │                           │
┌──────────────▼───────────────────────────▼─────────────────────┐
│                    SERVICE LAYER                                 │
│                                                                  │
│  ┌─────────────┐  ┌─────────────┐  ┌──────────────┐           │
│  │Auth Service │  │   Command   │  │    Query     │           │
│  │  (Node.js)  │  │   Service   │  │   Service    │           │
│  │             │  │(Spring Boot)│  │  (Node.js)   │           │
│  └─────────────┘  └─────────────┘  └──────────────┘           │
│                                                                  │
│  ┌─────────────┐  ┌─────────────┐  ┌──────────────┐           │
│  │AI Processing│  │ Analytics   │  │   Search     │           │
│  │  (Python)   │  │  Service    │  │   Service    │           │
│  │             │  │  (Node.js)  │  │  (Node.js)   │           │
│  └─────────────┘  └─────────────┘  └──────────────┘           │
│                                                                  │
│  ┌─────────────┐  ┌─────────────┐  ┌──────────────┐           │
│  │Notification │  │   Logging   │  │    Media     │           │
│  │  Service    │  │   Service   │  │   Service    │           │
│  │  (Node.js)  │  │  (Node.js)  │  │  (Node.js)   │           │
│  └─────────────┘  └─────────────┘  └──────────────┘           │
└──────────────┬───────────────────────────┬─────────────────────┘
               │                           │
               │                           │
┌──────────────▼───────────────────────────▼─────────────────────┐
│                     DATA LAYER                                   │
│                                                                  │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐         │
│  │ PostgreSQL   │  │ PostgreSQL   │  │  TimescaleDB │         │
│  │ (Write DB)   │  │  (Read DB)   │  │  (Analytics) │         │
│  └──────────────┘  └──────────────┘  └──────────────┘         │
│                                                                  │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐         │
│  │    Redis     │  │   MongoDB    │  │ Elasticsearch│         │
│  │   (Cache)    │  │   (Logs)     │  │   (Search)   │         │
│  └──────────────┘  └──────────────┘  └──────────────┘         │
│                                                                  │
│  ┌──────────────┐  ┌──────────────┐                            │
│  │      S3      │  │   SQS/SNS    │                            │
│  │   (Media)    │  │  (Messages)  │                            │
│  └──────────────┘  └──────────────┘                            │
└──────────────────────────────────────────────────────────────────┘
```

### Service Responsibilities

| Service | Primary Responsibility | Technology | Data Store |
|---------|----------------------|------------|------------|
| **Auth Service** | User authentication, JWT management, session handling | Node.js + Express | Redis (sessions) |
| **Command Service** | Write operations, business logic, event publishing | Spring Boot | PostgreSQL (write) |
| **Query Service** | Read operations, data aggregation, caching | Node.js + Express | PostgreSQL (read), Redis |
| **AI Processing** | Claude API integration, sentiment analysis, insights generation | Python + FastAPI | None (stateless) |
| **Analytics Service** | Time-series data, trends, statistics | Node.js + Express | TimescaleDB |
| **Search Service** | Full-text search, semantic search | Node.js + Express | Elasticsearch |
| **Notification Service** | Email, push notifications, webhooks | Node.js + Express | SQS (queue) |
| **Logging Service** | Centralized logging, audit trails | Node.js + Express | MongoDB |
| **Media Service** | File uploads, image processing, CDN | Node.js + Express | S3 |
| **GraphQL Gateway** | API aggregation, client-facing API | Node.js + Apollo | None (gateway) |

---

## Service Interaction Patterns

### 1. Synchronous Communication (Client → Services)

**Pattern:** GraphQL Gateway aggregates data from multiple services

```
Client Request
     │
     ▼
┌─────────────────┐
│ GraphQL Gateway │ ← Single entry point
└────────┬────────┘
         │
         ├─────────────┐
         │             │
         ▼             ▼
    ┌────────┐    ┌────────┐
    │ Query  │    │  Auth  │
    │Service │    │Service │
    └────────┘    └────────┘
```

**Example:** User requests their dashboard
1. Client sends GraphQL query to Gateway
2. Gateway authenticates via Auth Service (gRPC)
3. Gateway fetches user data from Query Service (gRPC)
4. Gateway fetches analytics from Analytics Service (gRPC)
5. Gateway combines results and returns to client

**Why GraphQL?**
- Client controls data shape (no over-fetching)
- Single request aggregates multiple services
- Strong typing and schema introspection
- Real-time subscriptions via WebSocket

### 2. Asynchronous Communication (Service → Service)

**Pattern:** Event-driven using message queues and pub/sub

```
Command Service
     │
     │ (1) Executes command
     ▼
[Write Database]
     │
     │ (2) Publishes event
     ▼
┌─────────────────┐
│   EventBridge   │ ← Central event bus
└────────┬────────┘
         │
         ├──────────────┬──────────────┬──────────────┐
         │              │              │              │
         ▼              ▼              ▼              ▼
    ┌────────┐    ┌─────────┐   ┌─────────┐   ┌─────────┐
    │ Query  │    │   AI    │   │Analytics│   │Logging  │
    │Service │    │Processing   │ Service │   │Service  │
    └────────┘    └─────────┘   └─────────┘   └─────────┘
         │              │              │              │
         ▼              ▼              ▼              ▼
   [Read Database] [SQS Queue]  [TimescaleDB]  [MongoDB]
```

**Event Flow Example:** User creates journal entry
1. Command Service validates and saves entry
2. Publishes `JournalEntryCreated` event to EventBridge
3. Multiple services consume the event:
   - Query Service: Updates read database
   - AI Processing: Queues entry for analysis
   - Analytics Service: Records metrics
   - Logging Service: Logs the action

**Benefits:**
- Services remain decoupled
- Easy to add new consumers without changing producers
- Natural retry and dead-letter queue handling
- Scales independently per consumer

### 3. Request-Response via Message Queue

**Pattern:** AI Processing uses SQS for guaranteed processing

```
Command Service
     │
     │ (1) Publishes to SQS
     ▼
┌─────────────────┐
│  SQS: ai-queue  │
└────────┬────────┘
         │
         │ (2) Polls messages
         ▼
┌─────────────────┐
│  AI Processing  │
│     Service     │
└────────┬────────┘
         │
         │ (3) Calls Claude API
         ▼
    [Claude API]
         │
         │ (4) Receives insights
         ▼
┌─────────────────┐
│  SNS: ai-results│
└────────┬────────┘
         │
         ├──────────────┬──────────────┐
         │              │              │
         ▼              ▼              ▼
    ┌────────┐    ┌─────────┐   ┌──────────┐
    │ Query  │    │Analytics│   │Notification
    │Service │    │ Service │   │  Service │
    └────────┘    └─────────┘   └──────────┘
```

**Why SQS + SNS?**
- **SQS:** Reliable delivery, automatic retries, visibility timeout
- **SNS:** Fan-out pattern, multiple subscribers
- **Dead Letter Queue:** Failed messages for manual inspection
- **Cost-effective:** Pay per message, auto-scaling

---

## CQRS Implementation

### What is CQRS?

**Command Query Responsibility Segregation** separates write operations (commands) from read operations (queries).

### Why CQRS for MindFlow?

1. **Different Read/Write Patterns:**
   - Writes are transactional and complex (validation, events)
   - Reads are simple and frequent (display data)

2. **Independent Scaling:**
   - Read database handles 90% of traffic
   - Write database handles complex transactions

3. **Optimized Data Models:**
   - Write DB: Normalized (3NF) for consistency
   - Read DB: Denormalized for query performance

4. **Technology Freedom:**
   - Write: Spring Boot (strong typing, transactions)
   - Read: Node.js (fast JSON serialization)

### CQRS Flow in MindFlow

#### Write Path (Command)

```
Client
  │
  │ (1) POST /api/journals
  ▼
┌──────────────────┐
│ GraphQL Gateway  │
└────────┬─────────┘
         │
         │ (2) gRPC: CreateJournalEntry
         ▼
┌──────────────────┐
│ Command Service  │
│  (Spring Boot)   │
│                  │
│ • Validate input │
│ • Check business │
│   rules          │
│ • Generate UUID  │
│ • Start txn      │
└────────┬─────────┘
         │
         │ (3) INSERT INTO journals
         ▼
┌──────────────────┐
│  PostgreSQL      │
│  (Write DB)      │
│                  │
│ • journals       │
│ • journal_tags   │
│ • journal_moods  │
└────────┬─────────┘
         │
         │ (4) COMMIT transaction
         ▼
┌──────────────────┐
│   EventBridge    │
└────────┬─────────┘
         │
         │ (5) Publishes event
         │     { type: "JournalEntryCreated",
         │       journalId: "...",
         │       userId: "...",
         │       timestamp: "..." }
         ▼
    [Event Consumers]
```

**Key Points:**
- Command Service is the only service writing to Write DB
- All writes go through validation and business logic
- Events are published AFTER successful commit
- Returns 201 Created immediately (async processing happens later)

#### Read Path (Query)

```
Client
  │
  │ (1) GET /api/journals?userId=123
  ▼
┌──────────────────┐
│ GraphQL Gateway  │
└────────┬─────────┘
         │
         │ (2) gRPC: GetUserJournals
         ▼
┌──────────────────┐
│  Query Service   │
│   (Node.js)      │
│                  │
│ • Check cache    │◄─────────┐
│ • If miss, query │           │
│   database       │           │
│ • Cache result   │           │
└────────┬─────────┘           │
         │                     │
         │ (3) SELECT FROM journals_view   │
         ▼                     │
┌──────────────────┐           │
│  PostgreSQL      │           │
│  (Read DB)       │           │
│                  │           │
│ • journals_view  │           │
│   (denormalized) │           │
│ • Pre-joined     │           │
│   with tags,     │           │
│   moods, user    │           │
└──────────────────┘           │
                                │
         ┌──────────────────────┘
         │ (3a) Cache HIT path
         ▼
┌──────────────────┐
│      Redis       │
│                  │
│ Key pattern:     │
│ journals:user:123│
│ TTL: 5 minutes   │
└──────────────────┘
```

**Key Points:**
- Query Service only reads, never writes
- Redis cache reduces database load
- Read DB has materialized views for complex queries
- Stale data is acceptable (eventual consistency)

### Read Database Synchronization

**How does Read DB stay in sync with Write DB?**

```
┌──────────────────┐
│   EventBridge    │
│                  │
│ Event:           │
│ JournalEntry     │
│ Created          │
└────────┬─────────┘
         │
         │ Subscriber
         ▼
┌──────────────────┐
│  Query Service   │
│                  │
│ Event Handler:   │
│ • Parse event    │
│ • Transform data │
│ • Upsert to      │
│   read DB        │
│ • Invalidate     │
│   cache          │
└────────┬─────────┘
         │
         │ INSERT/UPDATE
         ▼
┌──────────────────┐
│  PostgreSQL      │
│  (Read DB)       │
└──────────────────┘
```

**Synchronization Guarantees:**
- **Eventually Consistent:** Read DB may be seconds behind Write DB
- **Idempotent:** Same event processed multiple times = same result
- **Ordered:** Events processed in order per entity (using sequence numbers)
- **Retry Logic:** Failed updates retry with exponential backoff

**What if synchronization fails?**
1. Event goes to Dead Letter Queue (DLQ)
2. CloudWatch alarm triggers
3. Manual intervention or automated repair
4. Reconciliation job runs nightly to catch missed events

---

## Event-Driven Architecture

### Event Types in MindFlow

**Domain Events:** Business-significant occurrences

| Event Name | Producer | Consumers | Purpose |
|------------|----------|-----------|---------|
| `UserRegistered` | Auth Service | Query, Notification, Logging | Initialize user data |
| `JournalEntryCreated` | Command Service | Query, AI Processing, Analytics, Search, Logging | Propagate new entry |
| `JournalEntryUpdated` | Command Service | Query, AI Processing, Analytics, Search | Sync updates |
| `JournalEntryDeleted` | Command Service | Query, Analytics, Search, Logging | Soft delete propagation |
| `AIInsightsGenerated` | AI Processing | Query, Notification, Analytics | Store and notify insights |
| `MoodRecorded` | Command Service | Query, Analytics | Track mood over time |
| `TagCreated` | Command Service | Query, Search | Tag management |
| `UserLoggedIn` | Auth Service | Analytics, Logging | Track sessions |

### Event Schema Design

**Standard Event Envelope:**

```json
{
  "eventId": "uuid-v4",
  "eventType": "JournalEntryCreated",
  "version": "1.0",
  "timestamp": "2025-10-25T20:30:00Z",
  "source": "command-service",
  "correlationId": "request-trace-id",
  "metadata": {
    "userId": "user-123",
    "tenantId": "tenant-456"
  },
  "payload": {
    "journalId": "journal-789",
    "title": "My reflection",
    "content": "Today was...",
    "mood": "happy",
    "tags": ["work", "gratitude"]
  }
}
```

**Design Principles:**
- **Self-contained:** Event includes all necessary data (no need to query)
- **Versioned:** Schema version for backward compatibility
- **Immutable:** Events are facts, never modified
- **Timestamped:** Ordered processing and debugging
- **Traceable:** Correlation ID links related events

### Event Sourcing (Partial Implementation)

MindFlow doesn't use full event sourcing, but applies the pattern selectively:

**Where we use Event Sourcing:**
- **Analytics Service:** All metrics derived from events (never updates, only appends)
- **Audit Log:** Every domain event stored permanently in MongoDB

**Where we don't:**
- **Transactional Data:** Journal entries stored as current state in PostgreSQL
- **Read Models:** Query database stores denormalized views, not event history

**Why partial Event Sourcing?**
- ✅ Audit trail and analytics need complete history
- ✅ Complexity lower than full event sourcing
- ✅ Faster queries (no need to replay events)
- ❌ Can't reconstruct past state (trade-off accepted)

---

## Key User Flows

### Flow 1: User Creates Journal Entry with AI Analysis

This is the most complex flow, demonstrating multiple patterns.

```
┌───────┐
│ User  │
└───┬───┘
    │
    │ (1) Writes entry in Angular app
    │     Title: "Reflection on Today"
    │     Content: "Work was stressful but productive..."
    │     Mood: "stressed"
    ▼
┌─────────────────┐
│ Angular Client  │
└────────┬────────┘
         │
         │ (2) GraphQL Mutation
         │     mutation CreateJournal {
         │       createJournalEntry(input: {...})
         │     }
         ▼
┌─────────────────┐
│ GraphQL Gateway │
└────────┬────────┘
         │
         │ (3) Validates JWT
         ▼
┌─────────────────┐
│  Auth Service   │ ─────► [Redis: Check session]
└────────┬────────┘
         │
         │ (4) gRPC: CreateJournalEntry
         ▼
┌─────────────────┐
│ Command Service │
│                 │
│ Business Logic: │
│ • Validate      │
│ • Check limits  │
│   (free: 5/mo)  │
│ • Generate ID   │
│ • Start txn     │
└────────┬────────┘
         │
         │ (5) INSERT journal entry
         ▼
┌─────────────────┐
│  PostgreSQL     │
│  (Write DB)     │
└────────┬────────┘
         │
         │ (6) COMMIT + Publish Event
         ▼
┌─────────────────┐
│  EventBridge    │
│                 │
│ Event:          │
│ JournalEntry    │
│ Created         │
└────────┬────────┘
         │
         ├────────────────┬────────────────┬────────────────┐
         │                │                │                │
         ▼                ▼                ▼                ▼
    ┌────────┐      ┌─────────┐      ┌─────────┐     ┌────────┐
    │ Query  │      │   SQS   │      │Analytics│     │Logging │
    │Service │      │ai-queue │      │ Service │     │Service │
    └───┬────┘      └────┬────┘      └────┬────┘     └───┬────┘
        │                │                │              │
        │ (7a)           │ (7b)           │ (7c)         │ (7d)
        │                │                │              │
        ▼                ▼                ▼              ▼
[Update Read DB]  [Queue for AI]  [Record metric] [Log event]
        │                │
        │                │
        │                │ (8) AI Processing polls queue
        │                ▼
        │          ┌─────────────┐
        │          │AI Processing│
        │          │   Service   │
        │          │             │
        │          │ • Parse     │
        │          │   content   │
        │          │ • Call      │
        │          │   Claude API│
        │          │ • Extract   │
        │          │   insights  │
        │          └──────┬──────┘
        │                 │
        │                 │ (9) Claude API Response
        │                 │     Insights: [
        │                 │       "Stress from work deadlines",
        │                 │       "Productivity increased",
        │                 │       "Consider work-life balance"
        │                 │     ]
        │                 ▼
        │          ┌─────────────┐
        │          │     SNS     │
        │          │ ai-results  │
        │          └──────┬──────┘
        │                 │
        │                 ├────────────────┬────────────────┐
        │                 │                │                │
        │                 ▼                ▼                ▼
        │          ┌─────────┐      ┌─────────┐      ┌─────────┐
        │          │ Query   │      │Analytics│      │Notify   │
        │          │ Service │      │ Service │      │ Service │
        │          └────┬────┘      └────┬────┘      └────┬────┘
        │               │                │                │
        │               │ (10a)          │ (10b)          │ (10c)
        │               ▼                ▼                ▼
        │         [Store          [Aggregate        [Send
        │          insights]       sentiment]        email]
        │
        │
        │ (11) Client polls or WebSocket notification
        │
        ▼
┌─────────────────┐
│ Angular Client  │ ◄── WebSocket: "AI insights ready!"
│                 │
│ Displays:       │
│ ✓ Entry saved   │
│ ✓ AI analyzing  │
│ ✓ Insights:     │
│   "You mentioned│
│    stress 3     │
│    times..."    │
└─────────────────┘
```

**Timeline:**
- **0ms:** User clicks "Save"
- **100ms:** Entry saved, returns 201 Created to client
- **150ms:** Events published to consumers
- **200ms:** Read DB updated, analytics recorded
- **500ms:** AI processing starts
- **3000ms:** Claude API responds
- **3200ms:** Insights stored and user notified
- **3500ms:** Client receives WebSocket notification and displays insights

**Key Design Points:**
1. **Fast Response:** User gets confirmation immediately, not after AI processing
2. **Asynchronous AI:** Expensive Claude API call doesn't block user
3. **Multiple Consumers:** Single event triggers many actions
4. **Real-time Updates:** WebSocket notifies user when insights ready
5. **Idempotency:** If AI processing fails, retry doesn't duplicate data

### Flow 2: User Views Dashboard (Read-Heavy)

```
┌───────┐
│ User  │
└───┬───┘
    │
    │ (1) Opens dashboard
    ▼
┌─────────────────┐
│ Angular Client  │
└────────┬────────┘
         │
         │ (2) GraphQL Query
         │     query Dashboard {
         │       recentEntries(limit: 10)
         │       moodTrends(days: 30)
         │       insights
         │     }
         ▼
┌─────────────────┐
│ GraphQL Gateway │
└────────┬────────┘
         │
         ├────────────────┬────────────────┐
         │                │                │
         │ (3) Parallel requests via gRPC │
         │                │                │
         ▼                ▼                ▼
    ┌────────┐      ┌─────────┐      ┌─────────┐
    │ Query  │      │Analytics│      │  Query  │
    │Service │      │ Service │      │ Service │
    └───┬────┘      └────┬────┘      └────┬────┘
        │                │                │
        │ (4)            │ (5)            │ (6)
        │                │                │
        ▼                ▼                ▼
   [Check Cache]   [Check Cache]   [Check Cache]
        │                │                │
        │ MISS           │ HIT            │ MISS
        ▼                │                ▼
   [Read DB]             │           [Read DB]
        │                │                │
        ▼                ▼                ▼
   [Cache Result]  [Return cached] [Cache Result]
        │            data]              │
        │                │                │
        └────────────────┴────────────────┘
                        │
                        │ (7) GraphQL merges results
                        ▼
                ┌─────────────────┐
                │ GraphQL Gateway │
                └────────┬────────┘
                         │
                         │ (8) Single JSON response
                         ▼
                ┌─────────────────┐
                │ Angular Client  │
                │                 │
                │ Renders:        │
                │ • Recent entries│
                │ • Mood chart    │
                │ • AI insights   │
                └─────────────────┘
```

**Performance Optimizations:**
- **Redis Caching:** 90% of dashboard requests hit cache (sub-10ms response)
- **Parallel Queries:** GraphQL fetches from multiple services concurrently
- **Denormalized Views:** Read DB has pre-joined data
- **TTL Strategy:** 
  - Recent entries: 1 minute TTL
  - Mood trends: 15 minutes TTL
  - User profile: 1 hour TTL

### Flow 3: Authentication Flow

```
┌───────┐
│ User  │
└───┬───┘
    │
    │ (1) Enters email/password
    ▼
┌─────────────────┐
│ Angular Client  │
└────────┬────────┘
         │
         │ (2) POST /auth/login
         ▼
┌─────────────────┐
│ GraphQL Gateway │
└────────┬────────┘
         │
         │ (3) gRPC: AuthenticateUser
         ▼
┌─────────────────┐
│  Auth Service   │
│                 │
│ • Validate      │
│   credentials   │
│ • Check bcrypt  │
│   hash          │
└────────┬────────┘
         │
         │ (4) SELECT user
         ▼
┌─────────────────┐
│  PostgreSQL     │ (User table in Auth DB)
└────────┬────────┘
         │
         │ (5) User found + password valid
         ▼
┌─────────────────┐
│  Auth Service   │
│                 │
│ • Generate JWT  │
│   (15min expiry)│
│ • Generate      │
│   Refresh Token │
│   (7 day expiry)│
│ • Store session │
└────────┬────────┘
         │
         │ (6) SETEX session in Redis
         ▼
┌─────────────────┐
│     Redis       │
│                 │
│ Key: session:123│
│ Value: {userId, │
│  roles, exp}    │
│ TTL: 7 days     │
└────────┬────────┘
         │
         │ (7) Publish event
         ▼
┌─────────────────┐
│  EventBridge    │
│                 │
│ Event:          │
│ UserLoggedIn    │
└────────┬────────┘
         │
         ├────────────────┐
         │                │
         ▼                ▼
    ┌────────┐      ┌─────────┐
    │Analytics      │Logging  │
    │ Service│      │ Service │
    └────────┘      └─────────┘
         │
         │ (8) Returns tokens
         ▼
┌─────────────────┐
│ Angular Client  │
│                 │
│ Stores:         │
│ • JWT in memory │
│ • Refresh token │
│   in httpOnly   │
│   cookie        │
└─────────────────┘
```

**Subsequent Authenticated Requests:**

```
┌─────────────────┐
│ Angular Client  │
│                 │
│ Every request:  │
│ Authorization:  │
│ Bearer <JWT>    │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ GraphQL Gateway │
│                 │
│ • Extract JWT   │
│ • Verify sig    │
│ • Check expiry  │
└────────┬────────┘
         │
         │ If JWT expired
         ▼
┌─────────────────┐
│  Auth Service   │
│                 │
│ • Read refresh  │
│   token from    │
│   cookie        │
│ • Validate      │
│ • Issue new JWT │
└─────────────────┘
```

**Security Features:**
- **JWT:** Stateless, includes userId + roles, signed with RS256
- **Refresh Token:** Longer-lived, stored in httpOnly cookie (prevents XSS)
- **Session in Redis:** Allows immediate revocation if needed
- **Token Rotation:** New refresh token issued with each JWT refresh
- **Rate Limiting:** 5 failed login attempts = 15 minute lockout

---

## Authentication & Authorization

### Authentication Strategy

**Token-Based Authentication (JWT):**

```
JWT Payload:
{
  "sub": "user-123",           # Subject (user ID)
  "email": "user@example.com",
  "roles": ["user", "premium"],
  "iat": 1698345600,           # Issued at
  "exp": 1698346500,           # Expires (15 minutes)
  "iss": "mindflow-auth"       # Issuer
}
```

**Why JWT?**
- ✅ Stateless (no database lookup on every request)
- ✅ Self-contained (includes user info)
- ✅ Works across microservices
- ✅ Standard (libraries available in all languages)

**Refresh Token Flow:**
- Access token (JWT): 15 minutes
- Refresh token: 7 days
- Refresh token rotates on each use (prevents replay attacks)

### Authorization Strategy

**Role-Based Access Control (RBAC):**

```
Roles:
├── anonymous  → Can register, login
├── user       → Can CRUD own journals (5/month limit)
├── premium    → Unlimited journals + AI insights
├── admin      → Can view all users, analytics
└── system     → Service-to-service communication
```

**Permission Checking:**

1. **Gateway Level (coarse-grained):**
   ```
   Request → Gateway → Check JWT roles → Allow/Deny
   ```

2. **Service Level (fine-grained):**
   ```
   Command Service checks:
   - Is user authenticated?
   - Does user have "premium" role?
   - Does user own this resource?
   - Has user exceeded rate limits?
   ```

**Row-Level Security:**
- Every resource has `userId` column
- Services filter queries: `WHERE userId = :currentUserId`
- PostgreSQL Row-Level Security policies enforce at DB level

### Service-to-Service Authentication

**mTLS (Mutual TLS) with Istio:**

```
Service A                    Service B
    │                            │
    │ (1) TLS Handshake          │
    ├───────────────────────────>│
    │                            │
    │ (2) Present certificate    │
    │    (Istio auto-injects)    │
    ├───────────────────────────>│
    │                            │
    │ (3) Verify cert            │
    │<───────────────────────────┤
    │                            │
    │ (4) Encrypted gRPC call    │
    ├───────────────────────────>│
    │                            │
    │ (5) Response               │
    │<───────────────────────────┤
```

**Benefits:**
- All inter-service communication is encrypted
- Services authenticate each other
- Zero trust network model
- No shared secrets (certs auto-rotated)

---

## Data Consistency Strategy

### Consistency Models by Data Type

| Data Type | Consistency Model | Rationale |
|-----------|------------------|-----------|
| **User Credentials** | Strong Consistency | Security-critical, must be immediately accurate |
| **Journal Entries** | Strong Consistency (write), Eventual (read) | Write must be durable, reads can lag slightly |
| **AI Insights** | Eventual Consistency | Generated async, delay acceptable |
| **Analytics** | Eventual Consistency | Trends don't need real-time accuracy |
| **Search Index** | Eventual Consistency | Search can be slightly stale |

### Handling Eventual Consistency

**Problem:** Read DB might be seconds behind Write DB

**Solutions:**

1. **Read-Your-Writes Consistency:**
   ```
   User creates entry → Command Service returns entry data immediately
   → Client caches it → Appears instantly in UI
   → Background: Event propagates to Read DB
   ```

2. **Version Vectors:**
   ```
   Each record has: lastModified timestamp
   Client includes: If-Modified-Since header
   Service returns: 304 Not Modified if unchanged
   ```

3. **Reconciliation Jobs:**
   ```
   Nightly job:
   - Compare Write DB vs Read DB
   - Find missing/outdated records
   - Re-sync and log discrepancies
   ```

### Transaction Boundaries

**Where we use transactions:**
- ✅ Creating journal entry + tags + mood (single atomic operation)
- ✅ User registration + initial profile setup
- ✅ Updating user subscription status + recording payment

**Where we don't:**
- ❌ Across services (no distributed transactions)
- ❌ Publishing events (fire-and-forget, eventual consistency)
- ❌ Updating read database (idempotent, retryable)

### Idempotency

**All event handlers are idempotent:**

```javascript
// Query Service event handler
async function handleJournalEntryCreated(event) {
  const { journalId, title, content, userId } = event.payload;
  
  // Upsert (insert or update) ensures idempotency
  await db.query(`
    INSERT INTO journals_view (id, title, content, user_id, updated_at)
    VALUES ($1, $2, $3, $4, NOW())
    ON CONFLICT (id) DO UPDATE SET
      title = EXCLUDED.title,
      content = EXCLUDED.content,
      updated_at = EXCLUDED.updated_at
  `, [journalId, title, content, userId]);
}
```

**Why idempotency matters:**
- Event might be delivered multiple times (SQS "at least once" delivery)
- Processing same event twice produces same result
- No duplicate data, no inconsistencies

---

## Scalability & Reliability

### Horizontal Scaling

**Stateless Services:**
- All services are stateless (session data in Redis)
- Can add/remove instances without coordination
- Load balanced via Kubernetes Service + Istio

**Auto-Scaling Triggers:**

| Service | Scale Trigger | Min | Max |
|---------|--------------|-----|-----|
| **GraphQL Gateway** | CPU > 70% | 2 | 10 |
| **Query Service** | CPU > 60% | 2 | 20 |
| **Command Service** | CPU > 70% OR request queue > 100 | 2 | 10 |
| **AI Processing** | SQS queue depth > 50 | 1 | 5 |

### Database Scaling

**PostgreSQL:**
- **Write DB:** Single primary instance (vertical scaling)
- **Read DB:** Multiple read replicas (horizontal scaling)
- **Connection Pooling:** PgBouncer (max 100 connections per service)

**Why not multi-master writes?**
- Simpler: Avoid conflict resolution
- CQRS: Writes are <10% of traffic
- Vertical scaling sufficient for expected load

**Redis:**
- **Cluster Mode:** 3 shards, 2 replicas each
- **Partition by:** User ID (consistent hashing)
- **Eviction Policy:** LRU (Least Recently Used)

### Caching Strategy

**Multi-Level Caching:**

```
Client Request
     │
     │ (1) Check service cache (Redis)
     ▼
┌─────────────┐
│   Redis     │  ← L1 Cache (sub-10ms)
└──────┬──────┘
       │ MISS
       ▼
┌─────────────┐
│ PostgreSQL  │  ← L2 Cache (10-50ms)
│  Read DB    │
└──────┬──────┘
       │ MISS
       ▼
┌─────────────┐
│ PostgreSQL  │  ← Source of Truth
│  Write DB   │     (50-100ms)
└─────────────┘
```

**Cache Invalidation:**
- **Write-Through:** Command Service updates DB, then invalidates cache
- **TTL-Based:** Short TTL for frequently changing data
- **Event-Based:** Event triggers cache invalidation across services

**Cache Key Pattern:**
```
journals:user:{userId}:recent          # Recent entries
mood:user:{userId}:trend:30d           # 30-day mood trend
analytics:global:daily:2025-10-25      # Daily stats
```

### Reliability Patterns

**Circuit Breaker:**
```
Service A → Service B
            │
            │ If B fails 5 times in 10s:
            ├─> OPEN circuit
            │   (stop calling B, return cached/default)
            │
            │ After 30s:
            ├─> HALF-OPEN
            │   (try 1 request)
            │
            │ If success:
            └─> CLOSE circuit
```

**Retry with Exponential Backoff:**
```
Attempt 1: Immediate
Attempt 2: Wait 1s
Attempt 3: Wait 2s
Attempt 4: Wait 4s
Attempt 5: Give up, send to DLQ
```

**Bulkhead Pattern:**
- Isolate thread pools per dependency
- If AI service is slow, doesn't block other operations
- Kubernetes resource limits enforce isolation

**Health Checks:**
```
Kubernetes probes:
- Liveness:  /health/live   (is process running?)
- Readiness: /health/ready  (can accept traffic?)
- Startup:   /health/startup (for slow-starting services)
```

### Disaster Recovery

**Backup Strategy:**
- **PostgreSQL:** Automated daily backups (7-day retention)
- **Redis:** RDB snapshots every 5 minutes
- **S3:** Versioning enabled, cross-region replication
- **EventBridge:** Events logged to S3 for replay

**Recovery Scenarios:**

| Scenario | Impact | Recovery Time | Procedure |
|----------|--------|---------------|-----------|
| Single pod crashes | None (auto-restart) | < 1 minute | Kubernetes restarts pod |
| Service deployment bug | Partial outage | < 5 minutes | Rollback deployment |
| Database read replica fails | Increased latency | < 2 minutes | Promote another replica |
| Database primary fails | Brief write outage | < 5 minutes | RDS auto-failover |
| Availability zone failure | Degraded | < 10 minutes | Traffic shifts to other AZs |
| Region failure | Full outage | < 4 hours | Failover to DR region (manual) |

---

## Design Decisions & Trade-offs

### 1. CQRS: Why Separate Read/Write?

**Decision:** Implement CQRS pattern with separate databases

**Pros:**
- ✅ Independent scaling (reads are 90% of traffic)
- ✅ Optimized data models (normalized writes, denormalized reads)
- ✅ Technology freedom (Spring Boot for writes, Node.js for reads)
- ✅ Clear separation of concerns

**Cons:**
- ❌ Eventual consistency (reads may lag)
- ❌ Increased complexity (two databases to manage)
- ❌ Higher operational cost

**Trade-off Accepted:** For MindFlow, the benefits outweigh complexity. Journal entries don't need immediate read consistency.

### 2. Microservices: Why Not a Monolith?

**Decision:** Microservices architecture with 10+ services

**Pros:**
- ✅ Independent deployment (update AI service without touching auth)
- ✅ Technology diversity (Node.js, Spring Boot, Python)
- ✅ Team autonomy (different teams own different services)
- ✅ Fault isolation (AI service crash doesn't break auth)

**Cons:**
- ❌ Increased operational complexity (10+ deployments)
- ❌ Distributed tracing needed
- ❌ Network latency between services

**Trade-off Accepted:** For a learning project demonstrating modern architecture, microservices showcase more skills than a monolith.

### 3. Event-Driven: Why Async Communication?

**Decision:** Use EventBridge + SQS for inter-service communication

**Pros:**
- ✅ Loose coupling (services don't know about each other)
- ✅ Easy to add new consumers (search service added later without changing command service)
- ✅ Resilience (if analytics down, events queue up)
- ✅ Scalability (async processing handles spikes)

**Cons:**
- ❌ Eventual consistency (changes propagate with delay)
- ❌ Debugging harder (trace events across services)
- ❌ Complexity (message formats, versioning)

**Trade-off Accepted:** Asynchronous architecture is standard for modern cloud applications. Slight delay acceptable for MindFlow use cases.

### 4. GraphQL: Why Not REST?

**Decision:** GraphQL for client-facing API

**Pros:**
- ✅ Client controls data shape (no over-fetching)
- ✅ Single request for complex queries (reduces round-trips)
- ✅ Strong typing (auto-generated TypeScript types)
- ✅ Real-time subscriptions (WebSocket)

**Cons:**
- ❌ Caching more complex than REST
- ❌ Learning curve for team
- ❌ Potentially expensive queries (needs rate limiting)

**Trade-off Accepted:** GraphQL improves frontend developer experience significantly. Caching complexity handled with Redis.

### 5. Polyglot Persistence: Why Multiple Databases?

**Decision:** Use 6 different data stores

| Data Store | Purpose |
|------------|---------|
| PostgreSQL (write) | Transactional data |
| PostgreSQL (read) | Denormalized views |
| TimescaleDB | Time-series analytics |
| Redis | Caching, sessions |
| MongoDB | Structured logs |
| Elasticsearch | Full-text search |

**Pros:**
- ✅ Right tool for the job (Elasticsearch optimized for search)
- ✅ Performance (time-series queries fast in TimescaleDB)
- ✅ Learning (demonstrates knowledge of different DB types)

**Cons:**
- ❌ Operational overhead (6 databases to manage)
- ❌ Cost (each database = separate service)
- ❌ Complexity (need expertise in multiple systems)

**Trade-off Accepted:** In production, would consolidate (use PostgreSQL for logs, skip Elasticsearch initially). For learning, demonstrates architectural variety.

### 6. Kubernetes: Why Not Just EC2?

**Decision:** Deploy on EKS (Kubernetes)

**Pros:**
- ✅ Container orchestration (auto-restart, scaling)
- ✅ Service discovery (services find each other)
- ✅ Rolling updates (zero-downtime deploys)
- ✅ Industry standard (most companies use Kubernetes)

**Cons:**
- ❌ Steep learning curve
- ❌ Complexity for small apps
- ❌ Higher cost than serverless

**Trade-off Accepted:** Kubernetes skills highly valued in job market. Worth the learning investment.

### 7. Istio: Why Service Mesh?

**Decision:** Use Istio for service-to-service communication

**Pros:**
- ✅ Automatic mTLS (secure by default)
- ✅ Traffic management (canary deployments, circuit breaking)
- ✅ Observability (automatic metrics, tracing)
- ✅ No code changes (sidecar injection)

**Cons:**
- ❌ Significant complexity
- ❌ Resource overhead (sidecar per pod)
- ❌ Debugging can be harder

**Trade-off Accepted:** Istio demonstrates advanced Kubernetes knowledge. In real project, might start without and add later if needed.

---

## Summary

MindFlow's architecture demonstrates production-grade patterns:

1. **Microservices** with clear boundaries and responsibilities
2. **CQRS** for optimal read/write performance
3. **Event-Driven** for loose coupling and scalability
4. **Multiple data stores** for specialized workloads
5. **Kubernetes** for container orchestration
6. **Istio** for service mesh capabilities
7. **Strong security** with JWT + mTLS
8. **Observability** built-in from day one

The architecture balances **learning value** (demonstrates many modern patterns) with **practical feasibility** (can be built by one developer in 3 months).

Key strengths for job interviews:
- ✅ Explains complex systems clearly
- ✅ Justifies architectural decisions
- ✅ Understands trade-offs
- ✅ Demonstrates knowledge beyond coding (systems thinking)

This architecture serves as the blueprint for building MindFlow.
