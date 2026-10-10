# HealTest ⚡

> **Functional, generic, intent-based self-healing E2E testing platform.**

HealTest replaces brittle CSS/XPath-heavy end-to-end tests with **intent-based test execution**. Instead of hardcoding selectors, HealTest operates through accessible roles, labels, and text. When UI mutations break an interaction, HealTest inspects the modified DOM, finds safe, unambiguous candidate replacements, repairs the workflow, retries the action, and verifies real expected outcomes without fabricating results.

---

## 🏛️ Project Architecture

```
healtest/
├── frontend/             # React 19, TypeScript, Tailwind CSS, Vite Dashboard
│   ├── src/
│   │   ├── components/   # UI Modules (Navbar, TargetConfig, Steps, Healing, Logs, Screenshots, History)
│   │   ├── data/         # Sample verified test runs (HEALED, PASSED, FAILED)
│   │   ├── services/     # API client with auto backend health check & local fallback
│   │   ├── utils/        # URL safety and instruction validator
│   │   └── types/        # TypeScript contracts for steps, heals, runs, and intents
├── backend/              # Node.js + Express API server
│   ├── src/
│   │   ├── index.ts      # Express REST API, screenshot server, and test fixture route
│   │   ├── safety.ts     # Safety validator (protocol & private network guards)
│   │   ├── verify-stage2.ts # Stage 2 baseline verification script
│   │   ├── verify-stage3.ts # Stage 3 self-healing & outcome verification script
│   │   └── verify-stage4.ts # Stage 4 end-to-end integration verification script
├── engine/               # Playwright Intent & Self-Healing Testing Engine
│   ├── src/
│   │   ├── intentParser.ts      # Natural language intent parser & action decomposer
│   │   ├── executor.ts          # Playwright runner with self-healing recovery loop
│   │   ├── domAnalyzer.ts       # Live DOM inspection & accessible element extractor
│   │   ├── healingStrategist.ts # Candidate scoring, synonym dictionary, and ambiguity filter
│   │   └── index.ts             # Engine exports
├── shared/               # Shared TypeScript data contracts across frontend, backend, engine
│   └── types.ts
├── backend/artifacts/    # Real screenshot captures saved per test run
├── package.json          # Root monorepo scripts
└── README.md             # Setup and documentation
```

---

## 🚀 Status by Stage (All 4 Stages Complete)

### ✅ Stage 1: Functional Dashboard
- Interactive UI with URL input, natural language intent prompts, ground truth criteria, and presets.
- Real-time safety validation: protocol check, private-network detection, explicit Dev Mode toggle, and destructive operation blocker.
- Generated Steps Inspector with accessible locator synthesis.
- Self-Healing Deep Dive Inspector with DOM mutation diffs, candidate matrix, and recovery explanations.
- Console logs viewer with level filtering and clipboard copy.
- Screenshot gallery with full-resolution modal lightbox.

### ✅ Stage 2: Express API & Real Playwright Testing
- **Express REST API (`http://localhost:3001`)**:
  - `GET /api/health`: Health status, active stage, and run metrics.
  - `GET /api/runs`: Returns all executed runs.
  - `GET /api/runs/:id`: Returns detailed telemetry for a specific run.
  - `POST /api/runs`: Dispatches a real Playwright test execution against any supplied URL.
  - `GET /api/screenshots/*`: Static image server serving captured screenshots.
- **Minimal Temporary Test Fixture (`http://localhost:3001/fixture`)**:
  - Generic accessible target page containing accessible heading, text field, button, and dynamic status banner.
- **Real Playwright Browser Automation**:
  - Headless Chromium automation via accessible locators (`getByRole`, `getByLabel`, `getByText`).
  - Automatic step-by-step screenshot generation saved to disk.
  - Backend safety enforcement (blocks unauthorized localhost with `403 Forbidden`).

### ✅ Stage 3: Generic Failure Detection, Action Recovery & Outcome Verification
- **DOM Mutation Analyzer (`engine/src/domAnalyzer.ts`)**:
  - Inspects live browser DOM upon action failure.
  - Extracts visible interactive elements, accessibility roles, aria labels, text content, and DOM snippets.
- **Autonomous Healing Strategist (`engine/src/healingStrategist.ts`)**:
  - Multi-heuristic evaluation engine with normalized scoring (0.0 to 1.0).
  - Semantic synonym detection (e.g. `submit` ↔ `send`, `signin` ↔ `login`, `search` ↔ `find`).
  - Fuzzy text & placeholder similarity matching.
  - **Ambiguity Filter**: Rejects recovery if multiple candidate elements have matching high scores without clear discrimination, preventing dangerous unintended clicks.
  - Minimum confidence threshold enforcement (65%).
- **Workflow Mutation & Live Retry (`engine/src/executor.ts`)**:
  - Dynamically synthesizes a replacement accessible selector.
  - Retries the action on the live page and captures both failure and healed screenshots (`step-N-failure.png`, `step-N-healed.png`).
- **Strict Ground Truth Outcome Verification (No Fabrication)**:
  - Asserts expected criteria against live DOM.
  - Marks status as **`HEALED`** only when recovery succeeded AND the verifiable ground truth outcome was confirmed.
  - Reports **`FAILED`** if recovery cannot safely occur or outcome criteria are not met.

### ✅ Stage 4: Dashboard Integration & End-to-End Live Testing
- **Full Frontend-to-Backend Connectivity**:
  - Frontend dashboard connects live to `http://localhost:3001/api`.
  - Clicking "Run HealTest Engine" triggers real Playwright execution via `POST /api/runs`.
  - Telemetry, logs, and screenshots stream directly into the UI.
- **Real Screenshot Serving**:
  - Step screenshots served directly over HTTP (`http://localhost:3001/api/screenshots/...`) and displayed in the screenshot gallery with lightbox view.
- **Interactive Preset Scenarios Built into Dashboard**:
  - **⚡ Live Self-Healing (Submit → Send)**: Tests UI mutation recovery (`/fixture?mutated=true`) -> Verdict: `HEALED`.
  - **✅ Baseline E2E Pass**: Tests clean end-to-end flow (`/fixture`) -> Verdict: `PASSED`.
  - **❌ Strict Failure (No Fabrication)**: Tests unrecoverable missing element (`/fixture?broken=true`) -> Verdict: `FAILED`.
  - **🌐 Live Remote Target**: Tests an external remote URL (`https://example.com`).

---

## 💻 Setup and Run Commands

### Prerequisites
- Node.js (v18.0.0 or higher; tested on v24.21.0)
- npm (v9.0.0 or higher; tested on v11.19.0)

> **Note for Windows PowerShell Users**:
> If PowerShell blocks `npm` with a script execution policy error (`npm.ps1 cannot be loaded`), you can either:
> 1. Run commands with `npm.cmd` (e.g. `npm.cmd run dev`), OR
> 2. Allow scripts in your current PowerShell session: `Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass`

### 1. Start Both Frontend & Backend Together (Recommended)

From the project root:

```powershell
npm.cmd run dev
```

*This starts both the Express API (`http://localhost:3001`) and Vite Dashboard (`http://localhost:5173`) concurrently in a single terminal.*

### 2. Or Start Frontend and Backend Separately

**Terminal 1 - Backend API & Test Engine:**
```powershell
npm.cmd run dev:backend
```
*API runs at `http://localhost:3001` (Health: `http://localhost:3001/api/health`, Fixture: `http://localhost:3001/fixture`)*

**Terminal 2 - Frontend Dashboard:**
```powershell
npm.cmd run dev:frontend
```
*Dashboard runs at `http://localhost:5173`*

---

## 🧪 Automated Verification Test Suite

You can run each stage's verification suite directly from the command line:

```powershell
# Stage 2: Real Playwright baseline test
npm.cmd run test:stage2

# Stage 3: Autonomous self-healing & no-fabrication failure test
npm.cmd run test:stage3

# Stage 4: Full E2E integration test (API + Real Playwright + HTTP screenshots)
npm.cmd run test:stage4
```

All 3 automated verification suites pass with 100% success.
