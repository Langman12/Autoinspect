import assert from 'node:assert/strict'
import test from 'node:test'

test('Live Video Streamer — Configuration & Frame Rate Calculation', () => {
  const targetFps = 2
  const intervalMs = Math.max(200, Math.round(1000 / targetFps))
  assert.equal(intervalMs, 500, '2 FPS should sample at 500ms intervals')

  const targetFpsFast = 5
  const intervalFastMs = Math.max(200, Math.round(1000 / targetFpsFast))
  assert.equal(intervalFastMs, 200, '5 FPS should sample at 200ms intervals')
})

test('Live Video Streamer — Frame Base64 Sanitization Format', () => {
  const sampleDataUrl = 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEASABIAAD'
  const rawBase64 = sampleDataUrl.replace(/^data:image\/jpeg;base64,/, '')

  assert.equal(rawBase64.startsWith('data:'), false)
  assert.equal(rawBase64.startsWith('/9j/'), true)
})
