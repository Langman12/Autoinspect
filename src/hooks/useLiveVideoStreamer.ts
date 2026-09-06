import { useState, useEffect, useRef, useCallback } from 'react'

export interface CameraDeviceInfo {
  deviceId: string
  label: string
  groupId: string
}

export interface LiveVideoStreamerOptions {
  preferredFacingMode?: 'environment' | 'user'
  targetFps?: number
  frameQuality?: number // 0.1 to 1.0 (default 0.75)
  maxWidth?: number
  maxHeight?: number
}

export function useLiveVideoStreamer(options: LiveVideoStreamerOptions = {}) {
  const {
    preferredFacingMode = 'environment',
    targetFps = 1.5,
    frameQuality = 0.75,
    maxWidth = 1280,
    maxHeight = 720,
  } = options

  const [availableCameras, setAvailableCameras] = useState<CameraDeviceInfo[]>([])
  const [selectedCameraId, setSelectedCameraId] = useState<string>('')
  const [isStreaming, setIsStreaming] = useState<boolean>(false)
  const [hasPermission, setHasPermission] = useState<boolean | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [lastFrameBase64, setLastFrameBase64] = useState<string | null>(null)
  const [framesSentCount, setFramesSentCount] = useState<number>(0)

  const videoRef = useRef<HTMLVideoElement | null>(null)
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const frameIntervalRef = useRef<any>(null)
  const onFrameCallbackRef = useRef<((frameBase64: string) => void) | null>(null)

  // Enumerate all available camera lenses on device
  const refreshDevices = useCallback(async () => {
    if (typeof navigator === 'undefined' || !navigator.mediaDevices?.enumerateDevices) return

    try {
      const devices = await navigator.mediaDevices.enumerateDevices()
      const videoDevices = devices
        .filter((d) => d.kind === 'videoinput')
        .map((d, index) => ({
          deviceId: d.deviceId,
          label: d.label || `Camera Channel ${index + 1}`,
          groupId: d.groupId,
        }))

      setAvailableCameras(videoDevices)
      if (videoDevices.length > 0 && !selectedCameraId) {
        setSelectedCameraId(videoDevices[0].deviceId)
      }
    } catch (err: any) {
      console.warn('[useLiveVideoStreamer] Could not enumerate devices:', err)
    }
  }, [selectedCameraId])

  // Start video stream from camera
  const startCamera = useCallback(
    async (deviceId?: string) => {
      stopCamera()
      setError(null)

      if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
        setError('Camera API unavailable in this environment')
        return null
      }

      const targetDeviceId = deviceId || selectedCameraId
      const constraints: MediaStreamConstraints = {
        audio: false,
        video: targetDeviceId
          ? { deviceId: { exact: targetDeviceId }, width: { ideal: maxWidth }, height: { ideal: maxHeight } }
          : { facingMode: preferredFacingMode, width: { ideal: maxWidth }, height: { ideal: maxHeight } },
      }

      try {
        const stream = await navigator.mediaDevices.getUserMedia(constraints)
        streamRef.current = stream
        setHasPermission(true)
        setIsStreaming(true)

        if (videoRef.current) {
          videoRef.current.srcObject = stream
          await videoRef.current.play().catch(() => {})
        }

        // Re-enumerate to get labeled camera names after permission is granted
        refreshDevices()
        return stream
      } catch (err: any) {
        console.error('[useLiveVideoStreamer] Camera start failed:', err)
        setError(err?.message || 'Failed to acquire camera stream')
        setHasPermission(false)
        setIsStreaming(false)
        return null
      }
    },
    [maxHeight, maxWidth, preferredFacingMode, refreshDevices, selectedCameraId]
  )

  // Stop camera and cleanup tracks
  const stopCamera = useCallback(() => {
    stopFrameBroadcasting()
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => {
        try {
          track.stop()
        } catch {}
      })
      streamRef.current = null
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null
    }
    setIsStreaming(false)
  }, [])

  // Switch camera channel
  const selectCamera = useCallback(
    async (deviceId: string) => {
      setSelectedCameraId(deviceId)
      if (isStreaming) {
        await startCamera(deviceId)
      }
    },
    [isStreaming, startCamera]
  )

  // Capture single high-res snapshot
  const captureSnapshot = useCallback((): string | null => {
    const video = videoRef.current
    if (!video || video.readyState < 2) return null

    let canvas = canvasRef.current
    if (!canvas) {
      canvas = document.createElement('canvas')
      canvasRef.current = canvas
    }

    canvas.width = video.videoWidth || 1280
    canvas.height = video.videoHeight || 720
    const ctx = canvas.getContext('2d')
    if (!ctx) return null

    ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
    const dataUrl = canvas.toDataURL('image/jpeg', frameQuality)
    const base64 = dataUrl.replace(/^data:image\/jpeg;base64,/, '')
    setLastFrameBase64(base64)
    return base64
  }, [frameQuality])

  // Start continuous frame broadcast to live session callback
  const startFrameBroadcasting = useCallback(
    (onFrame: (frameBase64: string) => void) => {
      stopFrameBroadcasting()
      onFrameCallbackRef.current = onFrame

      const intervalMs = Math.max(200, Math.round(1000 / targetFps))

      frameIntervalRef.current = setInterval(() => {
        const frame = captureSnapshot()
        if (frame && onFrameCallbackRef.current) {
          onFrameCallbackRef.current(frame)
          setFramesSentCount((prev) => prev + 1)
        }
      }, intervalMs)
    },
    [captureSnapshot, targetFps]
  )

  const stopFrameBroadcasting = useCallback(() => {
    if (frameIntervalRef.current) {
      clearInterval(frameIntervalRef.current)
      frameIntervalRef.current = null
    }
    onFrameCallbackRef.current = null
  }, [])

  // Mount setup
  useEffect(() => {
    refreshDevices()
    return () => {
      stopCamera()
    }
  }, [refreshDevices, stopCamera])

  return {
    videoRef,
    availableCameras,
    selectedCameraId,
    selectCamera,
    isStreaming,
    hasPermission,
    error,
    lastFrameBase64,
    framesSentCount,
    startCamera,
    stopCamera,
    captureSnapshot,
    startFrameBroadcasting,
    stopFrameBroadcasting,
    refreshDevices,
  }
}
