# AutoGuard AI Design System

## Brand Identity & Aesthetic
- **Theme**: Dark Tactical Cockpit / Vehicle Forensics & Telemetry HUD
- **Core Mood**: High-tech, precise, mission-critical, forensic-grade, cybernetic automotive diagnostics
- **Tone**: Authoritative, analytical, clean, dense information architecture with crisp telemetry readouts

## Color Palette
### Backgrounds & Surfaces
- **Canvas / App Root**: `slate-950` (`#020617`)
- **Card / Surface Base**: `slate-900/90` (`#0f172a` with opacity)
- **Elevated Surfaces**: `slate-800/80` (`#1e293b`)
- **Card Borders**: `slate-800` (`#1e293b`), `slate-700/60` (`#334155`)

### Primary Accents & Gradients
- **Primary Gradient**: `from-cyan-600 to-blue-600` (`#0891b2` -> `#2563eb`)
- **Cyber Cyan**: `cyan-400` (`#22d3ee`), `cyan-500` (`#06b6d4`), `cyan-950` (`#083344`)
- **Electric Blue**: `blue-500` (`#3b82f6`), `blue-600` (`#2563eb`), `blue-950` (`#172554`)

### Semantic & Status Colors
- **Local AI / Online / Normal**: `emerald-400` / `emerald-950` (Border `emerald-700/80`)
- **Cloud AI / Informational**: `blue-400` / `blue-950` (Border `blue-700/80`)
- **Warning / Advisory**: `amber-400` / `amber-950` (Border `amber-700/80`)
- **Critical / Pathology / Defect**: `rose-500` / `rose-950` (Border `rose-800/80`)
- **Muted / Inactive**: `slate-400` / `slate-600`

## Typography & Hierarchy
- **Primary Font**: Modern system sans-serif (Inter / system-ui)
- **Monospace Font**: System monospace (`font-mono`) for VINs, telemetry metrics, timestamps, and model versions
- **Headings**:
  - App Brand: `text-lg font-black tracking-tight text-white`
  - Section Titles: `text-sm font-bold uppercase tracking-wider text-slate-300`
  - Micro Badges: `text-[9px]` to `text-[10px]` uppercase `font-mono tracking-widest`
  - Body Text: `text-xs` to `text-sm` in `text-slate-300` / `text-slate-400`

## Components & Visual Tokens
- **Header**: Sticky glassmorphic bar (`bg-slate-950/80 backdrop-blur-md border-b border-slate-800`)
- **Navigation Tabs**: Pill capsules with active gradient fill (`bg-gradient-to-r from-cyan-600 to-blue-600 text-white shadow-md`)
- **Cards**: Rounded 2xl / xl containers with border `border-slate-800`, subtle background gradient `bg-slate-900/90`
- **Badges**: Micro pill badges with semi-transparent tinted backgrounds and matched 1px borders
- **Buttons**: Rounded-xl, font-bold, active scale micro-interactions (`active:scale-95 transition-all`)
- **Data Tables & Matrices**: Dense grid layouts with monospaced keys, colored risk tags, and high contrast headers

## Available Views / Modules
1. **Inspect (`inspect`)**: Multimodal camera feed, visual scan, acoustic stethoscope waveform, vehicle profile loader
2. **Guardian GPS (`guardian`)**: Tactical live breadcrumb GPS, driving telemetry, route hazard heatmaps
3. **Fleet Analytics (`insights`)**: Fleet-wide health metrics, defect distributions, risk scores
4. **Pathology Matrix (`matrix`)**: Component degradation matrix, acoustic anomaly correlations, thermal heatmaps
5. **Intel Hub (`hub`)**: Forensic report archives, vehicle history lookup, cross-vehicle defect clustering
6. **Test Lab (`testlab`)**: AI model playground, synthetic diagnostic validation, confusion matrices, prompt testing
