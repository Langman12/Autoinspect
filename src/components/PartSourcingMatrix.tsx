import { useState } from 'react'
import { partSourcingService } from '../services/partSourcingService.ts'
import type { DamageFinding, PartQuoteItem } from '../types.ts'

const DEMO_DAMAGES: DamageFinding[] = [
  {
    id: 'dmg-01',
    type: 'MECHANICAL',
    component: 'Front Left Strut Assembly',
    description: 'Blown hydraulic seal, active oil leakage, loss of rebound damping.',
    status: 'RED',
    severityScore: 85,
    estimatedCost: { low: '$480', medium: '$560', high: '$650' },
    actionRequired: 'Replace strut pair and perform 4-wheel alignment.',
  },
  {
    id: 'dmg-02',
    type: 'MECHANICAL',
    component: 'Cylinder 3 Ignition Coil Pack',
    description: 'Secondary insulation breakdown causing intermittent misfire under load.',
    status: 'RED',
    severityScore: 80,
    estimatedCost: { low: '$140', medium: '$190', high: '$250' },
    actionRequired: 'Replace coil pack and inspect spark plug gap.',
  },
  {
    id: 'dmg-03',
    type: 'SAFETY',
    component: 'Rear Right Brake Rotor & Pad Set',
    description: 'Deep scoring on rotor surface below minimum discard thickness.',
    status: 'YELLOW',
    severityScore: 70,
    estimatedCost: { low: '$280', medium: '$340', high: '$420' },
    actionRequired: 'Replace rear axle rotors and ceramic brake pads.',
  },
  {
    id: 'dmg-04',
    type: 'MECHANICAL',
    component: 'Downstream Catalytic Converter',
    description: 'Thermal efficiency warning, internal core restriction developing.',
    status: 'YELLOW',
    severityScore: 65,
    estimatedCost: { low: '$750', medium: '$920', high: '$1,200' },
    actionRequired: 'Replace catalytic converter assembly and downstream O2 sensor.',
  },
]

export function PartSourcingMatrix() {
  const [shopHourlyRate, setShopHourlyRate] = useState(140)
  const [selectedTier, setSelectedTier] = useState<'OEM' | 'TIER_1_AFTERMARKET' | 'BUDGET'>('TIER_1_AFTERMARKET')
  const [quotes, setQuotes] = useState<PartQuoteItem[]>(() =>
    partSourcingService.generateQuotesForDamages(DEMO_DAMAGES, shopHourlyRate)
  )
  const [selectedQuote, setSelectedQuote] = useState<PartQuoteItem | null>(quotes[0] || null)

  const handleRateChange = (newRate: number) => {
    setShopHourlyRate(newRate)
    setQuotes(partSourcingService.generateQuotesForDamages(DEMO_DAMAGES, newRate))
  }

  const totals = partSourcingService.calculateTotals(quotes, selectedTier)

  return (
    <div className="space-y-6">
      {/* Top Header Ribbon */}
      <div className="bg-slate-900/80 border border-amber-500/30 rounded-2xl p-4 backdrop-blur-xl shadow-2xl flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-400/30 text-amber-400">
            💰
          </div>
          <div>
            <h2 className="text-lg font-black tracking-wider text-slate-100 uppercase">
              Automated Part Sourcing & Labor Matrix
            </h2>
            <p className="text-xs text-slate-400 font-mono">
              Mitchell / AllData Book Time Breakdown & Tier-1 Part Quotes
            </p>
          </div>
        </div>

        {/* Shop Hourly Rate Adjuster */}
        <div className="flex items-center gap-3 bg-slate-950 p-2 rounded-xl border border-slate-800 font-mono text-xs">
          <span className="text-slate-400">Shop Labor Rate:</span>
          <div className="flex items-center gap-1.5">
            {[110, 140, 175].map((rate) => (
              <button
                key={rate}
                onClick={() => handleRateChange(rate)}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
                  shopHourlyRate === rate
                    ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/30'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                ${rate}/hr
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Financial Summary KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 font-mono">
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4">
          <div className="text-[11px] text-slate-400 uppercase">Total Parts ({selectedTier})</div>
          <div className="text-2xl font-black text-cyan-400 mt-1">
            ${totals.totalPartsCost.toLocaleString()}
          </div>
          <div className="text-[10px] text-slate-500 mt-0.5">{quotes.length} Components Required</div>
        </div>

        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4">
          <div className="text-[11px] text-slate-400 uppercase">Book Labor Time</div>
          <div className="text-2xl font-black text-amber-400 mt-1">
            {totals.totalLaborHours} Hours
          </div>
          <div className="text-[10px] text-slate-500 mt-0.5">${totals.totalLaborCost.toLocaleString()} Shop Labor</div>
        </div>

        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4">
          <div className="text-[11px] text-slate-400 uppercase">Total Repair Cost</div>
          <div className="text-2xl font-black text-slate-100 mt-1">
            ${totals.totalRepairCost.toLocaleString()}
          </div>
          <div className="text-[10px] text-emerald-400 mt-0.5">Parts + Professional Labor</div>
        </div>

        <div className="bg-slate-900/90 border border-emerald-500/30 rounded-2xl p-4 bg-emerald-950/10">
          <div className="text-[11px] text-emerald-400 uppercase font-bold">DIY Labor Savings</div>
          <div className="text-2xl font-black text-emerald-400 mt-1">
            +${totals.estimatedDiySavings.toLocaleString()}
          </div>
          <div className="text-[10px] text-emerald-300 mt-0.5">If self-repaired with tool kit</div>
        </div>
      </div>

      {/* Part Tier Selector */}
      <div className="flex items-center justify-between bg-slate-900/90 p-3 rounded-2xl border border-slate-800">
        <span className="text-xs font-mono text-slate-400 uppercase tracking-wider pl-2">
          Select Parts Sourcing Tier:
        </span>
        <div className="flex items-center gap-2">
          {(
            [
              { id: 'OEM', label: 'Genuine OEM Dealership' },
              { id: 'TIER_1_AFTERMARKET', label: 'Tier-1 Aftermarket (Bosch/Brembo)' },
              { id: 'BUDGET', label: 'Budget (AutoZone / Duralast)' },
            ] as const
          ).map((tier) => (
            <button
              key={tier.id}
              onClick={() => setSelectedTier(tier.id)}
              className={`px-3 py-1.5 rounded-xl text-xs font-mono font-bold transition-all ${
                selectedTier === tier.id
                  ? 'bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 shadow-lg shadow-amber-500/30'
                  : 'bg-slate-950 text-slate-400 hover:text-slate-200 border border-slate-800'
              }`}
            >
              {tier.label}
            </button>
          ))}
        </div>
      </div>

      {/* Main Parts Sourcing & DIY Complexity Split Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Parts Table (2 cols) */}
        <div className="lg:col-span-2 bg-slate-900/90 border border-slate-800 rounded-3xl p-6 backdrop-blur-xl shadow-xl space-y-4">
          <h3 className="text-base font-black text-slate-100 uppercase font-mono">
            Itemized Component Breakdown
          </h3>

          <div className="space-y-3 font-mono">
            {quotes.map((quote) => {
              const activePart =
                selectedTier === 'OEM'
                  ? quote.oemQuote
                  : selectedTier === 'TIER_1_AFTERMARKET'
                  ? quote.aftermarketQuotes.find((a) => a.tier === 'TIER_1_AFTERMARKET') || quote.oemQuote
                  : quote.aftermarketQuotes.find((a) => a.tier === 'BUDGET') || quote.oemQuote

              const isSelected = selectedQuote?.id === quote.id

              return (
                <div
                  key={quote.id}
                  onClick={() => setSelectedQuote(quote)}
                  className={`p-4 rounded-2xl border cursor-pointer transition-all ${
                    isSelected
                      ? 'bg-slate-950 border-amber-500/80 shadow-lg shadow-amber-950/40'
                      : 'bg-slate-950/60 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-slate-100">
                          {quote.componentName}
                        </span>
                        <span className="text-[10px] px-2 py-0.5 rounded bg-slate-800 text-slate-400">
                          {quote.oemPartNumber}
                        </span>
                      </div>
                      <div className="text-xs text-amber-400 mt-1">
                        {activePart.brand} ({activePart.supplier})
                      </div>
                      <div className="text-[11px] text-slate-500 mt-0.5">
                        Warranty: {activePart.warranty} • Availability: {activePart.availability.replace(/_/g, ' ')}
                      </div>
                    </div>

                    <div className="text-right flex-shrink-0">
                      <div className="text-lg font-black text-cyan-400">${activePart.price}</div>
                      <div className="text-[11px] text-slate-400">
                        +{quote.laborBookHours}h Labor (${quote.laborBookHours * shopHourlyRate})
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* DIY Difficulty & Tool Checklist Sidebar (1 col) */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 backdrop-blur-xl shadow-xl space-y-4 font-mono">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-black text-slate-100 uppercase">
              DIY Workshop Guide
            </h3>
            <span className="text-xs text-amber-400">SELF-SERVICE</span>
          </div>

          {selectedQuote ? (
            <div className="space-y-4 text-xs">
              <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 space-y-2">
                <div className="text-[11px] text-slate-400 uppercase">
                  Target: {selectedQuote.componentName}
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-slate-300 font-bold">Complexity:</span>
                  <div className="flex items-center text-amber-400 text-sm">
                    {[...Array(5)].map((_, i) => (
                      <span key={i}>
                        {i < selectedQuote.diy.difficultyWrenches ? '🔧' : '⚪'}
                      </span>
                    ))}
                  </div>
                </div>
                <div className="text-slate-400">
                  Est. DIY Time: <span className="text-slate-200 font-bold">{selectedQuote.diy.estimatedHoursDiy} Hours</span>
                </div>
              </div>

              {/* Safety Warning if applicable */}
              {selectedQuote.diy.skillWarning && (
                <div className="bg-red-950/40 border border-red-800/50 p-3.5 rounded-xl text-red-200 text-xs">
                  <span className="font-bold text-red-400">⚠️ WARNING: </span>
                  {selectedQuote.diy.skillWarning}
                </div>
              )}

              {/* Required Tools */}
              <div className="space-y-2">
                <div className="text-[11px] text-cyan-400 font-bold uppercase">
                  Required Tool Checklist:
                </div>
                <ul className="space-y-1.5 pl-1">
                  {selectedQuote.diy.requiredTools.map((tool, idx) => (
                    <li key={idx} className="flex items-center gap-2 text-slate-300">
                      <span className="text-cyan-400">✔</span> {tool}
                    </li>
                  ))}
                </ul>
              </div>

              {/* Required Safety Equipment */}
              <div className="space-y-2 pt-2 border-t border-slate-800">
                <div className="text-[11px] text-amber-400 font-bold uppercase">
                  Required Safety Gear:
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {selectedQuote.diy.safetyEquipment.map((gear, idx) => (
                    <span
                      key={idx}
                      className="px-2.5 py-1 rounded-lg bg-slate-950 border border-slate-800 text-[11px] text-slate-300"
                    >
                      🛡️ {gear}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-12 text-slate-500 text-xs">
              Select a component to inspect tool requirements and DIY procedures.
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
