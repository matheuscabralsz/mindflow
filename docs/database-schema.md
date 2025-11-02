# MindFlow: Database Schema

## Document Purpose

This document defines the complete data model for MindFlow across all data stores. It shows table structures, indexes, relationships, and the rationale behind design decisions for each database.

---

## Table of Contents

1. [Database Overview](#database-overview)
2. [PostgreSQL - Write Database](#postgresql---write-database)
3. [PostgreSQL - Read Database](#postgresql---read-database)
4. [TimescaleDB - Analytics](#timescaledb---analytics)
5. [MongoDB - Logging](#mongodb---logging)
6. [Redis - Caching](#redis---caching)
7. [Elasticsearch - Search](#elasticsearch---search)
8. [Data Modeling Decisions](#data-modeling-decisions)

---

## Database Overview

### Database Allocation by Purpose

| Database | Type | Purpose | Writes/Reads | Size Estimate |
|----------|------|---------|--------------|---------------|
| **PostgreSQL (Write)** | Relational | Transactional data, source of truth | Write-heavy | 10 GB/year |
| **PostgreSQL (Read)** | Relational | Optimized read queries, denormalized views | Read-only | 12 GB/year |
| **TimescaleDB** | Time-series | Analytics, mood trends, insights | Append-only | 5 GB/year |
| **MongoDB** | Document | Audit logs, event history | Append-only | 20 GB/year |
| **Redis** | In-memory | Sessions, cache, real-time data | Read/write | 1-2 GB |
| **Elasticsearch** | Search engine | Full-text search on journal entries | Write + query | 8 GB/year |
| **S3** | Object storage | Media files (images, attachments) | Write + read | 100 GB/year |

### Data Flow Between Databases

```
┌──────────────────┐
│  Write Database  │ ← Source of truth
└────────┬─────────┘
         │
         │ Event published
         ▼
    ┌─────────┐
    │ Events  │
    └────┬────┘
         │
         ├─────────────┬─────────────┬─────────────┬─────────────┐
         │             │             │             │             │
         ▼             ▼             ▼             ▼             ▼
┌──────────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐
│ Read Database│ │TimescaleDB│ │ MongoDB  │ │Elasticsearch│ │  Redis   │
│ (Denormalized)│ │(Analytics)│ │  (Logs)  │ │  (Search)│ │  (Cache) │
└──────────────┘ └──────────┘ └──────────┘ └──────────┘ └──────────┘
```

---

## PostgreSQL - Write Database

### Purpose
- **Source of truth** for all transactional data
- **Normalized schema** (3NF) for data integrity
- **ACID transactions** for consistency
- **Write-focused** optimizations

### Schema: `mindflow_write`

---

### Table: `users`

Stores core user account information.

```sql
CREATE TABLE users (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email               VARCHAR(255) NOT NULL UNIQUE,
    password_hash       VARCHAR(255) NOT NULL, -- bcrypt hash
    display_name        VARCHAR(100) NOT NULL,
    photo_url           VARCHAR(500),
    timezone            VARCHAR(50) DEFAULT 'UTC',
    language            VARCHAR(5) DEFAULT 'en',
    theme               VARCHAR(10) DEFAULT 'system', -- 'light', 'dark', 'system'
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    last_login_at       TIMESTAMPTZ,
    deleted_at          TIMESTAMPTZ, -- Soft delete
    is_active           BOOLEAN NOT NULL DEFAULT true,
    email_verified      BOOLEAN NOT NULL DEFAULT false,
    
    CONSTRAINT check_theme CHECK (theme IN ('light', 'dark', 'system')),
    CONSTRAINT check_language CHECK (language IN ('en', 'pt')),
    CONSTRAINT check_email_format CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}$')
);

-- Indexes
CREATE INDEX idx_users_email ON users(email) WHERE deleted_at IS NULL;
CREATE INDEX idx_users_created_at ON users(created_at);
CREATE INDEX idx_users_deleted_at ON users(deleted_at) WHERE deleted_at IS NOT NULL;

-- Trigger to update updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER users_updated_at
BEFORE UPDATE ON users
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

COMMENT ON TABLE users IS 'Core user account information';
COMMENT ON COLUMN users.deleted_at IS 'Soft delete timestamp for GDPR compliance';
```

---

### Table: `user_gdpr_consent`

Tracks GDPR consent and data processing agreements.

```sql
CREATE TABLE user_gdpr_consent (
    id                              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id                         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    terms_accepted_at               TIMESTAMPTZ NOT NULL,
    terms_version                   VARCHAR(20) NOT NULL, -- e.g., 'v1.0'
    privacy_policy_accepted_at      TIMESTAMPTZ NOT NULL,
    privacy_policy_version          VARCHAR(20) NOT NULL,
    data_processing_consent         BOOLEAN NOT NULL DEFAULT false,
    marketing_consent               BOOLEAN NOT NULL DEFAULT false,
    consent_ip_address              INET,
    consent_user_agent              TEXT,
    created_at                      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at                      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    CONSTRAINT uq_user_consent UNIQUE (user_id)
);

CREATE INDEX idx_gdpr_user_id ON user_gdpr_consent(user_id);
CREATE INDEX idx_gdpr_marketing_consent ON user_gdpr_consent(marketing_consent) WHERE marketing_consent = true;

CREATE TRIGGER gdpr_consent_updated_at
BEFORE UPDATE ON user_gdpr_consent
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

COMMENT ON TABLE user_gdpr_consent IS 'GDPR consent tracking for legal compliance';
```

---

### Table: `user_settings`

User preferences and notification settings.

```sql
CREATE TABLE user_settings (
    id                              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id                         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    auto_save                       BOOLEAN DEFAULT true,
    private_mode                    BOOLEAN DEFAULT false, -- Excludes all entries from AI
    email_weekly_insights           BOOLEAN DEFAULT true,
    email_monthly_insights          BOOLEAN DEFAULT true,
    email_reminder_to_write         BOOLEAN DEFAULT false,
    created_at                      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at                      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    CONSTRAINT uq_user_settings UNIQUE (user_id)
);

CREATE INDEX idx_settings_user_id ON user_settings(user_id);

CREATE TRIGGER settings_updated_at
BEFORE UPDATE ON user_settings
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

COMMENT ON TABLE user_settings IS 'User preferences and notification settings';
```

---

### Table: `journal_entries`

Core journal entry data with mood and metadata.

```sql
CREATE TABLE journal_entries (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id             UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    date                DATE NOT NULL, -- Journal date (unique per user)
    title               VARCHAR(200) NOT NULL,
    content             TEXT NOT NULL, -- Markdown format
    mood                VARCHAR(20), -- 'ecstatic', 'happy', 'neutral', 'sad', 'anxious', 'angry'
    location            VARCHAR(200),
    weather             VARCHAR(100),
    word_count          INTEGER NOT NULL DEFAULT 0,
    reading_time        INTEGER NOT NULL DEFAULT 0, -- in seconds
    is_private          BOOLEAN NOT NULL DEFAULT false, -- Excludes from AI insights
    version             INTEGER NOT NULL DEFAULT 1, -- Optimistic locking
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at          TIMESTAMPTZ, -- Soft delete
    
    CONSTRAINT uq_user_date UNIQUE (user_id, date),
    CONSTRAINT check_mood CHECK (mood IN ('ecstatic', 'happy', 'neutral', 'sad', 'anxious', 'angry')),
    CONSTRAINT check_content_length CHECK (char_length(content) <= 10000),
    CONSTRAINT check_word_count CHECK (word_count >= 0),
    CONSTRAINT check_reading_time CHECK (reading_time >= 0)
);

-- Indexes
CREATE INDEX idx_entries_user_id ON journal_entries(user_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_entries_date ON journal_entries(date DESC) WHERE deleted_at IS NULL;
CREATE INDEX idx_entries_created_at ON journal_entries(created_at DESC);
CREATE INDEX idx_entries_mood ON journal_entries(mood) WHERE mood IS NOT NULL AND deleted_at IS NULL;
CREATE INDEX idx_entries_is_private ON journal_entries(is_private) WHERE is_private = false;
CREATE INDEX idx_entries_user_date ON journal_entries(user_id, date DESC) WHERE deleted_at IS NULL;

-- Partial index for active entries (most queries)
CREATE INDEX idx_entries_active ON journal_entries(user_id, date DESC) 
WHERE deleted_at IS NULL;

CREATE TRIGGER entries_updated_at
BEFORE UPDATE ON journal_entries
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

COMMENT ON TABLE journal_entries IS 'Core journal entries with mood and metadata';
COMMENT ON COLUMN journal_entries.date IS 'Date of journal entry (not created_at) - unique per user';
COMMENT ON COLUMN journal_entries.version IS 'Version number for optimistic concurrency control';
```

---

### Table: `tags`

Tag definitions (normalized to prevent duplicates).

```sql
CREATE TABLE tags (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name                VARCHAR(50) NOT NULL UNIQUE,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    CONSTRAINT check_tag_name CHECK (char_length(name) > 0 AND name = lower(trim(name)))
);

CREATE INDEX idx_tags_name ON tags(name);

COMMENT ON TABLE tags IS 'Normalized tag definitions';
COMMENT ON COLUMN tags.name IS 'Lowercase, trimmed tag name';
```

---

### Table: `journal_entry_tags`

Many-to-many relationship between entries and tags.

```sql
CREATE TABLE journal_entry_tags (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    journal_entry_id    UUID NOT NULL REFERENCES journal_entries(id) ON DELETE CASCADE,
    tag_id              UUID NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    CONSTRAINT uq_entry_tag UNIQUE (journal_entry_id, tag_id)
);

CREATE INDEX idx_entry_tags_entry ON journal_entry_tags(journal_entry_id);
CREATE INDEX idx_entry_tags_tag ON journal_entry_tags(tag_id);

COMMENT ON TABLE journal_entry_tags IS 'Many-to-many relationship: journal entries to tags';
```

---

### Table: `attachments`

Media files attached to journal entries.

```sql
CREATE TABLE attachments (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    journal_entry_id    UUID NOT NULL REFERENCES journal_entries(id) ON DELETE CASCADE,
    file_name           VARCHAR(255) NOT NULL,
    file_size           BIGINT NOT NULL, -- bytes
    mime_type           VARCHAR(100) NOT NULL,
    s3_key              VARCHAR(500) NOT NULL, -- S3 object key
    s3_url              VARCHAR(1000) NOT NULL, -- Full S3 URL
    thumbnail_s3_key    VARCHAR(500), -- For images
    thumbnail_url       VARCHAR(1000),
    uploaded_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at          TIMESTAMPTZ, -- Soft delete
    
    CONSTRAINT check_file_size CHECK (file_size > 0 AND file_size <= 52428800), -- Max 50MB
    CONSTRAINT check_mime_type CHECK (mime_type IN ('image/jpeg', 'image/png', 'image/gif', 'image/webp', 'application/pdf'))
);

CREATE INDEX idx_attachments_entry ON attachments(journal_entry_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_attachments_uploaded_at ON attachments(uploaded_at DESC);

COMMENT ON TABLE attachments IS 'Media files attached to journal entries';
COMMENT ON COLUMN attachments.s3_key IS 'S3 object key for file retrieval';
```

---

### Table: `user_streaks`

Tracks writing streaks for gamification.

```sql
CREATE TABLE user_streaks (
    id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id                 UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    current_streak          INTEGER NOT NULL DEFAULT 0, -- consecutive days
    longest_streak          INTEGER NOT NULL DEFAULT 0,
    last_entry_date         DATE,
    streak_start_date       DATE,
    total_entries           INTEGER NOT NULL DEFAULT 0,
    total_words             INTEGER NOT NULL DEFAULT 0,
    updated_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    CONSTRAINT uq_user_streak UNIQUE (user_id),
    CONSTRAINT check_streaks CHECK (current_streak >= 0 AND longest_streak >= current_streak)
);

CREATE INDEX idx_streaks_user ON user_streaks(user_id);
CREATE INDEX idx_streaks_current ON user_streaks(current_streak DESC);

CREATE TRIGGER streaks_updated_at
BEFORE UPDATE ON user_streaks
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

COMMENT ON TABLE user_streaks IS 'Writing streak tracking for user engagement';
```

---

## PostgreSQL - Read Database

### Purpose
- **Optimized for queries** (denormalized)
- **Read replicas** of write database
- **Materialized views** for complex aggregations
- **Cache-friendly** structure

### Schema: `mindflow_read`

The read database is synchronized from the write database via event handlers. It contains denormalized views optimized for common query patterns.

---

### Materialized View: `journals_view`

Denormalized view combining entries, user info, tags, and attachments.

```sql
CREATE MATERIALIZED VIEW journals_view AS
SELECT 
    je.id,
    je.user_id,
    u.display_name AS user_name,
    u.photo_url AS user_photo,
    je.date,
    je.title,
    je.content,
    je.mood,
    je.location,
    je.weather,
    je.word_count,
    je.reading_time,
    je.is_private,
    je.created_at,
    je.updated_at,
    
    -- Aggregated tags
    COALESCE(
        (SELECT json_agg(t.name ORDER BY t.name)
         FROM journal_entry_tags jet
         JOIN tags t ON jet.tag_id = t.id
         WHERE jet.journal_entry_id = je.id),
        '[]'::json
    ) AS tags,
    
    -- Aggregated attachments
    COALESCE(
        (SELECT json_agg(json_build_object(
            'id', a.id,
            'fileName', a.file_name,
            'fileSize', a.file_size,
            'mimeType', a.mime_type,
            'url', a.s3_url,
            'thumbnailUrl', a.thumbnail_url
        ) ORDER BY a.uploaded_at)
         FROM attachments a
         WHERE a.journal_entry_id = je.id AND a.deleted_at IS NULL),
        '[]'::json
    ) AS attachments,
    
    -- Metadata
    (SELECT COUNT(*) FROM attachments a 
     WHERE a.journal_entry_id = je.id AND a.deleted_at IS NULL) AS attachment_count
     
FROM journal_entries je
JOIN users u ON je.user_id = u.id
WHERE je.deleted_at IS NULL 
  AND u.deleted_at IS NULL;

-- Indexes on materialized view
CREATE UNIQUE INDEX idx_journals_view_id ON journals_view(id);
CREATE INDEX idx_journals_view_user_id ON journals_view(user_id);
CREATE INDEX idx_journals_view_date ON journals_view(date DESC);
CREATE INDEX idx_journals_view_user_date ON journals_view(user_id, date DESC);
CREATE INDEX idx_journals_view_mood ON journals_view(mood) WHERE mood IS NOT NULL;
CREATE INDEX idx_journals_view_created_at ON journals_view(created_at DESC);

-- GIN index for tags array search
CREATE INDEX idx_journals_view_tags ON journals_view USING gin(tags);

-- Refresh strategy: concurrent refresh every 30 seconds via cron job
COMMENT ON MATERIALIZED VIEW journals_view IS 'Denormalized view of journal entries with tags and attachments';
```

**Refresh Strategy:**
```sql
-- Refresh concurrently (doesn't lock reads)
REFRESH MATERIALIZED VIEW CONCURRENTLY journals_view;

-- Scheduled via cron or Kubernetes CronJob every 30 seconds
```

---

### Materialized View: `user_profile_view`

User profile with aggregated statistics.

```sql
CREATE MATERIALIZED VIEW user_profile_view AS
SELECT 
    u.id,
    u.email,
    u.display_name,
    u.photo_url,
    u.timezone,
    u.language,
    u.theme,
    u.created_at,
    u.last_login_at,
    
    -- User statistics
    COALESCE(us.current_streak, 0) AS current_streak,
    COALESCE(us.longest_streak, 0) AS longest_streak,
    COALESCE(us.total_entries, 0) AS total_entries,
    COALESCE(us.total_words, 0) AS total_words,
    us.last_entry_date,
    
    -- Settings
    json_build_object(
        'autoSave', st.auto_save,
        'privateMode', st.private_mode,
        'emailNotifications', json_build_object(
            'weeklyInsights', st.email_weekly_insights,
            'monthlyInsights', st.email_monthly_insights,
            'reminderToWrite', st.email_reminder_to_write
        )
    ) AS settings,
    
    -- GDPR consent
    json_build_object(
        'termsAcceptedAt', gc.terms_accepted_at,
        'privacyPolicyAcceptedAt', gc.privacy_policy_accepted_at,
        'dataProcessingConsent', gc.data_processing_consent,
        'marketingConsent', gc.marketing_consent
    ) AS gdpr_consent,
    
    -- Calculated fields
    EXTRACT(DAY FROM (CURRENT_DATE - u.created_at)) AS joined_days_ago,
    CASE 
        WHEN us.total_entries > 0 THEN us.total_words / us.total_entries 
        ELSE 0 
    END AS avg_words_per_entry
    
FROM users u
LEFT JOIN user_streaks us ON u.id = us.user_id
LEFT JOIN user_settings st ON u.id = st.user_id
LEFT JOIN user_gdpr_consent gc ON u.id = gc.user_id
WHERE u.deleted_at IS NULL;

CREATE UNIQUE INDEX idx_user_profile_id ON user_profile_view(id);
CREATE INDEX idx_user_profile_email ON user_profile_view(email);

COMMENT ON MATERIALIZED VIEW user_profile_view IS 'Complete user profile with statistics';
```

---

### Table: `mood_calendar_cache`

Pre-computed mood calendar for fast dashboard queries.

```sql
CREATE TABLE mood_calendar_cache (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id             UUID NOT NULL,
    year                INTEGER NOT NULL,
    month               INTEGER NOT NULL,
    calendar_data       JSONB NOT NULL, -- Array of {date, mood, hasEntry}
    entry_count         INTEGER NOT NULL DEFAULT 0,
    computed_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    CONSTRAINT uq_user_year_month UNIQUE (user_id, year, month),
    CONSTRAINT check_year CHECK (year >= 2020 AND year <= 2100),
    CONSTRAINT check_month CHECK (month >= 1 AND month <= 12)
);

CREATE INDEX idx_mood_calendar_user ON mood_calendar_cache(user_id);
CREATE INDEX idx_mood_calendar_user_year_month ON mood_calendar_cache(user_id, year, month);

COMMENT ON TABLE mood_calendar_cache IS 'Pre-computed mood calendar for dashboard';
COMMENT ON COLUMN mood_calendar_cache.calendar_data IS 'JSON array: [{date: "2025-10-01", mood: "happy", hasEntry: true}, ...]';
```

---

## TimescaleDB - Analytics

### Purpose
- **Time-series data** for analytics
- **Efficient aggregations** over time ranges
- **Retention policies** for old data
- **Continuous aggregates** for pre-computed metrics

### Schema: `mindflow_analytics`

---

### Hypertable: `journal_insights`

Stores AI-generated insights over time periods.

```sql
-- Enable TimescaleDB extension
CREATE EXTENSION IF NOT EXISTS timescaledb;

CREATE TABLE journal_insights (
    id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id                 UUID NOT NULL,
    insight_type            VARCHAR(20) NOT NULL, -- 'weekly', 'monthly', 'yearly', 'custom'
    start_date              DATE NOT NULL,
    end_date                DATE NOT NULL,
    generated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    -- Insight data
    summary                 TEXT NOT NULL,
    entries_analyzed        INTEGER NOT NULL,
    total_words             INTEGER NOT NULL,
    average_words           INTEGER NOT NULL,
    most_productive_day     VARCHAR(10), -- 'Monday', 'Tuesday', etc.
    longest_streak          INTEGER,
    
    -- Mood analysis
    mood_positive_pct       NUMERIC(5,2), -- percentage
    mood_neutral_pct        NUMERIC(5,2),
    mood_negative_pct       NUMERIC(5,2),
    dominant_mood           VARCHAR(20),
    
    -- Themes (stored as JSONB for flexibility)
    themes                  JSONB, -- [{name, frequency, sentiment, relatedWords}, ...]
    milestones              JSONB, -- ["Completed 30 days", "Wrote 10,000 words"]
    suggestions             JSONB, -- ["Try morning journaling", "Explore gratitude themes"]
    
    CONSTRAINT check_insight_type CHECK (insight_type IN ('weekly', 'monthly', 'yearly', 'custom')),
    CONSTRAINT check_date_range CHECK (end_date >= start_date),
    CONSTRAINT check_mood_percentages CHECK (
        mood_positive_pct >= 0 AND mood_positive_pct <= 100 AND
        mood_neutral_pct >= 0 AND mood_neutral_pct <= 100 AND
        mood_negative_pct >= 0 AND mood_negative_pct <= 100
    )
);

-- Convert to hypertable (partitioned by generated_at)
SELECT create_hypertable('journal_insights', 'generated_at', 
    chunk_time_interval => INTERVAL '1 month');

-- Indexes
CREATE INDEX idx_insights_user_time ON journal_insights(user_id, generated_at DESC);
CREATE INDEX idx_insights_type ON journal_insights(insight_type, generated_at DESC);
CREATE INDEX idx_insights_date_range ON journal_insights(user_id, start_date, end_date);

-- GIN index for JSONB columns
CREATE INDEX idx_insights_themes ON journal_insights USING gin(themes);

COMMENT ON TABLE journal_insights IS 'AI-generated insights over time periods';
COMMENT ON COLUMN journal_insights.themes IS 'JSONB array of theme objects';
```

---

### Hypertable: `mood_events`

Time-series of mood recordings for trend analysis.

```sql
CREATE TABLE mood_events (
    time                    TIMESTAMPTZ NOT NULL,
    user_id                 UUID NOT NULL,
    journal_entry_id        UUID NOT NULL,
    mood                    VARCHAR(20) NOT NULL,
    mood_score              NUMERIC(3,2) NOT NULL, -- -1 to +1 sentiment score
    tags                    TEXT[], -- Denormalized for faster queries
    word_count              INTEGER,
    
    CONSTRAINT check_mood CHECK (mood IN ('ecstatic', 'happy', 'neutral', 'sad', 'anxious', 'angry')),
    CONSTRAINT check_mood_score CHECK (mood_score >= -1 AND mood_score <= 1)
);

-- Convert to hypertable
SELECT create_hypertable('mood_events', 'time', 
    chunk_time_interval => INTERVAL '7 days');

-- Indexes
CREATE INDEX idx_mood_events_user_time ON mood_events(user_id, time DESC);
CREATE INDEX idx_mood_events_mood ON mood_events(mood, time DESC);

-- Continuous aggregate: daily mood summary
CREATE MATERIALIZED VIEW mood_daily_summary
WITH (timescaledb.continuous) AS
SELECT 
    time_bucket('1 day', time) AS day,
    user_id,
    COUNT(*) AS entry_count,
    AVG(mood_score) AS avg_mood_score,
    MODE() WITHIN GROUP (ORDER BY mood) AS most_common_mood,
    SUM(word_count) AS total_words
FROM mood_events
GROUP BY day, user_id
WITH NO DATA;

-- Refresh policy: update every hour for last 7 days
SELECT add_continuous_aggregate_policy('mood_daily_summary',
    start_offset => INTERVAL '7 days',
    end_offset => INTERVAL '1 hour',
    schedule_interval => INTERVAL '1 hour');

COMMENT ON TABLE mood_events IS 'Time-series mood data for trend analysis';
COMMENT ON MATERIALIZED VIEW mood_daily_summary IS 'Pre-computed daily mood aggregates';
```

---

### Hypertable: `user_activity_events`

User engagement metrics over time.

```sql
CREATE TABLE user_activity_events (
    time                    TIMESTAMPTZ NOT NULL,
    user_id                 UUID NOT NULL,
    event_type              VARCHAR(50) NOT NULL, -- 'login', 'entry_created', 'entry_updated', etc.
    metadata                JSONB,
    
    CONSTRAINT check_event_type CHECK (event_type IN (
        'login', 'logout', 'entry_created', 'entry_updated', 'entry_deleted',
        'insight_viewed', 'settings_updated', 'profile_updated'
    ))
);

-- Convert to hypertable
SELECT create_hypertable('user_activity_events', 'time',
    chunk_time_interval => INTERVAL '7 days');

CREATE INDEX idx_activity_user_time ON user_activity_events(user_id, time DESC);
CREATE INDEX idx_activity_type ON user_activity_events(event_type, time DESC);

-- Continuous aggregate: weekly user activity
CREATE MATERIALIZED VIEW user_weekly_activity
WITH (timescaledb.continuous) AS
SELECT 
    time_bucket('7 days', time) AS week,
    user_id,
    COUNT(*) FILTER (WHERE event_type = 'login') AS login_count,
    COUNT(*) FILTER (WHERE event_type = 'entry_created') AS entries_created,
    COUNT(*) FILTER (WHERE event_type = 'entry_updated') AS entries_updated,
    COUNT(*) AS total_events
FROM user_activity_events
GROUP BY week, user_id
WITH NO DATA;

SELECT add_continuous_aggregate_policy('user_weekly_activity',
    start_offset => INTERVAL '4 weeks',
    end_offset => INTERVAL '1 hour',
    schedule_interval => INTERVAL '1 hour');

COMMENT ON TABLE user_activity_events IS 'User engagement events for analytics';
```

---

### Data Retention Policies

```sql
-- Drop raw mood events older than 1 year (aggregates are kept)
SELECT add_retention_policy('mood_events', INTERVAL '1 year');

-- Drop raw activity events older than 6 months
SELECT add_retention_policy('user_activity_events', INTERVAL '6 months');

-- Keep insights forever (small dataset)
-- No retention policy on journal_insights
```

---

## MongoDB - Logging

### Purpose
- **Structured logging** with flexible schema
- **Audit trails** for compliance
- **High write throughput** for log ingestion
- **Document model** for nested data

### Database: `mindflow_logs`

---

### Collection: `audit_logs`

Complete audit trail of all user actions.

```javascript
// Schema (enforced at application level)
{
  _id: ObjectId("..."),
  userId: "uuid-string",
  action: "LOGIN" | "LOGOUT" | "ENTRY_CREATE" | "ENTRY_UPDATE" | "ENTRY_DELETE" | 
          "DATA_EXPORT" | "ACCOUNT_DELETE" | "SETTINGS_UPDATE" | "GDPR_CONSENT_UPDATE",
  timestamp: ISODate("2025-10-25T20:00:00Z"),
  
  // Request context
  metadata: {
    entryId: "uuid-string",       // If applicable
    changes: {                     // For UPDATE actions
      before: {...},
      after: {...}
    },
    reason: "User requested deletion" // For sensitive actions
  },
  
  // Technical context
  ipAddress: "192.168.1.1",
  userAgent: "Mozilla/5.0...",
  requestId: "req-uuid",           // For correlation
  
  // GDPR compliance
  dataCategory: "user_data" | "system_event" | "security_event",
  retentionPolicy: "7_years",      // Legal requirement
  
  // For searching
  searchableText: "user login from 192.168.1.1" // Indexed field
}

// Indexes
db.audit_logs.createIndex({ userId: 1, timestamp: -1 })
db.audit_logs.createIndex({ action: 1, timestamp: -1 })
db.audit_logs.createIndex({ timestamp: -1 })
db.audit_logs.createIndex({ ipAddress: 1 })
db.audit_logs.createIndex({ requestId: 1 }, { unique: true })
db.audit_logs.createIndex({ searchableText: "text" })

// TTL index: automatically delete logs older than 7 years (GDPR requirement)
db.audit_logs.createIndex({ timestamp: 1 }, { expireAfterSeconds: 220752000 }) // 7 years

// Sharding key (for horizontal scaling)
sh.shardCollection("mindflow_logs.audit_logs", { userId: "hashed" })
```

**Document Size:** ~1-2 KB average

**Write Volume:** ~10,000 documents/day (at 1,000 users)

---

### Collection: `application_logs`

Service-level application logs for debugging.

```javascript
{
  _id: ObjectId("..."),
  timestamp: ISODate("2025-10-25T20:00:00Z"),
  level: "DEBUG" | "INFO" | "WARN" | "ERROR" | "FATAL",
  service: "auth-service" | "command-service" | "query-service" | "ai-processing-service",
  message: "User authentication failed",
  
  // Structured context
  context: {
    userId: "uuid-string",
    requestId: "req-uuid",
    function: "authenticateUser",
    line: 142
  },
  
  // Error details (if applicable)
  error: {
    name: "AuthenticationError",
    message: "Invalid credentials",
    stack: "Error: Invalid credentials\n  at authenticateUser...",
    code: "AUTH_001"
  },
  
  // Performance metrics
  duration: 250, // ms
  
  // Kubernetes metadata
  pod: "auth-service-7d8c9f-abc123",
  node: "ip-10-0-1-23.ec2.internal"
}

// Indexes
db.application_logs.createIndex({ timestamp: -1 })
db.application_logs.createIndex({ level: 1, timestamp: -1 })
db.application_logs.createIndex({ service: 1, timestamp: -1 })
db.application_logs.createIndex({ "context.requestId": 1 })
db.application_logs.createIndex({ "context.userId": 1, timestamp: -1 })

// TTL: Keep application logs for 30 days
db.application_logs.createIndex({ timestamp: 1 }, { expireAfterSeconds: 2592000 })

// Text search on message and error
db.application_logs.createIndex({ 
  message: "text", 
  "error.message": "text" 
})
```

---

### Collection: `api_requests`

HTTP request logs for debugging and analytics.

```javascript
{
  _id: ObjectId("..."),
  timestamp: ISODate("2025-10-25T20:00:00Z"),
  requestId: "req-uuid",
  
  // Request details
  method: "POST",
  path: "/api/journals",
  query: { limit: "10" },
  headers: {
    "user-agent": "Mozilla/5.0...",
    "content-type": "application/json"
  },
  body: {...}, // Sanitized (no passwords)
  
  // Response details
  statusCode: 201,
  responseTime: 125, // ms
  responseSize: 2048, // bytes
  
  // User context
  userId: "uuid-string",
  ipAddress: "192.168.1.1",
  
  // Errors (if any)
  error: {
    message: "Validation failed",
    code: "VAL_001"
  }
}

// Indexes
db.api_requests.createIndex({ timestamp: -1 })
db.api_requests.createIndex({ userId: 1, timestamp: -1 })
db.api_requests.createIndex({ requestId: 1 }, { unique: true })
db.api_requests.createIndex({ statusCode: 1, timestamp: -1 })
db.api_requests.createIndex({ path: 1, method: 1, timestamp: -1 })

// TTL: Keep API logs for 90 days
db.api_requests.createIndex({ timestamp: 1 }, { expireAfterSeconds: 7776000 })
```

---

## Redis - Caching

### Purpose
- **Session storage** (fast authentication)
- **Query result caching** (reduce DB load)
- **Rate limiting** counters
- **Real-time features** (WebSocket state)

### Key Patterns

---

### 1. Session Data

```
Key Pattern: session:{sessionId}
Type: Hash
TTL: 7 days (604800 seconds)

Example:
  session:abc123xyz => {
    userId: "user-uuid",
    email: "user@example.com",
    roles: ["user", "premium"],
    createdAt: "2025-10-25T20:00:00Z",
    lastAccessedAt: "2025-10-25T20:30:00Z"
  }

Commands:
  HSET session:abc123xyz userId user-uuid email user@example.com
  EXPIRE session:abc123xyz 604800
  HGETALL session:abc123xyz
  DEL session:abc123xyz  (on logout)
```

---

### 2. User Profile Cache

```
Key Pattern: user:{userId}:profile
Type: String (JSON)
TTL: 1 hour (3600 seconds)

Example:
  user:123:profile => '{"id":"123","displayName":"John","photoUrl":"..."}'

Commands:
  SET user:123:profile '{"id":"123",...}' EX 3600
  GET user:123:profile
  DEL user:123:profile  (invalidate on update)
```

---

### 3. Journal Entry Cache

```
Key Pattern: journals:user:{userId}:recent
Type: String (JSON array)
TTL: 5 minutes (300 seconds)

Example:
  journals:user:123:recent => '[{"id":"entry-1",...}, {"id":"entry-2",...}]'

Commands:
  SET journals:user:123:recent '[...]' EX 300
  GET journals:user:123:recent
  DEL journals:user:123:recent  (invalidate on new entry)
```

---

### 4. Mood Trends Cache

```
Key Pattern: mood:user:{userId}:trend:{days}
Type: String (JSON)
TTL: 15 minutes (900 seconds)

Example:
  mood:user:123:trend:30 => '{"positive":65,"neutral":25,"negative":10}'

Commands:
  SET mood:user:123:trend:30 '{"positive":65,...}' EX 900
  GET mood:user:123:trend:30
```

---

### 5. Rate Limiting

```
Key Pattern: ratelimit:{identifier}:{window}
Type: String (counter)
TTL: Window size

Example (5 requests per minute):
  ratelimit:user:123:20251025-2030 => "3"
  
Commands:
  INCR ratelimit:user:123:20251025-2030
  EXPIRE ratelimit:user:123:20251025-2030 60
  GET ratelimit:user:123:20251025-2030
  
Rate limit check:
  IF GET value > 5 THEN reject request
```

---

### 6. AI Processing Queue Status

```
Key Pattern: ai:queue:{journalEntryId}
Type: String
TTL: 1 hour (3600 seconds)

Values: "queued" | "processing" | "completed" | "failed"

Example:
  ai:queue:entry-123 => "processing"

Commands:
  SET ai:queue:entry-123 "queued" EX 3600
  GET ai:queue:entry-123
  DEL ai:queue:entry-123  (after processing)
```

---

### 7. WebSocket Connections

```
Key Pattern: ws:user:{userId}
Type: Set (connection IDs)
TTL: None (cleared on disconnect)

Example:
  ws:user:123 => {"conn-abc", "conn-xyz"}  (multiple devices)

Commands:
  SADD ws:user:123 conn-abc
  SMEMBERS ws:user:123  (get all connections)
  SREM ws:user:123 conn-abc  (on disconnect)
```

---

### Cache Invalidation Strategy

```
Event-Driven Invalidation:

JournalEntryCreated event:
  - DEL journals:user:{userId}:recent
  - DEL mood:user:{userId}:trend:*
  - DEL user:{userId}:profile  (updates entry count)

UserUpdated event:
  - DEL user:{userId}:profile
  
SettingsUpdated event:
  - DEL user:{userId}:profile
```

---

## Elasticsearch - Search

### Purpose
- **Full-text search** on journal entries
- **Semantic search** (AI-powered)
- **Faceted search** (filter by mood, date, tags)
- **Autocomplete** for tags

### Index: `journal_entries`

---

### Index Mapping

```json
{
  "settings": {
    "number_of_shards": 3,
    "number_of_replicas": 1,
    "analysis": {
      "analyzer": {
        "journal_analyzer": {
          "type": "custom",
          "tokenizer": "standard",
          "filter": [
            "lowercase",
            "asciifolding",
            "stop",
            "snowball"
          ]
        }
      }
    }
  },
  "mappings": {
    "properties": {
      "id": { 
        "type": "keyword" 
      },
      "userId": { 
        "type": "keyword" 
      },
      "date": { 
        "type": "date",
        "format": "yyyy-MM-dd"
      },
      "title": { 
        "type": "text",
        "analyzer": "journal_analyzer",
        "fields": {
          "keyword": { "type": "keyword" }
        }
      },
      "content": { 
        "type": "text",
        "analyzer": "journal_analyzer",
        "term_vector": "with_positions_offsets"
      },
      "mood": { 
        "type": "keyword" 
      },
      "tags": { 
        "type": "keyword" 
      },
      "location": { 
        "type": "text",
        "fields": {
          "keyword": { "type": "keyword" }
        }
      },
      "wordCount": { 
        "type": "integer" 
      },
      "isPrivate": { 
        "type": "boolean" 
      },
      "createdAt": { 
        "type": "date" 
      },
      "updatedAt": { 
        "type": "date" 
      }
    }
  }
}
```

---

### Example Document

```json
{
  "id": "entry-123",
  "userId": "user-456",
  "date": "2025-10-25",
  "title": "A Reflective Evening",
  "content": "Today was productive but stressful. I completed three major tasks at work and felt accomplished. However, the deadline pressure is mounting...",
  "mood": "neutral",
  "tags": ["work", "productivity", "stress"],
  "location": "Home Office",
  "wordCount": 245,
  "isPrivate": false,
  "createdAt": "2025-10-25T20:30:00Z",
  "updatedAt": "2025-10-25T20:30:00Z"
}
```

---

### Search Queries

**1. Full-text search:**
```json
{
  "query": {
    "bool": {
      "must": [
        { "match": { "content": "productivity stress" }},
        { "term": { "userId": "user-456" }},
        { "term": { "isPrivate": false }}
      ]
    }
  },
  "highlight": {
    "fields": {
      "content": {}
    }
  }
}
```

**2. Faceted search (filter by mood):**
```json
{
  "query": {
    "bool": {
      "must": [
        { "term": { "userId": "user-456" }}
      ],
      "filter": [
        { "term": { "mood": "happy" }}
      ]
    }
  },
  "aggs": {
    "moods": {
      "terms": { "field": "mood" }
    },
    "tags": {
      "terms": { "field": "tags", "size": 20 }
    }
  }
}
```

**3. Date range search:**
```json
{
  "query": {
    "bool": {
      "must": [
        { "term": { "userId": "user-456" }}
      ],
      "filter": [
        { "range": { "date": { "gte": "2025-10-01", "lte": "2025-10-31" }}}
      ]
    }
  },
  "sort": [
    { "date": "desc" }
  ]
}
```

**4. Tag autocomplete:**
```json
{
  "suggest": {
    "tag-suggest": {
      "prefix": "prod",
      "completion": {
        "field": "tags",
        "size": 10
      }
    }
  }
}
```

---

## Data Modeling Decisions

### 1. Soft Deletes vs Hard Deletes

**Decision:** Use soft deletes (deleted_at timestamp)

**Rationale:**
- ✅ GDPR compliance (audit trail of deletions)
- ✅ Recover accidentally deleted entries
- ✅ Analytics preserve historical data
- ❌ Queries must filter `WHERE deleted_at IS NULL`
- ❌ Slightly larger database size

**Hard delete:** Only after GDPR retention period (7 years)

---

### 2. Normalized vs Denormalized

**Write Database (PostgreSQL):**
- **Normalized (3NF)** for data integrity
- Separate tables for tags, attachments
- Foreign keys enforce consistency

**Read Database (PostgreSQL):**
- **Denormalized** for query performance
- Materialized views with JOINs pre-computed
- JSON columns for nested data (tags, attachments)

**Trade-off:** Write complexity (events, syncing) for read simplicity

---

### 3. UUID vs Auto-Increment IDs

**Decision:** Use UUIDs for all primary keys

**Rationale:**
- ✅ Distributed system friendly (no coordination needed)
- ✅ No sequential ID enumeration attacks
- ✅ Merge databases without conflicts
- ✅ Client can generate IDs (optimistic UI)
- ❌ Larger index size (16 bytes vs 4 bytes)
- ❌ Slower INSERT performance (minimal impact)

**Performance impact:** Negligible at MindFlow's scale (<100K users)

---

### 4. JSONB vs Separate Tables

**Used JSONB for:**
- `themes` in journal_insights (flexible, rarely queried individually)
- `settings` in user_profile_view (small, updated as unit)
- `metadata` in audit_logs (varied structure per event)

**Used separate tables for:**
- `tags` (queried independently, need uniqueness)
- `attachments` (large objects, lifecycle management)

**Rule:** If data is queried independently or has complex relationships → separate table. If always retrieved as unit → JSONB.

---

### 5. Partitioning Strategy

**TimescaleDB:**
- **Time-based partitioning** (1 month chunks)
- Old partitions moved to cheaper storage
- Retention policies auto-drop old data

**MongoDB:**
- **Hash-based sharding** on userId
- Even distribution across shards
- Scales horizontally

**PostgreSQL:**
- **No partitioning initially** (unnecessary at current scale)
- Can add later if table > 100 GB

---

### 6. Index Strategy

**Principles:**
- Index all foreign keys
- Index commonly filtered columns (user_id, date, deleted_at)
- Partial indexes for common WHERE clauses
- Avoid over-indexing (slows writes)

**Monitoring:** Track index usage with pg_stat_user_indexes

```sql
-- Find unused indexes
SELECT 
  schemaname, tablename, indexname, idx_scan
FROM pg_stat_user_indexes
WHERE idx_scan = 0
  AND indexname NOT LIKE '%_pkey';
```

---

### 7. Data Consistency Model

| Data | Consistency | Justification |
|------|-------------|---------------|
| User credentials | Strong | Security-critical |
| Journal entries (write) | Strong | Data durability |
| Journal entries (read) | Eventual (30s lag) | Performance > freshness |
| AI insights | Eventual (minutes) | Generated async |
| Analytics | Eventual (hours) | Trends don't need real-time |
| Cache | Best-effort | TTL-based, invalidation on changes |

---

### 8. Backup & Recovery Strategy

**PostgreSQL:**
- **Automated daily backups** (AWS RDS)
- **Point-in-time recovery** (7-day window)
- **Multi-AZ replication** for high availability

**TimescaleDB:**
- **Continuous archival** to S3
- **Retention policies** auto-drop old chunks

**MongoDB:**
- **Replica set** (3 nodes)
- **Daily snapshots** to S3

**Redis:**
- **RDB snapshots** every 5 minutes
- **AOF (Append-Only File)** for durability
- Not critical (cache can be rebuilt)

**Elasticsearch:**
- **Snapshot to S3** daily
- Can rebuild from PostgreSQL if needed

---

## Summary

MindFlow's database architecture demonstrates:

1. **Polyglot Persistence:** Right database for each workload
2. **CQRS Pattern:** Optimized read and write paths
3. **Time-Series Optimization:** TimescaleDB for analytics
4. **Flexible Logging:** MongoDB for varied log structures
5. **High-Performance Caching:** Redis for sub-10ms queries
6. **Full-Text Search:** Elasticsearch for content discovery
7. **GDPR Compliance:** Soft deletes, audit logs, retention policies
8. **Scalability:** Partitioning, sharding, replication strategies

**Key Strengths for Interviews:**
- ✅ Understands different database types and when to use each
- ✅ Can explain normalization vs denormalization trade-offs
- ✅ Knows indexing strategies and performance implications
- ✅ Considers data consistency, durability, and compliance
- ✅ Designs for scalability from day one

This schema serves as the data foundation for building MindFlow.
