# AI Mail Reply Agent

> Automate routine email replies with agentic LLM workflows while preserving user control, privacy, and auditability.

---
## 1. Overview
The **AI Mail Reply Agent** is a full‑stack, agent-driven platform that connects to a user’s Gmail inbox, classifies and prioritizes inbound messages, generates high‑quality draft replies (multi‑tone), and lets the user review, edit, schedule, or send them. An optional Retrieval‑Augmented Generation (RAG) layer leverages prior approved replies for stylistic and contextual grounding. All autonomous steps are transparently logged for audit and trust.

**Core Values**
- Time savings on repetitive responses
- Human-in-the-loop safety (explicit approval before send)
- Transparency (agent plans, logs, rationale)
- Privacy & data minimization (opt-in storage + encryption)
- Extensibility (pluggable agents, models, providers)

---
## 2. Feature Highlights
| Category | Features |
|----------|----------|
| Auth | Secure Gmail OAuth2, token encryption, session/JWT |
| Inbox Intelligence | Importance classification, needs-reply detection, urgency tagging |
| Drafting | Multi-tone variants (Formal, Friendly, Concise), context-aware prompts, optional optimization pass |
| RAG (Optional) | Similar past replies retrieval, semantic embeddings, adaptive tone consistency |
| Scheduling | Delayed & batched send jobs, retry & backoff |
| Transparency | Agent plan viewer, per-step logs, prompt & token usage metrics |
| Cost Control | Quotas, heuristic prefilters, caching, per-user usage meter |
| Observability | Metrics (Prometheus), structured logs, Sentry errors, audit trail |
| Privacy & Compliance | Data export/delete, consent toggles, encryption, minimal storage mode |
| Extensibility | Modular agent registry, interchangeable LLM + embeddings provider, multi-account roadmap |

---
## 3. High-Level Architecture
```
+----------------------+          +---------------------+         +---------------------+
|      Frontend        |  HTTPS   |      Backend        |  Jobs   |      Workers        |
| Next.js (SSR/CSR)    | <------> | Express / REST / WS | <-----> | BullMQ + Redis      |
| Auth UI / Inbox /    |  JWT     | Auth, Orchestration |  Redis  | Agents: Classify,   |
| Draft Editor / Plan  |          | Queue Enqueue       |         | Writer, Optimizer,  |
+----------+-----------+          +----------+----------+         | Executor, RAG Index |
           |                                 |                    +---------+-----------+
           | WebSocket / SSE                 |                             |
           v                                 v                             v
   +---------------+                +--------------------+        +-------------------+
   |   Browser     |                | PostgreSQL (Core)  |        | Vector DB (RAG)   |
   | State & Cache |                | users, emails,     |        | Embeddings + meta |
   +---------------+                | drafts, logs, ...  |        +-------------------+
                                            |                          ^
                                            | Gmail API                |
                                            v                          |
                                      +-----------+                    |
                                      |  Gmail    |---------------------
                                      +-----------+
```
**Optional add-ons:** LangChain / LlamaIndex orchestration layer, Milvus / Weaviate / Pinecone for vectors, Prometheus + Grafana for metrics, ELK / OpenSearch for logs.

---
## 4. Technology Stack
| Layer | Primary | Alternatives / Notes |
|-------|---------|----------------------|
| Frontend | Next.js 15+, TypeScript, TailwindCSS, Shadcn/UI | Radix UI primitives, TanStack Query for data fetching |
| Backend API | Node.js (18+), Express | Fastify / NestJS if structured DI needed |
| Auth | Gmail OAuth2, Passport.js or custom OAuth handler | NextAuth.js (if co-located) |
| Queue | Redis + BullMQ | RabbitMQ / SQS + custom workers |
| LLM | Gemini API (Writer, Optimizer, Planner) | OpenAI / Claude / Local (via OpenAI-compatible) |
| Embeddings | Gemini Embeddings | sentence-transformers, OpenAI text-embedding-* |
| Vector Store | Pinecone | Weaviate, Milvus, pgvector, FAISS |
| DB | PostgreSQL (UUID PKs) | Supabase / RDS / Cloud SQL |
| ORM | Prisma or Drizzle | Knex (legacy) |
| Observability | Sentry, Prometheus, Grafana | OpenTelemetry collectors |
| Testing | Jest, React Testing Library, Playwright, k6 | Vitest (frontend) |
| CI/CD | GitHub Actions | CircleCI, Buildkite |

---
## 5. System Workflows
### 5.1 Authentication & Onboarding
1. User hits `GET /api/auth/oauth/url` → server returns Gmail OAuth consent URL
2. Redirect → Google consent → authorization code
3. Backend exchanges code for access+refresh tokens
4. Tokens encrypted (KMS or libsodium sealed boxes) and stored
5. User row created/updated; minimal profile cached
6. Optional first sync job enqueued (FetchMail)

### 5.2 Mail Fetching
- Push (Gmail Pub/Sub webhook) preferred; fallback polling job every 1–5 min
- New message IDs added to queue (FetchMail job) retrieving metadata + snippet + (optional) sanitized body

### 5.3 Classification → Draft Generation
- ClassifyMail job executes heuristics + LLM classification prompt
- If label ∈ {NeedsReply, Urgent} enqueue GenerateDraft job
- Writer agent composes system & user prompt with: thread summary, user tone prefs, RAG exemplars
- (Optional) OptimizeDraft job for grammar & clarity
- Results persisted; WebSocket event `draft.ready` emitted

### 5.4 Review & Approval
- UI shows variant tabs (Formal / Friendly / Concise / Optimized)
- User can edit inline; saving triggers patch call (debounced) to update draft record
- Approve → SendDraft job enqueued or scheduled

### 5.5 Sending / Execution
- Executor builds RFC 5322 message (thread headers) and sends via Gmail API
- On success: mark email replied, create RAG index job for final text

### 5.6 RAG Loop
- IndexRAG job embeds reply text, stores in vector DB with metadata
- Future GenerateDraft jobs query top-K (e.g., k=5) by similarity to subject+snippet

### 5.7 Agent Transparency
- Planner agent stores sequence (steps + required statuses)
- AgentLog rows appended per job (input hash, truncated prompt, tokens, latency, outcome)
- UI plan page fetches aggregated view

---
## 6. Data Model (Proposed Prisma Schema Excerpt)
```prisma
model User {
  id              String   @id @default(cuid())
  email           String   @unique
  name            String?
  provider        String   // 'gmail'
  accountId       String?  // Gmail internal id
  encryptedTokens String   // cipher text JSON {access_token, refresh_token}
  defaultTone     String   @default("friendly")
  autoReply       Boolean  @default(false)
  usageDrafts     Int      @default(0)
  createdAt       DateTime @default(now())
  drafts          Draft[]
  emails          EmailMeta[]
  ragEntries      RAGEntry[]
}

model EmailMeta {
  id                  String   @id @default(cuid())
  userId              String
  messageId           String   @unique
  threadId            String
  sender              String
  recipients          String
  subject             String
  snippet             String?
  labels              Json?
  classificationLabel String? // NeedsReply | ...
  classificationTags  Json?
  score               Float?
  fetchedAt           DateTime @default(now())
  processedAt         DateTime?
  repliedAt           DateTime?
  drafts              Draft[]
  @@index([userId, classificationLabel])
}

model Draft {
  id          String   @id @default(cuid())
  emailId     String
  userId      String
  tone        String   // formal | friendly | concise | optimized
  draftText   String
  optimizedText String?
  modelName   String
  tokensUsed  Int?
  status      String   @default("pending") // pending | ready | sent | scheduled
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  scheduledFor DateTime?
}

model AgentLog {
  id            String   @id @default(cuid())
  jobId         String
  agentType     String   // classifier | writer | optimizer | executor | rag-index
  action        String?
  inputSummary  String?
  outputSummary String?
  durationMs    Int?
  status        String   // success | fail | retry
  timestamp     DateTime @default(now())
  meta          Json?
  @@index([agentType, status])
}

model RAGEntry {
  id               String   @id @default(cuid())
  userId           String
  title            String
  text             String
  sourceMessageId  String?
  tags             Json?
  createdAt        DateTime @default(now())
  // embedding stored in external vector DB; store pointer fields if needed
}
```

---
## 7. API Surface (Representative)
Base URL: `/api`

### Auth
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /auth/oauth/url | Get Gmail OAuth consent URL |
| POST | /auth/oauth/callback?provider=gmail | Exchange code for tokens |
| GET | /auth/me | Current user profile |
| POST | /auth/logout | Invalidate session |

### Emails & Drafts
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /emails?filter=needsReply&limit=20&cursor=... | Paginated inbox items |
| GET | /emails/:id | Full message + (optional) thread messages |
| POST | /emails/:id/draft | Trigger draft (tones[] optional) |
| GET | /drafts/:id | Retrieve draft variants |
| PATCH | /drafts/:id | Update edited text or tone change |
| POST | /drafts/:id/send | Approve + send now |
| POST | /drafts/:id/schedule | Schedule future send |

### Agents & Transparency
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /agent/plan/:emailId | Planner step list + statuses |
| POST | /agent/run | Re-run selected agent for email |

### Settings & Usage
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /settings | User preferences |
| PUT | /settings | Update preferences (tone, autoReply, consent) |
| GET | /usage | LLM draft quota usage |

### RAG
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /rag/similar?emailId=... | Similar prior replies |
| POST | /rag/index | Manually index custom text/template |

### Admin / Ops (future)
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /admin/jobs?status=... | Inspect queue jobs |
| GET | /admin/metrics | Aggregated system metrics |

### Error Format (Example)
```json
{
  "error": {
    "code": "DRAFT_NOT_FOUND",
    "message": "Draft does not exist",
    "traceId": "b6f9..."
  }
}
```

---
## 8. Agents & Prompt Design
| Agent | Role | Key Inputs | Output |
|-------|------|-----------|--------|
| Planner | Build step list per email | Metadata (sender, subject) | JSON plan steps |
| Classifier | Determine reply need & priority | Message snippet + heuristics | {label, tags, reason} |
| Writer | Generate multi-tone drafts | Thread context, RAG examples, user prefs | Draft variants |
| Optimizer | Polish selected draft | Chosen draft text | Improved text + confidence |
| Executor | Send email | Approved draft, thread IDs | Gmail message ID |
| RAG Indexer | Embed & store | Final sent reply | Vector entry id |

### Example Classifier Prompt
```
System: You are a precise email triage classifier.
User: Decide whether this email needs a human reply. Provide concise JSON only.
Email Snippet: "{{snippet}}"
Output JSON schema: {"label": "NeedsReply|NoReply|LowPriority|Urgent", "reason": "<short>", "tags": ["..."]}
```
### Example Writer Prompt (Skeleton)
```
System: You are an assistant generating high-quality email reply drafts.
Context:
- Sender: {{senderName}}
- Subject: {{subject}}
- Thread Summary: {{threadSummary}}
- User Preferred Tone: {{preferredTone}}
- Style Examples: {{ragExamples}}
Instructions: Produce up to 3 variants: formal, friendly, concise. Avoid hallucinating facts.
Return JSON: {"variants": [{"tone": "formal", "text": "..."}, ...]}
```
### Example Optimizer Prompt
```
System: You refine emails for clarity and tone while preserving intent.
Draft:
"""
{{draft}}
"""
Tasks: Improve clarity, ensure appropriate tone ({{targetTone}}), remove redundancy, keep factual content unchanged. Output improved text only.
```

---
## 9. Background Jobs & Queues
| Job | Trigger | Steps | Failure Handling |
|-----|---------|-------|------------------|
| FetchMail | Webhook or poll tick | Fetch metadata, enqueue ClassifyMail | Retry 3x, DLQ notify |
| ClassifyMail | New EmailMeta | Heuristics + LLM classify | Retry 2x; fallback label=LowPriority |
| GenerateDraft | Label=NeedsReply/Urgent | Compose prompt, call LLM, store drafts | Retry 2x; escalate alert |
| OptimizeDraft | User enabled optimization | Call LLM refine | Retry 1x; fall back to original |
| SendDraft | User approves or schedule hits | Gmail send API | Retry w/ exponential backoff |
| IndexRAG | After send + consent | Embed + vector upsert | Retry 2x; if fail mark pending |

---
## 10. Security & Privacy
| Concern | Mitigation |
|---------|-----------|
| Token exposure | Encrypt at rest (AES-GCM + key in KMS) + rotate |
| Over-collection | Minimal storage mode (headers + snippet only) |
| Unauthorized access | Row-level checks by `userId`; JWT w/ short expiry + refresh |
| Prompt injection | Sanitize thread text; delimiter quoting; system prompt reassertion |
| Data exfiltration via drafts | Optimizer redaction rules; allowlist phrases |
| GDPR compliance | /export & /delete endpoints; RAG entries purged on account delete |
| Logging PII | Structured field filtering + hashed email addresses in logs |

**Encryption Strategy**
- App-level envelope encryption for tokens
- TLS 1.2+ end-to-end
- Optional field-level encryption (pgcrypto) for body text

---
## 11. Rate Limits, Quotas & Cost Controls
- Per-user monthly quota: `maxDrafts` (configurable)
- Sliding window rate limit (Redis token bucket) for draft generation (e.g., 5/min)
- Heuristic filtering cuts ~30–60% of LLM calls
- Cache identical classification results (subject+sender hash) for automated notifications
- Batch embedding operations where possible
- Admin metrics: average tokens/draft, cost estimation per user

---
## 12. Observability & Monitoring
| Dimension | Tooling | Key Metrics / Logs |
|-----------|---------|--------------------|
| Errors | Sentry | Exception rate, release health |
| Metrics | Prometheus | queue_depth{job}, job_latency_ms, llm_tokens_total, send_failures_total |
| Logs | Structured JSON (pino/winston) | agent_type, job_id, trace_id, latency_ms |
| Tracing | OpenTelemetry (optional) | end-to-end latency spans |
| Alerts | Grafana / PagerDuty | High queue latency, error spikes, quota threshold |

Correlate AgentLog IDs with trace IDs for deep debugging.

---
## 13. Testing Strategy
| Level | Tool | Scope |
|-------|------|-------|
| Unit | Jest | Helpers (prompt builders, classifiers heuristics) |
| Component | React Testing Library | Draft editor, inbox list states |
| Integration | Supertest (Express) | Auth callback, draft generation pipeline (mock LLM) |
| E2E | Playwright | Full login → draft → send flow |
| Performance | k6 | Spike of GenerateDraft & SendDraft jobs |
| Security | Dependency audit (npm audit, Snyk) | Vulnerability surface |

**Mocking the LLM:** Provide deterministic fixtures for prompts → responses to stabilize tests.

---
## 14. Local Development
### 14.1 Prerequisites
- Node.js 18+
- PostgreSQL 14+
- Redis 6+
- (Optional) Vector DB (or use a local FAISS/pgvector dev mode)

### 14.2 Environment Variables (example)
```
# Core
NODE_ENV=development
PORT=3000
APP_ORIGIN=http://localhost:3000

# OAuth
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
GOOGLE_REDIRECT_URI=http://localhost:3000/api/auth/oauth/callback

# JWT / Session
JWT_SECRET=change_me
SESSION_SECRET=change_me

# DB
DATABASE_URL=postgresql://user:pass@localhost:5432/mail_ai

# Redis
REDIS_URL=redis://localhost:6379

# Gemini
GEMINI_API_KEY=...

# Vector
VECTOR_PROVIDER=pinecone
PINECONE_API_KEY=...
PINECONE_INDEX=mail-replies

# Feature Flags
ENABLE_RAG=true
ENABLE_OPTIMIZER=true
```

### 14.3 Typical Dev Flow
1. `npm install`
2. Run migrations `npx prisma migrate dev`
3. Start services (Postgres, Redis)
4. `npm run dev` (spawns frontend & backend or two scripts depending on mono/ poly repo)
5. Start worker: `npm run worker`
6. Log in via Gmail test account
7. Trigger sample inbound email (send to self) → watch queue logs

### 14.4 Seeding & Fixtures
Provide seed script for demo inbox (sanitized lorem-style business mails) & deterministic LLM stub responses for local/offline mode (`USE_LLM_STUB=true`).

### 14.5 Real Gmail Fetch (Implemented)
The current implementation stores encrypted Gmail OAuth tokens and allows on-demand fetching of real inbox messages.

Route: `POST /api/emails/fetch`

Behavior:
- Requires authenticated Google user (provider = `google`).
- Decrypts stored token JSON (access + refresh if provided).
- Lists recent INBOX messages (`gmail.users.messages.list`) with `maxResults` (default 10, cap 50).
- For each message: fetches metadata (`format=metadata`, headers: Subject, From, To) + snippet and inserts into `EmailMeta` (ignoring duplicates using try/catch on unique `messageId`).
- Returns `{ inserted, attempted }`.

Limitations / Next Steps:
- Does not yet fetch full body or thread history (would switch to `format=full` and parse parts).
- No incremental sync using `historyId` yet (add column and use `users.history.list`).
- No background polling or Pub/Sub listener—user triggers fetch manually.
- Classification + draft generation not auto-enqueued on insert (future enhancement: enqueue after each new email).

Extending to Full Body:
1. Change message fetch to `format=full`.
2. Extract text/plain part (fallback to HTML stripped) and store in a new `EmailBody` table or a JSON field.
3. Sanitize (strip trackers, inline images) before storing.
4. Optionally encrypt body text at rest.

Incremental Sync Outline:
1. Store the `historyId` returned by `messages.list` response.
2. Subsequent fetch calls invoke `users.history.list` with `startHistoryId`.
3. Process only `messagesAdded` entries.
4. Backoff to full resync if `historyId` is invalid (HTTP 404).

Token Refresh Handling:
- Google may return a refresh token only on first consent with `access_type=offline` and `prompt=consent`.
- Add a periodic refresh step (before expiry) or refresh on 401 from Gmail.
- Update `encryptedTokens` with new `access_token` after refresh.

Security Notes:
- Current encryption is symmetric and developer-grade; for production integrate KMS (AWS KMS, GCP KMS) and rotate keys.
- Avoid logging token payloads (ensure logging redaction in middleware).

UI Integration:
- Inbox page button "Fetch Gmail" hits the route, updates status, then refreshes list.
- Clicking a subject opens a modal with metadata + snippet (no body yet).

Planned Enhancements:
- Auto-classify on fetch completion.
- WebSocket event push for newly inserted emails.
- Background scheduled fetch (CRON / queue job) for passive updates.

### 14.6 Neon Database Setup
The project now targets a Neon-hosted PostgreSQL instance.

Steps performed:
1. Updated `DATABASE_URL` in root `.env` to Neon connection string (with `sslmode=require`).
2. Applied migrations using `prisma migrate deploy`.
3. Verified connectivity with `prisma migrate status` and app runtime.

CLI Environment Considerations:
- A workspace-level `packages/db/.env` can override root; ensure it also points to Neon or remove it to avoid divergence.
- Studio script updated to: `npm run prisma:studio` → `prisma studio --schema packages/db/prisma/schema.prisma`.

Local Fallback Strategy (Optional):
Provide an alternate `DATABASE_URL_LOCAL` and a script:
```
"scripts": {
  "use:localdb": "set DATABASE_URL=%DATABASE_URL_LOCAL% && npm run dev"
}
```
(Use `cross-env` for cross-platform if needed.)

Performance Tips on Neon:
- Use connection pooling (Neon provides a pooled endpoint; current URL includes `-pooler`).
- Keep Prisma `pgBouncer` friendly settings (avoid long transactions for pooled connections).

Monitoring:
- Track slow queries in Neon dashboard.
- Add retries/backoff for transient network issues (Prisma already retries some errors).

---
## 15. Suggested Folder Structure
```
/ (repo root)
  apps/
    web/            # Next.js frontend
    api/            # Express backend
  packages/
    agents/         # Agent implementations (writer, classifier,...)
    core/           # Shared types, DTOs, zod schemas
    db/             # Prisma schema & migrations
    queue/          # BullMQ setup & job processors
    llm/            # LLM client wrappers & prompt builders
  infra/            # IaC templates (Terraform / Pulumi)
  scripts/          # Dev & CI scripts
  tests/            # Integration & E2E harness
  README.md
```
(Adjust if single-app repo; keep logical separation of concerns.)

---
## 16. Deployment & CI/CD
### 16.1 Pipeline (GitHub Actions Sample Stages)
1. `checkout` + `setup-node`
2. Install deps & cache
3. Lint & typecheck (`tsc --noEmit`)
4. Unit & integration tests (LLM mocked)
5. Build frontend & backend images (Docker)
6. Push to registry (ghcr.io or ECR)
7. Deploy to staging (infrastructure referencing image tag)
8. Run smoke tests (Playwright headless against staging)
9. Manual or automated promotion to prod

### 16.2 Runtime Environments
| Env | Purpose | Differences |
|-----|---------|-------------|
| Dev | Local iteration | Stubs, detailed logs |
| Staging | Pre-prod QA | Smaller quotas, synthetic data |
| Prod | Live users | Full quotas, monitoring/alerting |

### 16.3 Blue/Green or Canary
- Gradual rollout of new Writer prompt templates (feature flag `PROMPT_VERSION`)
- Compare reply acceptance rate metrics before/after

### 16.4 Deployment Options (Current Implementation)

#### Option A: Full Containers (API + Worker + Web)
Use `docker-compose.prod.yml` (provided) which builds three images:
- api: Express server on :4000
- worker: BullMQ workers (no exposed port)
- web: Next.js production server on :3000
- redis: In‑container Redis (replace with managed service for production)

Prerequisites:
1. Set required secrets in an `.env` (NOT committed). At minimum: `DATABASE_URL`, `JWT_SECRET`, `SESSION_SECRET`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_REDIRECT_URI`, `APP_ORIGIN`, `API_ORIGIN`, `REDIS_URL` (if using external Redis) .
2. Build & start:
```bash
docker compose -f docker-compose.prod.yml up -d --build
```
3. Access web at http://localhost:3000 (or configured domain) and API at http://localhost:4000.

Production Hardening:
- Replace inline Redis with managed Redis (Upstash, Elasticache, etc.).
- Use connection pool endpoints for Neon (already using pooled URL if `-pooler` present).
- Add reverse proxy (NGINX / Traefik) for TLS termination with Let's Encrypt certs.
- Set `COOKIE_SECURE=true` and `COOKIE_DOMAIN` to your apex or subdomain.
- Provide `PORT` env variable if deploying behind platform port injection (Render, Heroku, etc.).

#### Option B: Hybrid (Vercel Frontend + Containers for API/Worker)
1. Deploy `apps/web` to Vercel (it only needs env vars starting with `NEXT_PUBLIC_` at build time plus `NEXT_PUBLIC_API_ORIGIN` pointing to your public API URL).
2. Deploy `api` and `worker` containers to a service (Fly.io, Render, AWS ECS/Fargate). Use the respective Dockerfiles in `apps/api` and `apps/worker`.
3. Set `APP_ORIGIN` to your Vercel URL (e.g. `https://yourapp.vercel.app`) and `NEXT_PUBLIC_API_ORIGIN` to the public API domain.
4. Ensure CORS allowed origin matches `APP_ORIGIN`.

#### Option C: Monorepo Build Pipeline
Use GitHub Actions to build and push images (sample workflow can be added):
```yaml
name: ci
on: [push]
jobs:
  build-and-push:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: npm
      - run: npm ci
      - name: Build API image
        run: docker build -t ghcr.io/OWNER/mail-ai-api:$(git rev-parse --short HEAD) apps/api
      - name: Build Worker image
        run: docker build -t ghcr.io/OWNER/mail-ai-worker:$(git rev-parse --short HEAD) apps/worker
      - name: Build Web image
        run: docker build -t ghcr.io/OWNER/mail-ai-web:$(git rev-parse --short HEAD) apps/web
      # docker login + push steps would follow
```

Environment Variable Summary (Production):
| Variable | Purpose |
|----------|---------|
| APP_ORIGIN | Full URL of web frontend |
| API_ORIGIN | Public API base (for web fetch) |
| GOOGLE_CLIENT_ID / SECRET | OAuth credentials |
| GOOGLE_REDIRECT_URI | Must match console; points to API callback |
| JWT_SECRET / SESSION_SECRET | Auth token signing & token encryption |
| DATABASE_URL | Neon Postgres URL (sslmode=require) |
| REDIS_URL | Redis connection (prefer managed) |
| COOKIE_* | Cookie domain / security flags |
| GEMINI_API_KEY | (Future) LLM access |
| USE_LLM_STUB | Set false in prod when real LLM integrated |

Image Size Optimization:
- Use multi-stage builds (already in Dockerfiles) and `npm ci --omit=dev` for runtime layers.
- Consider copying only compiled `dist` for api/worker to reduce size.

Scaling Considerations:
- Horizontally scale API and Worker separately (e.g., scale workers to match queue depth).
- Use `BullMQ` metrics (add a lightweight endpoint or exporter) to inform autoscaling.
- Sticky sessions not required (JWT cookie is stateless) but set consistent `COOKIE_DOMAIN`.

Observability in Production:
- Add structured logger (pino) writing JSON to stdout → aggregate in log platform.
- Implement health + readiness endpoints (currently `/api/health`).
- Future: add `/api/metrics` for Prometheus.

Zero-Downtime Deploy Tips:
- Use rolling deployments with min 1 healthy instance.
- Perform DB migrations separately before swapping traffic.
- Introduce feature flags (already partially via env) for incremental rollout.

---
## 17. UX Mapping (Component → API)
| Component | API | Notes |
|-----------|-----|------|
| LoginPage | GET /auth/oauth/url | Redirect to Google |
| InboxList | GET /emails | Filter chips (All/Important/Needs Reply) map to query params |
| EmailDetail + DraftPanel | GET /emails/:id, GET /drafts/:id | Live status via WS `draft.status` |
| DraftActions | POST /drafts/:id/send | Buttons: Regenerate, Approve & Send, Edit & Send |
| PlanViewer | GET /agent/plan/:emailId | Step statuses (pending, running, done, error) |
| Settings | GET/PUT /settings | Tone, autoReply toggle, RAG consent |
| UsageMeter | GET /usage | Visual quota bar |

---
## 18. Roadmap & Future Enhancements
| Priority | Feature | Rationale |
|----------|---------|-----------|
| High | Multi-account / Team workspaces | Enterprise adoption |
| High | Calendar integration | Intelligent scheduling replies |
| Medium | Attachment semantic parsing (OCR) | Context completeness |
| Medium | Personalization fine-tuning | Higher acceptance rate |
| Medium | Mobile PWA push notifications | Approvals on the go |
| Low | Multi-LLM routing (cost vs quality) | Optimize spend |
| Low | Template marketplace | Shared best-practice replies |

---
## 19. Contributing
1. Fork & clone
2. Enable pre-commit hooks (`npm run prepare` if Husky configured)
3. Create feature branch
4. Add/Update tests for changes
5. Run full test suite & lint
6. Submit PR with description + screenshots / prompt diffs

Code style: ESLint + Prettier + TypeScript strict mode; commit messages conventional (`feat:`, `fix:` etc.).

---
## 20. Operational Metrics (KPIs)
| KPI | Description | Target (example) |
|-----|-------------|------------------|
| Draft Acceptance Rate | % of generated drafts sent with minor edits | >70% |
| Avg Time to Draft | Queue enqueue → drafts ready | <8s |
| LLM Tokens per Draft | Cost proxy | <2k tokens |
| Classification Precision | Accuracy on curated set | >90% |
| Draft Latency P95 | Tail performance | <12s |
| Send Failure Rate | Gmail send errors / total send attempts | <0.5% |

---
## 21. Risk Register (Selected)
| Risk | Impact | Mitigation |
|------|--------|-----------|
| Gmail API quota exhaustion | Drafting halted | Exponential backoff + quota dashboards |
| LLM provider outage | Draft generation downtime | Fallback to secondary model/provider |
| Prompt injection from malicious sender | Data leakage | Strict system prompt, sanitize & escape inbound content |
| Rising LLM costs | Budget overrun | Quotas, heuristics, caching, model mixing |
| Data breach of stored bodies | Privacy harm | Minimized storage + encryption + segmentation |

---
## 22. Appendix A: Example WebSocket Events
| Event | Payload |
|-------|---------|
| draft.ready | { draftId, emailId, tones: ["formal","friendly"] } |
| draft.updated | { draftId, tone, status } |
| draft.sent | { draftId, emailId, sentAt } |
| plan.updated | { emailId, step, status } |

---
## 23. Appendix B: Zod DTO Sketch
```ts
import { z } from 'zod';

export const DraftVariantSchema = z.object({
  tone: z.string(),
  text: z.string().min(1),
});

export const WriterResponseSchema = z.object({
  variants: z.array(DraftVariantSchema).min(1),
});

export const ClassificationSchema = z.object({
  label: z.enum(['NeedsReply','NoReply','LowPriority','Urgent']),
  reason: z.string(),
  tags: z.array(z.string()).default([])
});
```

---
## 24. Appendix C: Minimal Prompt Builder (Pseudo-code)
```ts
function buildWriterPrompt(ctx) {
  return `System: You are an assistant generating high-quality email reply drafts.\n` +
    `Sender: ${ctx.sender}\nSubject: ${ctx.subject}\n` +
    `Thread Summary: ${ctx.threadSummary}\n` +
    `Preferred Tone: ${ctx.preferredTone}\n` +
    `Examples:\n${ctx.examples.map((e,i)=>`[Example ${i+1}]\n${e}`).join('\n')}\n` +
    `Instructions: Provide JSON with variants for tones: formal, friendly, concise.`;
}
```

---
## 25. License
Add your preferred license (e.g., MIT) once repository is public.

---
## 26. Quick Start (TL;DR)
npm run dev
```bash
# 1. Install dependencies (root will install workspaces)
npm install

# 2. Generate Prisma client & run migrations
npm run prisma:generate -w packages/db
npm run prisma:migrate -w packages/db

# 3. Start backend API, web, and worker concurrently
npm run dev

# (Optional) Run only one target
npm run dev:api   # API
npm run dev:web   # Frontend
npm run dev:worker # Worker

# 4. Visit the web app
Start API on :4000 (default) and web on :3000
```
Visit: http://localhost:3000

---
## 27. Summary
This README documents the architecture, workflows, data models, API surface, agents, security posture, operations, and future roadmap for the AI Mail Reply Agent. Use it as the canonical onboarding & reference guide. Iterate continuously as implementation details evolve.

---
## 28. Next Immediate Implementation Steps (Suggested)
1. Scaffold repo structure + package boundaries
2. Implement OAuth flow & token encryption baseline
3. Create DB schema & run initial migrations
4. Build minimal inbox fetcher + classification heuristic
5. Integrate Writer agent with Gemini (single tone first)
6. Add draft review UI & send functionality
7. Introduce WebSocket notifications
8. Add quotas + usage meter
9. Layer in RAG + optimization after baseline stable
10. Harden observability & cost dashboards

---
Happy building! 🚀
