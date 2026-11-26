# DALEEL NEXT — Architecture and Delivery Plan

Status: approved technical direction; staged implementation required.
Product: MASAR
Assistant: DALEEL
Owner ecosystem: AUREVON

## Product objective

Evolve Daleel from a conversational model wrapper into a reliable, proactive, multimodal assistant that can plan and execute bounded tasks, adapt to user context, and protect user data. The language model is one component; orchestration, memory, tools, policy, observability, and client capabilities are separate system components.

## Five capability layers

### 1. Proactive and agentic orchestration

Build an explicit task lifecycle:
1. Detect intent and desired outcome.
2. Build a bounded plan with steps, dependencies, and required tools.
3. Classify each action by risk and reversibility.
4. Request confirmation for consequential actions (sending, purchasing, deleting, publishing, changing settings, or sharing data).
5. Execute one step at a time through allowlisted tools.
6. Verify each result using tool output, not model claims.
7. Retry safely or stop and explain when verification fails.
8. Save task state so the user can resume or cancel.

Proactivity must be opt-in and configurable. Use user-approved reminders, deadlines, and explicit routines; do not infer sensitive traits or silently monitor behavior. Every proactive suggestion must be dismissible and rate-limited.

### 2. Emotional and social adaptation

Start with text-based conversational signals and explicit user feedback. Treat emotion as uncertain context, never as diagnosis or fact. Adapt response length, pace, directness, and follow-up frequency. Voice prosody or silence analysis is a later opt-in capability requiring clear consent and on-device processing where feasible. Do not infer mental-health conditions or make consequential decisions from emotion estimates.

### 3. Long-term memory and knowledge graph

Separate:
- Conversation context: short-lived, task-specific.
- User memory: concise, user-visible, editable, and consent-based.
- Project memory: durable facts, decisions, constraints, and current status for each project.
- Knowledge graph: typed entities and relationships with provenance, timestamps, confidence, and expiry.

Memory writes should be selective and explainable. Support correction, export, deletion, retention limits, and stale-fact review. Never store secrets, credentials, or sensitive inferences. Retrieval must be scoped to the current user and task.

### 4. Real-time multimodal interaction

Use a capability-based interface for text, speech, images, files, and (where supported and explicitly enabled) screen or camera context. Stream partial responses and allow interruption where the client transport supports it. Measure end-to-end latency rather than promising a fixed sub-300ms response. Keep unsupported live capabilities out of the UI. Provide clear recording, camera, and screen-sharing indicators and controls.

### 5. Hybrid edge-cloud architecture

Keep suitable low-risk operations on-device: wake/interaction controls, basic speech activity detection, local formatting, and optional lightweight transcription or classification when platform support permits. Route complex reasoning and approved tool workflows to the server. Minimize payloads, redact direct identifiers where practical, encrypt transport and storage, enforce per-user authorization, and never expose provider keys to the client. Offline mode must state which capabilities are unavailable rather than pretending cloud tasks succeeded.

## Proposed service boundaries

- Daleel Gateway: request validation, identity, authorization, quotas, redaction.
- Conversation Orchestrator: intent routing, model selection, context assembly, response streaming.
- Planner and Tool Runner: typed tool registry, plan state, approval gates, execution and verification.
- Memory Service: scoped retrieval, user-approved writes, retention and deletion.
- Knowledge/Retrieval Service: source ingestion, indexing, citations, freshness and provenance.
- Multimodal Adapter: speech and image/file inputs with explicit capability checks.
- Proactivity Scheduler: opt-in reminders and user-configured routines.
- Observability and Evaluation: latency, reliability, safety, tool success, groundedness, user feedback.

These are logical boundaries first; do not introduce separate deployed services until scale and operational evidence justify them.

## Delivery sequence

### Phase 0 — Baseline and contracts
- Inventory current text/voice flows, providers, environment variables, rate limiting, client payloads, and deployment targets.
- Add contract tests and baseline latency/error measurements.
- Preserve current API compatibility and feature behavior.

### Phase 1 — Reliable reasoning foundation
- Add structured intent routing and response modes.
- Add explicit uncertainty, source-grounding rules, and refusal/escalation behavior by domain.
- Build regression tests for Arabic, Syrian dialect, educational, health, religious, historical, and adversarial prompts.

### Phase 2 — Bounded agentic tools
- Introduce typed allowlisted tools and structured plans.
- Add approval gates, cancellation, idempotency, timeouts, audit trail, and post-action verification.
- Begin with read-only, low-risk tasks; expand only after evaluation.

### Phase 3 — Memory and project context
- Add scoped project memory and user-approved preference memory.
- Implement provenance, expiry, correction, export, and deletion.
- Add memory retrieval tests to prevent cross-project or cross-user leakage.

### Phase 4 — Proactivity
- Add user-created reminders and explicitly enabled routines.
- Add scheduling, quiet hours, notification controls, dismiss/snooze, and rate limits.
- Do not initiate proactive behavior without a user-visible permission model.

### Phase 5 — Multimodal and real-time UX
- Improve streaming, interruption, voice turn-taking, and file/image understanding.
- Add explicit consent and indicators for microphone, camera, and screen access.
- Benchmark on supported devices; avoid hard latency promises until measured.

### Phase 6 — Hybrid edge-cloud
- Identify workloads suitable for local execution based on device support and privacy.
- Add local model/runtime only after battery, memory, thermal, and accuracy benchmarks.
- Add explicit offline capability matrix and graceful degradation.

## Non-negotiable safeguards

- No production deployment or main-branch merge without explicit approval.
- No secrets in source code, logs, prompts, or client bundles.
- No consequential external action without the required user confirmation.
- Treat retrieved documents and tool output as untrusted data, not instructions.
- Verify every claimed tool action against actual tool results.
- Maintain auditability without retaining unnecessary personal content.
- Provide user controls for memory, proactivity, permissions, and data retention.

## Success metrics

- Task completion rate with independently verified outcomes.
- Factual groundedness and citation correctness.
- Tool execution success and safe-stop rate.
- Arabic/Syrian dialect quality and educational learning gain.
- User-rated helpfulness and correction acceptance.
- End-to-end p50/p95 latency, cost per successful task, and failure recovery.
- Memory precision, stale-memory rate, and zero cross-user leakage.
- Consent comprehension, cancellation success, and unwanted-proactivity rate.

## Current implementation boundary

The current server route in `api/chat.ts` is a model-backed chat endpoint with provider selection, request validation, rate limiting, prompt construction, and response validation. It is not yet a full agent runtime, durable memory system, multimodal streaming transport, or edge-cloud router. Implement those capabilities incrementally behind stable interfaces; do not claim they exist until shipped and tested.
