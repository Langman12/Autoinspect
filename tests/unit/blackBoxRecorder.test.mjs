import assert from 'node:assert/strict'
import test from 'node:test'
import { blackBoxRecorder } from '../../src/services/blackBoxRecorder.ts'

test('Black Box Recorder — Circular Buffer & Sample Ingestion', () => {
  const initialLength = blackBoxRecorder.getBuffer().length
  const sample = {
    timestamp: Date.now(),
    speedKmh: 80,
    gForceLateral: 0.1,
    gForceLongitudinal: -0.2,
    gForceVertical: 1.0,
    pitchDeg: 0,
    rollDeg: 0,
    rpm: 2500,
    cabinAudioDecibels: 65,
    brakePressureKpa: 0,
  }

  blackBoxRecorder.addSample(sample)
  const buffer = blackBoxRecorder.getBuffer()
  assert.ok(buffer.length >= initialLength)
  assert.equal(buffer[buffer.length - 1].speedKmh, 80)
})

test('Black Box Recorder — Incident Trigger & Lock Event', () => {
  const incident = blackBoxRecorder.triggerIncident('HIGH_G_IMPACT', 2.6)

  assert.ok(incident.id.startsWith('INCIDENT-'))
  assert.equal(incident.triggerType, 'HIGH_G_IMPACT')
  assert.equal(incident.peakGForce, 2.6)
  assert.equal(incident.locked, true)
  assert.ok(incident.postBufferSamples.length > 0, 'Should generate post-buffer timeline samples')

  const incidents = blackBoxRecorder.getIncidents()
  assert.ok(incidents.some((i) => i.id === incident.id))
})
