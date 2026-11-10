# AUREVON Platform Architecture

**Status:** Architecture baseline — documentation only; no production services are implied by this document.

## 1. Verified current state

The repository currently contains two distinct deliverables:

- `aurevon-site/public/index.html`: a static AUREVON corporate website. It is not a Next.js application and does not currently expose a product backend.
- The repository-root VAYORA application: React, TypeScript and Vite, packaged as a PWA/Capacitor app. Core study data is stored locally in IndexedDB through Dexie; state is managed with Zustand.
- AI functionality is currently concentrated in `api/chat.ts`. It calls OpenRouter from the server, pins routing to `openrouter/free`, limits request size and message length, redacts common direct identifiers, checks allowed origins, and applies a daily limit through Upstash Redis or Railway Redis.
- `api/tts.ts` intentionally returns HTTP 410; speech is delegated to device/browser capabilities.
- The optional Node server in `server.ts` serves the built frontend and proxies the chat/TTS handlers. Vercel configuration declares the chat function separately.
- The README describes a local-first product and explicitly notes that cloud accounts and cross-device synchronization are not implemented.

## 2. Current-state constraints

The diagram's unified identity, user/content services, vector database, event bus, analytics platform, subscriptions, and developer APIs are **target capabilities**, not verified existing services.

In particular:

1. There is no verified shared identity or account system across AUREVON, VAYORA and Optima.
2. VAYORA's local IndexedDB data is not a cloud user database and does not automatically synchronize across devices.
3. The current AI route is a focused server-side endpoint, not a general AI gateway or model orchestration platform.
4. No production Kafka, Qdrant, MongoDB, Kubernetes, or microservice deployment is established by the inspected repository.
5. The corporate website is static HTML; do not describe it as Next.js until it is actually migrated.

## 3. Recommended target architecture

Start with a **modular monolith** behind a stable API boundary. Keep product clients independent while sharing platform capabilities through versioned APIs.

### Client layer

- AUREVON Web: corporate site and, later, a separate authenticated developer/control portal.
- VAYORA: PWA/Android client; preserve local-first study workflows.
- Optima: independent client and product domain; integrate only through documented APIs.

### Edge and API boundary

- Keep Vercel as the current web delivery platform.
- Add a managed edge/WAF layer only when traffic and threat model justify its operational cost.
- Version APIs (for example, `/api/v1`), validate inputs at the boundary, apply request-size limits, rate limits, and explicit CORS policy.
- Do not trust client-supplied identity, role, tenant, or billing values.

### Platform modules (initially one deployable backend)

1. **Identity & Access:** account lifecycle, verified sessions, roles, product membership, and tenant boundaries. Select an established OIDC provider or a well-maintained auth implementation before storing shared user data.
2. **User Profile:** minimal profile and preferences, separated from product-specific learning records.
3. **Product APIs:** separate VAYORA and Optima domain modules with explicit data ownership.
4. **AI Gateway:** provider adapters, server-only credentials, model allowlists, budgets, per-user quotas, timeouts, retries, audit metadata, and safe fallback behavior. Never expose provider keys to clients.
5. **Content & Files:** object storage for uploads, metadata in PostgreSQL, short-lived signed access, file validation and retention rules.
6. **Telemetry:** structured logs, error reporting, latency and usage metrics with personal data minimized.

### Data layer

- PostgreSQL: canonical accounts, product memberships, entitlements, and server-owned records.
- Object storage: documents and media; do not put large files in relational rows.
- Redis: short-lived cache, distributed rate limits, and ephemeral coordination.
- Vector database: introduce only for a measured semantic-search/RAG use case, with tenant isolation and deletion propagation.
- Event streaming: start with a transactional outbox and a lightweight queue if asynchronous work is needed. Adopt Kafka only when throughput and replay requirements justify it.

## 4. Non-negotiable engineering rules

- Preserve existing VAYORA features and local data behavior while adding optional cloud capabilities.
- Make cloud sync opt-in and conflict-aware; never silently replace local study data.
- Keep secrets server-side and out of Git, browser bundles, mobile packages, and logs.
- Enforce tenant/product authorization on every server-side data access.
- Define retention, export, and deletion behavior before collecting student records or files centrally.
- Treat minors' educational data as high-sensitivity operational data: minimize collection, restrict access, and obtain appropriate consent before enabling cloud profiles or AI processing.
- Add automated tests for authorization, tenant isolation, rate limits, validation, and data deletion before launch.
- Do not promise global latency targets such as sub-20ms; measure real user regions and request paths.

## 5. Delivery sequence

### Phase 0 — Baseline and safety
- Keep the current Vercel website and preview workflow.
- Reconcile deployment configuration, environment-variable documentation, and actual runtime behavior.
- Add CI checks for type safety, tests, and production builds.
- Document data flows, API contracts, and ownership before adding shared data.

### Phase 1 — Secure platform foundation
- Choose identity provider and define account, session, role, product, and tenant models.
- Establish a versioned API boundary and server-side authorization middleware.
- Add PostgreSQL migrations and audit events only for server-owned records.
- Preserve local-first VAYORA operation while introducing optional account linking.

### Phase 2 — Shared AI gateway
- Extract the existing chat logic behind a provider adapter without changing current free-model behavior by default.
- Add per-account quotas and cost controls only after identity is implemented.
- Add provider health, latency, token/cost telemetry, and bounded retries.
- Add RAG only after a real content retrieval use case and permission model exist.

### Phase 3 — Product integration
- Integrate VAYORA and Optima through separate product APIs.
- Add secure file storage and optional cross-device synchronization.
- Publish OpenAPI documentation for stable external interfaces.

### Phase 4 — Operations and monetization
- Add dashboards, alerts, backups, restore drills, and incident procedures.
- Add plans, entitlements, and billing only after product usage and legally supported payment rails are verified.
- Split modules into independent services only when measured scale, deployment cadence, or isolation requirements demand it.

## 6. Explicitly deferred

Do not introduce Kubernetes, Kafka, gRPC, MongoDB, Qdrant, multi-region databases, crypto payments, or a microservice fleet as initial work. Each adds cost and operational surface area without solving a verified current bottleneck.

## 7. Definition of done for each phase

A phase is complete only when its code is merged through review, automated checks pass, secrets and data boundaries are verified, a preview is tested, and rollback steps are documented. A diagram or UI mockup alone does not count as an implemented capability.
