# AutoGuard AI — Claude Project Architecture & Superdesign Contract

## Project Overview
- **Name**: AutoGuard AI (Automotive Forensic Intelligence & Tactical Driving Copilot)
- **Tech Stack**: React 19, TypeScript 5.8 (Strict Mode), Vite 6, Tailwind CSS 3.4
- **Dual AI Engine**: Local Ollama + Cloud Gemini 2.5 Live
- **DSP Engine**: Web Audio API (20Hz–20kHz) Acoustic Spectrum & Biquad Filtering
- **Telemetry**: Open-Meteo Road Physics, NHTSA Vehicle Safety Recalls API

---

## Superdesign Canvas Protocol

### 1. Evidence-First Visual Design
- Never invent placeholder screenshots or fake markdown embeds `![](...)`.
- Base all visual recommendations on real tokens in [`.superdesign/design-system.md`](file:///home/def/autoinspect/.superdesign/design-system.md) and inspected components in `src/components/`.

### 2. Workspace State & Persistence
- Design artifacts live in `.superdesign/`:
  - Design system: `.superdesign/design-system.md`
  - Active session: `.superdesign/resume.json`
  - Replicas: `.superdesign/replica_html_template/`
  - Drafts: `.superdesign/projects/autoguard-canvas/drafts/<draft_id>/`
- Draft Deliverables: `draft.html`, `preview.md`, `meta.json`, and an Implementation Brief before modifying production code.

### 3. Verification & Testing
- Run test harness: `node --experimental-strip-types scripts/run-all-tests.mjs`
- 15 test suites cover unit DSP, recall parsing, weather physics, and forensic pipelines.

### 4. Operator Constraints & Compliance
- **Compliance**: POPIA & GDPR privacy rules. Do not transmit PII/VIN without consent.
- **Excluded**: `.env`, credentials, local caches, raw memory dumps.
