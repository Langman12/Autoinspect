export class HapticsService {
  public vibrate(pattern: number | number[] = 50): boolean {
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      try {
        return navigator.vibrate(pattern)
      } catch (err) {
        console.warn('[Haptics] Vibration failed:', err)
      }
    }
    return false
  }

  public triggerVinLock() {
    this.vibrate([40, 60, 40])
  }

  public triggerDefectAlert() {
    this.vibrate([80, 50, 80, 50, 150])
  }

  public triggerImpactWarning() {
    this.vibrate([200, 100, 200, 100, 400])
  }

  public triggerOverspeedWarning() {
    this.vibrate([60, 40, 60])
  }

  public triggerButtonTap() {
    this.vibrate(25)
  }
}

export const hapticsService = new HapticsService()
