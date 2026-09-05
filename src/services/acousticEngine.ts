/**
 * AutoGuard AI — Acoustic Diagnostic Intelligence & Frequency Classifier Engine
 * 
 * Complies with GDVF Protocol 4 (Acoustic FFT Analysis & Harmonic Anomaly Detection)
 * Frequency Range: 20 Hz to 20,000 Hz (Highpass filtered at 20 Hz to eliminate DC & sub-sonic handling rumble).
 * 
 * Research Reference:
 * - Kararti, B. (Nov 2024). "Frequency Analysis of Car Engine Sounds and Fault Detection with Machine Learning."
 * - Randall, R. B., & Antoni, J. (2011). "Rolling element bearing diagnostics—A tutorial." Mechanical Systems and Signal Processing.
 * - Smith, S. W. (2002). "Digital Signal Processing: A Practical Guide for Engineers and Scientists."
 * 
 * Lead Architect: Andries Liebenberg
 */

export type AcousticBandKey = 'sub_bass' | 'reciprocating' | 'valvetrain' | 'bearing' | 'high_freq'

export interface AcousticBandProfile {
  key: AcousticBandKey
  name: string
  minHz: number
  maxHz: number
  colorHex: string
  typicalComponents: string[]
  commonFaults: string[]
  baseSeverity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
}

export const ACOUSTIC_BANDS: Record<AcousticBandKey, AcousticBandProfile> = {
  sub_bass: {
    key: 'sub_bass',
    name: '20Hz – 200Hz [Structural & Exhaust Dynamics]',
    minHz: 20,
    maxHz: 200,
    colorHex: '#ef4444',
    typicalComponents: ['Exhaust System', 'Subframe Bushings', 'Engine Mounts', 'Dual-Mass Flywheel'],
    commonFaults: [
      'Exhaust drone or ruptured flex pipe',
      'Structural chassis resonance from collapsed motor mount',
      'Loose catalytic converter heat shield',
      'Dual-mass flywheel damping spring failure',
    ],
    baseSeverity: 'MEDIUM',
  },
  reciprocating: {
    key: 'reciprocating',
    name: '200Hz – 800Hz [Combustion & Reciprocating Assembly]',
    minHz: 200,
    maxHz: 800,
    colorHex: '#f97316',
    typicalComponents: ['Connecting Rod Bearings', 'Piston Skirts', 'Crankshaft Main Journals', 'Wrist Pins'],
    commonFaults: [
      'Connecting rod knock (bearing oil starvation)',
      'Piston slap on cylinder wall (cold bore clearance)',
      'Main crankshaft journal bearing play',
      'Detonation / pre-ignition knock acoustic signature',
    ],
    baseSeverity: 'CRITICAL',
  },
  valvetrain: {
    key: 'valvetrain',
    name: '800Hz – 2.0kHz [Valvetrain & Auxiliary Friction]',
    minHz: 800,
    maxHz: 2000,
    colorHex: '#eab308',
    typicalComponents: ['Hydraulic Lifters / Tappets', 'Serpentine Drive Belt', 'CV Joints', 'Timing Chain'],
    commonFaults: [
      'Hydraulic lifter / lash adjuster ticking',
      'Serpentine belt slip / dry glaze squeak',
      'CV joint clicking during articulated steering',
      'Timing chain guide wear / tensioner slack',
    ],
    baseSeverity: 'HIGH',
  },
  bearing: {
    key: 'bearing',
    name: '2.0kHz – 8.0kHz [Rotational Bearings & Diode Whine]',
    minHz: 2000,
    maxHz: 8000,
    colorHex: '#10b981',
    typicalComponents: ['Wheel Hub Bearings', 'Alternator Rectifier', 'Water Pump Impeller', 'A/C Compressor'],
    commonFaults: [
      'Wheel hub bearing raceway spalling / speed-dependent growl',
      'Alternator phase diode ripple whining',
      'Water pump shaft bearing cavitation',
      'Power steering vane pump cavitation / fluid aeration',
    ],
    baseSeverity: 'HIGH',
  },
  high_freq: {
    key: 'high_freq',
    name: '8.0kHz – 20.0kHz [High-Frequency Gas Dynamics & Friction]',
    minHz: 8000,
    maxHz: 20000,
    colorHex: '#06b6d4',
    typicalComponents: ['Turbocharger Impeller', 'Intake / Vacuum Manifold', 'Brake Friction Pads'],
    commonFaults: [
      'Turbocharger compressor wheel rub / shaft imbalance whistle',
      'Pressurized boost pipe / vacuum line micro-tear hiss',
      'Semi-metallic brake pad surface glazing squeal',
      'EGR valve high-pressure seat bypass leak',
    ],
    baseSeverity: 'MEDIUM',
  },
}

export interface AcousticFeatureVector {
  dominantHz: number
  peakLevel: number
  spectralCentroid: number
  spectralFlatness: number
  spectralBandwidth: number
  spectralEntropy: number
  zeroCrossingRate: number
  harmonicToNoiseRatioDb: number
  thdEstimate: number
  melEnergies: number[]
  bandEnergy: {
    sub_bass: number
    reciprocating: number
    valvetrain: number
    bearing: number
    high_freq: number
  }
}

export interface AcousticDiagnosticResult {
  dominantHz: number
  peakLevel: number
  bandKey: AcousticBandKey
  bandName: string
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
  detectedFault: string
  probableCauses: string[]
  recommendedAction: string
  confidenceScore: number
  features?: AcousticFeatureVector
}

// -------------------------------------------------------------------------------------------------
// Digital Signal Processing (DSP) Feature Extractors
// -------------------------------------------------------------------------------------------------

/**
 * Compute Spectral Centroid (Center of Mass of the frequency spectrum)
 * Indicator of brightness / high-frequency acoustic distribution.
 */
export function computeSpectralCentroid(
  fftData: Uint8Array | number[],
  sampleRate: number = 44100
): number {
  const len = fftData.length
  if (len === 0) return 0

  const binWidth = (sampleRate / 2) / len
  let weightedSum = 0
  let totalMagnitude = 0

  for (let i = 0; i < len; i++) {
    const magnitude = fftData[i]
    const freq = i * binWidth
    weightedSum += freq * magnitude
    totalMagnitude += magnitude
  }

  return totalMagnitude > 0 ? Math.round(weightedSum / totalMagnitude) : 0
}

/**
 * Compute Spectral Flatness (Wiener entropy)
 * Ratio of geometric mean to arithmetic mean of power spectrum: ~0 for pure tones / resonant knock, ~1 for white noise.
 */
export function computeSpectralFlatness(fftData: Uint8Array | number[]): number {
  const len = fftData.length
  if (len === 0) return 0

  const epsilon = 1e-8
  let logSum = 0
  let linearSum = 0

  for (let i = 0; i < len; i++) {
    const norm = fftData[i] / 255.0
    const power = (norm * norm) + epsilon
    logSum += Math.log(power)
    linearSum += power
  }

  const geometricMean = Math.exp(logSum / len)
  const arithmeticMean = linearSum / len

  if (arithmeticMean === 0) return 0
  const flatness = geometricMean / arithmeticMean
  return Math.max(0, Math.min(1, parseFloat(flatness.toFixed(4))))
}


/**
 * Compute Spectral Bandwidth / Spread around the Spectral Centroid
 */
export function computeSpectralBandwidth(
  fftData: Uint8Array | number[],
  centroidHz: number,
  sampleRate: number = 44100
): number {
  const len = fftData.length
  if (len === 0) return 0

  const binWidth = (sampleRate / 2) / len
  let weightedVariance = 0
  let totalMagnitude = 0

  for (let i = 0; i < len; i++) {
    const magnitude = fftData[i]
    const freq = i * binWidth
    const diff = freq - centroidHz
    weightedVariance += (diff * diff) * magnitude
    totalMagnitude += magnitude
  }

  return totalMagnitude > 0 ? Math.round(Math.sqrt(weightedVariance / totalMagnitude)) : 0
}

/**
 * Compute Zero-Crossing Rate (ZCR) for time-domain or reconstructed acoustic frames
 */
export function computeZeroCrossingRate(
  signal: Uint8Array | number[] | Float32Array
): number {
  const len = signal.length
  if (len < 2) return 0

  let zeroCrossings = 0
  for (let i = 1; i < len; i++) {
    const prev = signal[i - 1] - 128 // Center around zero if uint8
    const curr = signal[i] - 128
    if ((prev >= 0 && curr < 0) || (prev < 0 && curr >= 0)) {
      zeroCrossings++
    }
  }

  return parseFloat((zeroCrossings / (len - 1)).toFixed(4))
}

/**
 * Compute Spectral Entropy (Measure of acoustic spectral complexity & dispersion)
 */
export function computeSpectralEntropy(fftData: Uint8Array | number[]): number {
  const len = fftData.length
  if (len === 0) return 0

  let totalMagnitude = 0
  for (let i = 0; i < len; i++) {
    totalMagnitude += fftData[i]
  }

  if (totalMagnitude === 0) return 0

  let entropy = 0
  for (let i = 0; i < len; i++) {
    const p = fftData[i] / totalMagnitude
    if (p > 1e-7) {
      entropy -= p * Math.log2(p)
    }
  }

  const maxEntropy = Math.log2(len)
  return parseFloat((entropy / maxEntropy).toFixed(4))
}

/**
 * Compute Harmonic-to-Noise Ratio (HNR in dB) around the dominant harmonic peaks
 */
export function computeHarmonicToNoiseRatio(
  fftData: Uint8Array | number[],
  dominantBin: number
): number {
  const len = fftData.length
  if (len === 0 || dominantBin <= 0) return 0

  let harmonicEnergy = 0
  let noiseEnergy = 0

  // Consider harmonics: 1x, 2x, 3x, 4x
  const harmonicBins = new Set([
    dominantBin,
    dominantBin * 2,
    dominantBin * 3,
    dominantBin * 4,
  ])

  for (let i = 0; i < len; i++) {
    const val = fftData[i]
    let isHarmonic = false
    for (const hBin of harmonicBins) {
      if (Math.abs(i - hBin) <= 1 && hBin < len) {
        isHarmonic = true
        break
      }
    }

    if (isHarmonic) {
      harmonicEnergy += val * val
    } else {
      noiseEnergy += val * val
    }
  }

  if (noiseEnergy === 0) return 40 // Peak clean SNR
  const ratio = harmonicEnergy / (noiseEnergy + 1e-5)
  const hnrDb = 10 * Math.log10(ratio)
  return parseFloat(Math.max(-20, Math.min(50, hnrDb)).toFixed(1))
}

/**
 * Convert Hertz to Mel Scale
 */
export function hzToMel(hz: number): number {
  return 2595 * Math.log10(1 + hz / 700)
}

/**
 * Convert Mel Scale to Hertz
 */
export function melToHz(mel: number): number {
  return 700 * (Math.pow(10, mel / 2595) - 1)
}

/**
 * Compute 13-Band Mel Filterbank Energies (MFCC front-end approximation)
 */
export function computeMelFilterbankEnergy(
  fftData: Uint8Array | number[],
  sampleRate: number = 44100,
  numFilters: number = 13
): number[] {
  const len = fftData.length
  if (len === 0) return new Array(numFilters).fill(0)

  const minMel = hzToMel(20)
  const maxMel = hzToMel(sampleRate / 2)
  const melStep = (maxMel - minMel) / (numFilters + 1)

  const melPoints = Array.from({ length: numFilters + 2 }, (_, i) => minMel + i * melStep)
  const hzPoints = melPoints.map(melToHz)
  const binPoints = hzPoints.map((hz) => Math.floor((hz / (sampleRate / 2)) * len))

  const energies: number[] = []

  for (let m = 1; m <= numFilters; m++) {
    const startBin = binPoints[m - 1]
    const centerBin = binPoints[m]
    const endBin = binPoints[m + 1]

    let filterEnergy = 0
    let weightSum = 0

    for (let k = startBin; k <= endBin; k++) {
      if (k >= 0 && k < len) {
        let weight = 0
        if (k < centerBin && centerBin > startBin) {
          weight = (k - startBin) / (centerBin - startBin)
        } else if (k >= centerBin && endBin > centerBin) {
          weight = (endBin - k) / (endBin - centerBin)
        }
        filterEnergy += fftData[k] * weight
        weightSum += weight
      }
    }

    const avgEnergy = weightSum > 0 ? filterEnergy / weightSum : 0
    energies.push(parseFloat(((avgEnergy / 255) * 100).toFixed(1)))
  }

  return energies
}

/**
 * Extract complete multi-dimensional acoustic feature vector from spectral and time data.
 */
export function extractAcousticFeatureVector(
  fftData: Uint8Array | number[],
  sampleRate: number = 44100,
  timeDomainData?: Uint8Array | number[] | Float32Array
): AcousticFeatureVector {
  const len = fftData.length
  if (len === 0) {
    return {
      dominantHz: 0,
      peakLevel: 0,
      spectralCentroid: 0,
      spectralFlatness: 0,
      spectralBandwidth: 0,
      spectralEntropy: 0,
      zeroCrossingRate: 0,
      harmonicToNoiseRatioDb: 0,
      thdEstimate: 0,
      melEnergies: new Array(13).fill(0),
      bandEnergy: { sub_bass: 0, reciprocating: 0, valvetrain: 0, bearing: 0, high_freq: 0 },
    }
  }

  const nyquist = sampleRate / 2
  const binWidth = nyquist / len

  let maxVal = 0
  let maxBin = 0
  let totalEnergy = 0

  const energyBuckets = { sub_bass: 0, reciprocating: 0, valvetrain: 0, bearing: 0, high_freq: 0 }

  for (let i = 0; i < len; i++) {
    const val = fftData[i]
    totalEnergy += val
    if (val > maxVal) {
      maxVal = val
      maxBin = i
    }
    const freq = i * binWidth
    if (freq <= 200) energyBuckets.sub_bass += val
    else if (freq <= 800) energyBuckets.reciprocating += val
    else if (freq <= 2000) energyBuckets.valvetrain += val
    else if (freq <= 8000) energyBuckets.bearing += val
    else energyBuckets.high_freq += val
  }

  const dominantHz = Math.round(maxBin * binWidth)
  const peakLevel = Math.round((maxVal / 255) * 100)
  const safeTotal = totalEnergy || 1

  const bandEnergy = {
    sub_bass: Math.round((energyBuckets.sub_bass / safeTotal) * 100),
    reciprocating: Math.round((energyBuckets.reciprocating / safeTotal) * 100),
    valvetrain: Math.round((energyBuckets.valvetrain / safeTotal) * 100),
    bearing: Math.round((energyBuckets.bearing / safeTotal) * 100),
    high_freq: Math.round((energyBuckets.high_freq / safeTotal) * 100),
  }

  const spectralCentroid = computeSpectralCentroid(fftData, sampleRate)
  const spectralFlatness = computeSpectralFlatness(fftData)
  const spectralBandwidth = computeSpectralBandwidth(fftData, spectralCentroid, sampleRate)
  const spectralEntropy = computeSpectralEntropy(fftData)
  const zeroCrossingRate = timeDomainData ? computeZeroCrossingRate(timeDomainData) : 0
  const harmonicToNoiseRatioDb = computeHarmonicToNoiseRatio(fftData, maxBin)
  const melEnergies = computeMelFilterbankEnergy(fftData, sampleRate, 13)

  // 2x and 3x harmonics
  const h2Bin = maxBin * 2
  const h3Bin = maxBin * 3
  const harmonicEnergy = (h2Bin < len ? fftData[h2Bin] : 0) + (h3Bin < len ? fftData[h3Bin] : 0)
  const thdEstimate = maxVal > 0 ? Math.min(100, Math.round((harmonicEnergy / maxVal) * 100)) : 0

  return {
    dominantHz,
    peakLevel,
    spectralCentroid,
    spectralFlatness,
    spectralBandwidth,
    spectralEntropy,
    zeroCrossingRate,
    harmonicToNoiseRatioDb,
    thdEstimate,
    melEnergies,
    bandEnergy,
  }
}

/**
 * Classify a dominant acoustic frequency and peak level into mechanical diagnostics.
 */
export function classifyAcousticFrequency(
  dominantHz: number,
  peakLevel: number,
  harmonics: number[] = [],
  features?: AcousticFeatureVector
): AcousticDiagnosticResult {
  const level = Math.max(0, Math.min(100, peakLevel))
  const hz = Math.max(0, Math.round(dominantHz))

  // Ambient or very low signal condition
  if (level < 15 || hz < 20) {
    return {
      dominantHz: hz,
      peakLevel: level,
      bandKey: 'sub_bass',
      bandName: 'Ambient / Background Noise (Below Threshold)',
      severity: 'LOW',
      detectedFault: 'No anomalous acoustic signature detected',
      probableCauses: ['Normal engine idling', 'Quiet ambient cabin acoustics'],
      recommendedAction: 'Maintain baseline monitoring during test drive.',
      confidenceScore: 95,
      features,
    }
  }

  let bandProfile: AcousticBandProfile
  let detectedFault = ''
  let probableCauses: string[] = []
  let recommendedAction = ''
  let severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' = 'LOW'

  if (hz <= 200) {
    bandProfile = ACOUSTIC_BANDS.sub_bass
    severity = level > 65 ? 'HIGH' : 'MEDIUM'
    detectedFault = 'Low-Frequency Structural Resonance / Exhaust Rumble'
    probableCauses = [
      'Cracked exhaust flex joint or loose heat shield',
      'Collapsed hydraulic engine or transmission mount',
      'Subframe bushing deterioration causing chassis vibration',
    ]
    recommendedAction = 'Inspect exhaust hangers, shields, and hydraulic engine mounts on lift.'
  } else if (hz <= 800) {
    bandProfile = ACOUSTIC_BANDS.reciprocating
    severity = level > 40 ? 'CRITICAL' : 'HIGH'
    detectedFault = 'Reciprocating Assembly Knock / Piston Slap Anomaly'
    probableCauses = [
      'Connecting rod big-end bearing clearance excess',
      'Piston skirt slap against cylinder wall',
      'Wrist pin bushing free play under load',
    ]
    recommendedAction = 'CRITICAL: Halt high-load testing. Check engine oil level and oil filter for copper/brass bronze shavings.'
  } else if (hz <= 2000) {
    bandProfile = ACOUSTIC_BANDS.valvetrain
    severity = level > 60 ? 'HIGH' : 'MEDIUM'
    detectedFault = 'Valvetrain Chatter / Auxiliary Friction Harmonic'
    probableCauses = [
      'Hydraulic valve lifter bleed-down / stuck plunger',
      'Auxiliary serpentine belt misalignment or tensioner pulley slip',
      'CV joint needle bearing wear during rotation',
    ]
    recommendedAction = 'Verify engine oil viscosity/pressure and inspect drive belts and CV boots.'
  } else if (hz <= 8000) {
    bandProfile = ACOUSTIC_BANDS.bearing
    severity = level > 50 ? 'HIGH' : 'MEDIUM'
    detectedFault = 'Rotational Bearing Wear / Alternator Electrical Whine'
    probableCauses = [
      'Wheel hub bearing raceway micro-spalling',
      'Alternator internal diode bridge ripple resonance',
      'A/C compressor clutch bearing or water pump bearing wear',
    ]
    recommendedAction = 'Isolate using automotive mechanics stethoscope while varying wheel speed and electrical load.'
  } else {
    bandProfile = ACOUSTIC_BANDS.high_freq
    severity = level > 60 ? 'HIGH' : 'MEDIUM'
    detectedFault = 'High-Frequency Turbo Whistle / Pneumatic Boost Leak'
    probableCauses = [
      'Turbocharger compressor wheel balance or turbine seal blow-by',
      'Intercooler pressurized boost hose pinhole leak',
      'Brake pad ceramic/metallic glaze squeal',
    ]
    recommendedAction = 'Perform smoke pressure test on induction system and inspect turbo shaft play.'
  }

  // Refine confidence with spectral flatness and harmonic features if present
  const harmonicBonus = harmonics.length > 0 ? 8 : 0
  const flatnessPenalty = features && features.spectralFlatness > 0.8 ? -10 : 0
  const confidenceScore = Math.min(
    99,
    Math.max(50, Math.round(55 + (level * 0.35) + harmonicBonus + flatnessPenalty))
  )

  return {
    dominantHz: hz,
    peakLevel: level,
    bandKey: bandProfile.key,
    bandName: bandProfile.name,
    severity,
    detectedFault,
    probableCauses,
    recommendedAction,
    confidenceScore,
    features,
  }
}

/**
 * Analyze an entire FFT buffer and compute band energy distribution,
 * dominant harmonic, THD approximation, and mechanical risk score.
 */
export function analyzeSpectrumDistribution(
  fftData: Uint8Array | number[],
  sampleRate: number = 44100,
  timeDomainData?: Uint8Array | number[] | Float32Array
) {
  const bufferLength = fftData.length
  if (bufferLength === 0) {
    const defaultDiag = classifyAcousticFrequency(0, 0)
    return {
      dominantHz: 0,
      peakLevel: 0,
      bandEnergy: { sub_bass: 0, reciprocating: 0, valvetrain: 0, bearing: 0, high_freq: 0 },
      diagnosis: defaultDiag,
      thdEstimate: 0,
      riskScore: 0,
      featureVector: extractAcousticFeatureVector(fftData, sampleRate),
    }
  }

  const featureVector = extractAcousticFeatureVector(fftData, sampleRate, timeDomainData)
  const nyquist = sampleRate / 2
  const binWidth = nyquist / bufferLength
  const maxBin = Math.floor(featureVector.dominantHz / binWidth)

  // Harmonic detection for dominant bin (2x, 3x)
  const harmonics: number[] = []
  const h2Bin = maxBin * 2
  const h3Bin = maxBin * 3
  if (h2Bin < bufferLength && fftData[h2Bin] > (featureVector.peakLevel * 2.55) * 0.25) {
    harmonics.push(Math.round(h2Bin * binWidth))
  }
  if (h3Bin < bufferLength && fftData[h3Bin] > (featureVector.peakLevel * 2.55) * 0.2) {
    harmonics.push(Math.round(h3Bin * binWidth))
  }

  const diagnosis = classifyAcousticFrequency(
    featureVector.dominantHz,
    featureVector.peakLevel,
    harmonics,
    featureVector
  )

  // Mechanical Risk Score (0 - 100)
  let riskScore = 0
  if (featureVector.peakLevel >= 15) {
    if (diagnosis.severity === 'CRITICAL') riskScore = Math.min(100, 75 + featureVector.peakLevel * 0.25)
    else if (diagnosis.severity === 'HIGH') riskScore = Math.min(85, 50 + featureVector.peakLevel * 0.3)
    else if (diagnosis.severity === 'MEDIUM') riskScore = Math.min(60, 25 + featureVector.peakLevel * 0.25)
    else riskScore = Math.min(30, featureVector.peakLevel * 0.2)
  }

  return {
    dominantHz: featureVector.dominantHz,
    peakLevel: featureVector.peakLevel,
    bandEnergy: featureVector.bandEnergy,
    diagnosis,
    thdEstimate: featureVector.thdEstimate,
    riskScore: Math.round(riskScore),
    featureVector,
  }
}

/**
 * Compute overall Acoustic Mechanical Health Index and plain-English summary.
 */
export function computeAcousticHealthScore(
  dominantHz: number,
  peakLevel: number,
  thd: number = 0
): { healthScore: number; status: 'OPTIMAL' | 'MODERATE' | 'CRITICAL'; summary: string } {
  const diag = classifyAcousticFrequency(dominantHz, peakLevel)

  if (diag.severity === 'LOW') {
    return {
      healthScore: 98,
      status: 'OPTIMAL',
      summary: 'Acoustic emissions are within baseline nominal tolerances. No mechanical knock or bearing fatigue detected.',
    }
  }

  if (diag.severity === 'CRITICAL') {
    return {
      healthScore: Math.max(10, 45 - Math.round(peakLevel * 0.35)),
      status: 'CRITICAL',
      summary: `ALERT: Significant acoustic anomaly in ${diag.bandName}. Detected: ${diag.detectedFault}.`,
    }
  }

  if (diag.severity === 'HIGH') {
    return {
      healthScore: Math.max(40, 75 - Math.round(peakLevel * 0.3 + thd * 0.1)),
      status: 'MODERATE',
      summary: `ELEVATED: Harmonic vibration detected in ${diag.bandName}. ${diag.detectedFault}.`,
    }
  }

  return {
    healthScore: Math.max(65, 88 - Math.round(peakLevel * 0.2)),
    status: 'MODERATE',
    summary: `MODERATE: Minor acoustic signature in ${diag.bandName}. ${diag.detectedFault}.`,
  }
}
