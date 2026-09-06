import { useState } from 'react'
import { tradeInValuationService } from '../services/tradeInValuationService.ts'
import type { DamageFinding, TradeInValuation } from '../types.ts'

const DEMO_DEFECTS: DamageFinding[] = [
  {
    id: 'd1',
    type: 'MECHANICAL',
    component: 'Front Strut Hydraulic Seal Leak',
    description: 'Blown shock damper seal.',
    status: 'RED',
    severityScore: 85,
    estimatedCost: { low: '$450', medium: '$480', high: '$600' },
    actionRequired: 'Replace strut pair.',
  },
  {
    id: 'd2',
    type: 'SAFETY',
    component: 'Rear Brake Rotor Grooving',
    description: 'Scored disc below discard spec.',
    status: 'YELLOW',
    severityScore: 70,
    estimatedCost: { low: '$280', medium: '$320', high: '$400' },
    actionRequired: 'Replace rear rotors and pads.',
  },
  {
    id: 'd3',
    type: 'MECHANICAL',
    component: 'Cylinder 3 Misfire Ignition Coil',
    description: 'Secondary insulation breakdown.',
    status: 'RED',
    severityScore: 80,
    estimatedCost: { low: '$140', medium: '$180', high: '$220' },
    actionRequired: 'Replace coil pack.',
  },
]

export function TradeInValuationView() {
  const [baseRetail, setBaseRetail] = useState(34500)
  const [valuation, setValuation] = useState<TradeInValuation>(() =>
    tradeInValuationService.calculateValuation('1HGCR2F8XHA049211', DEMO_DEFECTS, baseRetail)
  )

  const handleBaseRetailChange = (val: number) => {
    setBaseRetail(val)
    setValuation(tradeInValuationService.calculateValuation('1HGCR2F8XHA049211', DEMO_DEFECTS, val))
  }

  const spread = valuation.baseMarketSpread

  return (
    <div className="space-y-6 font-mono">
      {/* Top Header Ribbon */}
      <div className="bg-slate-900/80 border border-amber-500/30 rounded-2xl p-4 backdrop-blur-xl shadow-2xl flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-400/30 text-amber-400">
            💵
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-black tracking-wider text-slate-100 uppercase">
                AI Trade-In Valuation & Auction Arbitrage
              </h2>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-emerald-500/20 text-emerald-400 border border-emerald-500/40">
                ● {valuation.recommendedAction.replace(/_/g, ' ')}
              </span>
            </div>
            <p className="text-xs text-slate-400">
              Manheim Market Report (MMR) Wholesale Benchmark & Recon ROI Calculator
            </p>
          </div>
        </div>

        {/* Baseline Benchmark Slider */}
        <div className="flex items-center gap-3 bg-slate-950 p-2 rounded-xl border border-slate-800 text-xs">
          <span className="text-slate-400">Market Baseline:</span>
          <div className="flex items-center gap-1.5">
            {[28000, 34500, 42000].map((b) => (
              <button
                key={b}
                onClick={() => handleBaseRetailChange(b)}
                className={`px-2.5 py-1 rounded-lg font-bold transition-all ${
                  baseRetail === b
                    ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/30'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                ${(b / 1000).toFixed(0)}k
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Market Valuation Spread Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4">
          <div className="text-[11px] text-slate-400 uppercase">Clean Retail Market</div>
          <div className="text-2xl font-black text-cyan-400 mt-1">
            ${spread.cleanRetailMarket.toLocaleString()}
          </div>
          <div className="text-[10px] text-slate-500 mt-0.5">Top-Tier Dealer Forecourt Price</div>
        </div>

        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4">
          <div className="text-[11px] text-slate-400 uppercase">MMR Wholesale Benchmark</div>
          <div className="text-2xl font-black text-amber-400 mt-1">
            ${spread.wholesaleMmrAverage.toLocaleString()}
          </div>
          <div className="text-[10px] text-slate-500 mt-0.5">Auction Low: ${spread.wholesaleMmrLow.toLocaleString()} • High: ${spread.wholesaleMmrHigh.toLocaleString()}</div>
        </div>

        <div className="bg-slate-900/90 border border-red-500/30 rounded-2xl p-4 bg-red-950/10">
          <div className="text-[11px] text-red-400 uppercase font-bold">Total Recon Deductions</div>
          <div className="text-2xl font-black text-red-400 mt-1">
            -${valuation.totalReconDeductions.toLocaleString()}
          </div>
          <div className="text-[10px] text-red-300 mt-0.5">Based on 3 detected forensic defects</div>
        </div>

        <div className="bg-slate-900/90 border border-emerald-500/30 rounded-2xl p-4 bg-emerald-950/10">
          <div className="text-[11px] text-emerald-400 uppercase font-bold">Adjusted Wholesale Bid</div>
          <div className="text-2xl font-black text-emerald-400 mt-1">
            ${valuation.adjustedWholesaleBid.toLocaleString()}
          </div>
          <div className="text-[10px] text-emerald-300 mt-0.5">Target Trade-In Acquisition Offer</div>
        </div>
      </div>

      {/* Recon ROI Arbitrage Engine Table */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 backdrop-blur-xl shadow-xl space-y-6">
        <div>
          <h3 className="text-base font-black text-slate-100 uppercase">
            Recon ROI Arbitrage (Pre-Auction Profit Multipliers)
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">
            Identify which mechanical & cosmetic repairs yield the highest dollar return before selling
          </p>
        </div>

        <div className="border border-slate-800 rounded-2xl overflow-hidden bg-slate-950">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-900 text-slate-400 uppercase text-[10px]">
              <tr>
                <th className="p-3">Defect Component</th>
                <th className="p-3">Repair Cost</th>
                <th className="p-3">Auction Value Lift</th>
                <th className="p-3">Net Profit Delta</th>
                <th className="p-3">ROI %</th>
                <th className="p-3 text-right">Recommendation</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {valuation.reconRoiBreakdown.map((item, idx) => (
                <tr key={idx} className="hover:bg-slate-900/40 transition-colors">
                  <td className="p-3 font-bold text-slate-100">{item.component}</td>
                  <td className="p-3 text-red-400 font-bold">${item.repairCost}</td>
                  <td className="p-3 text-emerald-400 font-bold">+${item.valueBoostAtAuction}</td>
                  <td className="p-3 text-cyan-300 font-black">+${item.netProfitDelta}</td>
                  <td className="p-3 font-black text-amber-400">{item.roiPercent}%</td>
                  <td className="p-3 text-right">
                    <span className="px-2.5 py-0.5 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                      ✔ {item.recommendedPriority}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 flex flex-wrap items-center justify-between gap-4 text-xs">
          <div className="text-slate-300">
            Total Reconditioning Investment: <span className="text-red-400 font-bold">${valuation.totalReconDeductions}</span> → Generates <span className="text-emerald-400 font-bold">+$2,700</span> in gross auction recovery.
          </div>
          <div className="text-emerald-400 font-bold">
            NET ARBITRAGE LIFT: +${2700 - valuation.totalReconDeductions}
          </div>
        </div>
      </div>
    </div>
  )
}
