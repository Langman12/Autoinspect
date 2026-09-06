import { useState } from 'react'
import { PdfExportModal } from './PdfExportModal.tsx'
import type { InspectionReport } from '../types'

function escapeHtml(str: string | number | boolean | null | undefined): string {
  if (str === null || str === undefined) return ''
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
}

export function ReportView({ report, onBack }: { report: InspectionReport; onBack: () => void }) {
  const [viewMode, setViewMode] = useState<'forensic' | 'transparency'>('forensic')
  const [showPdfModal, setShowPdfModal] = useState(false)

  const exportToPDF = () => {
    const isSafe = report.riskAssessment.finalDecision === 'SAFE TO DRIVE'
    const printContent = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>AutoGuard Report - ${escapeHtml(report.vehicle.makeModel)}</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;800;900&display=swap');
    body { font-family: 'Inter', Arial, sans-serif; color: #1e293b; margin: 30px; line-height: 1.5; font-size: 13px; }
    .header { background: #0f172a; color: white; padding: 24px; border-radius: 12px; margin-bottom: 20px; display: flex; justify-content: space-between; align-items: center; }
    .header h1 { margin: 0; font-size: 22px; font-weight: 900; letter-spacing: -0.5px; }
    .header p { margin: 4px 0 0 0; color: #94a3b8; font-size: 12px; }
    .badge { display: inline-block; padding: 4px 10px; border-radius: 6px; font-weight: 800; font-size: 11px; text-transform: uppercase; }
    .badge-safe { background: #dcfce7; color: #15803d; }
    .badge-danger { background: #fee2e2; color: #b91c1c; }
    .verdict-box { padding: 18px; border-radius: 10px; margin-bottom: 20px; background: ${isSafe ? '#f0fdf4' : '#fef2f2'}; border: 1px solid ${isSafe ? '#bbf7d0' : '#fecaca'}; }
    .verdict-title { font-size: 18px; font-weight: 900; color: ${isSafe ? '#166534' : '#991b1b'}; margin: 0 0 6px 0; }
    .grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 15px; margin-bottom: 20px; }
    .card { border: 1px solid #e2e8f0; border-radius: 10px; padding: 14px; background: #f8fafc; }
    .card h3 { margin: 0 0 8px 0; font-size: 12px; text-transform: uppercase; color: #64748b; font-weight: 800; }
    table { width: 100%; border-collapse: collapse; margin-top: 10px; }
    th { text-align: left; background: #f1f5f9; padding: 8px 10px; font-size: 11px; text-transform: uppercase; color: #475569; }
    td { padding: 8px 10px; border-bottom: 1px solid #e2e8f0; font-size: 12px; }
    .damage-row-RED td { background: #fff1f2; }
    .damage-row-YELLOW td { background: #fffbeb; }
    .damage-row-GREEN td { background: #f0fdf4; }
    .signature-section { margin-top: 40px; display: grid; grid-template-columns: repeat(2, 1fr); gap: 40px; padding-top: 20px; border-top: 1px dashed #cbd5e1; }
    .sig-line { border-bottom: 1px solid #000; height: 35px; margin-top: 20px; }
    @media print { body { margin: 0; } }
  </style>
</head>
<body>
  <div class="header">
    <div>
      <h1>AutoGuard AI Forensic Inspection</h1>
      <p>${escapeHtml(report.vehicle.year || '')} ${escapeHtml(report.vehicle.makeModel)} | VIN: ${escapeHtml(report.vehicle.vin || 'N/A')} | Mileage: ${escapeHtml(report.vehicle.mileage || 'N/A')}</p>
      <p>Inspection Timestamp: ${escapeHtml(new Date(report.timestamp).toLocaleString())} | Report ID: ${escapeHtml(report.id)}</p>
    </div>
    <div style="text-align: right;">
      <div style="font-size: 32px; font-weight: 900; color: #38bdf8;">${escapeHtml(report.overallHealth)}<span style="font-size: 14px; color: #94a3b8;">/100</span></div>
      <span class="badge ${isSafe ? 'badge-safe' : 'badge-danger'}">${escapeHtml(report.riskAssessment.finalDecision)}</span>
    </div>
  </div>

  <div class="verdict-box">
    <div class="verdict-title">${escapeHtml(report.riskAssessment.finalDecision)} · ${escapeHtml(report.finalRecommendation)}</div>
    <p style="margin: 0; color: #334155;"><strong>Rationale:</strong> ${escapeHtml(report.riskAssessment.rationale)}</p>
    <p style="margin: 6px 0 0 0; color: #475569;"><strong>Executive Summary:</strong> ${escapeHtml(report.summary)}</p>
  </div>

  <div class="grid">
    <div class="card">
      <h3>Critical Safety Verification</h3>
      <div>Braking System: <strong>${report.riskAssessment.brakingSystem ? '✅ PASS' : '❌ FAIL'}</strong></div>
      <div>Steering & Suspension: <strong>${report.riskAssessment.steeringSuspension ? '✅ PASS' : '❌ FAIL'}</strong></div>
      <div>Fire / Thermal Risk: <strong>${!report.riskAssessment.fireRisk ? '✅ NONE DETECTED' : '❌ RISK DETECTED'}</strong></div>
      <div>Structural Frame Integrity: <strong>${report.riskAssessment.structuralIntegrity ? '✅ PASS' : '❌ COMPROMISED'}</strong></div>
      <div>Prior Crash Concealment: <strong>${report.priorRepairDetected ? '⚠️ SUSPECTED' : '✅ CLEAN'}</strong></div>
      <div>ADAS Calibration Required: <strong>${report.adasCalibrationRequired ? '⚠️ REQUIRED' : '✅ NOMINAL'}</strong></div>
    </div>

    <div class="card">
      <h3>Undercarriage & Acoustic Forensics</h3>
      <div>Frame Rail Straightness: <strong>${escapeHtml(report.underCarriageAudit?.railStraightness || 'N/A')}</strong></div>
      <div>Corrosion / Rust Grade: <strong>${escapeHtml(report.underCarriageAudit?.rustGrade || 'N/A')}</strong></div>
      <div>Undercoating Concealment: <strong>${report.underCarriageAudit?.undercoatingDetected ? '⚠️ DETECTED' : 'NONE'}</strong></div>
      <div>Fluid Leak Trace: <strong>${escapeHtml(report.underCarriageAudit?.leakTrace || 'NONE')}</strong></div>
      <div>Acoustic Mechanical Health: <strong>${escapeHtml(report.acousticAudit?.overallMechanicalNote || 'Acoustics Nominal')}</strong></div>
    </div>
  </div>

  <h3>Forensic Findings & Damage Matrix</h3>
  <table>
    <thead>
      <tr>
        <th>Component</th>
        <th>Category</th>
        <th>Status</th>
        <th>Description & Action Required</th>
        <th>Estimated Cost</th>
      </tr>
    </thead>
    <tbody>
      ${report.damages
        .map(
          (d) => `
        <tr class="damage-row-${escapeHtml(d.status)}">
          <td><strong>${escapeHtml(d.component)}</strong></td>
          <td>${escapeHtml(d.type)}</td>
          <td><strong>${escapeHtml(d.status)}</strong></td>
          <td>
            ${escapeHtml(d.description)}<br/>
            <small style="color: #64748b;">Action: ${escapeHtml(d.actionRequired)}</small>
          </td>
          <td>${escapeHtml(d.estimatedCost?.low || 'N/A')} - ${escapeHtml(d.estimatedCost?.high || 'N/A')}</td>
        </tr>`
        )
        .join('')}
    </tbody>
  </table>

  <div class="signature-section">
    <div>
      <strong>Certified Forensic Inspector:</strong>
      <div class="sig-line"></div>
      <small style="color: #64748b;">Master Technician Signature & Date</small>
    </div>
    <div>
      <strong>Customer / Dealership Acknowledgment:</strong>
      <div class="sig-line"></div>
      <small style="color: #64748b;">Authorized Sign-off & Date</small>
    </div>
  </div>
</body>
</html>`

    const win = window.open('', '_blank')
    if (win) {
      win.document.write(printContent)
      win.document.close()
      win.print()
    }
  }

  const exportJSON = () => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(report, null, 2))
    const dlAnchor = document.createElement('a')
    dlAnchor.setAttribute('href', dataStr)
    dlAnchor.setAttribute('download', `AutoGuard_Report_${report.vehicle.makeModel || 'Vehicle'}_${report.id.slice(0, 8)}.json`)
    dlAnchor.click()
  }

  const safe = report.riskAssessment.finalDecision === 'SAFE TO DRIVE'
  const starCount = Math.max(1, Math.min(5, Math.round(report.overallHealth / 20)))

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Top Bar */}
      <div className="flex items-center justify-between">
        <button onClick={onBack} className="text-sm text-cyan-400 font-bold hover:text-cyan-300 flex items-center gap-1">
          ← Back to Inspections
        </button>

        {/* View Mode Toggle */}
        <div className="flex bg-slate-900 border border-slate-800 rounded-xl p-1">
          <button
            onClick={() => setViewMode('forensic')}
            className={`px-3 py-1.5 rounded-lg text-xs font-black uppercase transition-all ${
              viewMode === 'forensic' ? 'bg-cyan-600 text-white' : 'text-slate-400 hover:text-white'
            }`}
          >
            Forensic Master View
          </button>
          <button
            onClick={() => setViewMode('transparency')}
            className={`px-3 py-1.5 rounded-lg text-xs font-black uppercase transition-all ${
              viewMode === 'transparency' ? 'bg-emerald-600 text-white' : 'text-slate-400 hover:text-white'
            }`}
          >
            Customer Transparency Report
          </button>
        </div>
      </div>

      {viewMode === 'transparency' ? (
        /* CUSTOMER TRANSPARENCY VIEW */
        <div className="space-y-6">
          <div className="rounded-3xl border border-emerald-700/60 bg-gradient-to-br from-emerald-950/50 to-slate-950 p-6 space-y-4">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
              <div>
                <span className="text-[10px] font-black uppercase tracking-[0.25em] text-emerald-400">
                  Customer Transparency Certificate
                </span>
                <h2 className="text-3xl font-black text-white mt-1">
                  {report.vehicle.year} {report.vehicle.makeModel}
                </h2>
                <p className="text-xs text-slate-400 font-mono mt-1">VIN: {report.vehicle.vin || 'Not Provided'}</p>
              </div>
              <div className="text-right">
                <div className="text-3xl">{'⭐'.repeat(starCount)}</div>
                <p className="text-xs text-slate-300 font-bold mt-1">
                  Overall Health Rating: {report.overallHealth}%
                </p>
              </div>
            </div>

            <div className={`p-4 rounded-2xl ${safe ? 'bg-emerald-900/30 border border-emerald-600/40 text-emerald-200' : 'bg-red-900/30 border border-red-600/40 text-red-200'}`}>
              <p className="font-black text-sm uppercase">Road Readiness Verdict:</p>
              <p className="text-base font-bold mt-0.5">{report.riskAssessment.finalDecision}</p>
              <p className="text-xs text-slate-300 mt-1">{report.riskAssessment.rationale}</p>
            </div>
          </div>

          {/* Plain English Customer Summary */}
          <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-5 space-y-2">
            <h3 className="text-xs font-black uppercase tracking-wider text-slate-400">Plain English Summary</h3>
            <p className="text-slate-200 text-sm leading-relaxed">{report.summary}</p>
          </div>

          {/* Simplified Safety Checklist */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className={`p-4 rounded-2xl border ${report.riskAssessment.brakingSystem ? 'bg-emerald-950/40 border-emerald-800 text-emerald-300' : 'bg-red-950/40 border-red-800 text-red-300'}`}>
              <p className="text-[10px] font-black uppercase">Braking</p>
              <p className="text-lg font-black mt-1">{report.riskAssessment.brakingSystem ? 'PASS' : 'REPAIR'}</p>
            </div>
            <div className={`p-4 rounded-2xl border ${report.riskAssessment.steeringSuspension ? 'bg-emerald-950/40 border-emerald-800 text-emerald-300' : 'bg-red-950/40 border-red-800 text-red-300'}`}>
              <p className="text-[10px] font-black uppercase">Steering & Shocks</p>
              <p className="text-lg font-black mt-1">{report.riskAssessment.steeringSuspension ? 'PASS' : 'ATTENTION'}</p>
            </div>
            <div className={`p-4 rounded-2xl border ${report.riskAssessment.structuralIntegrity ? 'bg-emerald-950/40 border-emerald-800 text-emerald-300' : 'bg-red-950/40 border-red-800 text-red-300'}`}>
              <p className="text-[10px] font-black uppercase">Chassis / Frame</p>
              <p className="text-lg font-black mt-1">{report.riskAssessment.structuralIntegrity ? 'SOLID' : 'DEFECT'}</p>
            </div>
            <div className={`p-4 rounded-2xl border ${!report.priorRepairDetected ? 'bg-emerald-950/40 border-emerald-800 text-emerald-300' : 'bg-amber-950/40 border-amber-800 text-amber-300'}`}>
              <p className="text-[10px] font-black uppercase">Body History</p>
              <p className="text-lg font-black mt-1">{!report.priorRepairDetected ? 'ORIGINAL' : 'PRIOR REPAIR'}</p>
            </div>
          </div>

          {/* Actionable Repairs & Costs */}
          <div className="space-y-3">
            <h3 className="text-xs font-black uppercase tracking-wider text-slate-400">Items Requiring Attention</h3>
            {report.damages.map((d) => (
              <div key={d.id} className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4 flex flex-col md:flex-row justify-between items-start md:items-center gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <span className={`w-2 h-2 rounded-full ${d.status === 'RED' ? 'bg-red-500' : d.status === 'YELLOW' ? 'bg-amber-500' : 'bg-emerald-500'}`} />
                    <strong className="text-white text-sm">{d.component}</strong>
                    <span className="text-[10px] text-slate-400 uppercase">({d.type})</span>
                  </div>
                  <p className="text-xs text-slate-300 mt-1">{d.description}</p>
                  <p className="text-[11px] text-cyan-300 font-bold mt-1">Recommended Action: {d.actionRequired}</p>
                </div>
                <div className="text-right whitespace-nowrap">
                  <span className="text-xs text-slate-400 font-mono">Estimated Cost</span>
                  <p className="text-sm font-black text-white">{d.estimatedCost?.low || 'N/A'} - {d.estimatedCost?.high || 'N/A'}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        /* FORENSIC MASTER TECH VIEW */
        <div className="space-y-6">
          {/* Main Verdict Card */}
          <div className={`rounded-3xl p-6 border ${safe ? 'bg-emerald-950/40 border-emerald-700' : 'bg-red-950/40 border-red-700'}`}>
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
              <div>
                <p className="text-xs uppercase tracking-widest text-slate-400 font-bold">GDVF Forensic Verdict</p>
                <h2 className="text-3xl font-black text-white mt-1">{report.riskAssessment.finalDecision}</h2>
                <p className="text-sm font-bold text-cyan-400 uppercase tracking-wider mt-0.5">
                  Recommendation: {report.finalRecommendation} · Confidence: {report.confidenceScore}%
                </p>
              </div>
              <div className="text-right">
                <p className="text-5xl font-black text-white">
                  {report.overallHealth}<span className="text-lg text-slate-400">/100</span>
                </p>
                <p className="text-[10px] text-slate-400 uppercase tracking-widest">Health Index</p>
              </div>
            </div>
            <p className="text-slate-200 text-sm mt-3 pt-3 border-t border-slate-800/80">{report.riskAssessment.rationale}</p>
          </div>

          {/* Flags & Special Audits */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className={`p-4 rounded-2xl border ${report.priorRepairDetected ? 'border-amber-700 bg-amber-950/30' : 'border-slate-800 bg-slate-900'}`}>
              <p className="text-[10px] uppercase font-bold text-slate-400">Prior Repair Concealment</p>
              <p className={`text-base font-black mt-1 ${report.priorRepairDetected ? 'text-amber-400' : 'text-slate-200'}`}>
                {report.priorRepairDetected ? '⚠️ DETECTED' : 'CLEAN'}
              </p>
            </div>
            <div className={`p-4 rounded-2xl border ${report.adasCalibrationRequired ? 'border-amber-700 bg-amber-950/30' : 'border-slate-800 bg-slate-900'}`}>
              <p className="text-[10px] uppercase font-bold text-slate-400">ADAS Radar Calibration</p>
              <p className={`text-base font-black mt-1 ${report.adasCalibrationRequired ? 'text-amber-400' : 'text-slate-200'}`}>
                {report.adasCalibrationRequired ? '⚠️ REQUIRED' : 'NOMINAL'}
              </p>
            </div>
            <div className={`p-4 rounded-2xl border ${report.riskAssessment.structuralIntegrity ? 'border-slate-800 bg-slate-900' : 'border-red-700 bg-red-950/30'}`}>
              <p className="text-[10px] uppercase font-bold text-slate-400">Structural Frame</p>
              <p className={`text-base font-black mt-1 ${report.riskAssessment.structuralIntegrity ? 'text-emerald-400' : 'text-red-400'}`}>
                {report.riskAssessment.structuralIntegrity ? 'INTEACT' : '⚠️ COMPROMISED'}
              </p>
            </div>
            <div className={`p-4 rounded-2xl border ${report.riskAssessment.fireRisk ? 'border-red-700 bg-red-950/30' : 'border-slate-800 bg-slate-900'}`}>
              <p className="text-[10px] uppercase font-bold text-slate-400">Fire / Thermal Hazard</p>
              <p className={`text-base font-black mt-1 ${report.riskAssessment.fireRisk ? 'text-red-400' : 'text-emerald-400'}`}>
                {report.riskAssessment.fireRisk ? '⚠️ HAZARD' : 'SAFE'}
              </p>
            </div>
          </div>

          {/* Undercarriage Forensic Audit */}
          {report.underCarriageAudit && (
            <div className="rounded-2xl border border-slate-800 bg-slate-900/90 p-5 space-y-3">
              <div className="flex items-center justify-between">
                <p className="font-black text-xs uppercase tracking-widest text-cyan-400">
                  Undercarriage & Metallurgy Forensics
                </p>
                <span className="text-xs font-mono text-slate-400">Frame Protocol 2</span>
              </div>
              <div className="grid md:grid-cols-3 gap-3 text-xs">
                <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
                  <span className="text-slate-400 font-bold">Rail Straightness:</span>
                  <p className="text-white font-black mt-1">{report.underCarriageAudit.railStraightness}</p>
                  <p className="text-slate-400 text-[11px] mt-1">{report.underCarriageAudit.railRationale}</p>
                </div>
                <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
                  <span className="text-slate-400 font-bold">Corrosion / Rust Grade:</span>
                  <p className="text-white font-black mt-1">{report.underCarriageAudit.rustGrade}</p>
                  <p className="text-slate-400 text-[11px] mt-1">{report.underCarriageAudit.rustRationale}</p>
                </div>
                <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
                  <span className="text-slate-400 font-bold">Fluid Leaks & Undercoating:</span>
                  <p className="text-white font-black mt-1">{report.underCarriageAudit.leakTrace || 'None Detected'}</p>
                  <p className="text-slate-400 text-[11px] mt-1">{report.underCarriageAudit.undercoatingRationale || 'Standard Factory Layer'}</p>
                </div>
              </div>
            </div>
          )}

          {/* Acoustic Diagnostic Audit */}
          {report.acousticAudit && (
            <div className="rounded-2xl border border-slate-800 bg-slate-900/90 p-5 space-y-3">
              <div className="flex items-center justify-between">
                <p className="font-black text-xs uppercase tracking-widest text-cyan-400">
                  Acoustic Pathology Signature Audit (20Hz - 20kHz)
                </p>
                <span className="text-xs font-mono text-slate-400">Acoustic Protocol 3</span>
              </div>
              <p className="text-xs text-slate-300">{report.acousticAudit.overallMechanicalNote}</p>
              {report.acousticAudit.signatures?.length > 0 && (
                <div className="space-y-2 pt-2">
                  {report.acousticAudit.signatures.map((sig, i) => (
                    <div key={i} className="rounded-xl bg-slate-950 border border-slate-800 p-3 flex justify-between items-center text-xs">
                      <div>
                        <span className="font-mono font-bold text-cyan-400">{sig.frequencyRange}</span>
                        <span className="text-slate-300 ml-3">{sig.description}</span>
                      </div>
                      <span className={`px-2 py-0.5 rounded font-black text-[10px] ${sig.detectedStatus === 'ANOMALY_DETECTED' ? 'bg-red-950 text-red-400 border border-red-800' : 'bg-emerald-950 text-emerald-400 border border-emerald-800'}`}>
                        {sig.detectedStatus}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Recalls */}
          {report.recalls && report.recalls.length > 0 && (
            <div className="rounded-2xl border border-amber-600 bg-amber-950/40 p-4 space-y-2">
              <p className="font-black text-amber-300 text-xs uppercase tracking-wider">⚠️ NHTSA Safety Recall Bulletins</p>
              {report.recalls.map((r) => (
                <div key={r.campaignNumber} className="text-xs text-amber-100 border-t border-amber-800/60 pt-2">
                  <p className="font-bold">{r.subject} — {r.component}</p>
                  <p className="text-slate-300 text-[11px] mt-0.5">Consequence: {r.consequence}</p>
                  <p className="text-cyan-300 text-[11px]">Remedy: {r.remedy}</p>
                </div>
              ))}
            </div>
          )}

          {/* Damage Findings Detailed List */}
          <div className="space-y-3">
            <h3 className="text-xs font-black uppercase tracking-wider text-slate-400">Forensic Component Findings</h3>
            {report.damages.map((d) => (
              <div
                key={d.id}
                className={`rounded-2xl border p-4 transition-all ${
                  d.status === 'RED'
                    ? 'border-red-700 bg-red-950/30'
                    : d.status === 'YELLOW'
                      ? 'border-amber-700 bg-amber-950/30'
                      : 'border-emerald-700 bg-emerald-950/30'
                }`}
              >
                <div className="flex justify-between items-start gap-3">
                  <div>
                    <strong className="text-white text-base">{d.component}</strong>
                    <span className="text-xs text-slate-400 ml-2">[{d.type}]</span>
                  </div>
                  <span className={`text-xs font-black px-2 py-0.5 rounded-full ${d.status === 'RED' ? 'bg-red-900 text-red-200' : d.status === 'YELLOW' ? 'bg-amber-900 text-amber-200' : 'bg-emerald-900 text-emerald-200'}`}>
                    {d.status} · Severity: {d.severityScore}/10
                  </span>
                </div>
                <p className="text-sm text-slate-300 mt-2">{d.description}</p>
                <p className="text-xs text-cyan-300 font-bold mt-2">Action Required: {d.actionRequired}</p>
                <div className="mt-3 pt-2 border-t border-slate-800/80 flex flex-wrap gap-4 text-xs font-mono text-slate-400">
                  <span>DIY/Budget: <strong className="text-slate-200">{d.estimatedCost?.low || 'N/A'}</strong></span>
                  <span>Independent Shop: <strong className="text-slate-200">{d.estimatedCost?.medium || 'N/A'}</strong></span>
                  <span>Dealer/Specialist: <strong className="text-slate-200">{d.estimatedCost?.high || 'N/A'}</strong></span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Export Action Buttons */}
      <div className="flex flex-wrap gap-3 pt-4 border-t border-slate-800">
        <button
          onClick={() => setShowPdfModal(true)}
          className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white rounded-2xl font-black text-xs uppercase shadow-lg shadow-cyan-900/30 transition-transform active:scale-95"
        >
          📜 Print & Export Forensic Certificate (SHA-256)
        </button>
        <button
          onClick={exportJSON}
          className="flex items-center gap-2 px-6 py-3 bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-700 rounded-2xl font-black text-xs uppercase transition-transform active:scale-95"
        >
          💾 Export Raw Forensic JSON
        </button>
      </div>

      <PdfExportModal
        report={report}
        isOpen={showPdfModal}
        onClose={() => setShowPdfModal(false)}
      />
    </div>
  )
}
