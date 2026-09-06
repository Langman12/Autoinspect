import assert from 'node:assert/strict'
import test from 'node:test'
import { probeHardwareCapabilities } from '../../src/hooks/useHardwareCapabilities.ts'

test('Hardware Capabilities — Null/Server Environment Fallback', () => {
  const result = probeHardwareCapabilities(null)

  assert.equal(result.bluetooth.supported, false)
  assert.equal(result.serial.supported, false)
  assert.equal(result.audioDsp.supported, false)
  assert.equal(result.camera.supported, false)
  assert.equal(result.webXr.supported, false)
  assert.equal(result.haptics.supported, false)
  assert.equal(result.geolocation.supported, false)
  assert.equal(result.serviceWorker.supported, false)
  assert.equal(result.isAllEssentialSupported, false)
  assert.ok(result.lastChecked > 0)
})

test('Hardware Capabilities — Modern Chromium Browser Mock Environment', () => {
  const mockNavigator = {
    bluetooth: {},
    serial: {},
    mediaDevices: {
      getUserMedia: () => Promise.resolve({}),
    },
    xr: {},
    vibrate: () => true,
    geolocation: {},
    serviceWorker: {},
  }

  const result = probeHardwareCapabilities(mockNavigator)

  assert.equal(result.bluetooth.supported, true)
  assert.equal(result.bluetooth.permissionState, 'prompt')
  assert.equal(result.serial.supported, true)
  assert.equal(result.audioDsp.supported, true)
  assert.equal(result.camera.supported, true)
  assert.equal(result.webXr.supported, true)
  assert.equal(result.haptics.supported, true)
  assert.equal(result.geolocation.supported, true)
  assert.equal(result.serviceWorker.supported, true)
  assert.equal(result.isAllEssentialSupported, true)
})

test('Hardware Capabilities — Partial Hardware Environment (Safari / Mobile without Bluetooth/Serial)', () => {
  const mockMobileSafari = {
    mediaDevices: {
      getUserMedia: () => Promise.resolve({}),
    },
    geolocation: {},
    serviceWorker: {},
  }

  const result = probeHardwareCapabilities(mockMobileSafari)

  assert.equal(result.bluetooth.supported, false)
  assert.equal(result.serial.supported, false)
  assert.equal(result.audioDsp.supported, true)
  assert.equal(result.camera.supported, true)
  assert.equal(result.geolocation.supported, true)
  assert.equal(result.isAllEssentialSupported, true)
})
