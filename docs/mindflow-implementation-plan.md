# 🚀 MindFlow: The Complete Overengineered Implementation Plan

## Executive Summary

**Project:** MindFlow - Enterprise-Grade AI Journaling Platform  
**Timeline:** 12 weeks (3 months)  
**Cost:** ~$300 (AWS + services)  
**Resume Impact:** 🔥🔥🔥 (Senior/Lead level showcase)

**Tech Stack Highlights:**
- Frontend: Angular 20, GraphQL, PWA
- Backend: Spring Boot, Node.js (NestJS), Python (FastAPI), gRPC
- Infrastructure: AWS EKS, Terraform, Istio Service Mesh
- Architecture: CQRS + Event Sourcing, Microservices
- AI: LangChain (multi-model: Claude + GPT-4)
- Auth: AWS Cognito + JWT
- Observability: Prometheus + Grafana + Jaeger
- CI/CD: GitHub Actions with advanced testing

---

## 🏗️ Enhanced Architecture

```
┌────────────────────────────────────────────────────────────────────┐
│                         CLIENT LAYER                               │
│                                                                    │
│  ┌─────────────────┐  ┌─────────────────┐  ┌──────────────────┐ │
│  │  Angular 20 SPA │  │  Mobile PWA     │  │   Admin Portal   │ │
│  │  • GraphQL Client│  │  • Offline Mode │  │   • React (opt)  │ │
│  │  • Apollo Client │  │  • IndexedDB    │  │   • Metrics View │ │
│  │  • Signals API   │  │  • Push Notifs  │  │                  │ │
│  └────────┬────────┘  └────────┬────────┘  └──────┬───────────┘ │
└───────────┼────────────────────┼────────────────────┼─────────────┘
            │                    │                    │
            └────────────────────▼────────────────────┘
                                 │
┌────────────────────────────────▼────────────────────────────────────┐
│                         EDGE LAYER                                  │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │  CloudFront + WAF                                            │  │
│  │  • DDoS protection                                           │  │
│  │  • Geo-blocking                                              │  │
│  │  • Cache rules                                               │  │
│  └───────────────────────┬──────────────────────────────────────┘  │
└───────────────────────────┼──────────────────────────────────────────┘
                            │
┌───────────────────────────▼──────────────────────────────────────────┐
│                    API GATEWAY LAYER                                 │
│  ┌──────────────────────────────────────────────────────────────┐   │
│  │  Application Load Balancer (ALB)                             │   │
│  │  • SSL termination (ACM)                                     │   │
│  │  • Health checks                                             │   │
│  │  • Path-based routing                                        │   │
│  └───────────────────────┬──────────────────────────────────────┘   │
│                          │                                           │
│  ┌───────────────────────▼──────────────────────────────────────┐   │
│  │  Kong API Gateway (K8s Ingress)                              │   │
│  │  • Rate limiting (Redis-backed)                              │   │
│  │  • JWT validation                                            │   │
│  │  • Request transformation                                    │   │
│  │  • Circuit breaker                                           │   │
│  │  • GraphQL + REST routing                                    │   │
│  └───────────────────────┬──────────────────────────────────────┘   │
└───────────────────────────┼──────────────────────────────────────────┘
                            │
┌───────────────────────────▼──────────────────────────────────────────┐
│                   SERVICE MESH LAYER (Istio)                         │
│  ┌──────────────────────────────────────────────────────────────┐   │
│  │  • mTLS between all services                                 │   │
│  │  • Traffic management (canary, A/B testing)                  │   │
│  │  • Fault injection (chaos engineering)                       │   │
│  │  • Distributed tracing (Jaeger integration)                  │   │
│  │  • Service-to-service auth                                   │   │
│  └───────────────────────┬──────────────────────────────────────┘   │
└───────────────────────────┼──────────────────────────────────────────┘
                            │
┌───────────────────────────▼──────────────────────────────────────────┐
│                    MICROSERVICES LAYER (EKS)                         │
│                                                                      │
│  ┌──────────────────┐  ┌──────────────────┐  ┌─────────────────┐   │
│  │   GraphQL API    │  │   Auth Service   │  │  Command Service│   │
│  │   Gateway        │  │   (Node.js)      │  │  (Spring Boot)  │   │
│  │   (Apollo)       │  │                  │  │  CQRS Write Side│   │
│  │                  │  │  • Cognito integration              │   │
│  │  Unified schema  │  │  • JWT issuer    │  │  • Journal CRUD │   │
│  │  for all services│  │  • OAuth2        │  │  • Event Store  │   │
│  └────────┬─────────┘  └────────┬─────────┘  └────────┬────────┘   │
│           │                     │                      │             │
│           │              ┌──────▼──────┐        ┌─────▼────────┐    │
│           │              │  AWS Cognito│        │ PostgreSQL   │    │
│           │              │  User Pool  │        │ (Write DB)   │    │
│           │              └─────────────┘        └──────────────┘    │
│           │                                                          │
│  ┌────────▼─────────┐  ┌──────────────────┐  ┌─────────────────┐   │
│  │  Query Service   │  │  AI Orchestrator │  │  Notification   │   │
│  │  (NestJS)        │  │  Service         │  │  Service        │   │
│  │  CQRS Read Side  │  │  (Python+FastAPI)│  │  (Node.js)      │   │
│  │                  │  │                  │  │                 │   │
│  │  • Projections   │  │  • LangChain     │  │  • SQS Consumer │   │
│  │  • Denormalized  │  │  • Multi-model   │  │  • AWS SES      │   │
│  │  • Read-optimized│  │  • Token mgmt    │  │  • SNS Topics   │   │
│  └────────┬─────────┘  └────────┬─────────┘  └────────┬────────┘   │
│           │                     │                      │             │
│    ┌──────▼──────┐       ┌──────▼──────┐       ┌──────▼────────┐   │
│    │ PostgreSQL  │       │   Redis     │       │   AWS SES     │   │
│    │ (Read DB)   │       │  (Cache +   │       │               │   │
│    │ + Materialized│      │  Embeddings)│       └───────────────┘   │
│    │   Views      │       └─────────────┘                           │
│    └──────────────┘                                                 │
│                                                                      │
│  ┌──────────────────┐  ┌──────────────────┐  ┌─────────────────┐   │
│  │  Analytics       │  │  Search Service  │  │  Media Service  │   │
│  │  Service         │  │  (Node.js)       │  │  (Node.js)      │   │
│  │  (Node.js)       │  │                  │  │                 │   │
│  │                  │  │  • OpenSearch    │  │  • S3 uploads   │   │
│  │  • Aggregations  │  │  • Full-text     │  │  • Pre-signed   │   │
│  │  • Reporting     │  │  • Fuzzy match   │  │    URLs         │   │
│  └────────┬─────────┘  └────────┬─────────┘  └────────┬────────┘   │
│           │                     │                      │             │
│    ┌──────▼──────┐       ┌──────▼──────┐       ┌──────▼────────┐   │
│    │ TimescaleDB │       │ OpenSearch  │       │   AWS S3      │   │
│    │(Time-series)│       │ (Managed)   │       │               │   │
│    └─────────────┘       └─────────────┘       └───────────────┘   │
│                                                                      │
│  ┌──────────────────┐  ┌──────────────────┐  ┌─────────────────┐   │
│  │  Logging Service │  │  Workflow Engine │  │  Projection     │   │
│  │  (Node.js)       │  │  (Step Functions)│  │  Builder        │   │
│  │                  │  │                  │  │  (Node.js)      │   │
│  │  • Structured    │  │  • AI workflows  │  │                 │   │
│  │    logs          │  │  • Sagas         │  │  • Event replay │   │
│  │  • Aggregation   │  │  • Retries       │  │  • Read models  │   │
│  └────────┬─────────┘  └──────────────────┘  └────────┬────────┘   │
│           │                                            │             │
│    ┌──────▼──────┐                              ┌──────▼────────┐   │
│    │  MongoDB    │                              │  DynamoDB     │   │
│    │  (Logs)     │                              │  (Projections)│   │
│    └─────────────┘                              └───────────────┘   │
│                                                                      │
│                          gRPC Communication                          │
│  ┌──────────────────────────────────────────────────────────────┐   │
│  │  Inter-service calls use gRPC for performance                │   │
│  │  • Command → Query (invalidation)                            │   │
│  │  • AI → Command (insights storage)                           │   │
│  │  • Analytics → Query (data fetch)                            │   │
│  └──────────────────────────────────────────────────────────────┘   │
└──────────────────────────────────────────────────────────────────────┘
                            │
┌───────────────────────────▼──────────────────────────────────────────┐
│                   EVENT BACKBONE                                     │
│                                                                      │
│  ┌──────────────────────────────────────────────────────────────┐   │
│  │                  AWS EventBridge (Event Bus)                 │   │
│  │  ┌───────────────────────────────────────────────────────┐  │   │
│  │  │  Domain Events:                                        │  │   │
│  │  │  • journal.created                                     │  │   │
│  │  │  • journal.updated                                     │  │   │
│  │  │  • journal.deleted                                     │  │   │
│  │  │  • user.registered                                     │  │   │
│  │  │  • ai.analysis.requested                               │  │   │
│  │  │  • ai.insight.generated                                │  │   │
│  │  │  • mood.tracked                                        │  │   │
│  │  └───────────────────────────────────────────────────────┘  │   │
│  └────────┬──────────────────────────┬────────────────────────────┘│
│           │                          │                              │
│  ┌────────▼─────────┐       ┌────────▼─────────┐                   │
│  │   Amazon SQS     │       │   Amazon SNS     │                   │
│  │                  │       │                  │                   │
│  │ Queues:          │       │ Topics:          │                   │
│  │ • ai-queue       │       │ • notifications  │                   │
│  │ • email-queue    │       │ • webhooks       │                   │
│  │ • analytics-queue│       │ • system-alerts  │                   │
│  │ • search-index   │       │                  │                   │
│  │ • projection-sync│       │ Fan-out to:      │                   │
│  │                  │       │ • Email (SES)    │                   │
│  │ Each with DLQ    │       │ • Push (SNS)     │                   │
│  └──────────────────┘       │ • Webhooks       │                   │
│                             └──────────────────┘                   │
│                                                                      │
│  ┌──────────────────────────────────────────────────────────────┐   │
│  │               Event Store (PostgreSQL + DynamoDB)            │   │
│  │  • All domain events stored immutably                        │   │
│  │  • PostgreSQL for relational queries                         │   │
│  │  • DynamoDB for high-throughput event streaming              │   │
│  │  • Event replay capability                                   │   │
│  └──────────────────────────────────────────────────────────────┘   │
└──────────────────────────────────────────────────────────────────────┘
                            │
┌───────────────────────────▼──────────────────────────────────────────┐
│                   OBSERVABILITY STACK                                │
│                                                                      │
│  ┌─────────────┐  ┌──────────────┐  ┌─────────────┐  ┌──────────┐  │
│  │ Prometheus  │→ │   Grafana    │  │   Jaeger    │  │  Kiali   │  │
│  │  (Metrics)  │  │ (Dashboards) │  │  (Traces)   │  │ (Mesh UI)│  │
│  └──────┬──────┘  └──────────────┘  └──────┬──────┘  └────────── ┘  │
│         │                                   │                        │
│         └───────────────┬───────────────────┘                        │
│                         │                                            │
│  ┌──────────────────────▼────────────────────────┐                   │
│  │         OpenTelemetry Collector               │                   │
│  │  • Trace collection                           │                   │
│  │  • Metric aggregation                         │                   │
│  │  • Log forwarding                             │                   │
│  └──────────────────────┬────────────────────────┘                   │
│                         │                                            │
│  ┌──────────────────────▼────────────────────────┐                   │
│  │  CloudWatch + X-Ray (AWS Integration)         │                   │
│  │  • Hybrid observability                       │                   │
│  │  • Cost tracking                              │                   │
│  │  • Anomaly detection                          │                   │
│  └───────────────────────────────────────────────┘                   │
└──────────────────────────────────────────────────────────────────────┘
```

---

## 📚 Enhanced Data Models

### Event Store Schema

```typescript
// Event sourcing - immutable event log
interface DomainEvent {
  id: string; // UUID
  aggregateId: string; // e.g., userId or journalId
  aggregateType: 'User' | 'JournalEntry' | 'AIInsight';
  eventType: string; // e.g., 'JournalCreated', 'MoodUpdated'
  eventVersion: number; // Schema version for evolution
  data: Record<string, any>; // Event payload
  metadata: {
    userId: string;
    timestamp: string; // ISO 8601
    correlationId: string; // For distributed tracing
    causationId: string; // Previous event that caused this
    ipAddress?: string;
    userAgent?: string;
  };
  sequence: number; // Auto-incrementing per aggregate
  createdAt: string;
}

// Specific event types
interface JournalCreatedEvent extends DomainEvent {
  eventType: 'JournalCreated';
  data: {
    title: string;
    content: string;
    mood?: string;
    tags: string[];
    isPrivate: boolean;
  };
}

interface MoodTrackedEvent extends DomainEvent {
  eventType: 'MoodTracked';
  data: {
    journalId: string;
    mood: 'ecstatic' | 'happy' | 'neutral' | 'sad' | 'anxious' | 'angry';
    previousMood?: string;
  };
}

interface AIInsightGeneratedEvent extends DomainEvent {
  eventType: 'AIInsightGenerated';
  data: {
    journalId: string;
    insightType: 'weekly' | 'monthly' | 'pattern';
    summary: string;
    themes: Theme[];
    modelUsed: 'claude-3-5-sonnet' | 'gpt-4-turbo';
    tokensUsed: number;
    confidenceScore: number;
  };
}
```

### Command Models (Write Side)

```typescript
// Commands - express intent
interface CreateJournalCommand {
  commandId: string; // Idempotency key
  userId: string;
  data: {
    title: string;
    content: string;
    mood?: string;
    tags: string[];
    isPrivate: boolean;
  };
  metadata: {
    requestId: string;
    timestamp: string;
  };
}

interface UpdateJournalCommand {
  commandId: string;
  journalId: string;
  userId: string;
  expectedVersion: number; // Optimistic locking
  data: Partial<JournalEntry>;
  metadata: {
    requestId: string;
    timestamp: string;
  };
}
```

### Query Models (Read Side - Denormalized)

```typescript
// Optimized for reads - materialized views
interface JournalListProjection {
  id: string;
  userId: string;
  title: string;
  excerpt: string; // First 200 chars
  mood?: string;
  tags: string[];
  wordCount: number;
  hasAIInsight: boolean;
  createdAt: string;
  updatedAt: string;
  
  // Denormalized for performance
  userDisplayName: string;
  userPhotoUrl?: string;
  
  // Search optimization
  searchVector: string; // PostgreSQL ts_vector
}

interface UserDashboardProjection {
  userId: string;
  stats: {
    totalJournals: number;
    totalWords: number;
    currentStreak: number;
    longestStreak: number;
    averageMood: number; // 1-5
    journalsThisWeek: number;
    journalsThisMonth: number;
  };
  recentJournals: JournalListProjection[];
  recentInsights: JournalInsight[];
  moodTrend: Array<{
    date: string;
    mood: number;
  }>;
  
  // Pre-computed for dashboard
  lastUpdated: string;
}

interface AnalyticsProjection {
  userId: string;
  period: 'week' | 'month' | 'year';
  startDate: string;
  endDate: string;
  
  // Pre-aggregated data
  metrics: {
    totalEntries: number;
    totalWords: number;
    averageWordsPerEntry: number;
    writingDays: number;
    streakDays: number;
  };
  
  moodDistribution: {
    ecstatic: number;
    happy: number;
    neutral: number;
    sad: number;
    anxious: number;
    angry: number;
  };
  
  wordCloud: Array<{
    word: string;
    frequency: number;
    sentiment: 'positive' | 'neutral' | 'negative';
  }>;
  
  themes: Theme[];
  
  // Cached for performance
  generatedAt: string;
  expiresAt: string;
}
```

### LangChain Integration Models

```typescript
// AI Configuration per user
interface AIConfiguration {
  userId: string;
  preferredModel: 'claude-3-5-sonnet-20241022' | 'gpt-4-turbo' | 'auto';
  temperature: number; // 0-1
  maxTokens: number;
  customInstructions?: string;
  privacyMode: boolean; // Exclude from AI if true
  features: {
    autoInsights: boolean;
    weeklyDigest: boolean;
    moodTracking: boolean;
    themeExtraction: boolean;
  };
  budget: {
    maxTokensPerMonth: number;
    currentUsage: number;
    resetDate: string;
  };
}

// AI Processing Job
interface AIProcessingJob {
  id: string;
  userId: string;
  journalId?: string;
  jobType: 'instant-insight' | 'weekly-summary' | 'theme-analysis';
  status: 'queued' | 'processing' | 'completed' | 'failed';
  modelUsed?: string;
  tokensUsed?: number;
  cost?: number; // USD
  result?: any;
  error?: string;
  createdAt: string;
  startedAt?: string;
  completedAt?: string;
  retryCount: number;
}
```

### User-Provided Base Models

```typescript
// Enhanced data models with GDPR compliance and soft-delete support

interface User {
  id: string; // UUID
  email: string;
  displayName: string;
  photoUrl?: string;
  createdAt: string; // ISO 8601
  lastLoginAt: string;
  deletedAt?: string; // Soft delete
  gdprConsent: {
    termsAcceptedAt: string;
    privacyPolicyAcceptedAt: string;
    dataProcessingConsent: boolean;
    marketingConsent: boolean;
  };
  profile: {
    journalEntryCount: number;
    lastEntryDate?: string;
    totalWords: number;
    joinedDaysAgo: number;
  };
  settings: {
    theme: 'light' | 'dark' | 'system';
    language: 'en' | 'pt';
    timezone: string; // e.g., 'America/New_York'
    emailNotifications: {
      weeklyInsights: boolean;
      monthlyInsights: boolean;
      reminderToWrite: boolean;
    };
    autoSave: boolean;
    privateMode: boolean; // Excludes all entries from AI
  };
}

interface JournalEntry {
  id: string; // UUID
  userId: string;
  date: string; // YYYY-MM-DD format (unique per user)
  title: string;
  content: string; // Markdown, max 2000 chars
  mood?: 'ecstatic' | 'happy' | 'neutral' | 'sad' | 'anxious' | 'angry';
  tags: string[]; // max 5 tags
  attachments?: Attachment[];
  location?: string; // User-input text
  weather?: string; // Optional weather data
  wordCount: number;
  readingTime: number; // in seconds
  createdAt: string;
  updatedAt: string;
  deletedAt?: string; // Soft delete
  isPrivate: boolean; // Excludes from AI insights
  version: number; // For optimistic locking
}

interface Attachment {
  id: string;
  url: string; // S3 URL
  thumbnailUrl?: string;
  fileName: string;
  fileSize: number; // bytes
  mimeType: string;
  uploadedAt: string;
}

interface JournalInsight {
  id: string;
  userId: string;
  type: 'weekly' | 'monthly' | 'yearly' | 'custom';
  startDate: string; // YYYY-MM-DD
  endDate: string;
  generatedAt: string;
  summary: string; // AI-generated summary
  keyThemes: Theme[]; // Extracted themes
  moodTrends: {
    positive: number; // percentage
    neutral: number;
    negative: number;
    dominant: string;
  };
  statistics: {
    totalEntries: number;
    totalWords: number;
    averageWordsPerEntry: number;
    mostProductiveDay: string; // day of week
    longestStreak: number; // consecutive days
  };
  milestones: string[]; // Notable achievements
  suggestions: string[]; // AI recommendations
  entriesAnalyzed: number;
}

interface Theme {
  name: string;
  frequency: number;
  sentiment: 'positive' | 'neutral' | 'negative';
  relatedWords: string[];
}

interface AuditLog {
  id: string;
  userId: string;
  action: string; // 'LOGIN' | 'LOGOUT' | 'ENTRY_CREATE' | 'ENTRY_DELETE' | 'DATA_EXPORT' | 'ACCOUNT_DELETE'
  metadata?: Record<string, any>;
  ipAddress?: string;
  userAgent?: string;
  timestamp: string;
}
```

---

## 🔧 Technology Deep Dive

### LangChain Architecture

```python
# ai-orchestrator-service/src/chains/journal_analyzer.py
from langchain.chains import LLMChain
from langchain.prompts import PromptTemplate
from langchain.chat_models import ChatAnthropic, ChatOpenAI
from langchain.embeddings import OpenAIEmbeddings
from langchain.vectorstores import Redis as RedisVectorStore
from langchain.memory import ConversationBufferMemory
from langchain.callbacks import get_openai_callback

class JournalAnalyzer:
    def __init__(self, config: AIConfiguration):
        self.config = config
        self.llm = self._init_llm()
        self.embeddings = OpenAIEmbeddings()
        self.vector_store = RedisVectorStore(
            redis_url="redis://redis-cluster:6379",
            embedding=self.embeddings
        )
    
    def _init_llm(self):
        """Initialize LLM based on user preference"""
        if self.config.preferredModel.startswith('claude'):
            return ChatAnthropic(
                model=self.config.preferredModel,
                temperature=self.config.temperature,
                max_tokens=self.config.maxTokens
            )
        else:
            return ChatOpenAI(
                model=self.config.preferredModel,
                temperature=self.config.temperature,
                max_tokens=self.config.maxTokens
            )
    
    async def analyze_entry(self, journal: JournalEntry) -> AIInsight:
        """Analyze a single journal entry"""
        
        # Check similar entries from vector store
        similar_entries = await self.vector_store.similarity_search(
            journal.content,
            k=5,
            filter={"userId": journal.userId}
        )
        
        # Build context-aware prompt
        prompt = PromptTemplate(
            input_variables=["current_entry", "similar_entries", "user_context"],
            template="""
You are an empathetic AI journal analyst. Analyze this journal entry and provide insights.

Current Entry:
{current_entry}

Similar Past Entries:
{similar_entries}

User Context:
{user_context}

Provide:
1. A 2-3 sentence summary
2. 3-5 key themes
3. Mood assessment (1-5 scale with reasoning)
4. Patterns noticed across entries
5. Gentle suggestions or questions for reflection

Format as JSON.
"""
        )
        
        chain = LLMChain(llm=self.llm, prompt=prompt)
        
        # Track token usage
        with get_openai_callback() as cb:
            result = await chain.arun(
                current_entry=journal.content,
                similar_entries=self._format_similar(similar_entries),
                user_context=self._build_user_context(journal.userId)
            )
            
            # Update usage tracking
            await self._update_token_usage(
                journal.userId,
                cb.total_tokens,
                cb.total_cost
            )
        
        # Store embedding for future similarity search
        await self.vector_store.add_texts(
            texts=[journal.content],
            metadatas=[{
                "journalId": journal.id,
                "userId": journal.userId,
                "createdAt": journal.createdAt
            }]
        )
        
        return self._parse_insight(result, journal)
    
    async def generate_weekly_summary(self, user_id: str, start_date: str, end_date: str):
        """Generate comprehensive weekly summary"""
        
        # Retrieve all entries for the week
        entries = await self._fetch_entries(user_id, start_date, end_date)
        
        # Use MapReduce for long documents
        from langchain.chains import MapReduceDocumentsChain
        
        map_template = """Summarize this journal entry in 2 sentences:
{entry}"""
        
        reduce_template = """Given these daily summaries, create a comprehensive weekly overview:
{summaries}

Include:
1. Overall mood trend
2. Recurring themes
3. Notable moments
4. Growth observed
5. Suggestions for next week
"""
        
        # ... MapReduce implementation
        
        return weekly_summary
```

### CQRS Implementation

**Command Side (Spring Boot):**

```java
// command-service/src/main/java/com/mindflow/command/JournalCommandHandler.java
@Service
public class JournalCommandHandler {
    
    @Autowired
    private EventStore eventStore;
    
    @Autowired
    private EventBridge eventBridge;
    
    @Transactional
    public CommandResult handle(CreateJournalCommand command) {
        // 1. Validate command
        validateCommand(command);
        
        // 2. Load aggregate (if updating)
        JournalAggregate aggregate = command.isNew() 
            ? new JournalAggregate(command.getJournalId())
            : loadAggregate(command.getJournalId());
        
        // 3. Apply business logic
        aggregate.createJournal(
            command.getTitle(),
            command.getContent(),
            command.getMood(),
            command.getTags()
        );
        
        // 4. Get uncommitted events
        List<DomainEvent> events = aggregate.getUncommittedEvents();
        
        // 5. Persist events to event store
        eventStore.saveEvents(
            command.getJournalId(),
            events,
            command.getExpectedVersion()
        );
        
        // 6. Publish events to EventBridge
        for (DomainEvent event : events) {
            eventBridge.publish(event);
        }
        
        // 7. Clear uncommitted events
        aggregate.markEventsAsCommitted();
        
        return CommandResult.success(command.getJournalId());
    }
    
    private JournalAggregate loadAggregate(String aggregateId) {
        // Rebuild aggregate from events
        List<DomainEvent> events = eventStore.getEvents(aggregateId);
        JournalAggregate aggregate = new JournalAggregate(aggregateId);
        aggregate.loadFromHistory(events);
        return aggregate;
    }
}

// Aggregate root
public class JournalAggregate {
    private String id;
    private String userId;
    private String title;
    private String content;
    private List<String> tags;
    private int version;
    private List<DomainEvent> uncommittedEvents = new ArrayList<>();
    
    public void createJournal(String title, String content, String mood, List<String> tags) {
        // Business rule validation
        if (content.length() > 2000) {
            throw new BusinessRuleViolation("Content too long");
        }
        
        // Apply event
        apply(new JournalCreatedEvent(
            this.id,
            this.userId,
            title,
            content,
            mood,
            tags
        ));
    }
    
    private void apply(DomainEvent event) {
        // Update state
        when(event);
        // Track for persistence
        uncommittedEvents.add(event);
        version++;
    }
    
    private void when(DomainEvent event) {
        // State changes based on event type
        if (event instanceof JournalCreatedEvent) {
            JournalCreatedEvent e = (JournalCreatedEvent) event;
            this.title = e.getTitle();
            this.content = e.getContent();
            // ... update other fields
        }
        // ... handle other event types
    }
    
    public void loadFromHistory(List<DomainEvent> history) {
        for (DomainEvent event : history) {
            when(event);
            version++;
        }
    }
}
```

**Query Side (NestJS):**

```typescript
// query-service/src/projections/journal-list.projection.ts
@Injectable()
export class JournalListProjectionHandler {
  constructor(
    @InjectRepository(JournalListProjection)
    private readonly repository: Repository<JournalListProjection>,
    private readonly redis: RedisService,
  ) {}
  
  @EventsHandler(JournalCreatedEvent)
  async handleJournalCreated(event: JournalCreatedEvent) {
    // Create denormalized read model
    const projection = new JournalListProjection();
    projection.id = event.aggregateId;
    projection.userId = event.data.userId;
    projection.title = event.data.title;
    projection.excerpt = event.data.content.substring(0, 200);
    projection.mood = event.data.mood;
    projection.tags = event.data.tags;
    projection.wordCount = event.data.content.split(' ').length;
    projection.createdAt = event.metadata.timestamp;
    
    // Generate search vector for PostgreSQL full-text search
    projection.searchVector = await this.generateSearchVector(
      event.data.title,
      event.data.content,
      event.data.tags
    );
    
    await this.repository.save(projection);
    
    // Invalidate cache
    await this.redis.del(`user:${event.data.userId}:journals`);
    await this.redis.del(`user:${event.data.userId}:dashboard`);
  }
  
  @EventsHandler(JournalUpdatedEvent)
  async handleJournalUpdated(event: JournalUpdatedEvent) {
    const projection = await this.repository.findOne({
      where: { id: event.aggregateId }
    });
    
    if (projection) {
      // Update only changed fields
      Object.assign(projection, event.data);
      projection.updatedAt = event.metadata.timestamp;
      await this.repository.save(projection);
      
      // Invalidate cache
      await this.redis.del(`journal:${event.aggregateId}`);
      await this.redis.del(`user:${event.data.userId}:journals`);
    }
  }
  
  private async generateSearchVector(title: string, content: string, tags: string[]) {
    // PostgreSQL ts_vector generation
    const combined = [title, content, ...tags].join(' ');
    return combined; // Actual implementation would use raw SQL
  }
}
```

### GraphQL Schema

```graphql
# schema.graphql
type Query {
  # User queries
  me: User!
  user(id: ID!): User
  
  # Journal queries (optimized read models)
  journals(
    userId: ID!
    limit: Int = 20
    offset: Int = 0
    filter: JournalFilter
    sort: JournalSort
  ): JournalConnection!
  
  journal(id: ID!): Journal
  
  # Search
  searchJournals(
    query: String!
    userId: ID!
    limit: Int = 10
  ): [Journal!]!
  
  # Analytics (pre-computed projections)
  userDashboard(userId: ID!): Dashboard!
  analytics(
    userId: ID!
    period: AnalyticsPeriod!
    startDate: Date!
    endDate: Date!
  ): Analytics!
  
  # AI Insights
  aiInsights(
    journalId: ID
    userId: ID!
    type: InsightType
  ): [AIInsight!]!
}

type Mutation {
  # Commands (write side)
  createJournal(input: CreateJournalInput!): JournalMutationResponse!
  updateJournal(id: ID!, input: UpdateJournalInput!, expectedVersion: Int!): JournalMutationResponse!
  deleteJournal(id: ID!): MutationResponse!
  
  # AI operations
  requestAIAnalysis(journalId: ID!): AIAnalysisJob!
  configureAI(input: AIConfigInput!): User!
  
  # User operations
  updateProfile(input: UpdateProfileInput!): User!
  updateSettings(input: UpdateSettingsInput!): User!
}

type Subscription {
  # Real-time updates
  journalUpdated(userId: ID!): Journal!
  aiInsightGenerated(userId: ID!): AIInsight!
  notificationReceived(userId: ID!): Notification!
}

# Types
type User {
  id: ID!
  email: String!
  displayName: String!
  photoUrl: String
  profile: UserProfile!
  settings: UserSettings!
  aiConfig: AIConfiguration!
  createdAt: DateTime!
}

type Journal {
  id: ID!
  user: User!
  title: String!
  content: String!
  mood: Mood
  tags: [String!]!
  wordCount: Int!
  readingTime: Int!
  hasAIInsight: Boolean!
  aiInsights: [AIInsight!]!
  createdAt: DateTime!
  updatedAt: DateTime!
  version: Int!
}

type Dashboard {
  stats: DashboardStats!
  recentJournals: [Journal!]!
  moodTrend: [MoodDataPoint!]!
  recentInsights: [AIInsight!]!
  streakInfo: StreakInfo!
}

# Input types
input CreateJournalInput {
  title: String!
  content: String!
  mood: Mood
  tags: [String!]
  isPrivate: Boolean
}

input UpdateJournalInput {
  title: String
  content: String
  mood: Mood
  tags: [String!]
  isPrivate: Boolean
}

# Enums
enum Mood {
  ECSTATIC
  HAPPY
  NEUTRAL
  SAD
  ANXIOUS
  ANGRY
}

enum AnalyticsPeriod {
  WEEK
  MONTH
  YEAR
  CUSTOM
}

# Response types
type JournalMutationResponse {
  success: Boolean!
  message: String
  journal: Journal
  errors: [Error!]
}

interface MutationResponse {
  success: Boolean!
  message: String
  errors: [Error!]
}
```

### gRPC Service Definitions

```protobuf
// protos/journal.proto
syntax = "proto3";

package mindflow.journal;

service JournalService {
  rpc CreateJournal(CreateJournalRequest) returns (JournalResponse);
  rpc GetJournal(GetJournalRequest) returns (JournalResponse);
  rpc ListJournals(ListJournalsRequest) returns (ListJournalsResponse);
  rpc UpdateJournal(UpdateJournalRequest) returns (JournalResponse);
  rpc DeleteJournal(DeleteJournalRequest) returns (DeleteResponse);
  
  // Streaming for real-time updates
  rpc StreamJournals(StreamRequest) returns (stream JournalResponse);
}

message CreateJournalRequest {
  string user_id = 1;
  string title = 2;
  string content = 3;
  optional string mood = 4;
  repeated string tags = 5;
  bool is_private = 6;
  map<string, string> metadata = 7;
}

message JournalResponse {
  string id = 1;
  string user_id = 2;
  string title = 3;
  string content = 4;
  optional string mood = 5;
  repeated string tags = 6;
  int32 word_count = 7;
  int64 created_at = 8;
  int64 updated_at = 9;
  int32 version = 10;
}

// Inter-service communication
service QueryService {
  rpc InvalidateCache(InvalidateCacheRequest) returns (InvalidateResponse);
  rpc GetJournalProjection(GetProjectionRequest) returns (ProjectionResponse);
}

service AIService {
  rpc AnalyzeJournal(AnalyzeRequest) returns (stream AnalyzeResponse);
  rpc GetTokenUsage(TokenUsageRequest) returns (TokenUsageResponse);
}
```

---

## 📋 Next Steps

This document contains the comprehensive architecture and data models for MindFlow. The following components still need to be detailed:

1. **Week-by-week implementation schedule** (12 weeks broken down)
2. **Terraform module structure** (complete IaC)
3. **Testing strategy** (unit, integration, e2e, chaos)
4. **CI/CD pipeline** (GitHub Actions workflows)
5. **Cost breakdown** (week-by-week AWS costs)
6. **Service-by-service implementation guides** (code structure for each)
7. **Istio Service Mesh configuration**
8. **Monitoring & alerting setup**
9. **Security implementation details**
10. **Deployment procedures**
