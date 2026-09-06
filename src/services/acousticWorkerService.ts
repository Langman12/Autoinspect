/**
 * AutoGuard AI — Acoustic Worker Client Bridge
 * 
 * Manages background Web Worker thread communication for DSP matrix operations
 * with seamless in-thread fallback for server/test environments.
 */

import { extractAcousticFeatureVector, type AcousticFeatureVector } from './acousticEngine.ts'
import {
  trainAcousticClassifier,
  predictAcousticFeatures,
  type LabeledAcousticSample,
  type TrainedModelEvaluation,
  type AcousticModelPrediction,
} from './acousticTrainer.ts'
import type { WorkerRequest, WorkerResponse } from '../workers/acousticProcessor.worker.ts'

class AcousticWorkerService {
  private worker: Worker | null = null
  private pendingRequests: Map<string, { resolve: (val: any) => void; reject: (err: any) => void }> = new Map()

  constructor() {
    this.initWorker()
  }

  private initWorker() {
    if (typeof window !== 'undefined' && typeof Worker !== 'undefined') {
      try {
        this.worker = new Worker(
          new URL('../workers/acousticProcessor.worker.ts', import.meta.url),
          { type: 'module' }
        )

        this.worker.onmessage = (e: MessageEvent<WorkerResponse>) => {
          const { id, success, data, error } = e.data
          const handler = this.pendingRequests.get(id)
          if (!handler) return

          this.pendingRequests.delete(id)
          if (success) {
            handler.resolve(data)
          } else {
            handler.reject(new Error(error || 'Worker operation failed'))
          }
        }

        this.worker.onerror = (err) => {
          console.warn('[AcousticWorkerService] Worker runtime error, will fallback:', err)
        }
      } catch (err) {
        console.warn('[AcousticWorkerService] Could not instantiate Web Worker:', err)
        this.worker = null
      }
    }
  }

  private sendRequest<T>(action: WorkerRequest['action'], payload: any): Promise<T> {
    const id = `req-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`

    if (this.worker) {
      return new Promise<T>((resolve, reject) => {
        this.pendingRequests.set(id, { resolve, reject })
        this.worker!.postMessage({ id, action, payload } as WorkerRequest)

        // Safety timeout in case worker hangs
        setTimeout(() => {
          if (this.pendingRequests.has(id)) {
            this.pendingRequests.delete(id)
            reject(new Error(`Worker request [${action}] timed out after 10000ms`))
          }
        }, 10000)
      })
    }

    // Direct synchronous fallback for Node / SSR / unsupported Web Worker runtimes
    return new Promise<T>((resolve, reject) => {
      try {
        if (action === 'EXTRACT_FEATURES') {
          const { fftBuffer, sampleRate } = payload
          const fftData = new Uint8Array(fftBuffer)
          resolve(extractAcousticFeatureVector(fftData, sampleRate || 44100) as unknown as T)
        } else if (action === 'TRAIN_MODEL') {
          const { dataset, testSplitRatio } = payload
          resolve(trainAcousticClassifier(dataset, testSplitRatio || 0.2) as unknown as T)
        } else if (action === 'PREDICT') {
          const { features } = payload
          resolve(predictAcousticFeatures(features) as unknown as T)
        } else {
          reject(new Error(`Unsupported fallback action: ${action}`))
        }
      } catch (err) {
        reject(err)
      }
    })
  }

  public async extractFeaturesAsync(fftData: Uint8Array, sampleRate: number = 44100): Promise<AcousticFeatureVector> {
    const bufferCopy = fftData.buffer.slice(0)
    return this.sendRequest<AcousticFeatureVector>('EXTRACT_FEATURES', {
      fftBuffer: bufferCopy,
      sampleRate,
    })
  }

  public async trainModelAsync(
    dataset: LabeledAcousticSample[],
    testSplitRatio: number = 0.2
  ): Promise<TrainedModelEvaluation> {
    return this.sendRequest<TrainedModelEvaluation>('TRAIN_MODEL', {
      dataset,
      testSplitRatio,
    })
  }

  public async predictAsync(features: AcousticFeatureVector): Promise<AcousticModelPrediction> {
    return this.sendRequest<AcousticModelPrediction>('PREDICT', { features })
  }

  public terminate() {
    if (this.worker) {
      this.worker.terminate()
      this.worker = null
    }
  }
}

export const acousticWorkerService = new AcousticWorkerService()
