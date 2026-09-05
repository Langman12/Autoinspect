# AutoGuard AI — Improvement & Modernization Plan

## 1. Executive Modernization Strategy
While AutoGuard AI features a rich, innovative feature set (GDVF forensics, acoustic FFT analysis, tactical weather GPS, local Ollama execution), transitioning it into an enterprise-grade automotive platform requires strategic enhancements across security, testing, persistence, and developer experience.

## 2. Dimensional Recommendations

### A. Security & Secret Hardening
- **Current Issue:** Cloud API keys (`VITE_GEMINI_API_KEY`, `VITE_FIREBASE_API_KEY`) are exposed to client-side bundles in production builds.
- **Modernization Action:** Introduce an optional lightweight Node/Fastify or Edge Proxy (e.g. Cloudflare Worker / Vercel Edge Function) to terminate Gemini Cloud and Firebase tokens securely when deployed publicly.
- **Risk / Effort:** Low Risk, Medium Effort.

### B. Storage & Offline Persistence (IndexedDB)
- **Current Issue:** `firebaseService.ts` falls back to `localStorage` (`autoguard-history`), which has a strict 5MB quota limit that fails when storing multiple high-res base64 vehicle inspection photos.
- **Modernization Action:** Integrate `idb` / `dexie` (IndexedDB) for local forensic report storage, enabling hundreds of offline audits and full-resolution uncompressed image archives.
- **Risk / Effort:** Low Risk, Small Effort.

### C. Automated Testing & CI/CD Pipeline
- **Current Issue:** Zero automated unit or component tests exist; manual verification scripts (`scripts/test-ollama.js`, `scripts/test-weather.js`) exist but aren't wired to CI.
- **Modernization Action:** Configure Vitest + `@testing-library/react` + Playwright for end-to-end user journey tests (Vehicle target setup → Camera capture → Report generation → PDF export).
- **Risk / Effort:** Low Risk, Medium Effort.

### D. Audio Worklet & Noise Suppression
- **Current Issue:** Standard `AudioContext.createMediaStreamSource` records raw microphone input without background wind noise reduction.
- **Modernization Action:** Implement an `AudioWorkletNode` applying high-pass filters (cutting sub-20Hz rumble) and adaptive gain normalization for cleaner engine harmonics.
- **Risk / Effort:** Low Risk, Medium Effort.
