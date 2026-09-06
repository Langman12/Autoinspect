export interface VoiceMechanicMessage {
  id: string
  sender: 'USER' | 'MECHANIC'
  text: string
  timestamp: number
  actionTriggered?: string
}

export class VoiceMechanicService {
  private isListening = false
  private recognition: any = null
  private messages: VoiceMechanicMessage[] = []
  private listeners: Array<(messages: VoiceMechanicMessage[], isListening: boolean) => void> = []

  constructor() {
    this.messages.push({
      id: 'msg-init',
      sender: 'MECHANIC',
      text: 'AutoGuard Tactical Voice Co-Pilot online. Ready for diagnostic commands. Try saying "Inspect Engine Bay", "Read Fault Codes", "Estimate Brakes", or "Check Flight Buffer".',
      timestamp: Date.now(),
    })
  }

  public getMessages(): VoiceMechanicMessage[] {
    return [...this.messages]
  }

  public getIsListening(): boolean {
    return this.isListening
  }

  public subscribe(
    callback: (messages: VoiceMechanicMessage[], isListening: boolean) => void
  ): () => void {
    this.listeners.push(callback)
    callback(this.messages, this.isListening)
    return () => {
      this.listeners = this.listeners.filter((l) => l !== callback)
    }
  }

  private notify() {
    for (const listener of this.listeners) {
      listener(this.messages, this.isListening)
    }
  }

  public toggleListening(
    onCommandDetected?: (command: string, action?: string) => void
  ): boolean {
    if (this.isListening) {
      this.stopListening()
      return false
    } else {
      this.startListening(onCommandDetected)
      return true
    }
  }

  public startListening(onCommandDetected?: (command: string, action?: string) => void) {
    this.isListening = true
    this.notify()

    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition

    if (SpeechRecognition) {
      try {
        this.recognition = new SpeechRecognition()
        this.recognition.continuous = true
        this.recognition.interimResults = false
        this.recognition.lang = 'en-US'

        this.recognition.onresult = (event: any) => {
          const transcript = event.results[event.results.length - 1][0].transcript.trim()
          this.processUserVoiceInput(transcript, onCommandDetected)
        }

        this.recognition.onerror = (err: any) => {
          console.warn('[Voice Mechanic] Speech recognition warning:', err)
        }

        this.recognition.start()
        return
      } catch (err) {
        console.warn('[Voice Mechanic] Speech recognition failed to start:', err)
      }
    }
  }

  public stopListening() {
    this.isListening = false
    if (this.recognition) {
      try {
        this.recognition.stop()
      } catch (_) {}
      this.recognition = null
    }
    this.notify()
  }

  public speak(text: string) {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      try {
        window.speechSynthesis.cancel()
        const utterance = new SpeechSynthesisUtterance(text)
        utterance.rate = 1.05
        utterance.pitch = 0.95
        window.speechSynthesis.speak(utterance)
      } catch (_) {}
    }
  }

  public processUserVoiceInput(
    text: string,
    onCommandDetected?: (command: string, action?: string) => void
  ) {
    const userMsg: VoiceMechanicMessage = {
      id: `user-${Date.now()}`,
      sender: 'USER',
      text,
      timestamp: Date.now(),
    }
    this.messages.push(userMsg)

    const lower = text.toLowerCase()
    let reply = "Acknowledged. Monitoring vehicle parameters."
    let action: string | undefined = undefined

    if (lower.includes('engine') || lower.includes('bay')) {
      reply = "Engaging Engine Bay forensic inspection. Optical scan active, listening for rod knock or belt harmonics."
      action = 'NAVIGATE_CAMERA'
    } else if (lower.includes('dtc') || lower.includes('code') || lower.includes('fault') || lower.includes('obd')) {
      reply = "Querying CAN-Bus OBD-II port. Reading active powertrain and network trouble codes."
      action = 'NAVIGATE_OBD'
    } else if (lower.includes('3d') || lower.includes('twin') || lower.includes('model')) {
      reply = "Projecting 3D Holographic Digital Twin. Overlaying chassis defect coordinate markers."
      action = 'NAVIGATE_3D'
    } else if (lower.includes('part') || lower.includes('price') || lower.includes('cost') || lower.includes('quote') || lower.includes('brake')) {
      reply = "Accessing parts sourcing matrix. Calculating OEM vs Tier-1 aftermarket pricing and Mitchell labor hours."
      action = 'NAVIGATE_PARTS'
    } else if (lower.includes('passport') || lower.includes('cert') || lower.includes('hash') || lower.includes('fraud')) {
      reply = "Generating cryptographically signed SHA-256 Digital Vehicle Passport and EXIF fraud audit."
      action = 'NAVIGATE_PASSPORT'
    } else if (lower.includes('tread') || lower.includes('tire')) {
      reply = "Engaging tire tread depth laser shadow profiler and thermal imaging mode."
      action = 'OPEN_TREAD_SCAN'
    } else if (lower.includes('black box') || lower.includes('flight') || lower.includes('g-force')) {
      reply = "Accessing in-flight tactical black box circular flight buffer."
      action = 'NAVIGATE_BLACKBOX'
    }

    const mechanicMsg: VoiceMechanicMessage = {
      id: `mech-${Date.now()}`,
      sender: 'MECHANIC',
      text: reply,
      timestamp: Date.now(),
      actionTriggered: action,
    }
    this.messages.push(mechanicMsg)
    this.notify()
    this.speak(reply)

    if (action && onCommandDetected) {
      onCommandDetected(text, action)
    }
  }
}

export const voiceMechanicService = new VoiceMechanicService()
