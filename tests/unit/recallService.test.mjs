import test from 'node:test'
import assert from 'node:assert/strict'

/**
 * Pure NHTSA VIN Validator
 */
function validateVinFormat(vin) {
  if (typeof vin !== 'string') return false
  const trimmed = vin.trim().toUpperCase()
  // 17 characters, alphanumeric excluding I, O, Q
  const vinRegex = /^[A-HJ-NPR-Z0-9]{17}$/
  return vinRegex.test(trimmed)
}

/**
 * NHTSA Recall Record Normalizer
 */
function normalizeRecallData(rawResults) {
  if (!Array.isArray(rawResults)) return []
  return rawResults.map((r) => ({
    campaignNumber: r.NHTSACampaignNumber || r.campaignNumber || 'UNKNOWN',
    manufacturer: r.Manufacturer || r.manufacturer || 'UNKNOWN',
    subject: r.Subject || r.subject || 'Safety Recall Notice',
    component: r.Component || r.component || 'General',
    consequence: r.Consequence || r.consequence || 'Unknown hazard risk',
    remedy: r.Remedy || r.remedy || 'Contact authorized dealership',
    reportDate: r.ReportReceivedDate || r.reportDate || new Date().toISOString(),
    unitsAffected: Number(r.PotentialNumberOfUnitsAffected || r.unitsAffected || 0),
  }))
}

test('Safety & Recall Service — NHTSA Format & Parser', async (t) => {
  await t.test('Valid 17-character VIN passes validation', () => {
    const validVin = '1HGCR2F83HA123456'
    assert.strictEqual(validateVinFormat(validVin), true)
  })

  await t.test('Invalid VIN lengths (< 17 or > 17) are rejected', () => {
    assert.strictEqual(validateVinFormat('1HGCR2F83HA123'), false)
    assert.strictEqual(validateVinFormat('1HGCR2F83HA1234567890'), false)
    assert.strictEqual(validateVinFormat(''), false)
  })

  await t.test('VIN containing illegal characters (I, O, Q) are rejected', () => {
    assert.strictEqual(validateVinFormat('1HGCR2F83HI123456'), false) // Contains 'I'
    assert.strictEqual(validateVinFormat('1HGCR2F83HO123456'), false) // Contains 'O'
    assert.strictEqual(validateVinFormat('1HGCR2F83HQ123456'), false) // Contains 'Q'
  })

  await t.test('Normalizes raw NHTSA API payload with missing keys cleanly', () => {
    const raw = [
      {
        NHTSACampaignNumber: '21V123000',
        Manufacturer: 'HONDA (AMERICAN HONDA MOTOR CO.)',
        Subject: 'FUEL PUMP INOPERATIVE',
        Component: 'FUEL SYSTEM, GASOLINE:DELIVERY:FUEL PUMP',
        Consequence: 'Engine stall may increase risk of crash.',
        Remedy: 'Dealers will replace the fuel pump module free of charge.',
        ReportReceivedDate: '15/03/2021',
        PotentialNumberOfUnitsAffected: '624552'
      },
      {
        // Minimal record
        campaignNumber: '22V999000'
      }
    ]

    const normalized = normalizeRecallData(raw)
    assert.strictEqual(normalized.length, 2)
    assert.strictEqual(normalized[0].campaignNumber, '21V123000')
    assert.strictEqual(normalized[0].unitsAffected, 624552)
    assert.strictEqual(normalized[1].manufacturer, 'UNKNOWN')
    assert.strictEqual(normalized[1].subject, 'Safety Recall Notice')
  })
})
