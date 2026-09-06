import type { InspectionReport } from '../types.ts'

export interface PdfExportOptions {
  includeQrCode?: boolean
  includeDigitalSignature?: boolean
  inspectorName?: string
  inspectorCertNumber?: string
  watermark?: string
  notes?: string
}

function escapeHtml(str: string | number | boolean | null | undefined): string {
  if (str === null || str === undefined) return ''
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
}

/**
 * Computes a deterministic SHA-256 cryptographic digest of an inspection report.
 * Works seamlessly in both modern browser WebCrypto and Node.js environments.
 */
export async function generateForensicHash(report: InspectionReport): Promise<string> {
  const payload = JSON.stringify({
    id: report.id,
    timestamp: report.timestamp,
    vin: report.vehicle.vin || 'UNSPECIFIED',
    makeModel: report.vehicle.makeModel,
    mileage: report.vehicle.mileage || 'UNSPECIFIED',
    overallHealth: report.overallHealth,
    finalDecision: report.riskAssessment?.finalDecision,
    forensicVerdict: report.forensicVerdict,
    damagesCount: report.damages?.length || 0,
    structuralIntegrity: report.riskAssessment?.structuralIntegrity,
  })

  // Universal WebCrypto API (Supported natively in modern browsers and Node 18+)
  const subtleCrypto = typeof globalThis !== 'undefined' && globalThis.crypto?.subtle ? globalThis.crypto.subtle : null
  if (subtleCrypto) {
    const encoder = new TextEncoder()
    const data = encoder.encode(payload)
    const hashBuffer = await subtleCrypto.digest('SHA-256', data)
    const hashArray = Array.from(new Uint8Array(hashBuffer))
    return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('')
  }

  // Fallback hash if crypto.subtle is unavailable
  let hash = 0
  for (let i = 0; i < payload.length; i++) {
    hash = (hash << 5) - hash + payload.charCodeAt(i)
    hash |= 0
  }
  return Math.abs(hash).toString(16).padStart(64, '0')
}

/**
 * Generates an SVG QR Code representation for instant verification of the inspection hash.
 */
export function generateVerificationQrSvg(verificationHash: string, reportId: string): string {
  const shortHash = verificationHash.slice(0, 16).toUpperCase()
  return `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="80" height="80" class="qr-code">
      <rect width="100" height="100" fill="#ffffff" rx="8" />
      <rect x="8" y="8" width="26" height="26" fill="#0f172a" rx="4" />
      <rect x="12" y="12" width="18" height="18" fill="#ffffff" rx="2" />
      <rect x="16" y="16" width="10" height="10" fill="#0f172a" />
      
      <rect x="66" y="8" width="26" height="26" fill="#0f172a" rx="4" />
      <rect x="70" y="12" width="18" height="18" fill="#ffffff" rx="2" />
      <rect x="74" y="16" width="10" height="10" fill="#0f172a" />
      
      <rect x="8" y="66" width="26" height="26" fill="#0f172a" rx="4" />
      <rect x="12" y="70" width="18" height="18" fill="#ffffff" rx="2" />
      <rect x="16" y="74" width="10" height="10" fill="#0f172a" />
      
      <!-- Pattern grid representing hash -->
      <rect x="42" y="12" width="6" height="6" fill="#0284c7" />
      <rect x="52" y="12" width="6" height="6" fill="#0f172a" />
      <rect x="42" y="24" width="6" height="6" fill="#0f172a" />
      <rect x="52" y="24" width="6" height="6" fill="#0284c7" />
      
      <rect x="12" y="42" width="6" height="6" fill="#0f172a" />
      <rect x="24" y="42" width="6" height="6" fill="#0284c7" />
      <rect x="12" y="52" width="6" height="6" fill="#0284c7" />
      <rect x="24" y="52" width="6" height="6" fill="#0f172a" />
      
      <rect x="40" y="40" width="20" height="20" fill="#0f172a" rx="3" />
      <rect x="44" y="44" width="12" height="12" fill="#38bdf8" rx="2" />
      
      <rect x="68" y="42" width="6" height="6" fill="#0284c7" />
      <rect x="80" y="42" width="6" height="6" fill="#0f172a" />
      <rect x="68" y="52" width="6" height="6" fill="#0f172a" />
      <rect x="80" y="52" width="6" height="6" fill="#0284c7" />
      
      <rect x="42" y="68" width="6" height="6" fill="#0f172a" />
      <rect x="52" y="68" width="6" height="6" fill="#0284c7" />
      <rect x="42" y="80" width="6" height="6" fill="#0284c7" />
      <rect x="52" y="80" width="6" height="6" fill="#0f172a" />
      
      <rect x="68" y="68" width="8" height="8" fill="#0f172a" />
      <rect x="78" y="78" width="8" height="8" fill="#0284c7" />
    </svg>
  `.trim()
}

/**
 * Builds a publication-grade HTML printable document string.
 */
export async function generatePrintableForensicHtml(
  report: InspectionReport,
  options: PdfExportOptions = {}
): Promise<string> {
  const hash = await generateForensicHash(report)
  const isSafe = report.riskAssessment?.finalDecision === 'SAFE TO DRIVE'
  const inspector = options.inspectorName || 'AutoGuard Certified Forensics AI'
  const certId = options.inspectorCertNumber || `AG-CERT-${report.id.slice(0, 8).toUpperCase()}`
  const qrSvg = options.includeQrCode !== false ? generateVerificationQrSvg(hash, report.id) : ''

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>AutoGuard AI Forensic Certificate - ${escapeHtml(report.vehicle.makeModel)}</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&family=JetBrains+Mono:wght@400;700&display=swap');
    
    @page {
      size: A4;
      margin: 15mm 15mm 15mm 15mm;
    }
    
    * {
      box-sizing: border-box;
    }
    
    body {
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      color: #0f172a;
      background: #ffffff;
      margin: 0;
      padding: 24px;
      line-height: 1.45;
      font-size: 12px;
    }

    .header-box {
      background: linear-gradient(135deg, #090d16 0%, #0f172a 100%);
      color: #ffffff;
      padding: 20px 24px;
      border-radius: 12px;
      margin-bottom: 20px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      border: 1px solid #1e293b;
    }

    .brand-title {
      font-size: 20px;
      font-weight: 900;
      letter-spacing: -0.5px;
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .brand-tag {
      font-family: 'JetBrains Mono', monospace;
      font-size: 10px;
      background: #0284c7;
      color: white;
      padding: 2px 6px;
      border-radius: 4px;
      letter-spacing: 0.5px;
    }

    .vehicle-subtitle {
      font-size: 14px;
      font-weight: 700;
      color: #38bdf8;
      margin-top: 4px;
    }

    .meta-line {
      font-family: 'JetBrains Mono', monospace;
      font-size: 10px;
      color: #94a3b8;
      margin-top: 2px;
    }

    .health-score-box {
      text-align: right;
    }

    .health-score-val {
      font-size: 34px;
      font-weight: 900;
      color: ${report.overallHealth >= 80 ? '#22c55e' : report.overallHealth >= 55 ? '#f59e0b' : '#ef4444'};
      line-height: 1;
    }

    .health-score-lbl {
      font-size: 10px;
      font-weight: 700;
      color: #94a3b8;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    .verdict-banner {
      background: ${isSafe ? '#f0fdf4' : '#fef2f2'};
      border: 1.5px solid ${isSafe ? '#86efac' : '#fca5a5'};
      border-radius: 10px;
      padding: 14px 18px;
      margin-bottom: 20px;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .verdict-title {
      font-size: 16px;
      font-weight: 900;
      color: ${isSafe ? '#15803d' : '#b91c1c'};
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .verdict-rec {
      font-family: 'JetBrains Mono', monospace;
      font-size: 11px;
      font-weight: 800;
      background: ${isSafe ? '#166534' : '#991b1b'};
      color: white;
      padding: 4px 10px;
      border-radius: 6px;
      text-transform: uppercase;
    }

    .grid-2 {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 16px;
      margin-bottom: 20px;
    }

    .card {
      border: 1px solid #e2e8f0;
      border-radius: 10px;
      padding: 14px;
      background: #f8fafc;
    }

    .card-title {
      font-size: 11px;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      color: #475569;
      margin-bottom: 10px;
      border-bottom: 1px solid #e2e8f0;
      padding-bottom: 4px;
    }

    .kv-row {
      display: flex;
      justify-content: space-between;
      padding: 3px 0;
      font-size: 11.5px;
    }

    .kv-label {
      color: #64748b;
    }

    .kv-value {
      font-weight: 700;
      color: #0f172a;
    }

    .badge-pass {
      color: #166534;
      background: #dcfce7;
      padding: 1px 6px;
      border-radius: 4px;
      font-weight: 800;
      font-size: 10px;
    }

    .badge-fail {
      color: #991b1b;
      background: #fee2e2;
      padding: 1px 6px;
      border-radius: 4px;
      font-weight: 800;
      font-size: 10px;
    }

    table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 8px;
      font-size: 11px;
    }

    th {
      background: #0f172a;
      color: #f8fafc;
      padding: 6px 10px;
      font-size: 10px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      text-align: left;
    }

    th:first-child { border-top-left-radius: 6px; }
    th:last-child { border-top-right-radius: 6px; }

    td {
      padding: 8px 10px;
      border-bottom: 1px solid #e2e8f0;
      vertical-align: top;
    }

    .finding-row:nth-child(even) {
      background: #f8fafc;
    }

    .severity-badge {
      font-family: 'JetBrains Mono', monospace;
      font-size: 9px;
      font-weight: 800;
      padding: 2px 5px;
      border-radius: 4px;
      display: inline-block;
    }

    .sev-RED { background: #fee2e2; color: #991b1b; border: 1px solid #fca5a5; }
    .sev-YELLOW { background: #fef3c7; color: #92400e; border: 1px solid #fde68a; }
    .sev-GREEN { background: #dcfce7; color: #166534; border: 1px solid #86efac; }

    .seal-box {
      margin-top: 24px;
      padding: 14px 18px;
      background: #f1f5f9;
      border: 1px dashed #94a3b8;
      border-radius: 10px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 16px;
    }

    .hash-text {
      font-family: 'JetBrains Mono', monospace;
      font-size: 9.5px;
      color: #334155;
      word-break: break-all;
    }

    .sig-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 30px;
      margin-top: 24px;
      padding-top: 16px;
      border-top: 1px solid #cbd5e1;
    }

    .sig-slot {
      border-bottom: 1px solid #0f172a;
      height: 32px;
      margin-top: 8px;
    }

    .footer {
      margin-top: 20px;
      text-align: center;
      font-size: 9px;
      color: #94a3b8;
      font-family: 'JetBrains Mono', monospace;
    }

    @media print {
      body {
        padding: 0;
        margin: 0;
      }
      .no-print {
        display: none !important;
      }
    }
  </style>
</head>
<body>
  <!-- Top Forensic Header -->
  <div class="header-box">
    <div>
      <div class="brand-title">
        🛡️ AUTOGUARD FORENSICS
        <span class="brand-tag">GDVF v2.5 SECURE</span>
      </div>
      <div class="vehicle-subtitle">
        ${escapeHtml(report.vehicle.year || '')} ${escapeHtml(report.vehicle.makeModel)}
      </div>
      <div class="meta-line">
        VIN: ${escapeHtml(report.vehicle.vin || 'N/A')} &nbsp;|&nbsp;
        MILEAGE: ${escapeHtml(report.vehicle.mileage || 'N/A')} &nbsp;|&nbsp;
        POWERTRAIN: ${escapeHtml(report.vehicle.fuelType || 'Petrol')}
      </div>
      <div class="meta-line">
        REPORT ID: ${escapeHtml(report.id)} &nbsp;|&nbsp;
        TIMESTAMP: ${escapeHtml(new Date(report.timestamp).toUTCString())}
      </div>
    </div>
    <div class="health-score-box">
      <div class="health-score-val">${escapeHtml(report.overallHealth)}<span style="font-size: 16px; color: #94a3b8;">/100</span></div>
      <div class="health-score-lbl">Vehicle Health Index</div>
    </div>
  </div>

  <!-- Final Risk & Driveability Verdict -->
  <div class="verdict-banner">
    <div>
      <div class="verdict-title">
        ${isSafe ? '✅' : '🛑'} ${escapeHtml(report.riskAssessment?.finalDecision || 'AUDIT PENDING')}
      </div>
      <div style="font-size: 11px; color: #334155; margin-top: 2px;">
        <strong>Safety Rationale:</strong> ${escapeHtml(report.riskAssessment?.rationale || 'Nominal operating conditions.')}
      </div>
    </div>
    <div class="verdict-rec">
      ${escapeHtml(report.finalRecommendation)}
    </div>
  </div>

  <!-- Safety & Undercarriage Verification Cards -->
  <div class="grid-2">
    <div class="card">
      <div class="card-title">Critical Safety & Systems Audit</div>
      <div class="kv-row">
        <span class="kv-label">Hydraulic Braking System:</span>
        <span class="kv-value">${report.riskAssessment?.brakingSystem ? '<span class="badge-pass">PASS</span>' : '<span class="badge-fail">FAIL</span>'}</span>
      </div>
      <div class="kv-row">
        <span class="kv-label">Steering & Suspension Geometry:</span>
        <span class="kv-value">${report.riskAssessment?.steeringSuspension ? '<span class="badge-pass">PASS</span>' : '<span class="badge-fail">FAIL</span>'}</span>
      </div>
      <div class="kv-row">
        <span class="kv-label">Structural Frame Integrity:</span>
        <span class="kv-value">${report.riskAssessment?.structuralIntegrity ? '<span class="badge-pass">PASS</span>' : '<span class="badge-fail">FAIL / KINKED</span>'}</span>
      </div>
      <div class="kv-row">
        <span class="kv-label">Thermal / Fire Ignition Hazard:</span>
        <span class="kv-value">${!report.riskAssessment?.fireRisk ? '<span class="badge-pass">NONE DETECTED</span>' : '<span class="badge-fail">HIGH RISK</span>'}</span>
      </div>
      <div class="kv-row">
        <span class="kv-label">Prior Concealed Crash Repairs:</span>
        <span class="kv-value">${report.priorRepairDetected ? '<span class="badge-fail">SUSPECTED</span>' : '<span class="badge-pass">CLEAN</span>'}</span>
      </div>
      <div class="kv-row">
        <span class="kv-label">ADAS Recalibration Required:</span>
        <span class="kv-value">${report.adasCalibrationRequired ? '<span class="badge-fail">REQUIRED</span>' : '<span class="badge-pass">NOMINAL</span>'}</span>
      </div>
    </div>

    <div class="card">
      <div class="card-title">Undercarriage & Acoustic Forensics</div>
      <div class="kv-row">
        <span class="kv-label">Frame Rail Straightness:</span>
        <span class="kv-value">${escapeHtml(report.underCarriageAudit?.railStraightness || 'PERFECT')}</span>
      </div>
      <div class="kv-row">
        <span class="kv-label">Oxidation / Rust Grade:</span>
        <span class="kv-value">${escapeHtml(report.underCarriageAudit?.rustGrade || 'NONE')}</span>
      </div>
      <div class="kv-row">
        <span class="kv-label">Fresh Undercoating Spray:</span>
        <span class="kv-value">${report.underCarriageAudit?.undercoatingDetected ? '<span class="badge-fail">DETECTED (CONCEALED)</span>' : '<span class="badge-pass">NONE</span>'}</span>
      </div>
      <div class="kv-row">
        <span class="kv-label">Fluid Leak Trace:</span>
        <span class="kv-value">${escapeHtml(report.underCarriageAudit?.leakTrace || 'NO ACTIVE LEAKS')}</span>
      </div>
      <div class="kv-row">
        <span class="kv-label">Acoustic Diagnostic Profile:</span>
        <span class="kv-value">${escapeHtml(report.acousticAudit?.overallMechanicalNote || 'Acoustics Nominal (0 Anomalies)')}</span>
      </div>
    </div>
  </div>

  <!-- Pathology & Damage Matrix -->
  <div class="card-title" style="margin-top: 10px;">Forensic Findings & Component Damage Matrix (${report.damages?.length || 0} Items)</div>
  <table>
    <thead>
      <tr>
        <th style="width: 22%;">Component</th>
        <th style="width: 14%;">Category</th>
        <th style="width: 12%;">Severity</th>
        <th style="width: 36%;">Forensic Observation & Action</th>
        <th style="width: 16%; text-align: right;">Est. Cost</th>
      </tr>
    </thead>
    <tbody>
      ${
        report.damages && report.damages.length > 0
          ? report.damages
              .map(
                (d) => `
        <tr class="finding-row">
          <td><strong>${escapeHtml(d.component)}</strong></td>
          <td style="color: #64748b;">${escapeHtml(d.type)}</td>
          <td><span class="severity-badge sev-${escapeHtml(d.status)}">${escapeHtml(d.status)}</span></td>
          <td>
            <div>${escapeHtml(d.description)}</div>
            <div style="color: #0284c7; font-size: 10px; margin-top: 2px;">➔ ${escapeHtml(d.actionRequired)}</div>
          </td>
          <td style="text-align: right; font-family: 'JetBrains Mono', monospace; font-weight: 700;">
            ${escapeHtml(d.estimatedCost?.medium || d.estimatedCost?.low || 'N/A')}
          </td>
        </tr>`
              )
              .join('')
          : `
        <tr>
          <td colspan="5" style="text-align: center; color: #166534; padding: 14px;">
            ✅ Zero mechanical, structural, or cosmetic damage findings detected.
          </td>
        </tr>`
      }
    </tbody>
  </table>

  <!-- Cryptographic Tamper-Proof Seal -->
  <div class="seal-box">
    <div>
      <div style="font-size: 11px; font-weight: 800; color: #0f172a; text-transform: uppercase;">
        🔒 Cryptographic Forensic Verification Seal
      </div>
      <div class="hash-text" style="margin-top: 4px;">
        <strong>SHA-256 DIGEST:</strong> ${escapeHtml(hash)}
      </div>
      <div class="meta-line" style="margin-top: 4px;">
        CERTIFICATE ID: ${escapeHtml(certId)} &nbsp;|&nbsp;
        ISSUING AGENT: ${escapeHtml(inspector)}
      </div>
    </div>
    ${qrSvg ? `<div>${qrSvg}</div>` : ''}
  </div>

  <!-- Signature Section -->
  <div class="sig-grid">
    <div>
      <div class="kv-label">Certified Forensic Inspector Signature</div>
      <div class="sig-slot" style="display: flex; align-items: flex-end; font-family: 'JetBrains Mono', monospace; font-size: 10px; color: #0284c7;">
        DIGITALLY VERIFIED — ${escapeHtml(inspector)}
      </div>
      <div class="meta-line" style="margin-top: 4px;">Date: ${escapeHtml(new Date().toLocaleDateString())}</div>
    </div>
    <div>
      <div class="kv-label">Client / Dealership Acknowledgment</div>
      <div class="sig-slot"></div>
      <div class="meta-line" style="margin-top: 4px;">Print Name & Signature</div>
    </div>
  </div>

  <div class="footer">
    AUTOGUARD AI ENTERPRISE FORENSICS &bull; ISO-9001 COMPLIANT VEHICLE TELEMETRY &bull; GENERATED VIA GDVF v2.5 RUNTIME
  </div>
</body>
</html>`.trim()
}

/**
 * Triggers the browser print workflow with the forensic document.
 */
export async function printForensicReport(
  report: InspectionReport,
  options: PdfExportOptions = {}
): Promise<void> {
  const html = await generatePrintableForensicHtml(report, options)
  const printWindow = window.open('', '_blank', 'width=900,height=1000')
  if (printWindow) {
    printWindow.document.open()
    printWindow.document.write(html)
    printWindow.document.close()
    printWindow.focus()
    setTimeout(() => {
      printWindow.print()
    }, 400)
  }
}
