import { useState, useRef, useEffect, useCallback } from 'react'
import {
  autoSeedTrainingDataset,
  type TrainedModelEvaluation,
  type LabeledAcousticSample,
} from '../services/acousticTrainer.ts'
import { acousticWorkerService } from '../services/acousticWorkerService.ts'

export interface AcousticSynthOptions {
  id: string
  freqHz: number
  waveType?: OscillatorType
  modulationFreqHz?: number
  volume?: number
}

export function useAcousticTrainer() {
  const [acousticDataset, setAcousticDataset] = useState<LabeledAcousticSample[]>([])
  const [trainedModelEvaluation, setTrainedModelEvaluation] = useState<TrainedModelEvaluation | null>(null)
  const [isAutoSeeding, setIsAutoSeeding] = useState<boolean>(false)
  const [isTrainingModel, setIsTrainingModel] = useState<boolean>(false)
  const [trainingProgress, setTrainingProgress] = useState<number>(0)
  const [isPlayingAudio, setIsPlayingAudio] = useState<boolean>(false)
  const [activeToneId, setActiveToneId] = useState<string | null>(null)

  const audioCtxRef = useRef<AudioContext | null>(null)
  const oscRef = useRef<OscillatorNode | null>(null)
  const gainRef = useRef<GainNode | null>(null)

  const stopAudio = useCallback(() => {
    if (oscRef.current) {
      try {
        oscRef.current.stop()
        oscRef.current.disconnect()
      } catch {}
      oscRef.current = null
    }
    if (audioCtxRef.current) {
      try {
        audioCtxRef.current.close()
      } catch {}
      audioCtxRef.current = null
    }
    setIsPlayingAudio(false)
    setActiveToneId(null)
  }, [])

  const playTone = useCallback((opts: AcousticSynthOptions) => {
    stopAudio()

    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext
      if (!AudioCtx) return

      const ctx = new AudioCtx()
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()

      osc.type = opts.waveType || 'sawtooth'
      osc.frequency.setValueAtTime(opts.freqHz, ctx.currentTime)

      // Add mechanical engine rotational harmonic modulation
      const modFreq = opts.modulationFreqHz ?? 12
      const lfo = ctx.createOscillator()
      const lfoGain = ctx.createGain()
      lfo.frequency.setValueAtTime(modFreq, ctx.currentTime)
      lfoGain.gain.setValueAtTime(opts.freqHz * 0.05, ctx.currentTime)
      lfo.connect(lfoGain)
      lfoGain.connect(osc.frequency)
      lfo.start()

      gain.gain.setValueAtTime(opts.volume ?? 0.15, ctx.currentTime)
      osc.connect(gain)
      gain.connect(ctx.destination)

      osc.start()

      audioCtxRef.current = ctx
      oscRef.current = osc
      gainRef.current = gain
      setIsPlayingAudio(true)
      setActiveToneId(opts.id)
    } catch (err) {
      console.error('[useAcousticTrainer] Audio synthesis error:', err)
    }
  }, [stopAudio])

  const autoSeed = useCallback((sampleCount?: number | unknown) => {
    const count = typeof sampleCount === 'number' ? sampleCount : 25
    setIsAutoSeeding(true)
    setTimeout(() => {
      const ds = autoSeedTrainingDataset(count)
      setAcousticDataset(ds)
      setIsAutoSeeding(false)
    }, 300)
  }, [])

  const trainModel = useCallback(async (testSplitRatio?: number | unknown) => {
    const ratio = typeof testSplitRatio === 'number' ? testSplitRatio : 0.2
    let currentDs = acousticDataset
    if (currentDs.length === 0) {
      currentDs = autoSeedTrainingDataset(25)
      setAcousticDataset(currentDs)
    }

    setIsTrainingModel(true)
    setTrainingProgress(20)

    setTimeout(() => setTrainingProgress(60), 200)
    setTimeout(() => setTrainingProgress(90), 450)

    try {
      const evaluation = await acousticWorkerService.trainModelAsync(currentDs, ratio)
      setTrainedModelEvaluation(evaluation)
      setTrainingProgress(100)
    } catch (err) {
      console.error('[useAcousticTrainer] Web Worker training failed:', err)
    } finally {
      setIsTrainingModel(false)
    }
  }, [acousticDataset])

  const clearDataset = useCallback(() => {
    setAcousticDataset([])
    setTrainedModelEvaluation(null)
    setTrainingProgress(0)
  }, [])

  // Teardown audio on hook unmount
  useEffect(() => {
    return () => {
      stopAudio()
    }
  }, [stopAudio])

  return {
    acousticDataset,
    setAcousticDataset,
    trainedModelEvaluation,
    setTrainedModelEvaluation,
    isAutoSeeding,
    isTrainingModel,
    trainingProgress,
    isPlayingAudio,
    activeToneId,
    playTone,
    stopAudio,
    autoSeed,
    trainModel,
    clearDataset,
  }
}
