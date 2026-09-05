import { useState } from 'react'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
  PieChart,
  Pie,
} from 'recharts'
import type { InspectionReport } from '../types'

export function FleetInsights({
  history,
  onOpenReport,
}: {
  history: InspectionReport[]
  onOpenReport: (report: InspectionReport) => void
}) {
  const [filterQuery, setFilterQuery] = useState('')

  const filteredHistory = history.filter(
    (r) =>
      r.vehicle.makeModel.toLowerCase().includes(filterQuery.toLowerCase()) ||
      (r.vehicle.vin && r.vehicle.vin.toLowerCase().includes(filterQuery.toLowerCase()))
  )

  const avgHealth =
    history.length === 0
      ? 0
      : Math.round(history.reduce((sum, r) => sum + r.overallHealth, 0) / history.length)

  const towOnlyCount = history.filter((r) => r.riskAssessment.finalDecision === 'TOW TRUCK ONLY').length
  const priorRepairCount = history.filter((r) => r.priorRepairDetected).length
  const adasRequiredCount = history.filter((r) => r.adasCalibrationRequired).length
  const totalFindings = history.reduce((sum, r) => sum + r.damages.length, 0)

  // Damage type distribution for charts
  const damageTypeCounts: Record<string, number> = {}
  history.forEach((r) => {
    r.damages.forEach((d) => {
      damageTypeCounts[d.type] = (damageTypeCounts[d.type] || 0) + 1
    })
  })

  const damageTypeData = Object.entries(damageTypeCounts).map(([type, count]) => ({
    name: type,
    count,
  }))

  // Health Score Distribution
  const healthDistributionData = [
    { range: '90-100 (Pristine)', count: history.filter((r) => r.overallHealth >= 90).length, color: '#10b981' },
    { range: '75-89 (Good)', count: history.filter((r) => r.overallHealth >= 75 && r.overallHealth < 90).length, color: '#3b82f6' },
    { range: '50-74 (Caution)', count: history.filter((r) => r.overallHealth >= 50 && r.overallHealth < 75).length, color: '#f59e0b' },
    { range: '<50 (Critical)', count: history.filter((r) => r.overallHealth < 50).length, color: '#ef4444' },
  ]

  const exportCSV = () => {
    if (!history.length) return
    const headers = ['ReportID', 'Date', 'MakeModel', 'Year', 'VIN', 'Mileage', 'Class', 'HealthScore', 'Decision', 'PriorRepair', 'FindingsCount']
    const rows = history.map((r) => [
      r.id,
      new Date(r.timestamp).toISOString(),
      `"${r.vehicle.makeModel}"`,
      r.vehicle.year || '',
      r.vehicle.vin || '',
      r.vehicle.mileage || '',
      r.vehicle.class || '',
      r.overallHealth,
      `"${r.riskAssessment.finalDecision}"`,
      r.priorRepairDetected ? 'YES' : 'NO',
      r.damages.length,
    ])

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n')
    const dlAnchor = document.createElement('a')
    dlAnchor.setAttribute('href', encodeURI(csvContent))
    dlAnchor.setAttribute('download', `AutoGuard_Fleet_Analytics_${new Date().toISOString().slice(0, 10)}.csv`)
    dlAnchor.click()
  }

  return (
    <section className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <p className="text-[10px] uppercase tracking-[0.3em] text-cyan-400 font-black">Fleet & Unit Intelligence</p>
          <h2 className="text-2xl font-black text-white">Forensic Audit History</h2>
        </div>
        {history.length > 0 && (
          <button
            onClick={exportCSV}
            className="px-4 py-2 bg-slate-900 border border-slate-700 hover:border-cyan-500 rounded-xl text-xs font-black uppercase text-cyan-300 transition-all flex items-center gap-1.5"
          >
            📊 Export Fleet CSV
          </button>
        )}
      </div>

      {history.length === 0 ? (
        <div className="rounded-3xl border border-slate-800 bg-slate-900/60 p-12 text-center space-y-3">
          <span className="text-4xl">🚗</span>
          <h3 className="text-lg font-black text-white">No Inspection Records Found</h3>
          <p className="text-sm text-slate-400 max-w-sm mx-auto">
            Perform an automotive inspection in the Camera / Upload view to start populating forensic analytics.
          </p>
        </div>
      ) : (
        <>
          {/* Key KPI Stats Grid */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            <Stat label="Average Health" value={`${avgHealth}%`} />
            <Stat label="Total Audited" value={String(history.length)} />
            <Stat label="Tow Truck Flags" value={String(towOnlyCount)} danger={towOnlyCount > 0} />
            <Stat label="Prior Repairs" value={String(priorRepairCount)} warning={priorRepairCount > 0} />
            <Stat label="Total Defect Items" value={String(totalFindings)} />
          </div>

          {/* Recharts Analytics Charts */}
          <div className="grid md:grid-cols-2 gap-4">
            {/* Health Score Distribution Bar Chart */}
            <div className="rounded-3xl border border-slate-800 bg-slate-900/80 p-5 space-y-3">
              <p className="text-xs font-black uppercase tracking-wider text-slate-400">
                Health Index Distribution
              </p>
              <div className="h-52 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={healthDistributionData}>
                    <XAxis dataKey="range" stroke="#64748b" fontSize={10} tickLine={false} />
                    <YAxis stroke="#64748b" fontSize={10} tickLine={false} allowDecimals={false} />
                    <Tooltip
                      contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '12px', fontSize: '12px' }}
                    />
                    <Bar dataKey="count" radius={[6, 6, 0, 0]}>
                      {healthDistributionData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Damage Category Breakdown */}
            <div className="rounded-3xl border border-slate-800 bg-slate-900/80 p-5 space-y-3">
              <p className="text-xs font-black uppercase tracking-wider text-slate-400">
                Defects by System Category
              </p>
              {damageTypeData.length > 0 ? (
                <div className="h-52 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={damageTypeData} layout="vertical">
                      <XAxis type="number" stroke="#64748b" fontSize={10} tickLine={false} allowDecimals={false} />
                      <YAxis dataKey="name" type="category" stroke="#64748b" fontSize={10} tickLine={false} width={80} />
                      <Tooltip
                        contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '12px', fontSize: '12px' }}
                      />
                      <Bar dataKey="count" fill="#38bdf8" radius={[0, 6, 6, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <p className="text-xs text-slate-500 italic pt-12 text-center">No defects logged in current batch.</p>
              )}
            </div>
          </div>

          {/* Search & Filterable Inspection List */}
          <div className="space-y-3 pt-2">
            <div className="flex justify-between items-center gap-4">
              <h3 className="text-xs font-black uppercase tracking-wider text-slate-400">
                Inspection Registry ({filteredHistory.length})
              </h3>
              <input
                type="text"
                value={filterQuery}
                onChange={(e) => setFilterQuery(e.target.value)}
                placeholder="Filter by Make, Model, or VIN..."
                className="px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-700 text-white text-xs w-64 outline-none focus:border-cyan-400"
              />
            </div>

            <div className="space-y-2">
              {filteredHistory.map((report) => (
                <button
                  key={report.id}
                  onClick={() => onOpenReport(report)}
                  className="w-full text-left rounded-2xl border border-slate-800 bg-slate-900/70 hover:bg-slate-900 p-4 flex items-center justify-between gap-4 hover:border-cyan-500 transition-all"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-black text-white text-base">
                        {report.vehicle.year} {report.vehicle.makeModel || 'Unknown Vehicle'}
                      </p>
                      <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded-md bg-slate-800 text-slate-300">
                        {report.vehicle.class || 'STANDARD'}
                      </span>
                    </div>
                    <p className="text-xs text-slate-400 mt-1">
                      VIN: <span className="font-mono text-slate-300">{report.vehicle.vin || 'N/A'}</span> ·{' '}
                      {new Date(report.timestamp).toLocaleDateString()} · {report.damages.length} findings
                    </p>
                  </div>
                  <div className="text-right whitespace-nowrap">
                    <p className="text-2xl font-black font-mono text-white">{report.overallHealth}%</p>
                    <span
                      className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full ${report.riskAssessment.finalDecision === 'SAFE TO DRIVE'
                          ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                          : 'bg-red-950 text-red-400 border border-red-800'
                        }`}
                    >
                      {report.riskAssessment.finalDecision}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </>
      )}
    </section>
  )
}

function Stat({
  label,
  value,
  danger,
  warning,
}: {
  label: string
  value: string
  danger?: boolean
  warning?: boolean
}) {
  return (
    <div
      className={`glass-card rounded-2xl border p-4 shadow-md ${danger
          ? 'border-rose-800/80 bg-rose-950/40 text-rose-300'
          : warning
            ? 'border-amber-800/80 bg-amber-950/40 text-amber-300'
            : 'border-slate-800 text-slate-200'
        }`}
    >
      <p className="text-[10px] uppercase tracking-wider text-slate-400 font-mono font-bold">{label}</p>
      <p className="text-2xl font-black font-mono mt-1 text-white">{value}</p>
    </div>
  )
}
