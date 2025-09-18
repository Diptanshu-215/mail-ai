# System Design Documentation: AI Mail Reply Agent

## 1. Overview
Automates email replies using AI agents, allowing users to review, edit, and send drafts from a web dashboard. Integrates Gmail, LLMs (Gemini), and supports RAG, background jobs, and secure authentication.

---

## 2. Architecture

**Structure:**
- `apps/web`: Next.js frontend (React, Tailwind)
- `apps/api`: Express backend (Node.js, REST API, OAuth, queue producer)
- `apps/worker`: BullMQ worker (background jobs)
- `packages/core`: Shared utilities (env, errors, auth)
- `packages/db`: Prisma ORM, database client
- `packages/llm`: LLM abstraction (Gemini, stub)
- `packages/queue`: BullMQ job types, connection
- `packages/agents`: Agent logic (planner, classifier, writer, optimizer, executor, rag-indexer)

**Data Flow:**
1. User authenticates via Google OAuth.
2. API fetches emails, enqueues jobs for classification/drafting.
3. Worker processes jobs, calls LLM, saves drafts.
4. Frontend displays inbox, drafts, agent plans.
5. User reviews/edits/sends replies; actions logged.

---

## 3. Key Components

**Frontend (Next.js):**
- Login, Inbox, Draft Viewer, Settings
- Calls API for data/actions
- Uses WebSockets for draft status updates

**Backend (Express):**
- Auth routes (Google OAuth, JWT, dev login)
- Email fetch, draft generation, agent plan endpoints
- Queue producer for background jobs

**Worker (BullMQ):**
- Processes jobs: fetch mail, classify, generate/optimize/send drafts, RAG indexing
- Calls LLM (Gemini or stub)

**Database (PostgreSQL via Prisma):**
- Users, EmailMeta, Drafts, AgentLogs, RAGEntries

**LLM Layer:**
- Gemini API integration
- Stub for local/dev mode

**Queue (Redis + BullMQ):**
- Job scheduling and processing

---

## 4. Security
- OAuth 2.0 for Gmail authentication
- JWT for session management
- Encrypted token storage
- HTTPS/TLS everywhere
- Audit logs for agent actions

---

## 5. Deployment
- **Frontend:** Vercel (Next.js)
- **API:** Render/Railway/AWS (Express, Docker)
- **Worker:** Same as API or separate service
- **Database:** Managed Postgres (Neon, Supabase, RDS)
- **Queue:** Managed Redis

---

## 6. Scalability & Reliability
- Stateless API and worker (horizontal scaling)
- Background jobs for heavy/slow tasks
- Dead-letter queues for failed jobs
- Monitoring: Sentry, Prometheus, ELK

---

## 7. Extensibility
- Modular agent design (easy to add new agents)
- Pluggable LLM providers
- Feature flags for RAG, optimizer, stub mode
- API surface for future integrations (calendar, attachments, mobile)

---

## 8. Data Models (Sample)

**User:**  
`id, email, name, provider, encryptedTokens, defaultTone, autoReply, createdAt`

**EmailMeta:**  
`id, userId, messageId, threadId, sender, recipients, subject, snippet, labels, classificationLabel, classificationTags, score, fetchedAt, processedAt`

**Draft:**  
`id, emailId, userId, tone, draftText, optimizedText, modelName, tokensUsed, status, createdAt, updatedAt`

**AgentLog:**  
`id, jobId, agentType, action, inputSummary, outputSummary, durationMs, status, timestamp`

**RAGEntry:**  
`id, userId, title, text, embeddingVector, sourceMessageId, tags, createdAt`

---

## 9. API Endpoints (Sample)
- `/api/auth/google` — Start OAuth
- `/api/auth/oauth/callback` — Handle OAuth callback
- `/api/emails` — List emails
- `/api/emails/:id` — Email detail
- `/api/emails/:id/draft` — Generate draft
- `/api/drafts/:id` — Get draft
- `/api/drafts/:id/send` — Send draft
- `/api/agent/plan/:emailId` — Get agent plan

---

## 10. Future Enhancements
- Multi-account/team support
- Learning user preferences
- Attachment and calendar integration
- Mobile app/PWA
