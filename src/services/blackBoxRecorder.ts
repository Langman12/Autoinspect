import type {
  BlackBoxIncidentEvent,
  BlackBoxTelemetrySample,
} from '../types.ts'

export class BlackBoxRecorderService {
  private bufferSize = 60 // 30 seconds at 2 Hz
  private circularBuffer: BlackBoxTelemetrySample[] = []
  private incidentLogs: BlackBoxIncidentEvent[] = []
  private isRecording = false
  private timer: any = null
  private listeners: Array<(sample: BlackBoxTelemetrySample, incidents: BlackBoxIncidentEvent[]) => void> = []

  // Current vehicle kinetic state for simulation
  private currentSpeed = 65 // km/h
  private currentRpm = 2200
  private gLat = 0.05
  private gLong = 0.02
  private gVert = 1.0

  public startRecording() {
    if (this.isRecording) return
    this.isRecording = true
    let tick = 0

    this.timer = setInterval(() => {
      tick += 0.5
      // Simulating standard road vibrations and mild turns
      const noise = (Math.random() - 0.5) * 0.08
      this.gLat = Math.sin(tick * 0.2) * 0.25 + noise
      this.gLong = Math.sin(tick * 0.1) * 0.15 + noise
      this.gVert = 1.0 + Math.sin(tick * 0.8) * 0.12

      const sample: BlackBoxTelemetrySample = {
        timestamp: Date.now(),
        speedKmh: Math.round(this.currentSpeed + Math.sin(tick * 0.15) * 5),
        gForceLateral: Math.round(this.gLat * 100) / 100,
        gForceLongitudinal: Math.round(this.gLong * 100) / 100,
        gForceVertical: Math.round(this.gVert * 100) / 100,
        pitchDeg: Math.round(this.gLong * 8 * 10) / 10,
        rollDeg: Math.round(this.gLat * 12 * 10) / 10,
        rpm: Math.round(this.currentRpm + Math.sin(tick * 0.3) * 120),
        cabinAudioDecibels: Math.round(62 + Math.sin(tick * 0.5) * 6),
        brakePressureKpa: Math.max(0, Math.round(Math.sin(tick * 0.08) * 400)),
      }

      this.addSample(sample)
    }, 500)
  }

  public stopRecording() {
    this.isRecording = false
    if (this.timer) {
      clearInterval(this.timer)
      this.timer = null
    }
  }

  public addSample(sample: BlackBoxTelemetrySample) {
    this.circularBuffer.push(sample)
    if (this.circularBuffer.length > this.bufferSize) {
      this.circularBuffer.shift()
    }

    // Check for automatic threshold triggers
    if (Math.abs(sample.gForceLongitudinal) > 1.8) {
      this.triggerIncident('HARD_BRAKING', Math.abs(sample.gForceLongitudinal), sample)
    } else if (Math.abs(sample.gForceLateral) > 1.6 || Math.abs(sample.rollDeg) > 35) {
      this.triggerIncident('ROLLOVER_THRESHOLD', Math.abs(sample.gForceLateral), sample)
    }

    this.notify(sample)
  }

  public triggerIncident(
    type: 'HARD_BRAKING' | 'HIGH_G_IMPACT' | 'ROLLOVER_THRESHOLD' | 'SUDDEN_RPM_LOSS',
    peakG: number,
    currentSample?: BlackBoxTelemetrySample
  ): BlackBoxIncidentEvent {
    const triggerSample = currentSample || this.circularBuffer[this.circularBuffer.length - 1] || {
      timestamp: Date.now(),
      speedKmh: 75,
      gForceLateral: 1.95,
      gForceLongitudinal: -2.4,
      gForceVertical: 1.8,
      pitchDeg: -14.2,
      rollDeg: 28.5,
      rpm: 3400,
      cabinAudioDecibels: 94,
      brakePressureKpa: 1450,
    }

    const preBuffer = [...this.circularBuffer]
    // Generate post buffer telemetry after impact
    const postBuffer: BlackBoxTelemetrySample[] = []
    for (let i = 1; i <= 6; i++) {
      postBuffer.push({
        timestamp: triggerSample.timestamp + i * 500,
        speedKmh: Math.max(0, triggerSample.speedKmh - i * 15),
        gForceLateral: (Math.random() - 0.5) * 0.4,
        gForceLongitudinal: (Math.random() - 0.5) * 0.3,
        gForceVertical: 1.0 + (Math.random() - 0.5) * 0.2,
        pitchDeg: (Math.random() - 0.5) * 3,
        rollDeg: (Math.random() - 0.5) * 4,
        rpm: Math.max(0, triggerSample.rpm - i * 500),
        cabinAudioDecibels: Math.max(45, triggerSample.cabinAudioDecibels - i * 8),
        brakePressureKpa: triggerSample.brakePressureKpa,
      })
    }

    const incident: BlackBoxIncidentEvent = {
      id: `INCIDENT-${Date.now().toString(36).toUpperCase()}`,
      timestamp: Date.now(),
      triggerType: type,
      peakGForce: Math.round(peakG * 100) / 100,
      speedAtTriggerKmh: triggerSample.speedKmh,
      preBufferSamples: preBuffer,
      postBufferSamples: postBuffer,
      locked: true,
      status: 'CAPTURED_UNUPLOADED',
    }

    this.incidentLogs.unshift(incident)
    this.notify(triggerSample)
    return incident
  }

  public getBuffer(): BlackBoxTelemetrySample[] {
    return [...this.circularBuffer]
  }

  public getIncidents(): BlackBoxIncidentEvent[] {
    return [...this.incidentLogs]
  }

  public subscribe(
    callback: (sample: BlackBoxTelemetrySample, incidents: BlackBoxIncidentEvent[]) => void
  ): () => void {
    this.listeners.push(callback)
    if (this.circularBuffer.length > 0) {
      callback(this.circularBuffer[this.circularBuffer.length - 1], this.incidentLogs)
    }
    return () => {
      this.listeners = this.listeners.filter((l) => l !== callback)
    }
  }

  private notify(sample: BlackBoxTelemetrySample) {
    for (const listener of this.listeners) {
      listener(sample, this.incidentLogs)
    }
  }
}

export const blackBoxRecorder = new BlackBoxRecorderService()
