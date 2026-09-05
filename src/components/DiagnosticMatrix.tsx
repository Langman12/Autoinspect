import { useState } from 'react'

interface DiagnosticItem {
  id: string
  category: 'Acoustic' | 'Exhaust Smoke' | 'Undercarriage & Body' | 'EV & Hybrid' | 'Safety & ADAS'
  symptom: string
  rootCause: string
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW'
  action: string
  frequencyOrSpecs?: string
}

const DIAGNOSTIC_DATABASE: DiagnosticItem[] = [
  // Acoustic
  {
    id: 'ac-1',
    category: 'Acoustic',
    symptom: 'Deep, hollow metallic knocking at idle (600-800 RPM)',
    rootCause: 'Connecting rod bearing spun or severe piston slap',
    severity: 'CRITICAL',
    action: '🔴 FAIL ENGINE — TOW TRUCK ONLY. Do not rev. Engine rebuild required.',
    frequencyOrSpecs: '200 Hz - 800 Hz',
  },
  {
    id: 'ac-2',
    category: 'Acoustic',
    symptom: 'High-frequency rhythmic ticking from cylinder head',
    rootCause: 'Hydraulic valve lifter failure, loose rocker arm, or exhaust manifold leak',
    severity: 'MEDIUM',
    action: '🟡 Inspect valvetrain clearance and exhaust manifold gasket studs.',
    frequencyOrSpecs: '800 Hz - 2.5 kHz',
  },
  {
    id: 'ac-3',
    category: 'Acoustic',
    symptom: 'Loud grinding noise when brake pedal is applied',
    rootCause: 'Brake pads worn down to steel backing plate; metal-to-metal rotor gouging',
    severity: 'CRITICAL',
    action: '🔴 IMMEDIATE BRAKE OVERHAUL. Replace pads & rotors. Do not drive on highway.',
    frequencyOrSpecs: '1.2 kHz - 4 kHz',
  },
  {
    id: 'ac-4',
    category: 'Acoustic',
    symptom: 'Continuous humming/whining drone proportional to road speed',
    rootCause: 'Wheel bearing race pitting or differential pinion bearing wear',
    severity: 'HIGH',
    action: '🟡 Jack vehicle up, check for 12/6 o\'clock hub play. Replace hub assembly.',
    frequencyOrSpecs: '2 kHz - 6 kHz',
  },
  {
    id: 'ac-5',
    category: 'Acoustic',
    symptom: 'Rhythmic clicking/popping during tight low-speed turns',
    rootCause: 'Constant Velocity (CV) joint boot torn and ball cage degraded',
    severity: 'HIGH',
    action: '🟡 Replace complete CV half-shaft axle assembly.',
    frequencyOrSpecs: '500 Hz - 1.5 kHz',
  },

  // Exhaust Smoke
  {
    id: 'sm-1',
    category: 'Exhaust Smoke',
    symptom: 'Blue smoke from exhaust on startup and acceleration',
    rootCause: 'Burning engine oil past worn piston rings, valve stem seals, or blown turbo seal',
    severity: 'CRITICAL',
    action: '🔴 FAIL ENGINE / TURBO — High oil consumption hazard. Check spark plugs for fouling.',
    frequencyOrSpecs: 'Exhaust chemical marker',
  },
  {
    id: 'sm-2',
    category: 'Exhaust Smoke',
    symptom: 'Thick white smoke with sweet odor that lingers in air',
    rootCause: 'Coolant combustion from blown cylinder head gasket or cracked engine block',
    severity: 'CRITICAL',
    action: '🔴 CRITICAL ENGINE FAILURE — Risk of hydraulic lock and immediate overheating.',
    frequencyOrSpecs: 'Ethylene glycol vaporization',
  },
  {
    id: 'sm-3',
    category: 'Exhaust Smoke',
    symptom: 'Heavy black smoke under moderate throttle (Diesel / Petrol)',
    rootCause: 'Incomplete combustion: clogged air filter, leaking injector, failed MAF or DPF failure',
    severity: 'MEDIUM',
    action: '🟡 Clean air intake, test injector spray balance and DPF differential pressure.',
    frequencyOrSpecs: 'Excess soot particulate',
  },

  // Undercarriage & Body
  {
    id: 'uc-1',
    category: 'Undercarriage & Body',
    symptom: 'Parallel linear clamp marks on unibody frame pinch welds',
    rootCause: 'Vehicle was previously mounted on a frame-pulling bench after a severe collision',
    severity: 'CRITICAL',
    action: '🔴 PRIOR CRASH CONCEALMENT — Laser frame alignment verification mandatory.',
    frequencyOrSpecs: 'Frame tolerance > 1.0mm',
  },
  {
    id: 'uc-2',
    category: 'Undercarriage & Body',
    symptom: 'Fresh localized spray undercoating covering frame rails only',
    rootCause: 'Attempt to conceal structural rust rot or crude stitch weld repairs',
    severity: 'CRITICAL',
    action: '🔴 SCRAPE & PROBE TEST — Check with ultrasound thickness gauge and pick hammer.',
    frequencyOrSpecs: 'Coating variation > 500 microns',
  },
  {
    id: 'uc-3',
    category: 'Undercarriage & Body',
    symptom: 'Orange peel waviness and uneven panel gap (> 2mm delta)',
    rootCause: 'Non-OEM aftermarket replacement panel with heavy polyester Bondo filler',
    severity: 'HIGH',
    action: '🟡 Measure paint depth (Normal OEM: 90-140 µm; Bondo: > 400 µm).',
    frequencyOrSpecs: 'Paint meter > 350 µm',
  },

  // EV & Hybrid
  {
    id: 'ev-1',
    category: 'EV & Hybrid',
    symptom: 'High-pitch electrical inverter screeching under regenerative braking',
    rootCause: 'IGBT gate driver degradation or motor phase stator insulation breakdown',
    severity: 'CRITICAL',
    action: '🔴 HV INVERTER FAULT — HV isolation test required before customer handover.',
    frequencyOrSpecs: '8 kHz - 16 kHz',
  },
  {
    id: 'ev-2',
    category: 'EV & Hybrid',
    symptom: 'Underside battery pack casing scrape or enclosure puncture',
    rootCause: 'Road debris impact causing structural deformation to lithium pouch/cylindrical cells',
    severity: 'CRITICAL',
    action: '🔴 THERMAL RUNAWAY RISK — Isolate vehicle in designated fire-safe zone immediately.',
    frequencyOrSpecs: 'Enclosure depth > 3mm',
  },
  {
    id: 'ev-3',
    category: 'EV & Hybrid',
    symptom: 'Suspension creak and groan during low-speed EV roll',
    rootCause: 'Heavy EV curb weight accelerating lower control arm bushing and ball joint tearing',
    severity: 'MEDIUM',
    action: '🟡 Replace heavy-duty polyurethane or spherical suspension bushings.',
    frequencyOrSpecs: '100 Hz - 400 Hz',
  },

  // Safety & ADAS
  {
    id: 'sf-1',
    category: 'Safety & ADAS',
    symptom: 'Windshield replaced without camera radar recalibration target sweep',
    rootCause: 'Forward collision warning (FCW) & Lane Keep Assist (LKA) cameras misaligned',
    severity: 'CRITICAL',
    action: '🔴 ADAS RECALIBRATION MANDATORY before test drive to prevent false braking.',
    frequencyOrSpecs: 'Optical target sweep',
  },
  {
    id: 'sf-2',
    category: 'Safety & ADAS',
    symptom: 'White powder residue around steering wheel or dashboard seams',
    rootCause: 'Sodium azide deployment residue from prior airbag deployment; dummy cover installed',
    severity: 'CRITICAL',
    action: '🔴 AIRBAG FRAUD DETECTED — TOW TRUCK ONLY. Zero crash protection.',
    frequencyOrSpecs: 'Sodium azide chemical trace',
  },
]

export function DiagnosticMatrix() {
  const [selectedCategory, setSelectedCategory] = useState<string>('All')
  const [searchTerm, setSearchTerm] = useState('')
  const [activeItem, setActiveItem] = useState<DiagnosticItem | null>(null)

  const categories = ['All', 'Acoustic', 'Exhaust Smoke', 'Undercarriage & Body', 'EV & Hybrid', 'Safety & ADAS']

  const filteredItems = DIAGNOSTIC_DATABASE.filter((item) => {
    const matchesCat = selectedCategory === 'All' || item.category === selectedCategory
    const matchesSearch =
      item.symptom.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.rootCause.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.action.toLowerCase().includes(searchTerm.toLowerCase())
    return matchesCat && matchesSearch
  })

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      
      {/* Search & Filter Header Control Card */}
      <div className="glass-card rounded-2xl p-5 border border-slate-800 space-y-4 glass-glow-matrix">
        <div className="flex flex-col md:flex-row justify-between md:items-center gap-4">
          <div>
            <p className="text-[10px] uppercase tracking-[0.25em] text-cyan-400 font-black font-mono">
              UNIVERSAL FORENSIC KNOWLEDGE BASE
            </p>
            <h2 className="text-2xl font-black text-white tracking-tight">Pathology & Symptom Matrix</h2>
          </div>
          <div className="w-full md:w-80">
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search symptoms, knock, smoke, EV..."
              className="w-full px-3.5 py-2 rounded-xl bg-slate-950/90 border border-slate-700/80 text-white text-xs font-mono focus:border-cyan-400 outline-none shadow-inner placeholder-slate-500"
            />
          </div>
        </div>

        {/* Category Pills */}
        <div className="flex gap-2 overflow-x-auto pb-1 pt-1 border-t border-slate-800/80">
          {categories.map((cat) => {
            const count = cat === 'All' ? DIAGNOSTIC_DATABASE.length : DIAGNOSTIC_DATABASE.filter(x => x.category === cat).length
            const isSel = selectedCategory === cat
            return (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-black uppercase whitespace-nowrap transition-all font-mono ${
                  isSel
                    ? 'bg-cyan-950 text-cyan-300 border border-cyan-600 shadow-md shadow-cyan-950/40'
                    : 'bg-slate-900 border border-slate-800 text-slate-400 hover:text-white hover:border-slate-700'
                }`}
              >
                {cat} ({count})
              </button>
            )
          })}
        </div>
      </div>

      {/* Pathology Cards Grid */}
      <div className="grid md:grid-cols-2 gap-4">
        {filteredItems.map((item) => (
          <div
            key={item.id}
            onClick={() => setActiveItem(item)}
            className="cursor-pointer glass-card rounded-2xl border border-slate-800 p-5 hover:border-cyan-500/70 transition-all flex flex-col justify-between group shadow-xl"
          >
            <div className="space-y-2.5">
              <div className="flex items-center justify-between gap-2">
                <span className="text-[10px] uppercase tracking-wider font-mono font-bold text-slate-400">
                  {item.category}
                </span>
                <span
                  className={`text-[9px] font-black uppercase font-mono px-2.5 py-1 rounded-lg border ${
                    item.severity === 'CRITICAL'
                      ? 'bg-rose-950 text-rose-300 border-rose-700'
                      : item.severity === 'HIGH'
                        ? 'bg-amber-950 text-amber-300 border-amber-700'
                        : 'bg-yellow-950 text-yellow-300 border-yellow-700'
                  }`}
                >
                  {item.severity}
                </span>
              </div>
              <h3 className="font-black text-white text-sm leading-snug group-hover:text-cyan-300 transition-colors">
                {item.symptom}
              </h3>
              <p className="text-xs text-slate-400 font-mono leading-relaxed">
                <strong className="text-slate-300">Root Cause:</strong> {item.rootCause}
              </p>

              {/* Action Banner */}
              <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs font-mono font-medium text-slate-300">
                {item.action}
              </div>
            </div>

            <div className="mt-3 pt-3 border-t border-slate-800/80 flex items-center justify-between">
              <span className="text-xs font-mono text-cyan-400 font-bold">{item.frequencyOrSpecs || 'Forensic Visual'}</span>
              <span className="text-xs font-bold text-cyan-400 group-hover:translate-x-0.5 transition-transform font-mono">
                Inspect Protocol →
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Protocol Inspection Modal */}
      {activeItem && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="glass-card border border-cyan-600/60 rounded-3xl p-6 max-w-lg w-full space-y-4 shadow-2xl glass-glow-matrix animate-fadeIn">
            <div className="flex justify-between items-start">
              <div>
                <span className="text-[10px] uppercase tracking-widest font-mono text-cyan-400 font-bold">
                  {activeItem.category} PROTOCOL
                </span>
                <h3 className="text-lg font-black text-white mt-1 leading-snug">{activeItem.symptom}</h3>
              </div>
              <button
                onClick={() => setActiveItem(null)}
                className="text-slate-400 hover:text-white font-black text-lg p-1"
              >
                ✕
              </button>
            </div>

            <div className="rounded-2xl bg-slate-950 p-4 border border-slate-800 space-y-1.5 font-mono">
              <p className="text-[10px] text-slate-400 font-bold uppercase">Root Cause Analysis</p>
              <p className="text-xs text-slate-200 leading-relaxed">{activeItem.rootCause}</p>
            </div>

            <div className="rounded-2xl bg-slate-950 p-4 border border-rose-900/60 space-y-1.5 font-mono">
              <p className="text-[10px] text-rose-400 font-bold uppercase">Mandatory Engineering Action</p>
              <p className="text-xs text-amber-200 font-bold leading-relaxed">{activeItem.action}</p>
            </div>

            {activeItem.frequencyOrSpecs && (
              <div className="flex justify-between items-center text-xs px-2 text-slate-400 font-mono">
                <span>Frequency / Sensor Band:</span>
                <span className="text-cyan-300 font-bold">{activeItem.frequencyOrSpecs}</span>
              </div>
            )}

            <button
              onClick={() => setActiveItem(null)}
              className="w-full py-3 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-black text-xs uppercase font-mono shadow-lg shadow-cyan-900/40 transition"
            >
              Acknowledge Protocol
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
