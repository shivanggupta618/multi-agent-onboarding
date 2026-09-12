# Multi-Agent Onboarding Case Reviewer

A full-stack, **synthetic-data-only** banking onboarding demonstrator built in TypeScript. It demonstrates how specialized AI agents independently inspect customer onboarding evidence, pass typed findings to a supervisor orchestrator, and produce an explainable, advisory recommendation with an auditable execution trace.

This implementation uses a deterministic agent engine with typed Zod contracts. The agent boundaries, input/output schemas, supervisor retries, and autonomy controls are structured so that live LLMs (e.g. OpenAI/Gemini/Anthropic) can replace the policy functions without altering the orchestration design.

---

## 🚀 Quick Start & Evaluator Instructions

```bash
# 1. Clone the repository
git clone https://github.com/shivanggupta618/multi-agent-onboarding.git
cd multi-agent-onboarding

# 2. Install workspace dependencies
npm install

# 3. Seed database with synthetic onboarding test cases
npm run seed

# 4. Run automated unit, integration & performance test suites (Vitest)
npm test

# 5. Build TypeScript packages
npm run build

# 6. Start development servers (API on :3001, Vite React UI on :5173 / :5175)
npm run dev
```

Open `http://localhost:5173` (or the URL printed by Vite) in your browser to interact with the review console.

---

## 🏛️ Architecture & System Topology

```text
               ┌──────────────────────────────────────────────┐
               │    React 19 + TypeScript Review Console      │
               │   (Vite UI, Preset Case Selector & JSON Upload)│
               └──────────────────────┬───────────────────────┘
                                      │ HTTP REST API
                                      ▼
               ┌──────────────────────────────────────────────┐
               │         Express API (apps/api)               │
               │    - Zod Validation & Schema Enforcement    │
               │    - SQLite Binary Persistence (sql.js)      │
               └──────────────────────┬───────────────────────┘
                                      │ Orchestration Trigger
                                      ▼
               ┌──────────────────────────────────────────────┐
               │            Supervisor Orchestration          │
               │    - Workflow Execution Trace & Audit Log    │
               │    - Retry Boundaries & Failure Isolation    │
               │    - Autonomy Mode Policy Evaluation          │
               └──────┬───────────────┬───────────────┬───────┘
                      │               │               │
      ┌───────────────┴────┐  ┌───────┴──────────┐  ┌─┴──────────────────┐
      ▼                    ▼  ▼                  ▼  ▼                    ▼
┌───────────────┐ ┌───────────────┐ ┌───────────────┐ ┌───────────────┐
│  Document     │ │  Identity     │ │  Financial    │ │  Risk         │
│  Completeness │ │  Consistency  │ │  Profile      │ │  Indicator    │
│  Agent        │ │  Agent        │ │  Agent        │ │  Agent        │
└───────┬───────┘ └───────┬───────┘ └───────┬───────┘ └───────┬───────┘
        │                 │                 │                 │
        └─────────────────┼─────────────────┴─────────────────┘
                          │ Typed Specialist Findings (AgentOutput[])
                          ▼
             ┌─────────────────────────┐
             │  Recommendation Agent   │
             │  (Decision Synthesizer) │
             └────────────┬────────────┘
                          │
                          ▼
            Auditable Recommendation + Rationale
          (Strictly Advisory - Non-Executable)
```

The frontend and backend are cleanly separated:
- **Frontend**: Handles case selection, custom synthetic JSON uploads, field editing, autonomy mode toggling, and rendering agent findings / trace timelines.
- **Backend**: Enforces schema contracts, executes agent policies, manages retries, stores cases/workflows in SQLite, and generates audit logs.

---

## 🤖 Agent Roles, Responsibilities & Contracts

Every agent is defined with a explicit role, goal, typed input, typed output schema, and controlled workflow participation:

| Agent Name | Role | Goal | Input Schema | Output / Policy logic |
|---|---|---|---|---|
| **Document Completeness Agent** | Evidence Verifier | Confirm required onboarding documents (ID, Address proof, Income evidence) are present and legible. | `OnboardingCase` | Generates `WARNING` findings if mandatory documents are missing or unreadable. |
| **Identity Consistency Agent** | Identity Reconciler | Reconcile declared customer profile data against supplied identity documents. | `OnboardingCase` | Generates `CRITICAL` findings for name mismatch, date-of-birth mismatch, or expired identity documents. |
| **Financial Profile Agent** | Financial Plausibility Reviewer | Assess declared employment status and income plausibility. | `OnboardingCase` | Generates `WARNING` findings if annual income is $0 or employer details are missing. |
| **Risk Indicator Agent** | Risk Screener | Screen synthetic risk indicators (Sanctions, PEP, High-risk country, Adverse Media). | `OnboardingCase` | Generates `CRITICAL` findings for sanctions hits; `WARNING` for PEP, high-risk country, or adverse media. |
| **Recommendation Agent** | Decision Synthesizer | Synthesize specialist outputs into an explainable consolidated recommendation. | `AgentOutput[]` | Maps findings to `APPROVE`, `REJECT` (Sanctions/Expired ID), or `REFER_FOR_MANUAL_REVIEW`. |

### Decision Logic Table

| Case Condition | Recommendation | System Action / Status |
|---|---|---|
| No material findings across all agents | `APPROVE` | `COMPLETED` (if exception mode) or `PENDING_HUMAN_APPROVAL` |
| Warnings detected (missing docs, zero income, PEP, high risk geo) | `REFER_FOR_MANUAL_REVIEW` | `PENDING_HUMAN_APPROVAL` |
| Critical findings detected (Sanctions hit, Expired ID) | `REJECT` | `PENDING_HUMAN_APPROVAL` |
| Malformed case payload or validation failure | HTTP 400 | Server error response before workflow start |

---

## ⚙️ Workflow, Autonomy Modes & Reliability

1. **Intake**: Case data is loaded from preset synthetic templates, uploaded via JSON, or created via UI.
2. **Persistence**: Case data is validated with Zod schemas and persisted in SQLite (`onboarding-reviewer.sqlite`).
3. **Specialist Parallel Execution**: The Supervisor runs Document, Identity, Financial, and Risk agents concurrently.
4. **Retry Boundary & Failure Handling**: If an agent throws an error, the supervisor retries execution (up to 2 attempts). If attempts are exhausted, the failure is recorded as an isolated finding so the workflow can safely complete without crashing.
5. **Controlled Hand-off**: Specialist outputs (`AgentOutput[]`) are passed to the Recommendation Agent. Raw customer PII/data is not reread by the Recommendation Agent.
6. **Autonomy Policy Evaluation**:
   - `HUMAN_APPROVAL_REQUIRED`: Every review outcome is queued as `PENDING_HUMAN_APPROVAL`.
   - `REVIEW_ON_EXCEPTION`: Clean approvals (`APPROVE` with no warnings/failures) transition directly to `COMPLETED`. Any warnings, rejects, or agent failures force `PENDING_HUMAN_APPROVAL`.
7. **Auditability**: Every step (STARTED, COMPLETED, RETRYING, HANDOFF, FAILED) is logged to an immutable `TraceEvent[]` list.

---

## 🧪 Automated Testing

Automated tests are implemented using **Vitest**:

```bash
npm test
```

### Coverage Includes:
- **Agent Unit Tests** (`apps/api/src/tests/agents.test.ts`):
  - Document Completeness validation (missing/unreadable documents).
  - Identity Consistency reconciliation (name mismatch, DOB mismatch, expired ID).
  - Financial Profile validation (zero income, missing employer).
  - Risk Indicator screening (Sanctions hits, PEP, adverse media).
  - Recommendation Agent synthesis rules.
- **Orchestrator Integration Tests** (`apps/api/src/tests/orchestrator.test.ts`):
  - Workflow execution and state transitions.
  - Autonomy mode evaluation (`HUMAN_APPROVAL_REQUIRED` vs `REVIEW_ON_EXCEPTION`).
  - Execution trace event creation and audit logging.

---

## 📁 Repository Structure & Code Walkthrough

```text
.
├── .env.example                # Environment configuration template
├── package.json                # Monorepo workspace configuration & scripts
├── README.md                   # Technical documentation
└── apps
    ├── api                     # Backend Express + Node.js + SQLite service
    │   ├── package.json
    │   ├── tsconfig.json
    │   ├── vitest.config.ts    # Vitest testing configuration
    │   └── src
    │       ├── agents.ts       # Implementation of all 5 specialized agents
    │       ├── contracts.ts    # Central Zod schemas & TypeScript type contracts
    │       ├── db.ts           # SQLite repository wrapper (sql.js)
    │       ├── index.ts        # Express REST API routes & middleware
    │       ├── orchestrator.ts # Supervisor workflow runner, retries & trace logging
    │       ├── sample.ts       # Preset synthetic case dataset generator
    │       ├── seed.ts         # Database seed script
    │       └── tests/          # Vitest unit & integration test suites
    │           ├── agents.test.ts
    │           └── orchestrator.test.ts
    └── web                     # Frontend React + Vite application
        ├── package.json
        ├── tsconfig.json
        ├── vite.config.ts      # Vite dev server configuration & API proxy
        ├── index.html
        └── src
            ├── main.tsx        # React 19 review console UI & JSON file uploader
            └── styles.css      # Custom design system CSS
```

---

## 🛡️ Security, Assumptions & Non-Executable Action Controls

1. **Synthetic Data Policy**: Strictly uses synthetic names, addresses, document numbers, and risk signals. No actual PII or live banking data is present.
2. **Separation of Recommendation & Execution**: The application produces **advisory outputs only**. No backend endpoint or database function has authority or connectivity to open bank accounts, issue cards, or transfer funds.
3. **Typed Boundary Integrity**: Input cases and output findings pass through strict Zod schemas, preventing untyped string outputs or prompt injection artifacts from altering system state.

---

## 🛣️ Roadmap for Safe Autonomy Progression

To safely advance from human-in-the-loop to higher autonomy in a live banking environment:

1. **Phase 1 (Current)**: Human approval required for all cases; AI recommendation is advisory.
2. **Phase 2 (Shadow Execution)**: Run agent reviews in parallel with manual underwriting to benchmark accuracy and calibrate confidence thresholds against human decisions.
3. **Phase 3 (Exception-Only Autonomy)**: Enable auto-approval (`REVIEW_ON_EXCEPTION`) strictly for low-risk, high-confidence clean cases (100% doc readability, zero risk hits, verified ID).
4. **Phase 4 (Gated Downstream Execution)**: Connect downstream account opening via dedicated, idempotent action adapters requiring dual-authorization and kill-switch overrides.

---

## 🛠️ AI Development Tool Disclosure

As part of the technical assessment guidelines:
- **Codex & Antigravity**: Initial project scaffolding, agent typed contract structures, React component templates, and Vitest test suites were developed in pair-programming collaboration with AI engineering tools (Codex and Google Antigravity).
- **Engineering Decisions Made**: Architectural choices (monorepo layout, SQLite sql.js integration, Zod schema validation, Supervisor retry boundary, non-executable recommendation safety barrier, and autonomy policy design) were explicitly directed and verified by the engineer.
