import test from 'node:test'
import assert from 'node:assert/strict'
import {
  generateForensicHash,
  generateVerificationQrSvg,
  generatePrintableForensicHtml,
} from '../../src/services/pdfReportService.ts'

const mockReport = {
  id: 'REP-7890-XYZ',
  timestamp: 1725500000000,
  vehicle: {
    year: '2022',
    makeModel: 'Audi RS6 Avant',
    vin: 'WAUZZZF27NA012345',
    mileage: '42,000 km',
    fuelType: 'Petrol (V8 Twin-Turbo)',
  },
  overallHealth: 88,
  confidenceScore: 94,
  summary: 'Excellent mechanical condition with minor surface oxidation on lower subframe.',
  priorRepairDetected: false,
  adasCalibrationRequired: false,
  forensicVerdict: 'Clean Title / Minor Cosmetic Findings',
  finalRecommendation: 'RETAIL READY',
  riskAssessment: {
    brakingSystem: true,
    steeringSuspension: true,
    fireRisk: false,
    structuralIntegrity: true,
    finalDecision: 'SAFE TO DRIVE',
    rationale: 'All critical safety matrices pass threshold.',
  },
  underCarriageAudit: {
    undercoatingDetected: false,
    undercoatingRationale: 'No masking detected.',
    railStraightness: 'PERFECT',
    railRationale: 'Zero kink or bend on main frame rails.',
    rustGrade: 'SURFACE',
    rustRationale: 'Light surface oxidation on non-structural subframe bracket.',
    leakTrace: 'NO ACTIVE LEAKS',
  },
  acousticAudit: {
    signatures: [],
    overallMechanicalNote: 'No timing chain slap or abnormal valvetrain noise.',
  },
  damages: [
    {
      id: 'DMG-1',
      component: 'Front Lower Splitter',
      type: 'BODY',
      description: 'Minor curb rash on right carbon fiber corner.',
      status: 'YELLOW',
      severityScore: 3,
      estimatedCost: { low: '$200', medium: '$450', high: '$800' },
      actionRequired: 'Buff or replace splitter edge.',
    },
  ],
}

test('generateForensicHash returns valid 64-char SHA-256 hex string', async () => {
  const hash = await generateForensicHash(mockReport)
  assert.equal(typeof hash, 'string')
  assert.equal(hash.length, 64)
  assert.match(hash, /^[a-f0-9]{64}$/)
})

test('generateForensicHash is deterministic for identical input', async () => {
  const hash1 = await generateForensicHash(mockReport)
  const hash2 = await generateForensicHash(JSON.parse(JSON.stringify(mockReport)))
  assert.equal(hash1, hash2)
})

test('generateForensicHash changes when report data is tampered with', async () => {
  const hashOriginal = await generateForensicHash(mockReport)
  
  const tamperedReport = {
    ...mockReport,
    vehicle: { ...mockReport.vehicle, mileage: '999,999 km' },
  }
  const hashTampered = await generateForensicHash(tamperedReport)
  assert.notEqual(hashOriginal, hashTampered)
})

test('generateVerificationQrSvg outputs valid SVG elements', () => {
  const hash = 'a1b2c3d4e5f60718293a4b5c6d7e8f90a1b2c3d4e5f60718293a4b5c6d7e8f90'
  const svg = generateVerificationQrSvg(hash, 'REP-7890-XYZ')
  assert.ok(svg.includes('<svg'))
  assert.ok(svg.includes('</svg>'))
  assert.ok(svg.includes('class="qr-code"'))
})

test('generatePrintableForensicHtml embeds vehicle info, hash and safety decision', async () => {
  const html = await generatePrintableForensicHtml(mockReport, {
    inspectorName: 'Lead Forensics Engineer Dr. Tesla',
    inspectorCertNumber: 'CERT-9900-AI',
  })
  assert.ok(html.includes('Audi RS6 Avant'))
  assert.ok(html.includes('WAUZZZF27NA012345'))
  assert.ok(html.includes('SAFE TO DRIVE'))
  assert.ok(html.includes('RETAIL READY'))
  assert.ok(html.includes('Front Lower Splitter'))
  assert.ok(html.includes('Lead Forensics Engineer Dr. Tesla'))
  assert.ok(html.includes('CERT-9900-AI'))
  assert.ok(html.includes('SHA-256 DIGEST:'))
})
