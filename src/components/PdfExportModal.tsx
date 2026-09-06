import { useEffect, useState } from 'react'
import { generateForensicHash, printForensicReport, type PdfExportOptions } from '../services/pdfReportService.ts'
import type { InspectionReport } from '../types.ts'

export function PdfExportModal({
  report,
  isOpen,
  onClose,
}: {
  report: InspectionReport
  isOpen: boolean
  onClose: () => void
}) {
  const [inspectorName, setInspectorName] = useState('Master Forensic AI Technician')
  const [certNumber, setCertNumber] = useState(`AG-CERT-${report.id.slice(0, 8).toUpperCase()}`)
  const [includeQr, setIncludeQr] = useState(true)
  const [hash, setHash] = useState<string>('')
  const [isGenerating, setIsGenerating] = useState(false)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    if (isOpen) {
      generateForensicHash(report).then(setHash)
    }
  }, [isOpen, report])

  if (!isOpen) return null

  const handlePrint = async () => {
    setIsGenerating(true)
    const options: PdfExportOptions = {
      inspectorName,
      inspectorCertNumber: certNumber,
      includeQrCode: includeQr,
    }
    await printForensicReport(report, options)
    setIsGenerating(false)
  }

  const handleCopyHash = () => {
    if (navigator.clipboard && hash) {
      navigator.clipboard.writeText(hash)
      setCopied(true)
      setTimeout(() => setCopied(false), 2500)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fade-in">
      <div className="bg-slate-900 border border-cyan-500/40 rounded-3xl p-6 max-w-lg w-full shadow-2xl space-y-5 text-slate-100">
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400 text-lg">
              📜
            </div>
            <div>
              <h3 className="text-base font-black uppercase tracking-wider text-white">
                Forensic PDF Certification
              </h3>
              <p className="text-xs text-slate-400 font-mono">
                SHA-256 Tamper-Proof Cryptographic Seal
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center text-sm font-bold"
          >
            ✕
          </button>
        </div>

        {/* Cryptographic Hash Badge */}
        <div className="bg-slate-950/80 border border-slate-800 rounded-2xl p-3.5 space-y-2 font-mono">
          <div className="flex justify-between items-center text-[10px] text-cyan-400 uppercase font-black">
            <span>Cryptographic Integrity Digest (SHA-256)</span>
            <button
              onClick={handleCopyHash}
              className="text-[10px] text-slate-400 hover:text-cyan-300 transition-colors"
            >
              {copied ? '✅ COPIED' : '📋 COPY'}
            </button>
          </div>
          <div className="text-[11px] text-slate-300 break-all leading-tight bg-slate-900 p-2 rounded-xl border border-slate-850">
            {hash || 'Computing cryptographic digest...'}
          </div>
        </div>

        {/* Customization Options */}
        <div className="space-y-3 font-mono text-xs">
          <div>
            <label className="block text-slate-400 text-[10px] uppercase font-bold mb-1">
              Certifying Inspector / Lead Technician
            </label>
            <input
              value={inspectorName}
              onChange={(e) => setInspectorName(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white font-mono text-xs outline-none focus:border-cyan-400"
            />
          </div>

          <div>
            <label className="block text-slate-400 text-[10px] uppercase font-bold mb-1">
              Inspection Certificate ID
            </label>
            <input
              value={certNumber}
              onChange={(e) => setCertNumber(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-cyan-300 font-mono text-xs outline-none focus:border-cyan-400"
            />
          </div>

          <label className="flex items-center gap-3 cursor-pointer py-1">
            <input
              type="checkbox"
              checked={includeQr}
              onChange={(e) => setIncludeQr(e.target.checked)}
              className="w-4 h-4 rounded bg-slate-950 border-slate-700 text-cyan-500 focus:ring-0"
            />
            <span className="text-slate-300">Embed Instant QR Verification Matrix on Page 1</span>
          </label>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3 pt-2">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 font-bold text-xs uppercase tracking-wider text-slate-300"
          >
            Cancel
          </button>
          <button
            onClick={handlePrint}
            disabled={isGenerating}
            className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 font-black text-xs uppercase tracking-wider text-white shadow-lg shadow-cyan-900/40 flex items-center justify-center gap-2"
          >
            {isGenerating ? 'Generating...' : '🖨️ Export PDF / Print'}
          </button>
        </div>
      </div>
    </div>
  )
}
