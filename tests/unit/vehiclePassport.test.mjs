import assert from 'node:assert/strict'
import test from 'node:test'
import { vehiclePassportService } from '../../src/services/vehiclePassportService.ts'

test('Vehicle Passport — SHA-256 Hashing & Asset Digestion', async () => {
  const hash1 = await vehiclePassportService.computeSha256('TEST_STRING_A')
  const hash2 = await vehiclePassportService.computeSha256('TEST_STRING_A')
  const hash3 = await vehiclePassportService.computeSha256('TEST_STRING_B')

  assert.equal(hash1, hash2, 'Identical inputs must yield identical SHA-256 hashes')
  assert.notEqual(hash1, hash3, 'Distinct inputs must yield distinct hashes')
  assert.equal(hash1.length, 64, 'SHA-256 hex string should be 64 characters long')
})

test('Vehicle Passport — EXIF Tamper Audit Checks', () => {
  const mockReport = {
    id: 'RPT-TEST-01',
    timestamp: Date.now(),
    vehicle: { makeModel: 'Test Car', vin: '12345678901234567' },
    damages: [],
    overallHealth: 92,
    confidenceScore: 98,
    summary: 'Clean',
    priorRepairDetected: false,
    adasCalibrationRequired: false,
    forensicVerdict: 'CLEAN',
    finalRecommendation: 'RETAIL READY',
    riskAssessment: {
      brakingSystem: true,
      steeringSuspension: true,
      fireRisk: false,
      structuralIntegrity: true,
      finalDecision: 'SAFE TO DRIVE',
      rationale: 'OK',
    },
  }

  const audits = vehiclePassportService.runExifTamperAudit(mockReport)
  assert.ok(audits.length >= 4, 'Should execute all 4 EXIF anomaly checks')
  assert.ok(audits.every((a) => a.passed), 'Clean report should pass all EXIF audits')
})

test('Vehicle Passport — End-to-End Passport Generation', async () => {
  const mockReport = {
    id: 'RPT-TEST-02',
    timestamp: Date.now(),
    vehicle: { makeModel: 'Interceptor AWD', vin: '1HGCR2F8XHA049211', year: '2024', mileage: '50000' },
    damages: [],
    overallHealth: 90,
    confidenceScore: 99,
    summary: 'Verified chassis',
    priorRepairDetected: false,
    adasCalibrationRequired: false,
    forensicVerdict: 'PASS',
    finalRecommendation: 'RETAIL READY',
    riskAssessment: {
      brakingSystem: true,
      steeringSuspension: true,
      fireRisk: false,
      structuralIntegrity: true,
      finalDecision: 'SAFE TO DRIVE',
      rationale: 'OK',
    },
  }

  const passport = await vehiclePassportService.generatePassport(mockReport, [
    { data: 'RAW_IMAGE_VIN', mimeType: 'image/jpeg', label: 'VIN Tag' },
  ])

  assert.ok(passport.passportId.startsWith('PASSPORT-'))
  assert.equal(passport.vin, '1HGCR2F8XHA049211')
  assert.equal(passport.forensicGrade, 'AUTHENTIC_CERTIFIED')
  assert.equal(passport.assetDigests.length, 1)
  assert.ok(passport.signature.blockchainHash.startsWith('0x'))
  assert.ok(passport.qrCodeVerificationPayload.includes('https://autoguard.ai/verify/'))
})
