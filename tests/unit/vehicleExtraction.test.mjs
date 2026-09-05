import test from 'node:test'
import assert from 'node:assert/strict'

/**
 * Pure Vehicle Details & VIN Parser Logic
 */
function parseVehicleExtractionResponse(rawText) {
  if (!rawText) return null

  // 1. Try structured JSON match
  const jsonMatch = rawText.match(/\{[\s\S]*\}/)
  if (jsonMatch) {
    try {
      const parsed = JSON.parse(jsonMatch[0])
      if (parsed.vin) {
        parsed.vin = parsed.vin.replace(/[^A-HJ-NPR-Z0-9]/gi, '').toUpperCase()
      }
      return parsed
    } catch {}
  }

  // 2. Regex fallback for 17-char VIN
  const vinMatch = rawText.match(/\b[A-HJ-NPR-Z0-9]{17}\b/i)
  const yearMatch = rawText.match(/\b(19\d\d|20[0-2]\d)\b/)
  const knownBrands = ['Tesla', 'Toyota', 'Ford', 'BMW', 'Mercedes', 'Honda', 'Chevrolet', 'Audi', 'Porsche']
  let detectedBrand = ''
  for (const brand of knownBrands) {
    if (new RegExp(`\\b${brand}\\b`, 'i').test(rawText)) {
      detectedBrand = brand
      break
    }
  }

  if (vinMatch || detectedBrand || yearMatch) {
    return {
      vin: vinMatch ? vinMatch[0].toUpperCase() : undefined,
      makeModel: detectedBrand ? `${detectedBrand} Vehicle` : undefined,
      year: yearMatch ? yearMatch[0] : undefined,
    }
  }

  return null
}

test('Vehicle Detail Extraction from Photos — VIN & Spec Parser', async (t) => {
  await t.test('Successfully extracts structured JSON payload with VIN and Model', () => {
    const rawAiOutput = `Based on the door jamb certification placard in this photo:
\`\`\`json
{
  "vin": "5YJ3E1EB8NF123456",
  "makeModel": "Tesla Model Y Long Range",
  "year": "2023",
  "mileage": "32,000 km",
  "fuelType": "Electric (EV)",
  "class": "LUXURY"
}
\`\`\`
`
    const extracted = parseVehicleExtractionResponse(rawAiOutput)
    assert.ok(extracted, 'Should extract valid vehicle object')
    assert.strictEqual(extracted.vin, '5YJ3E1EB8NF123456')
    assert.strictEqual(extracted.makeModel, 'Tesla Model Y Long Range')
    assert.strictEqual(extracted.year, '2023')
    assert.strictEqual(extracted.fuelType, 'Electric (EV)')
    assert.strictEqual(extracted.class, 'LUXURY')
  })

  await t.test('Cleans hyphens and whitespace from raw VIN strings', () => {
    const rawAiOutput = `{"vin": "WAU-ZZZ-F27-LN-123456", "makeModel": "Audi RS6"}`
    const extracted = parseVehicleExtractionResponse(rawAiOutput)
    assert.strictEqual(extracted.vin, 'WAUZZZF27LN123456')
  })

  await t.test('Regex fallback captures 17-char VIN in unformatted text', () => {
    const unformattedAiOutput = `I identified the vehicle VIN stamped on the lower windshield corner as 1FTFW1ED4MF987654 for this Ford Ranger.`
    const extracted = parseVehicleExtractionResponse(unformattedAiOutput)
    assert.ok(extracted)
    assert.strictEqual(extracted.vin, '1FTFW1ED4MF987654')
  })

  await t.test('Extracts brand and approximate year from unformatted exterior photo description', () => {
    const aiOutput = 'This photo shows a 2022 Porsche 911 GT3 in shark blue parked in a driveway.'
    const extracted = parseVehicleExtractionResponse(aiOutput)
    assert.ok(extracted)
    assert.strictEqual(extracted.makeModel, 'Porsche Vehicle')
    assert.strictEqual(extracted.year, '2022')
  })

  await t.test('Returns null when no VIN or vehicle metadata exists in output', () => {
    const emptyOutput = 'The photo is too blurry or is just a close up of the grass.'
    const extracted = parseVehicleExtractionResponse(emptyOutput)
    assert.strictEqual(extracted, null)
  })
})
