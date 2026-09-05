import type { InspectionReport } from '../types'

export function VehicleTimeline({
  history,
  onOpenReport,
}: {
  history: InspectionReport[]
  onOpenReport: (report: InspectionReport) => void
}) {
  const grouped = [...history].sort((a, b) => b.timestamp - a.timestamp)

  return (
    <section className="space-y-4">
      <div>
        <p className="text-[10px] uppercase tracking-[0.3em] text-blue-400 font-black">Vehicle timeline</p>
        <h2 className="text-2xl font-black text-white">Chronological forensic log</h2>
      </div>
      {grouped.length === 0 ? (
        <p className="text-slate-500 text-sm">Timeline fills as inspections are saved.</p>
      ) : (
        <ol className="relative border-l border-slate-800 ml-3 space-y-6">
          {grouped.map((report) => (
            <li key={report.id} className="ml-6">
              <span className="absolute -left-1.5 mt-1.5 h-3 w-3 rounded-full bg-blue-500" />
              <button onClick={() => onOpenReport(report)} className="text-left w-full">
                <p className="text-xs text-slate-500">{new Date(report.timestamp).toLocaleString()}</p>
                <p className="font-black text-white">{report.vehicle.makeModel}</p>
                <p className="text-sm text-slate-400 line-clamp-2">{report.summary}</p>
                <p className="text-[10px] uppercase tracking-widest text-slate-500 mt-1">
                  Health {report.overallHealth} · {report.riskAssessment.finalDecision}
                </p>
              </button>
            </li>
          ))}
        </ol>
      )}
    </section>
  )
}
