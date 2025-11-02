# MindFlow - AI-Powered Journaling Platform

## Project Overview

MindFlow is a production-grade microservices application demonstrating modern cloud-native architecture, event-driven design, and AI integration. Built as a portfolio project showcasing enterprise-level system design and full-stack development skills.

**Vision:** Transform daily journaling into actionable insights using AI. Users write reflections, and Claude AI analyzes patterns, tracks mood trends, and provides personalized recommendations.

### Project Stats
- **Duration:** 12 weeks implementation timeline
- **Services:** 10+ microservices
- **Cloud Platform:** AWS (EKS, RDS, S3, SQS, SNS, EventBridge)
- **Cost:** ~$300-400 for full implementation
- **Languages:** TypeScript, Java, Python, SQL
- **Databases:** PostgreSQL (write/read), TimescaleDB, MongoDB, Redis, Elasticsearch

---

## Core Architecture Patterns

### 1. CQRS (Command Query Responsibility Segregation)
- **Write Path:** Command Service (Spring Boot) → PostgreSQL Write DB → Event Publishing
- **Read Path:** Query Service (Node.js) → PostgreSQL Read DB (denormalized) → Redis Cache
- **Benefit:** Independent scaling, optimized data models for reads vs writes

### 2. Event-Driven Architecture
- **Event Bus:** AWS EventBridge
- **Message Queues:** SQS for reliable delivery, SNS for pub/sub
- **Pattern:** Services communicate via events, not direct calls
- **Benefit:** Loose coupling, easy to add new consumers, natural retry handling

### 3. Microservices Architecture
```
Frontend (Angular 20)
    ↓
GraphQL Gateway (Apollo)
    ↓
┌────────────────┬─────────────────┬─────────────────┐
│ Auth Service   │ Command Service │ Query Service   │
│ (Node.js)      │ (Spring Boot)   │ (NestJS)        │
└────────────────┴─────────────────┴─────────────────┘
    ↓
┌────────────────┬─────────────────┬─────────────────┐
│ AI Processing  │ Analytics       │ Search Service  │
│ (Python)       │ (Node.js)       │ (Node.js)       │
└────────────────┴─────────────────┴─────────────────┘
```

### 4. Polyglot Persistence Strategy

| Database | Purpose | Used By |
|----------|---------|---------|
| **PostgreSQL (Write)** | Source of truth, transactional data | Command Service |
| **PostgreSQL (Read)** | Denormalized views, optimized queries | Query Service |
| **TimescaleDB** | Time-series analytics, mood trends | Analytics Service |
| **Redis** | Caching, sessions, rate limiting | All services |
| **MongoDB** | Structured logs, audit trails | Logging Service |
| **Elasticsearch** | Full-text search on journal entries | Search Service |
| **S3** | Media files (images, attachments) | Media Service |

---

## Technology Stack

### Frontend
- **Angular 20** - Modern reactive UI with standalone components
- **Angular Material** - Component library
- **RxJS** - Reactive programming
- **Apollo Client** - GraphQL state management
- **Chart.js** - Data visualization for analytics dashboard
- **PWA** - Progressive Web App capabilities

### Backend Services
- **Node.js + Express/NestJS** - Auth, Query, Analytics, Search, Notification services
- **Spring Boot 3.2** - Command service (write operations)
- **Python + FastAPI** - AI processing service
- **GraphQL (Apollo Server)** - API gateway
- **gRPC** - Inter-service communication

### Infrastructure
- **AWS EKS** - Kubernetes cluster
- **Istio** - Service mesh (mTLS, traffic management)
- **Terraform** - Infrastructure as Code
- **Docker** - Containerization
- **Helm** - Kubernetes package manager
- **GitHub Actions** - CI/CD pipelines

### Observability
- **Prometheus** - Metrics collection
- **Grafana** - Visualization dashboards
- **Jaeger** - Distributed tracing
- **CloudWatch** - AWS-native monitoring

---

## Key Data Models

### Core Entities

**Users:**
```typescript
interface User {
  id: UUID
  email: string
  displayName: string
  createdAt: timestamp
  settings: UserSettings
  gdprConsent: GDPRConsent
}
```

**Journal Entries:**
```typescript
interface JournalEntry {
  id: UUID
  userId: UUID
  date: DATE  // Unique per user
  title: string
  content: string  // Markdown, max 10,000 chars
  mood: 'ecstatic' | 'happy' | 'neutral' | 'sad' | 'anxious' | 'angry'
  tags: string[]
  isPrivate: boolean  // Excludes from AI
  version: number  // Optimistic locking
  wordCount: number
  createdAt: timestamp
  updatedAt: timestamp
}
```

**AI Insights:**
```typescript
interface JournalInsight {
  id: UUID
  userId: UUID
  type: 'weekly' | 'monthly' | 'yearly' | 'custom'
  summary: string
  themes: Theme[]
  moodTrends: MoodTrends
  suggestions: string[]
  entriesAnalyzed: number
  generatedAt: timestamp
}
```

### Event Schema
All domain events follow this structure:
```typescript
interface DomainEvent {
  eventId: UUID
  eventType: string  // e.g., "JournalEntryCreated"
  aggregateId: UUID
  version: string
  timestamp: ISO8601
  correlationId: UUID
  metadata: {
    userId: UUID
    source: string  // Service name
  }
  payload: any
}
```

---

## Critical Flows

### 1. Create Journal Entry with AI Analysis
```
1. User writes entry in Angular app
2. GraphQL mutation → Gateway → Command Service
3. Command Service:
   - Validates entry
   - Saves to PostgreSQL (write DB)
   - Publishes "JournalEntryCreated" event
4. Event consumers (parallel):
   - Query Service: Updates read DB
   - AI Processing: Queues for analysis
   - Analytics Service: Records metrics
   - Logging Service: Audit log
5. AI Processing (async):
   - Polls SQS queue
   - Calls Claude API with entry content
   - Publishes "AIInsightGenerated" event
6. Query Service: Stores insight
7. WebSocket notifies user: "Insights ready!"
```

**Timeline:** 100ms to save entry, 3-5 seconds for AI insights

### 2. User Views Dashboard
```
1. GraphQL query → Gateway
2. Gateway makes parallel gRPC calls:
   - Query Service: Recent entries
   - Analytics Service: Mood trends
   - Query Service: AI insights
3. Redis cache check (90% hit rate)
4. GraphQL merges results → Single JSON response
5. Frontend renders dashboard
```

**Performance:** Sub-50ms for cached requests

---

## Database Schemas

### PostgreSQL Write DB (mindflow_write)

**Core Tables:**
- `users` - User accounts with GDPR consent
- `user_settings` - Preferences and notification settings
- `journal_entries` - Main journal data (normalized)
- `tags` - Tag definitions (normalized)
- `journal_entry_tags` - Many-to-many relationship
- `attachments` - S3 references for media files
- `user_streaks` - Writing streak tracking

**Key Indexes:**
```sql
CREATE INDEX idx_entries_user_date ON journal_entries(user_id, date DESC)
WHERE deleted_at IS NULL;

CREATE INDEX idx_entries_active ON journal_entries(user_id, date DESC)
WHERE deleted_at IS NULL;
```

### PostgreSQL Read DB (mindflow_read)

**Materialized Views:**
- `journals_view` - Denormalized with tags, attachments, user info
- `user_profile_view` - Complete user profile with statistics
- `mood_calendar_cache` - Pre-computed mood calendar

**Refresh Strategy:** Concurrent refresh every 30 seconds

### TimescaleDB (mindflow_analytics)

**Hypertables:**
- `journal_insights` - AI-generated insights over time
- `mood_events` - Time-series mood data
- `user_activity_events` - Engagement metrics

**Continuous Aggregates:**
- `mood_daily_summary` - Pre-computed daily mood stats
- `user_weekly_activity` - Weekly engagement metrics

**Retention Policies:**
- Raw mood events: 1 year
- Activity events: 6 months
- Insights: Forever

### Redis Cache Patterns

```
session:{sessionId}               → User session (7 days TTL)
user:{userId}:profile            → User profile (1 hour TTL)
journals:user:{userId}:recent    → Recent entries (5 min TTL)
mood:user:{userId}:trend:{days}  → Mood trends (15 min TTL)
ratelimit:{identifier}:{window}  → Rate limiting counters
ai:queue:{journalId}             → AI processing status
ws:user:{userId}                 → WebSocket connections
```

### Elasticsearch Index

**Index:** `journal_entries`
- Full-text search with custom analyzer
- Faceted search (mood, tags, date ranges)
- Highlights in search results
- Tag autocomplete

---

## Security & Compliance

### Authentication
- **JWT tokens:** 15-minute expiry, RS256 signature
- **Refresh tokens:** 7 days, httpOnly cookie, rotation on use
- **Sessions:** Stored in Redis for immediate revocation

### Authorization
- **RBAC Roles:** anonymous, user, premium, admin, system
- **Row-Level Security:** PostgreSQL RLS policies
- **Service-to-Service:** mTLS via Istio

### GDPR Compliance
- **Soft deletes:** `deleted_at` timestamp for audit trail
- **Data export:** Full user data export capability
- **Right to erasure:** Hard delete after 7-year retention
- **Consent tracking:** Versioned consent with IP/user-agent
- **Audit logs:** 7-year retention in MongoDB

### Encryption
- **At rest:** AES-256 for all databases
- **In transit:** TLS 1.3 for external, mTLS for internal
- **Secrets:** AWS Secrets Manager with automatic rotation

---

## Development Workflow

### Local Development
```bash
# Start all infrastructure
docker-compose up -d

# Install dependencies
npm run install:all

# Start services
npm run dev

# Frontend
cd frontend/mindflow-app
npm start
```

**Access Points:**
- Frontend: http://localhost:4200
- GraphQL Playground: http://localhost:4000/graphql
- Mailhog: http://localhost:8025

### Environment Variables
Required in `.env`:
```bash
# Database
DB_HOST=localhost
DB_PORT=5432
DB_NAME=mindflow_write
DB_USER=mindflow
DB_PASSWORD=dev_password_change_in_prod

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379

# JWT
JWT_SECRET=dev_jwt_secret_change_in_prod

# Claude AI
ANTHROPIC_API_KEY=your_api_key_here
```

### Testing Strategy
```bash
# Unit tests
npm test

# Integration tests
npm run test:integration

# E2E tests (Cypress)
npm run test:e2e

# Load tests (k6)
npm run test:load
```

---

## Deployment

### Infrastructure Provisioning
```bash
cd infrastructure/terraform
terraform init
terraform plan
terraform apply
```

### Kubernetes Deployment
```bash
# Deploy services
kubectl apply -k infrastructure/kubernetes/base

# Check status
kubectl get pods -n mindflow

# View logs
kubectl logs -f deployment/command-service -n mindflow
```

### CI/CD Pipeline
1. **Build:** Docker images tagged with git SHA
2. **Test:** Unit, integration, security scans
3. **Deploy:** Rolling update with health checks
4. **Verify:** Smoke tests, automatic rollback on failure

---

## Key Design Decisions

### Why CQRS?
- ✅ Independent scaling (reads are 90% of traffic)
- ✅ Optimized data models
- ✅ Technology freedom per service
- ❌ Eventual consistency (acceptable for this use case)

### Why Microservices?
- ✅ Independent deployment and scaling
- ✅ Technology diversity
- ✅ Fault isolation
- ❌ Operational complexity (worth it for portfolio value)

### Why Event-Driven?
- ✅ Loose coupling between services
- ✅ Easy to add new features without modifying existing services
- ✅ Natural audit trail
- ❌ Debugging harder (mitigated with distributed tracing)

### Why GraphQL?
- ✅ Client controls data shape (no over-fetching)
- ✅ Single request for complex queries
- ✅ Strong typing with auto-generated types
- ✅ Real-time subscriptions
- ❌ Caching complexity (solved with Redis)

### Why Kubernetes?
- ✅ Industry standard
- ✅ Auto-scaling, self-healing
- ✅ Declarative configuration
- ❌ Steep learning curve (valuable skill to demonstrate)

---

## Project Structure

```
mindflow/
├── docs/                         # Complete documentation
│   ├── README.md                 # Project overview
│   ├── system-architecture.md    # Architecture deep dive
│   ├── database-schema.md        # All database schemas
│   ├── infrastructure-overview.md # Cloud architecture
│   ├── week-by-week-plan.md     # Implementation schedule
│   └── mindflow-implementation-plan.md
│
├── services/                     # Microservices
│   ├── auth-service/            # User authentication (Node.js)
│   ├── command-service/         # Write operations (Spring Boot)
│   ├── query-service/           # Read operations (NestJS)
│   ├── ai-service/              # Claude integration (Python)
│   ├── analytics-service/       # Time-series analytics (Node.js)
│   ├── search-service/          # Elasticsearch queries (Node.js)
│   ├── notification-service/    # Email/push (Node.js)
│   ├── logging-service/         # Centralized logging (Node.js)
│   ├── media-service/           # File uploads (Node.js)
│   └── graphql-gateway/         # API gateway (Apollo)
│
├── frontend/                    # Client applications
│   └── mindflow-app/           # Angular 20 SPA
│
├── infrastructure/              # IaC and deployment
│   ├── terraform/              # AWS infrastructure
│   │   ├── modules/
│   │   ├── environments/
│   │   └── main.tf
│   ├── kubernetes/             # K8s manifests
│   │   ├── base/
│   │   └── overlays/
│   └── scripts/                # Helper scripts
│
├── .github/
│   └── workflows/              # CI/CD pipelines
│
├── docker-compose.yml          # Local development
└── README.md
```

---

## Implementation Roadmap

### Phase 1: Foundation (Weeks 1-4) ✅ Planned
- ✅ Project architecture and planning
- ✅ Database schema design
- ✅ Infrastructure setup (local + AWS)
- [ ] Core services (Auth, Command, Query)
- [ ] Basic Angular frontend

### Phase 2: Core Features (Weeks 5-8)
- [ ] Journal CRUD operations
- [ ] AI processing integration (Claude API)
- [ ] GraphQL gateway
- [ ] Redis caching layer
- [ ] Full-text search

### Phase 3: Advanced Features (Weeks 9-12)
- [ ] Analytics service and dashboard
- [ ] Notification service
- [ ] Media upload service
- [ ] Real-time features (WebSocket)
- [ ] PWA capabilities

### Phase 4: Production Readiness (Weeks 13-16)
- [ ] Kubernetes deployment with Istio
- [ ] CI/CD pipeline automation
- [ ] Comprehensive testing
- [ ] Monitoring and observability
- [ ] Security hardening

---

## Common Commands

### Docker
```bash
# Start infrastructure
docker-compose up -d

# View logs
docker-compose logs -f [service-name]

# Stop all
docker-compose down
```

### Database
```bash
# Connect to PostgreSQL
psql -h localhost -U mindflow -d mindflow_write

# Check event store
SELECT * FROM domain_events ORDER BY created_at DESC LIMIT 10;

# Refresh materialized view
REFRESH MATERIALIZED VIEW CONCURRENTLY journals_view;
```

### Kubernetes
```bash
# Get pods
kubectl get pods -n mindflow

# View logs
kubectl logs -f deployment/[service] -n mindflow

# Port forward
kubectl port-forward svc/graphql-gateway 4000:4000 -n mindflow

# Scale deployment
kubectl scale deployment command-service --replicas=3 -n mindflow
```

### Monitoring
```bash
# Access Grafana
kubectl port-forward svc/grafana 3000:3000 -n mindflow-monitoring

# Access Jaeger
kubectl port-forward svc/jaeger-query 16686:16686 -n mindflow-monitoring

# View Prometheus targets
kubectl port-forward svc/prometheus-server 9090:9090 -n mindflow-monitoring
```

---

## Performance Targets

- **API Response Time:** P95 < 200ms
- **GraphQL Query:** P95 < 100ms (with cache)
- **AI Analysis:** < 5 seconds per entry
- **Cache Hit Rate:** > 90% for read queries
- **Uptime:** 99.9% (< 44 minutes downtime/month)

---

## Cost Breakdown

**Development (Local):** $0
**Staging (AWS):** ~$80/month
**Production (AWS):** ~$300-400/month

**Cost Optimization:**
- Use spot instances for EKS nodes (70% savings)
- Auto-scaling to match demand
- S3 lifecycle policies for old media
- Reserved instances for predictable workloads

---

## Resources

### Documentation
- [System Architecture](../docs/system-architecture.md) - Detailed service interactions
- [Database Schema](../docs/database-schema.md) - Complete data models
- [Infrastructure](../docs/infrastructure-overview.md) - Cloud architecture
- [Implementation Plan](../docs/week-by-week-plan.md) - Week-by-week schedule

### External Resources
- [Anthropic Claude API](https://docs.anthropic.com/)
- [AWS EKS Best Practices](https://aws.github.io/aws-eks-best-practices/)
- [Istio Documentation](https://istio.io/latest/docs/)
- [GraphQL Best Practices](https://graphql.org/learn/best-practices/)

---

## Development Guidelines

### Code Style
- **TypeScript/JavaScript:** ESLint + Prettier
- **Java:** Google Java Style Guide
- **Python:** Black + isort
- **Commits:** Conventional Commits format

### Git Workflow
- Feature branches: `feature/description`
- Bug fixes: `fix/description`
- Merge to `main` via PR with approval
- Squash commits on merge

### API Design
- REST: Use proper HTTP methods and status codes
- GraphQL: Follow naming conventions (Query, Mutation, Subscription)
- gRPC: Use protocol buffers v3
- Always version APIs (v1, v2)

### Testing Requirements
- Unit tests: 80%+ coverage
- Integration tests for critical flows
- E2E tests for user journeys
- Load tests before major releases

---

## Troubleshooting

### Common Issues

**Service won't start:**
- Check environment variables in `.env`
- Verify database connection: `docker-compose ps`
- Check logs: `docker-compose logs [service]`

**Event not processing:**
- Check EventBridge rules
- Verify SQS queue visibility
- Check DLQ for failed messages
- Review service logs for errors

**Database slow:**
- Check index usage: `SELECT * FROM pg_stat_user_indexes`
- Review query plans: `EXPLAIN ANALYZE [query]`
- Check connection pool: `SELECT * FROM pg_stat_activity`

**Cache not working:**
- Verify Redis connection
- Check TTL values
- Review cache invalidation logic
- Monitor hit/miss rates in Grafana

---

## Contact & Support

**Project Maintainer:** [Your Name]
**Repository:** https://github.com/yourusername/mindflow
**Documentation:** See `/docs` folder
**Issues:** GitHub Issues

---

*Last Updated: 2025-10-25*
