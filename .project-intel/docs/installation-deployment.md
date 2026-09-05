# AutoGuard AI — Installation, Configuration & Deployment Guide

## 1. Prerequisites & System Requirements
- **Node.js:** v18.0.0 or higher (v20+ / v24 recommended)
- **Ollama (Optional for Local AI):** v0.3.0+ running on `http://localhost:11434`
  - Recommended Text Models: `ollama pull llama3.2:3b` or `ollama pull qwen2.5:1.5b`
  - Recommended Vision Model: `ollama pull moondream`
- **Modern Web Browser:** Chrome 110+, Edge 110+, Firefox 115+, or Safari 16.4+ (supporting Web Audio API, WebRTC `getUserMedia`, and Web Speech API).

## 2. Quickstart Installation

```bash
# 1. Clone repository / enter workspace
cd /home/def/autoinspect

# 2. Install dependencies
npm install

# 3. Configure environment variables
cp .env.example .env

# 4. Start local development server
npm run dev
```

## 3. Environment Configuration (`.env`)

| Variable | Required | Default | Description |
| :--- | :--- | :--- | :--- |
| `VITE_AI_PROVIDER` | No | `ollama` | Default AI engine (`ollama` or `gemini`) |
| `VITE_OLLAMA_BASE_URL` | No | `http://localhost:11434` | Ollama server URL (proxied via `/api/ollama` in dev) |
| `VITE_OLLAMA_MODEL` | No | `llama3.2:3b` | Primary local text/reasoning model |
| `VITE_OLLAMA_VISION_MODEL` | No | `moondream` | Primary local multimodal vision model |
| `VITE_GEMINI_API_KEY` | Optional | `""` | Google AI Studio API key for Gemini 2.5 Pro & Live |
| `VITE_FIREBASE_API_KEY` | Optional | `""` | Firebase Web API Key (enables cloud sync) |
| `VITE_FIREBASE_PROJECT_ID` | Optional | `""` | Firebase Project ID |
| `VITE_FIREBASE_STORAGE_BUCKET`| Optional | `""` | Firebase Cloud Storage bucket for inspection photos |

## 4. Production Build & Static Hosting
The application is a pure client-side SPA with zero server-side rendering requirements:

```bash
# Type check and build production assets
npm run build

# Preview production build locally
npm run preview
```

### Static Deployment Targets:
- **Vercel / Netlify:** Connect Git repo, set build command `npm run build` and output directory `dist`.
- **Firebase Hosting:** Run `firebase deploy --only hosting`.
- **Docker / Nginx:** Serve the `dist/` directory through standard Nginx alpine container with SPA fallback rewrite (`try_files $uri $uri/ /index.html;`).
