/**
 * AutoGuard AI — Acoustic Processor Web Worker
 * 
 * Offloads heavy FFT feature vector extraction, 13-band Mel filterbank integrals,
 * and Gaussian feature-space model training completely off the main UI thread.
 */

import { extractAcousticFeatureVector } from '../services/acousticEngine.ts'
import {
  trainAcousticClassifier,
  predictAcousticFeatures,
  type LabeledAcousticSample,
} from '../services/acousticTrainer.ts'

export interface WorkerRequest {
  id: string
  action: 'EXTRACT_FEATURES' | 'TRAIN_MODEL' | 'PREDICT'
  payload: any
}

export interface WorkerResponse {
  id: string
  action: WorkerRequest['action']
  success: boolean
  data?: any
  error?: string
}

// Global scope worker listener
self.onmessage = (e: MessageEvent<WorkerRequest>) => {
  const { id, action, payload } = e.data

  try {
    switch (action) {
      case 'EXTRACT_FEATURES': {
        const { fftBuffer, sampleRate } = payload
        const fftData = new Uint8Array(fftBuffer)
        const features = extractAcousticFeatureVector(fftData, sampleRate || 44100)
        const res: WorkerResponse = { id, action, success: true, data: features }
        self.postMessage(res)
        break
      }

      case 'TRAIN_MODEL': {
        const { dataset, testSplitRatio } = payload as {
          dataset: LabeledAcousticSample[]
          testSplitRatio?: number
        }
        const evaluation = trainAcousticClassifier(dataset, testSplitRatio || 0.2)
        const res: WorkerResponse = { id, action, success: true, data: evaluation }
        self.postMessage(res)
        break
      }

      case 'PREDICT': {
        const { features } = payload
        const prediction = predictAcousticFeatures(features)
        const res: WorkerResponse = { id, action, success: true, data: prediction }
        self.postMessage(res)
        break
      }

      default:
        throw new Error(`Unknown worker action: ${action}`)
    }
  } catch (err: any) {
    const errorResponse: WorkerResponse = {
      id,
      action,
      success: false,
      error: err?.message || 'Acoustic worker processing failed',
    }
    self.postMessage(errorResponse)
  }
}
