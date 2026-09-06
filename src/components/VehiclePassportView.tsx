import { useEffect, useState } from 'react'
import { vehiclePassportService } from '../services/vehiclePassportService.ts'
import type { InspectionReport, VehiclePassport } from '../types.ts'

const DEMO_REPORT: InspectionReport = {
  id: 'RPT-2024-X991',
  timestamp: Date.now() - 3600000,
  vehicle: {
    year: '2024',
    makeModel: 'Tactical Interceptor Special Edition',
    vin: '1HGCR2F8XHA049211',
    mileage: '42,150 km',
    fuelType: 'Hybrid AWD',
    class: 'COMMERCIAL',
  },
  damages: [
    {
      id: 'dmg-01',
      type: 'MECHANICAL',
      component: 'Front Left Strut Assembly',
      description: 'Hydraulic seal weeping oil.',
      status: 'RED',
      severityScore: 85,
      estimatedCost: { low: '$480', medium: '$560', high: '$650' },
      actionRequired: 'Replace strut pair.',
    },
    {
      id: 'dmg-02',
      type: 'MECHANICAL',
      component: 'Cylinder 3 Coil Pack',
      description: 'Misfire under full boost load.',
      status: 'RED',
      severityScore: 80,
      estimatedCost: { low: '$140', medium: '$190', high: '$250' },
      actionRequired: 'Replace coil pack.',
    },
  ],
  overallHealth: 88,
  confidenceScore: 99.4,
  summary: 'Forensic baseline verified. Structural rails within factory tolerance. Mechanical repairs required on front suspension.',
  priorRepairDetected: false,
  adasCalibrationRequired: false,
  forensicVerdict: 'AUTHENTIC_CERTIFIED_CHASSIS',
  finalRecommendation: 'RETAIL READY',
  riskAssessment: {
    brakingSystem: true,
    steeringSuspension: false,
    fireRisk: false,
    structuralIntegrity: true,
    finalDecision: 'SAFE TO DRIVE',
    rationale: 'Primary safety systems intact.',
  },
}

export function VehiclePassportView() {
  const [passport, setPassport] = useState<VehiclePassport | null>(null)
  const [copySuccess, setCopySuccess] = useState(false)

  useEffect(() => {
    vehiclePassportService.generatePassport(DEMO_REPORT, [
      { data: 'RAW_IMAGE_VIN_STATION_1', mimeType: 'image/jpeg', label: 'VIN Stamping & Federal Emissions Tag' },
      { data: 'RAW_IMAGE_ENGINE_BAY_STATION_2', mimeType: 'image/jpeg', label: 'Engine Plenum & Ignition Coil Array' },
      { data: 'RAW_AUDIO_SPECTROGRAM_STATION_3', mimeType: 'audio/wav', label: '40-12000Hz FFT Acoustic Spectrogram' },
      { data: 'RAW_OBD_CAN_BUS_DUMP_STATION_4', mimeType: 'application/json', label: 'ISO 15765-4 Diagnostic PIDs & Freeze Frames' },
    ]).then(setPassport)
  }, [])

  const handleCopyJsonLd = () => {
    if (!passport) return
    navigator.clipboard.writeText(JSON.stringify(passport, null, 2))
    setCopySuccess(true)
    setTimeout(() => setCopySuccess(false), 2000)
  }

  const handleDownloadCertificate = () => {
    if (!passport) return
    const blob = new Blob([JSON.stringify(passport, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `AUTOGUARD_PASSPORT_${passport.vin}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  if (!passport) {
    return (
      <div className="text-center py-20 text-slate-400 font-mono text-sm animate-pulse">
        Generating SHA-256 Cryptographic Vehicle Passport & EXIF Anomaly Audit...
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Top Header Ribbon */}
      <div className="bg-slate-900/80 border border-purple-500/30 rounded-2xl p-4 backdrop-blur-xl shadow-2xl flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-purple-500/10 border border-purple-400/30 text-purple-400">
            📜
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-black tracking-wider text-slate-100 uppercase">
                Cryptographic Vehicle Passport & Fraud Radar
              </h2>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-black bg-emerald-500/20 text-emerald-400 border border-emerald-500/40">
                ✓ {passport.forensicGrade}
              </span>
            </div>
            <p className="text-xs text-slate-400 font-mono">
              Immutable SHA-256 Hash Provenance & EXIF Manipulation Audit
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2">
          <button
            onClick={handleCopyJsonLd}
            className="px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-800 text-xs font-mono text-slate-300 hover:text-white"
          >
            {copySuccess ? '✓ COPIED JSON-LD' : '📋 COPY JSON-LD'}
          </button>
          <button
            onClick={handleDownloadCertificate}
            className="px-3.5 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-mono font-bold text-xs shadow-lg shadow-purple-900/40"
          >
            ⬇ DOWNLOAD PASSPORT
          </button>
        </div>
      </div>

      {/* Main Digital Passport Certificate Card */}
      <div className="bg-slate-900/90 border border-purple-500/40 rounded-3xl p-8 backdrop-blur-xl shadow-2xl relative overflow-hidden font-mono">
        {/* Holographic Security Watermark Grid */}
        <div className="absolute inset-0 bg-[radial-gradient(#8b5cf6_1px,transparent_1px)] [background-size:16px_16px] opacity-10 pointer-events-none" />

        {/* Certificate Header Banner */}
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800 pb-6 relative z-10">
          <div>
            <div className="text-[11px] text-purple-400 uppercase tracking-widest font-bold">
              OFFICIAL FORENSIC VEHICLE PASSPORT
            </div>
            <h3 className="text-2xl font-black text-slate-100 mt-1">
              {passport.year} {passport.makeModel}
            </h3>
            <div className="text-sm text-slate-400 mt-0.5">
              VIN: <span className="text-cyan-400 font-bold tracking-wider">{passport.vin}</span> • Odometer: {passport.mileage.toLocaleString()} km
            </div>
          </div>

          <div className="text-right">
            <div className="text-[11px] text-slate-400 uppercase">Health Rating</div>
            <div className="text-4xl font-black text-emerald-400 mt-0.5">
              {passport.overallHealthScore} / 100
            </div>
            <div className="text-[10px] text-purple-300 mt-0.5">CERTIFICATE ID: {passport.passportId}</div>
          </div>
        </div>

        {/* Cryptographic Proof & Signature Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 my-6 relative z-10">
          {/* Cryptographic Signature */}
          <div className="bg-slate-950/80 p-5 rounded-2xl border border-slate-800 space-y-3">
            <div className="flex items-center justify-between text-xs text-purple-400 font-bold uppercase">
              <span>Cryptographic Signature Proof</span>
              <span className="text-[10px] text-emerald-400">VERIFIED</span>
            </div>

            <div className="space-y-2 text-xs">
              <div>
                <span className="text-slate-500">Signing Authority:</span>
                <div className="text-slate-200 font-bold">{passport.signature.signedBy}</div>
              </div>
              <div>
                <span className="text-slate-500">Certificate Fingerprint:</span>
                <div className="text-cyan-400 font-bold">{passport.signature.certificateFingerprint}</div>
              </div>
              <div>
                <span className="text-slate-500">Root SHA-256 Ledger Hash:</span>
                <div className="text-[10px] text-slate-300 break-all bg-slate-900 p-2 rounded-lg border border-slate-800">
                  {passport.signature.blockchainHash}
                </div>
              </div>
            </div>
          </div>

          {/* Asset Digest Hashes */}
          <div className="bg-slate-950/80 p-5 rounded-2xl border border-slate-800 space-y-3">
            <div className="text-xs text-cyan-400 font-bold uppercase">
              Raw Forensic Asset Checksums ({passport.assetDigests.length})
            </div>

            <div className="space-y-2 text-xs max-h-48 overflow-y-auto pr-1">
              {passport.assetDigests.map((asset, idx) => (
                <div key={idx} className="bg-slate-900/60 p-2.5 rounded-xl border border-slate-800/80">
                  <div className="text-[11px] font-bold text-slate-200 truncate">{asset.label}</div>
                  <div className="text-[10px] text-slate-400 font-mono truncate mt-0.5">
                    SHA-256: {asset.sha256Hash}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* EXIF Forensic Fraud & Tamper Radar */}
        <div className="relative z-10 space-y-4 pt-4 border-t border-slate-800">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-black text-slate-100 uppercase">
              AI EXIF Forensic Fraud & Manipulation Audit
            </h4>
            <span className="text-xs text-emerald-400">ALL PASS</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {passport.exifAudits.map((audit) => (
              <div
                key={audit.id}
                className="bg-slate-950/80 p-4 rounded-2xl border border-slate-800 flex items-start gap-3"
              >
                <div className="text-lg">
                  {audit.severity === 'CLEAN' ? '🛡️' : '⚠️'}
                </div>
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-slate-200">
                      {audit.checkName}
                    </span>
                    <span className="text-[10px] text-purple-300 font-bold">
                      {audit.confidenceScore}% CONF
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400 leading-relaxed">
                    {audit.details}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
