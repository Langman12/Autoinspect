import test from 'node:test'
import assert from 'node:assert/strict'

/**
 * Vehicle Forensics Pipeline Simulation
 */
class ForensicPipelineSimulator {
  analyzeAcousticSpectrum(dominantFrequenciesHz) {
    // 200Hz - 800Hz = Engine Rod Knock
    // 2000Hz - 8000Hz = Bearing Whir / Belt Squeal
    const issues = []
    let mechanicalScore = 100

    for (const freq of dominantFrequenciesHz) {
      if (freq >= 200 && freq <= 800) {
        issues.push({
          type: 'ENGINE_ROD_KNOCK',
          freqHz: freq,
          severity: 'HIGH',
          estimatedRepairUsd: 2500
        })
        mechanicalScore -= 35
      } else if (freq >= 2000 && freq <= 8000) {
        issues.push({
          type: 'BEARING_OR_PULLEY_WEAR',
          freqHz: freq,
          severity: 'MEDIUM',
          estimatedRepairUsd: 450
        })
        mechanicalScore -= 15
      }
    }

    return {
      mechanicalScore: Math.max(0, mechanicalScore),
      issues
    }
  }

  calculateOverallGrade(bodyScore, mechanicalScore, undercarriageScore) {
    const composite = (bodyScore * 0.35) + (mechanicalScore * 0.45) + (undercarriageScore * 0.20)
    let grade = 'F'
    if (composite >= 90) grade = 'A'
    else if (composite >= 80) grade = 'B'
    else if (composite >= 70) grade = 'C'
    else if (composite >= 60) grade = 'D'

    return {
      compositeScore: Math.round(composite),
      grade
    }
  }
}

test('Forensic Pipeline Integration — Acoustic & Multi-Phase Analysis', async (t) => {
  const pipeline = new ForensicPipelineSimulator()

  await t.test('Clean running engine produces no mechanical knock alerts and 100% acoustic score', () => {
    // Frequencies outside defect thresholds (e.g. idle exhaust rumble 50Hz, induction hum 120Hz)
    const acousticResult = pipeline.analyzeAcousticSpectrum([50, 110, 125])
    assert.strictEqual(acousticResult.mechanicalScore, 100)
    assert.strictEqual(acousticResult.issues.length, 0)

    const grade = pipeline.calculateOverallGrade(95, acousticResult.mechanicalScore, 90)
    assert.strictEqual(grade.grade, 'A')
    assert.strictEqual(grade.compositeScore, 96)
  })

  await t.test('Defective engine with 450Hz rod knock triggers severe mechanical downgrade', () => {
    // 450Hz rod knock detected in spectral analysis
    const acousticResult = pipeline.analyzeAcousticSpectrum([450, 60])
    assert.strictEqual(acousticResult.mechanicalScore, 65)
    assert.strictEqual(acousticResult.issues.length, 1)
    assert.strictEqual(acousticResult.issues[0].type, 'ENGINE_ROD_KNOCK')
    assert.strictEqual(acousticResult.issues[0].estimatedRepairUsd, 2500)

    const grade = pipeline.calculateOverallGrade(90, acousticResult.mechanicalScore, 85)
    assert.strictEqual(grade.grade, 'C') // 90*0.35 (31.5) + 65*0.45 (29.25) + 85*0.20 (17) = 77.75 -> C
    assert.strictEqual(grade.compositeScore, 78)
  })
})
