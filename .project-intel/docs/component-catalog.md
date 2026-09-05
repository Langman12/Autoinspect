# AutoGuard AI — Component & Module Catalog

## 1. UI Components (`src/components/`)

| Component | File Path | Responsibilities & Capabilities | Key Dependencies |
| :--- | :--- | :--- | :--- |
| **`Layout`** | [`src/components/Layout.tsx`](file:///home/def/autoinspect/src/components/Layout.tsx) | Navigation header, tab switcher, global AI provider toggle pill (Ollama vs Gemini), health polling interval (15s). | `aiService`, `ollamaService` |
| **`CameraView`** | [`src/components/CameraView.tsx`](file:///home/def/autoinspect/src/components/CameraView.tsx) | 6-phase guided camera capture, frame slicing (`video.toDataURL`), live stream overlay with AR crosshairs, audio recording trigger, analysis progress HUD. | `aiService`, `geminiService`, `recallService`, `AcousticVisualizer` |
| **`AcousticVisualizer`** | [`src/components/AcousticVisualizer.tsx`](file:///home/def/autoinspect/src/components/AcousticVisualizer.tsx) | Real-time HTML5 Canvas Web Audio API visualizer (512 FFT), dominant frequency detector (Hz), 5-band color-coded spectrum, WebM audio recording. | Web Audio API, `MediaRecorder` |
| **`GuardianView`** | [`src/components/GuardianView.tsx`](file:///home/def/autoinspect/src/components/GuardianView.tsx) | In-motion tactical GPS co-pilot, Open-Meteo weather radar card, live grip meter, simulated hazard injector, text-to-speech voice co-pilot (`SpeechSynthesis`). | `geminiService`, `weatherService` |
| **`ReportView`** | [`src/components/ReportView.tsx`](file:///home/def/autoinspect/src/components/ReportView.tsx) | Dual-mode report presenter: Master Forensic View (detailed damage matrix, undercarriage, acoustic) vs Customer Transparency View (star rating, plain English), Print/PDF exporter, JSON downloader. | `InspectionReport` |
| **`DiagnosticMatrix`** | [`src/components/DiagnosticMatrix.tsx`](file:///home/def/autoinspect/src/components/DiagnosticMatrix.tsx) | Searchable interactive knowledge base containing 15+ engineering diagnostic protocols across Acoustic, Exhaust Smoke, Undercarriage, EV/Hybrid, and Safety/ADAS. | Static Knowledge Base |
| **`FleetInsights`** | [`src/components/FleetInsights.tsx`](file:///home/def/autoinspect/src/components/FleetInsights.tsx) | Fleet-wide analytics dashboard, average health KPIs, Recharts bar charts (Health Distribution, Defect by System Category), filterable registry, CSV exporter. | `recharts` |
| **`IntelligenceHub`** | [`src/components/IntelligenceHub.tsx`](file:///home/def/autoinspect/src/components/IntelligenceHub.tsx) | Central operations control room: Local Ollama model selector and live playground tester, global weather radar search, NHTSA recall bulletin manager, social brief generator. | `ollamaService`, `weatherService`, `aiService` |
| **`VehicleTimeline`** | [`src/components/VehicleTimeline.tsx`](file:///home/def/autoinspect/src/components/VehicleTimeline.tsx) | Chronological vertical audit log of historical vehicle inspections. | `InspectionReport` |
| **`ErrorBoundary`** | [`src/components/ErrorBoundary.tsx`](file:///home/def/autoinspect/src/components/ErrorBoundary.tsx) | Class-based React error boundary with graceful fallback screen and state reload button. | React Core |

## 2. Core Services (`src/services/`)

| Service | File Path | Responsibilities & Capabilities |
| :--- | :--- | :--- |
| **`aiService`** | [`src/services/aiService.ts`](file:///home/def/autoinspect/src/services/aiService.ts) | Provider orchestration facade. Manages active provider state in `localStorage`, observer listener subscription, health check aggregation, and automated local-to-cloud fallback execution. |
| **`ollamaService`** | [`src/services/ollamaService.ts`](file:///home/def/autoinspect/src/services/ollamaService.ts) | Local Ollama REST client (`/api/ollama`). Handles model enumeration, multimodal image inspection with `moondream`, structured JSON report generation with `llama3.2:3b`/`qwen2.5`, and latency benchmarking. |
| **`geminiService`** | [`src/services/geminiService.ts`](file:///home/def/autoinspect/src/services/geminiService.ts) | Google Gemini SDK client (`@google/genai`). Implements GDVF system instructions, structured output validation (`FORENSIC_RESPONSE_SCHEMA`), exponential backoff retry loop (`withRetry`), and WebSockets Live multimodal audio streaming. |
| **`weatherService`** | [`src/services/weatherService.ts`](file:///home/def/autoinspect/src/services/weatherService.ts) | Open-Meteo integration. Decodes WMO 0–99 weather codes, computes tire-to-asphalt road grip index (15%–99%), evaluates hydroplaning / black ice / crosswind threats, and calculates safe speed caps. |
| **`recallService`** | [`src/services/recallService.ts`](file:///home/def/autoinspect/src/services/recallService.ts) | NHTSA REST API client. Fetches official government safety recall bulletins by 17-character VIN or Make/Model/Year query. |
| **`firebaseService`** | [`src/services/firebaseService.ts`](file:///home/def/autoinspect/src/services/firebaseService.ts) | Persistence adapter. Automatically falls back to browser `localStorage` if Firebase credentials are omitted, or syncs reports and base64 images to Firestore/Cloud Storage. |
