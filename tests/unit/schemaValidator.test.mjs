import assert from 'node:assert/strict'
import test from 'node:test'
import {
  safeExtractJsonFromLlm,
  validateDamageFinding,
  validateInspectionReport,
  validateRiskAssessment,
  validateVehicleProfile,
} from '../../src/services/ai/schemaValidator.ts'

test('Schema Validator — safeExtractJsonFromLlm with Markdown Fences', () => {
  const rawLlmOutput = '```json\n{\n  "status": "GREEN",\n  "count": 42\n}\n```'
  const parsed = safeExtractJsonFromLlm(rawLlmOutput)
  assert.equal(parsed.status, 'GREEN')
  assert.equal(parsed.count, 42)
})

test('Schema Validator — safeExtractJsonFromLlm with Conversational Text Prefix', () => {
  const conversationalOutput = 'Here is your forensic analysis report:\n\n{\n  "vehicle": { "makeModel": "Honda Civic" }\n}\n\nHope this helps!'
  const parsed = safeExtractJsonFromLlm(conversationalOutput)
  assert.equal(parsed.vehicle.makeModel, 'Honda Civic')
})

test('Schema Validator — validateVehicleProfile with Missing Fields', () => {
  const profile = validateVehicleProfile({ makeModel: '  Toyota Tacoma  ', year: 2023 })
  assert.equal(profile.makeModel, 'Toyota Tacoma')
  assert.equal(profile.year, '2023')
  assert.equal(profile.fuelType, 'Gasoline')
  assert.equal(profile.class, 'ECONOMY')
})

test('Schema Validator — GDVF Rule Override: Safety Defect Forces Tow Truck Decision', () => {
  const damages = [
    validateDamageFinding({
      type: 'SAFETY',
      component: 'Front Right Hydraulic Brake Line',
      description: 'Active hydraulic fluid rupture',
      status: 'RED',
    }),
  ]

  const risk = validateRiskAssessment({ finalDecision: 'SAFE TO DRIVE' }, damages)
  assert.equal(risk.finalDecision, 'TOW TRUCK ONLY')
  assert.equal(risk.brakingSystem, true)
})

test('Schema Validator — validateInspectionReport End-to-End Resilience', () => {
  const malformedReport = {
    vehicle: null,
    damages: [{ component: 'Quarter Panel Scrape' }],
    overallHealth: 'invalid-number',
  }

  const report = validateInspectionReport(malformedReport, 'custom-id-999')
  assert.equal(report.id, 'custom-id-999')
  assert.equal(report.vehicle.makeModel, 'Unknown Vehicle')
  assert.equal(report.damages.length, 1)
  assert.equal(report.overallHealth, 70)
  assert.ok(report.timestamp > 0)
})
