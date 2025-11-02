# MindFlow

> **AI-Powered Journaling Platform for Mental Wellness**

MindFlow is a production-grade microservices application demonstrating modern cloud-native architecture, event-driven design, and AI integration. Built as a portfolio project showcasing enterprise-level system design and full-stack development skills.

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.3-blue)](https://www.typescriptlang.org/)
[![Spring Boot](https://img.shields.io/badge/Spring%20Boot-3.2-green)](https://spring.io/projects/spring-boot)
[![AWS](https://img.shields.io/badge/AWS-EKS%20%7C%20RDS%20%7C%20S3-orange)](https://aws.amazon.com/)
[![Kubernetes](https://img.shields.io/badge/Kubernetes-1.28-326CE5)](https://kubernetes.io/)

---

## 🎯 Project Vision

MindFlow transforms daily journaling into actionable insights using AI. Users write reflections, and Claude AI analyzes patterns, tracks mood trends, and provides personalized recommendations—helping people understand their mental health journey through data.

**Why this project?**
- Demonstrates **enterprise-grade microservices architecture** (10+ services)
- Showcases **event-driven design** with CQRS pattern
- Implements **cloud-native** deployment on AWS with Kubernetes
- Integrates **modern AI capabilities** (Claude API)
- Applies **production best practices** (observability, security, scalability)

---

## 🏗️ Architecture Overview

### High-Level Design

```
┌─────────────────────────────────────────────────────────────┐
│                    Angular SPA Frontend                      │
│              (PWA • Material Design • RxJS)                  │
└───────────────────────────┬─────────────────────────────────┘
                            │
                            │ GraphQL / WebSocket
                            │
┌───────────────────────────▼─────────────────────────────────┐
│                     API Gateway Layer                        │
│                                                              │
│    GraphQL Gateway (Node.js) • WebSocket Hub (Node.js)      │
└───────────────────────────┬─────────────────────────────────┘
                            │
            ┌───────────────┼───────────────┐
            │               │               │
┌───────────▼────┐  ┌──────▼──────┐  ┌────▼──────────┐
│  Auth Service  │  │  Command    │  │    Query      │
│   (Node.js)    │  │  Service    │  │   Service     │
│                │  │(Spring Boot)│  │  (Node.js)    │
└───────┬────────┘  └──────┬──────┘  └────┬──────────┘
        │                  │               │
        │         ┌────────┴────────┐      │
        │         │                 │      │
┌───────▼─────────▼─────────────────▼──────▼──────────┐
│              Microservices Layer                     │
│                                                      │
│  AI Processing • Analytics • Search • Notification  │
│  Logging • Media • (Python • Node.js)               │
└──────────────────────────┬───────────────────────────┘
                           │
        ┌──────────────────┼──────────────────┐
        │                  │                  │
┌───────▼────┐  ┌─────────▼────┐  ┌─────────▼────┐
│ PostgreSQL │  │ TimescaleDB  │  │    Redis     │
│ (Write+Read)  │  (Analytics) │  │   (Cache)    │
└────────────┘  └──────────────┘  └──────────────┘
        │                  │                  │
┌───────▼────┐  ┌─────────▼────┐  ┌─────────▼────┐
│  MongoDB   │  │Elasticsearch │  │      S3      │
│   (Logs)   │  │   (Search)   │  │   (Media)    │
└────────────┘  └──────────────┘  └──────────────┘
```

### Key Architectural Patterns

- **CQRS (Command Query Responsibility Segregation):** Separate write and read databases for optimal performance
- **Event-Driven Architecture:** Services communicate via AWS EventBridge/SNS/SQS
- **API Gateway Pattern:** GraphQL as single entry point for client applications
- **Service Mesh:** Istio for mTLS, circuit breaking, and traffic management
- **Polyglot Persistence:** Right database for each workload (PostgreSQL, TimescaleDB, MongoDB, Redis, Elasticsearch)

📖 **[Complete Architecture Documentation →](docs/system-architecture.md)**

---

## 🚀 Core Features

### For Users

✨ **Smart Journaling**
- Rich text editor with markdown support
- Mood tracking (6 emotional states)
- Tag organization and filtering
- Media attachments (images, files)
- Private entries (excluded from AI)

🧠 **AI-Powered Insights**
- Sentiment analysis on journal entries
- Theme extraction and pattern recognition
- Weekly/monthly/yearly summaries
- Personalized recommendations
- Mood trend visualization

📊 **Analytics Dashboard**
- Interactive mood calendar
- Writing streak tracking
- Word count statistics
- Most productive days analysis
- Historical trend charts

🔒 **Privacy & Security**
- GDPR compliant data handling
- End-to-end encryption for entries
- Granular privacy controls
- Data export capabilities
- Account deletion with audit trail

### For Developers

🏗️ **Modern Tech Stack**
- Microservices with clear bounded contexts
- Container orchestration with Kubernetes
- Infrastructure as Code (Terraform)
- CI/CD pipelines (GitHub Actions)
- Comprehensive observability (Prometheus, Grafana, Jaeger)

---

## 🛠️ Technology Stack

### Frontend
- **Angular 20** - Modern reactive UI framework
- **Angular Material** - Component library
- **RxJS** - Reactive programming
- **Apollo Client** - GraphQL state management
- **Chart.js** - Data visualization

### Backend Services
- **Node.js + Express** - API services (Auth, Query, Analytics, etc.)
- **Spring Boot 3.2** - Command service (write operations)
- **Python + FastAPI** - AI processing service
- **GraphQL (Apollo)** - API gateway
- **gRPC** - Inter-service communication

### Data Layer
- **PostgreSQL 15** - Primary relational database (write + read)
- **TimescaleDB** - Time-series analytics
- **Redis 7** - Caching and session storage
- **MongoDB 7** - Structured logging
- **Elasticsearch 8** - Full-text search
- **Amazon S3** - Object storage for media

### Cloud Infrastructure
- **AWS EKS** - Managed Kubernetes
- **AWS RDS** - Managed PostgreSQL
- **AWS ElastiCache** - Managed Redis
- **AWS S3** - Object storage
- **AWS SQS/SNS** - Message queuing
- **AWS EventBridge** - Event bus
- **AWS Secrets Manager** - Secrets management

### DevOps & Tools
- **Kubernetes 1.28** - Container orchestration
- **Istio** - Service mesh
- **Terraform** - Infrastructure as Code
- **Docker** - Containerization
- **GitHub Actions** - CI/CD
- **Helm** - Kubernetes package manager
- **Prometheus + Grafana** - Monitoring
- **Jaeger** - Distributed tracing

---

## 📚 Documentation

This project includes comprehensive planning and design documentation:

| Document | Description |
|----------|-------------|
| **[System Architecture](docs/system-architecture.md)** | Service interactions, CQRS implementation, event flows, design patterns |
| **[Database Schema](docs/database-schema.md)** | Complete data models across all databases with rationale |
| **[Infrastructure Overview](docs/infrastructure-overview.md)** | Cloud architecture, deployment strategy, scalability considerations |
| **[Implementation Plan](docs/mindflow-implementation-plan.md)** | Project scope, milestones, and technical requirements |
| **[Week-by-Week Plan](docs/week-by-week-plan.md)** | Detailed 12-week development roadmap |

---

## 🎯 Development Roadmap

### Phase 1: Foundation (Weeks 1-4) ✅ *Planned*
- [x] Project architecture and planning
- [x] Database schema design
- [x] Infrastructure setup (local + AWS)
- [ ] Core services implementation (Auth, Command, Query)
- [ ] Basic Angular frontend

### Phase 2: Core Features (Weeks 5-8) 📋 *In Progress*
- [ ] Journal CRUD operations
- [ ] AI processing integration (Claude API)
- [ ] GraphQL gateway implementation
- [ ] Caching layer with Redis
- [ ] Full-text search with Elasticsearch

### Phase 3: Advanced Features (Weeks 9-12) 🎯 *Planned*
- [ ] Analytics service and dashboard
- [ ] Notification service (email, push)
- [ ] Media upload service
- [ ] Real-time features (WebSocket)
- [ ] Mobile-responsive PWA

### Phase 4: Production Readiness (Weeks 13-16) 🚀 *Planned*
- [ ] Kubernetes deployment with Istio
- [ ] CI/CD pipeline automation
- [ ] Comprehensive testing (unit, integration, e2e)
- [ ] Monitoring and observability stack
- [ ] Security hardening and audit

---

## 🚦 Quick Start

### Prerequisites

```bash
# Required tools
- Docker 24.0+
- Docker Compose 2.20+
- Node.js 20+
- Java 17+
- Python 3.11+
- AWS CLI 2.13+
- Terraform 1.7+
- kubectl 1.28+
```

### Local Development Setup

```bash
# Clone the repository
git clone https://github.com/yourusername/mindflow.git
cd mindflow

# Copy environment template
cp .env.example .env

# Start infrastructure (databases, queues, etc.)
docker-compose up -d

# Wait for services to be healthy (~30 seconds)
docker-compose ps

# Install dependencies for all services
npm run install:all

# Start all microservices in development mode
npm run dev

# In another terminal, start the frontend
cd frontend/mindflow-app
npm install
npm start
```

**Application will be available at:**
- Frontend: http://localhost:4200
- GraphQL Playground: http://localhost:4000/graphql
- Mailhog (email testing): http://localhost:8025

### Environment Variables

Create `.env` file in project root:

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
REDIS_PASSWORD=dev_redis_password

# AWS (LocalStack for local development)
AWS_REGION=us-east-1
AWS_ENDPOINT=http://localhost:4566

# JWT
JWT_SECRET=dev_jwt_secret_change_in_prod
JWT_EXPIRY=15m
REFRESH_TOKEN_EXPIRY=7d

# Claude AI
ANTHROPIC_API_KEY=your_api_key_here

# Node Environment
NODE_ENV=development
```

---

## 🧪 Testing

```bash
# Run all unit tests
npm test

# Run integration tests
npm run test:integration

# Run e2e tests
npm run test:e2e

# Generate coverage report
npm run test:coverage

# Lint all code
npm run lint

# Format code
npm run format
```

---

## 🏗️ Project Structure

```
mindflow/
├── docs/                           # Documentation
│   ├── system-architecture.md
│   ├── database-schema.md
│   ├── infrastructure-overview.md
│   └── ...
├── services/                       # Microservices
│   ├── auth-service/              # User authentication
│   ├── command-service/           # Write operations (Spring Boot)
│   ├── query-service/             # Read operations
│   ├── ai-service/                # Claude AI integration (Python)
│   ├── analytics-service/         # Time-series analytics
│   ├── search-service/            # Elasticsearch queries
│   ├── notification-service/      # Email/push notifications
│   ├── logging-service/           # Centralized logging
│   ├── media-service/             # File uploads
│   └── graphql-gateway/           # API gateway
├── frontend/                       # Angular application
│   └── mindflow-app/
├── infrastructure/                 # IaC and deployment
│   ├── terraform/                 # AWS infrastructure
│   ├── kubernetes/                # K8s manifests
│   │   ├── base/
│   │   └── overlays/
│   └── scripts/                   # Helper scripts
├── docker-compose.yml             # Local development
├── docker-compose.override.yml    # Service definitions
├── .github/
│   └── workflows/                 # CI/CD pipelines
├── .env.example                   # Environment template
└── README.md
```

---

## 🔐 Security

- **Authentication:** JWT with refresh token rotation
- **Authorization:** Role-based access control (RBAC)
- **Transport Security:** TLS 1.3 for all external communication
- **Service Mesh:** mTLS between services via Istio
- **Secrets Management:** AWS Secrets Manager with automatic rotation
- **Data Encryption:** AES-256 at rest, TLS in transit
- **Input Validation:** Schema validation on all inputs
- **SQL Injection Prevention:** Parameterized queries only
- **XSS Prevention:** Content Security Policy headers
- **Rate Limiting:** Redis-based rate limiting per user/IP

---

## 📊 Observability

### Metrics
- **Prometheus:** Time-series metrics collection
- **Grafana:** Visualization dashboards
- Custom application metrics (business KPIs)

### Logging
- **Structured JSON logs** from all services
- **Centralized logging** in MongoDB
- **Log aggregation** with Elasticsearch
- Request tracing with correlation IDs

### Tracing
- **Jaeger:** Distributed tracing across services
- Performance bottleneck identification
- Error rate tracking by service

### Alerts
- CloudWatch alarms for infrastructure
- Prometheus AlertManager for application metrics
- PagerDuty integration for critical alerts

---

## 🎓 Learning Objectives

This project demonstrates proficiency in:

✅ **Architecture & Design**
- Microservices architecture with clear bounded contexts
- Event-driven design with eventual consistency
- CQRS pattern for read/write separation
- API gateway and service mesh patterns

✅ **Backend Development**
- Node.js and Spring Boot microservices
- RESTful APIs and GraphQL
- Database design (relational, time-series, document, key-value)
- Message queues and pub/sub patterns

✅ **Frontend Development**
- Modern Angular with reactive programming (RxJS)
- State management and GraphQL integration
- Progressive Web App (PWA) capabilities
- Responsive design with Material Design

✅ **Cloud & DevOps**
- AWS services (EKS, RDS, S3, SQS, SNS, EventBridge)
- Kubernetes orchestration and Helm charts
- Infrastructure as Code with Terraform
- CI/CD pipeline automation
- Monitoring and observability

✅ **AI Integration**
- Anthropic Claude API integration
- Asynchronous processing patterns
- Prompt engineering for insights
- Cost optimization for AI workloads

✅ **Security & Compliance**
- Authentication and authorization
- GDPR compliance (data portability, right to erasure)
- Encryption at rest and in transit
- Audit logging and compliance tracking

---

## 🤝 Contributing

This is currently a solo portfolio project, but feedback and suggestions are welcome!

If you'd like to provide feedback:
1. Open an issue describing your suggestion
2. For technical discussions, reference the relevant documentation
3. For architecture feedback, please review [system-architecture.md](docs/system-architecture.md) first

---

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## 👤 Author

**Your Name**
- GitHub: [@yourusername](https://github.com/yourusername)
- LinkedIn: [Your LinkedIn](https://linkedin.com/in/yourprofile)
- Email: your.email@example.com

---

## 🙏 Acknowledgments

- **Anthropic** for Claude API and modern AI capabilities
- **Spring Boot** community for excellent microservices patterns
- **Kubernetes** and CNCF projects for cloud-native tooling
- Open source community for the incredible tools and libraries

---

## 📈 Project Stats

- **Total Services:** 10+ microservices
- **Lines of Code:** ~50,000 (estimated on completion)
- **Databases:** 6 different data stores
- **Cloud Services:** 15+ AWS services
- **Test Coverage Target:** 80%+
- **Documentation Pages:** 5 comprehensive design docs

---

## 🎯 Use Cases & Demo Scenarios

### Scenario 1: Daily Journaling Flow
1. User logs in and creates a journal entry for today
2. Writes about their day, tags it with "work" and "productivity"
3. Selects mood: "happy"
4. Entry is saved to Command Service → PostgreSQL
5. Event published → AI Processing queues entry for analysis
6. Within 3 seconds, AI insights appear: "Detected productivity patterns, suggesting morning writing"

### Scenario 2: Analytics Dashboard
1. User navigates to dashboard
2. GraphQL Gateway aggregates data from Query + Analytics services
3. Displays:
   - 30-day mood calendar with color-coded dots
   - Current writing streak: 7 days
   - Most productive day: Monday
   - Word count trend line chart

### Scenario 3: Search & Insights
1. User searches "stress" across all entries
2. Elasticsearch returns relevant entries with highlights
3. User clicks "Generate Insight" for selected month
4. AI analyzes 20 entries, extracts themes:
   - Work pressure (mentioned 15 times)
   - Exercise correlation with mood (positive)
   - Suggestion: "Consider setting work boundaries"

---

## 🚀 Deployment

### Production Deployment (AWS EKS)

Detailed deployment instructions coming soon. High-level steps:

```bash
# 1. Provision AWS infrastructure
cd infrastructure/terraform
terraform init
terraform apply

# 2. Configure kubectl for EKS
aws eks update-kubeconfig --name mindflow-cluster --region us-east-1

# 3. Install Istio service mesh
istioctl install --set profile=production

# 4. Deploy services with Helm
helm install mindflow ./infrastructure/helm/mindflow

# 5. Verify deployment
kubectl get pods -n mindflow
```

---

## 🐛 Known Issues & Limitations

*(Will be updated as development progresses)*

- AI processing limited to 100 requests/day in development (Claude API tier limits)
- Search functionality requires Elasticsearch cluster (adds cost)
- Mobile app not yet implemented (PWA only)

---

## 💡 Future Enhancements

- **Voice Journaling:** Speech-to-text entry creation
- **Collaborative Journals:** Share entries with trusted users
- **AI Mood Prediction:** Predict mood based on entry content
- **Integration Hub:** Connect with Spotify, fitness apps, calendar
- **Mobile Native Apps:** iOS and Android applications
- **Multi-language Support:** Expand beyond English and Portuguese

---

## 📞 Support & Questions

For questions about the architecture or implementation:
- **Architecture Questions:** Review [system-architecture.md](docs/system-architecture.md)
- **Database Questions:** Review [database-schema.md](docs/database-schema.md)
- **Infrastructure Questions:** Review [infrastructure-overview.md](docs/infrastructure-overview.md)
- **General Questions:** Open a GitHub issue

---

<div align="center">

**Built with ❤️ as a portfolio project demonstrating modern software architecture**

⭐ Star this repo if you find it helpful!

</div>
