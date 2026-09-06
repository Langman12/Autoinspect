import type {
  DtcFaultCode,
  FreezeFrameData,
  ObdConnectionStatus,
  ObdPidData,
} from '../types.ts'

export const KNOWN_DTC_DATABASE: DtcFaultCode[] = [
  {
    code: 'P0300',
    system: 'POWERTRAIN',
    severity: 'CRITICAL',
    description: 'Random / Multiple Cylinder Misfire Detected',
    possibleCauses: [
      'Faulty ignition coils or spark plugs',
      'Low fuel pressure or clogged fuel injectors',
      'Vacuum leak in intake manifold',
      'Camshaft/Crankshaft position sensor fault',
    ],
    recommendedAction: 'Inspect ignition coil pack resistance, measure fuel rail pressure, test cylinder compression.',
    active: true,
    correlatedAcousticSignature: '40-120 Hz Sub-harmonic rhythmic thumping & combustion shudder',
    freezeFrame: {
      dtcCode: 'P0300',
      timestamp: Date.now() - 124000,
      rpm: 2420,
      speedKmh: 68,
      coolantTempC: 92,
      engineLoadPercent: 64,
      fuelTrimStft: 14.2,
      fuelTrimLtft: 8.9,
    },
  },
  {
    code: 'P0171',
    system: 'POWERTRAIN',
    severity: 'WARNING',
    description: 'System Too Lean (Bank 1)',
    possibleCauses: [
      'Unmetered air intake leak (cracked PCV hose or boot)',
      'Dirty or failing Mass Air Flow (MAF) sensor',
      'Weak fuel pump or clogged fuel filter',
      'Exhaust manifold gasket leak before upstream O2 sensor',
    ],
    recommendedAction: 'Perform smoke test on intake plenum, clean MAF sensor with dedicated solvent, verify LTFT at idle.',
    active: true,
    correlatedAcousticSignature: '2.4-4.2 kHz High-frequency hiss & induction turbulence',
    freezeFrame: {
      dtcCode: 'P0171',
      timestamp: Date.now() - 360000,
      rpm: 1850,
      speedKmh: 45,
      coolantTempC: 89,
      engineLoadPercent: 42,
      fuelTrimStft: 18.5,
      fuelTrimLtft: 22.1,
    },
  },
  {
    code: 'P0420',
    system: 'POWERTRAIN',
    severity: 'WARNING',
    description: 'Catalyst System Efficiency Below Threshold (Bank 1)',
    possibleCauses: [
      'Degraded catalytic converter substrate',
      'Downstream O2 sensor lazy or contaminated',
      'Exhaust leak near catalytic converter',
      'Engine running rich causing converter overheating',
    ],
    recommendedAction: 'Measure upstream vs downstream O2 sensor voltage switching waveform, check catalyst inlet/outlet temperature delta (>35°C delta required).',
    active: false,
    correlatedAcousticSignature: '800-1400 Hz Metallic rattle inside exhaust shell',
  },
  {
    code: 'P0128',
    system: 'POWERTRAIN',
    severity: 'ADVISORY',
    description: 'Coolant Thermostat (Coolant Temp Below Thermostat Regulating Temp)',
    possibleCauses: [
      'Thermostat stuck open',
      'Faulty Engine Coolant Temperature (ECT) sensor',
      'Low coolant level or trapped air pocket',
    ],
    recommendedAction: 'Replace thermostat assembly, flush coolant, verify ECT resistance curve.',
    active: false,
  },
  {
    code: 'U0100',
    system: 'NETWORK_CAN',
    severity: 'CRITICAL',
    description: 'Lost Communication With Engine Control Module (ECM/PCM)',
    possibleCauses: [
      'CAN-bus high/low wiring short or open circuit',
      'Corroded ground strap or ECM connector pin',
      'Low battery supply voltage (<10.5V) during engine crank',
    ],
    recommendedAction: 'Measure CAN-H to CAN-L termination resistance (nominal 60Ω across network), check ECM main relay voltage.',
    active: false,
  },
]

class ObdStreamerService {
  private status: ObdConnectionStatus = 'DISCONNECTED'
  private currentPids: ObdPidData = this.createBaselinePids()
  private activeDtcs: DtcFaultCode[] = [...KNOWN_DTC_DATABASE.filter((d) => d.active)]
  private listeners: Array<(pids: ObdPidData, status: ObdConnectionStatus) => void> = []
  private timer: any = null
  private throttlePhase = 0

  private createBaselinePids(): ObdPidData {
    return {
      timestamp: Date.now(),
      rpm: 850,
      speedKmh: 0,
      coolantTempC: 88,
      intakeTempC: 24,
      stftPercent: 2.1,
      ltftPercent: 3.4,
      mafGramsPerSec: 4.2,
      mapKpa: 34,
      throttlePercent: 12.4,
      timingAdvanceDeg: 14.5,
      o2Voltage1: 0.45,
      o2Voltage2: 0.72,
      oilPressureKpa: 280,
      batteryVoltage: 14.2,
      engineLoadPercent: 22.0,
      boostPsi: -8.4,
    }
  }

  public getStatus(): ObdConnectionStatus {
    return this.status
  }

  public getPids(): ObdPidData {
    return { ...this.currentPids }
  }

  public getActiveDtcs(): DtcFaultCode[] {
    return [...this.activeDtcs]
  }

  public subscribe(callback: (pids: ObdPidData, status: ObdConnectionStatus) => void): () => void {
    this.listeners.push(callback)
    callback(this.currentPids, this.status)
    return () => {
      this.listeners = this.listeners.filter((l) => l !== callback)
    }
  }

  private notify() {
    for (const listener of this.listeners) {
      listener(this.currentPids, this.status)
    }
  }

  public async connect(mode: 'SIMULATION' | 'BLUETOOTH' | 'SERIAL' = 'SIMULATION'): Promise<boolean> {
    this.status = 'CONNECTING'
    this.notify()

    if (mode === 'BLUETOOTH') {
      try {
        if ('bluetooth' in navigator) {
          await (navigator as any).bluetooth.requestDevice({
            filters: [{ namePrefix: 'OBD' }, { namePrefix: 'ELM' }, { namePrefix: 'V-LINK' }],
            optionalServices: ['0000fff0-0000-1000-8000-00805f9b34fb'],
          })
          this.status = 'CONNECTED'
          this.startStreaming()
          return true
        }
      } catch (err) {
        console.warn('[OBD Streamer] Web Bluetooth failed, falling back to tactical simulation:', err)
      }
    }

    if (mode === 'SERIAL') {
      try {
        if ('serial' in navigator) {
          await (navigator as any).serial.requestPort()
          this.status = 'CONNECTED'
          this.startStreaming()
          return true
        }
      } catch (err) {
        console.warn('[OBD Streamer] Web Serial failed, falling back to tactical simulation:', err)
      }
    }

    // Default: Realistic high-precision simulation
    await new Promise((r) => setTimeout(r, 600))
    this.status = 'CONNECTED'
    this.startStreaming()
    return true
  }

  public disconnect() {
    this.stopStreaming()
    this.status = 'DISCONNECTED'
    this.currentPids = this.createBaselinePids()
    this.notify()
  }

  public triggerThrottleSpike() {
    this.throttlePhase = Math.PI * 0.8
  }

  public clearCodes(): boolean {
    this.activeDtcs = []
    this.notify()
    return true
  }

  public injectDtc(code: string): boolean {
    const found = KNOWN_DTC_DATABASE.find((d) => d.code === code)
    if (found && !this.activeDtcs.some((d) => d.code === code)) {
      this.activeDtcs.push({ ...found, active: true })
      this.notify()
      return true
    }
    return false
  }

  private startStreaming() {
    this.stopStreaming()
    let tick = 0
    this.timer = setInterval(() => {
      tick += 0.1
      this.throttlePhase = Math.max(0, this.throttlePhase - 0.05)

      const throttleWave = Math.sin(tick * 0.4) * 15 + Math.sin(tick * 1.2) * 8 + (this.throttlePhase > 0 ? 45 : 0)
      const throttle = Math.min(95, Math.max(8, 18 + throttleWave))
      const load = Math.min(98, Math.max(15, throttle * 0.95 + Math.sin(tick * 0.7) * 5))

      const targetRpm = 850 + load * 48 + Math.sin(tick * 3.5) * 45
      const targetSpeed = Math.min(180, Math.max(0, load * 1.2 + Math.sin(tick * 0.2) * 15))

      const stft = (load > 60 ? 12.4 : -2.1) + Math.sin(tick * 1.8) * 4.2
      const ltft = 6.8 + Math.sin(tick * 0.3) * 1.5
      const o2_1 = 0.1 + (Math.sin(tick * 4.0) + 1) * 0.4
      const o2_2 = 0.68 + Math.sin(tick * 0.5) * 0.08
      const maf = (targetRpm / 1000) * 4.2 * (load / 40)
      const map = 30 + load * 0.85
      const boost = map > 101.3 ? (map - 101.3) * 0.145 : (map - 101.3) * 0.145
      const coolant = 89 + Math.sin(tick * 0.05) * 3

      this.currentPids = {
        timestamp: Date.now(),
        rpm: Math.round(targetRpm),
        speedKmh: Math.round(targetSpeed),
        coolantTempC: Math.round(coolant * 10) / 10,
        intakeTempC: Math.round((26 + load * 0.15) * 10) / 10,
        stftPercent: Math.round(stft * 10) / 10,
        ltftPercent: Math.round(ltft * 10) / 10,
        mafGramsPerSec: Math.round(maf * 10) / 10,
        mapKpa: Math.round(map * 10) / 10,
        throttlePercent: Math.round(throttle * 10) / 10,
        timingAdvanceDeg: Math.round((28 - load * 0.2 + Math.sin(tick * 2.0) * 2) * 10) / 10,
        o2Voltage1: Math.round(o2_1 * 100) / 100,
        o2Voltage2: Math.round(o2_2 * 100) / 100,
        oilPressureKpa: Math.round((180 + (targetRpm / 1000) * 80) * 10) / 10,
        batteryVoltage: Math.round((14.1 + Math.sin(tick * 0.8) * 0.2) * 100) / 100,
        engineLoadPercent: Math.round(load * 10) / 10,
        boostPsi: Math.round(boost * 10) / 10,
      }

      this.notify()
    }, 100)
  }

  private stopStreaming() {
    if (this.timer) {
      clearInterval(this.timer)
      this.timer = null
    }
  }
}

export const obdStreamer = new ObdStreamerService()
