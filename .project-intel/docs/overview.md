# AutoGuard AI — Project Overview & System Mandate

## 1. Executive Summary
**AutoGuard AI** is a dual-capability automotive intelligence platform that combines **Forensic Vehicle Reconditioning Diagnostics (GDVF)** with a **Tactical GPS Co-Pilot (Global Guardian)**. Built on React 19, Vite, and TypeScript, it operates in a **Hybrid Local/Cloud AI paradigm**, capable of running 100% offline via local LLMs/vision models (Ollama: `llama3.2:3b`, `qwen2.5`, `moondream`, `deepseek-r1`) or scaling to Google Gemini 2.5 Pro and Gemini 2.0 Flash Live multimodal APIs.

## 2. Business Purpose & Core Value Proposition
1. **Accident & Concealment Detection:** Automatically identifies prior panel beatings, uneven gaps (tolerance ±1mm), non-factory welds, aerosol undercoating hiding chassis rust, and airbag deployment concealment (sodium azide residues).
2. **Acoustic Pathology Diagnostics:** Analyzes live audio streams across the 20Hz–20kHz frequency spectrum to diagnose engine rod knock, valve lifter ticks, belt squeal, wheel bearing degradation, and turbo leaks before catastrophic breakdown.
3. **Tactical Guardian Road Safety:** In-motion GPS co-pilot integrating live weather telemetry (Open-Meteo) to dynamically compute road grip indices (15%–99%), enforce hydroplane/black ice safe speed caps, and provide rally-style voice guidance.
4. **Transparency & Dealership Economics:** Produces dual-mode reports (Forensic Master Tech View with multi-tiered cost estimation vs. Customer Transparency Certificate) with instant PDF/JSON/CSV export and automated NHTSA recall audits.

## 3. Technology Fingerprint & Evidence Grounding
- **Frontend Core:** React 19.2.3, Vite 6.2.0, TypeScript 5.8.2 ([`package.json:19-33`](file:///home/def/autoinspect/package.json#L19-L33))
- **Styling:** Tailwind CSS 3.4.1 with custom slate/cyan dark mode theme ([`tailwind.config.js`](file:///home/def/autoinspect/tailwind.config.js), [`src/index.css`](file:///home/def/autoinspect/src/index.css))
- **Local AI Engine:** Ollama local proxy at `/api/ollama` ([`vite.config.ts:7-13`](file:///home/def/autoinspect/vite.config.ts#L7-L13), [`src/services/ollamaService.ts`](file:///home/def/autoinspect/src/services/ollamaService.ts))
- **Cloud AI Engine:** `@google/genai` SDK v0.7.0 ([`src/services/geminiService.ts`](file:///home/def/autoinspect/src/services/geminiService.ts))
- **Audio Processing:** Native Web Audio API `AudioContext` + `AnalyserNode` with 512 FFT binning ([`src/components/AcousticVisualizer.tsx:37-46`](file:///home/def/autoinspect/src/components/AcousticVisualizer.tsx#L37-L46))
- **Telemetry & APIs:** Open-Meteo Weather/Geocoding ([`src/services/weatherService.ts:107`](file:///home/def/autoinspect/src/services/weatherService.ts#L107)), NHTSA Recall API ([`src/services/recallService.ts:7`](file:///home/def/autoinspect/src/services/recallService.ts#L7)), Firebase Storage/Firestore with LocalStorage fallback ([`src/services/firebaseService.ts`](file:///home/def/autoinspect/src/services/firebaseService.ts)).
