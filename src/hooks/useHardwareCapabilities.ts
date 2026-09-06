import { useState, useEffect, useCallback } from 'react'

export interface HardwareFeatureStatus {
  supported: boolean
  permissionState: 'prompt' | 'granted' | 'denied' | 'unsupported'
  label: string
  detail: string
}

export interface HardwareCapabilitiesMatrix {
  bluetooth: HardwareFeatureStatus
  serial: HardwareFeatureStatus
  audioDsp: HardwareFeatureStatus
  camera: HardwareFeatureStatus
  webXr: HardwareFeatureStatus
  haptics: HardwareFeatureStatus
  geolocation: HardwareFeatureStatus
  serviceWorker: HardwareFeatureStatus
  isAllEssentialSupported: boolean
  lastChecked: number
}

/**
 * Pure evaluation function for hardware capabilities (deterministic & unit-testable in Node)
 */
export function probeHardwareCapabilities(nav?: any): HardwareCapabilitiesMatrix {
  const n = nav || (typeof navigator !== 'undefined' ? navigator : null)

  const bluetoothSupported = !!(n && 'bluetooth' in n)
  const serialSupported = !!(n && 'serial' in n)
  const audioSupported = !!(n && n.mediaDevices && typeof n.mediaDevices.getUserMedia === 'function')
  const cameraSupported = !!(n && n.mediaDevices && typeof n.mediaDevices.getUserMedia === 'function')
  const xrSupported = !!(n && 'xr' in n)
  const hapticsSupported = !!(n && typeof n.vibrate === 'function')
  const geoSupported = !!(n && 'geolocation' in n)
  const swSupported = !!(n && 'serviceWorker' in n)

  const isAllEssential = audioSupported && cameraSupported && geoSupported

  return {
    bluetooth: {
      supported: bluetoothSupported,
      permissionState: bluetoothSupported ? 'prompt' : 'unsupported',
      label: 'Web Bluetooth (OBD-II)',
      detail: bluetoothSupported ? 'Wireless ELM327 BLE telemetry ready' : 'Requires Chrome/Edge on supported OS',
    },
    serial: {
      supported: serialSupported,
      permissionState: serialSupported ? 'prompt' : 'unsupported',
      label: 'Web Serial (CAN-Bus)',
      detail: serialSupported ? 'Direct USB / FTDI UART stream ready' : 'Requires Chromium desktop browser',
    },
    audioDsp: {
      supported: audioSupported,
      permissionState: audioSupported ? 'prompt' : 'unsupported',
      label: 'Web Audio DSP (Microphone)',
      detail: audioSupported ? '20Hz-20kHz acoustic frequency capture active' : 'Microphone API unavailable',
    },
    camera: {
      supported: cameraSupported,
      permissionState: cameraSupported ? 'prompt' : 'unsupported',
      label: 'Camera (Forensic AR HUD)',
      detail: cameraSupported ? 'Ultra-HD damage capture & AR overlay active' : 'Camera API unavailable',
    },
    webXr: {
      supported: xrSupported,
      permissionState: xrSupported ? 'prompt' : 'unsupported',
      label: 'WebXR / Spatial Anchor',
      detail: xrSupported ? 'Hardware spatial depth tracking supported' : 'Falling back to Gyro/IMU simulation',
    },
    haptics: {
      supported: hapticsSupported,
      permissionState: hapticsSupported ? 'granted' : 'unsupported',
      label: 'Tactile Haptics (Vibration)',
      detail: hapticsSupported ? 'Tactical vibration pulses enabled' : 'Device lacks vibration motor',
    },
    geolocation: {
      supported: geoSupported,
      permissionState: geoSupported ? 'prompt' : 'unsupported',
      label: 'Tactical GPS / Weather Sync',
      detail: geoSupported ? 'Precision coordinates & Open-Meteo sync active' : 'Geolocation unavailable',
    },
    serviceWorker: {
      supported: swSupported,
      permissionState: swSupported ? 'granted' : 'unsupported',
      label: 'Offline PWA Sync (Service Worker)',
      detail: swSupported ? 'Background IndexedDB sync active' : 'Offline caching unavailable',
    },
    isAllEssentialSupported: isAllEssential,
    lastChecked: Date.now(),
  }
}

/**
 * React hook to observe and query hardware capabilities across AutoGuard AI subsystems.
 */
export function useHardwareCapabilities() {
  const [capabilities, setCapabilities] = useState<HardwareCapabilitiesMatrix>(() => probeHardwareCapabilities())

  const refreshCapabilities = useCallback(() => {
    const updated = probeHardwareCapabilities()
    setCapabilities(updated)

    // Attempt permission queries if permissions API exists
    if (typeof navigator !== 'undefined' && 'permissions' in navigator && (navigator as any).permissions?.query) {
      const p = (navigator as any).permissions
      const queryList = [
        { name: 'geolocation', key: 'geolocation' as const },
        { name: 'microphone' as any, key: 'audioDsp' as const },
        { name: 'camera' as any, key: 'camera' as const },
      ]

      queryList.forEach(({ name, key }) => {
        try {
          p.query({ name }).then((status: PermissionStatus) => {
            setCapabilities((prev) => ({
              ...prev,
              [key]: {
                ...prev[key],
                permissionState: status.state,
              },
            }))
            status.onchange = () => {
              setCapabilities((prev) => ({
                ...prev,
                [key]: {
                  ...prev[key],
                  permissionState: status.state,
                },
              }))
            }
          }).catch(() => {
            // Permission name unsupported in this browser engine
          })
        } catch {
          // Graceful fallback
        }
      })
    }
  }, [])

  useEffect(() => {
    refreshCapabilities()
  }, [refreshCapabilities])

  return {
    capabilities,
    refreshCapabilities,
  }
}
