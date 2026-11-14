import type { decode } from '@jsquash/jpeg'
import DecodeWorker from '~/workers/decode.worker.ts?worker'
import EncodeWorker from '~/workers/encode.worker.ts?worker'

class WorkerWrapper<Data, Result> {
  private worker: Worker
  busy: boolean = false
  currentResolve?: (result: Result) => void
  currentReject?: (error: Error) => void

  constructor(worker: Worker) {
    this.worker = worker
    this.setupWorker()
  }

  private setupWorker() {
    this.worker.onmessage = (e) => {
      this.busy = false
      if (e.data.success) {
        this.currentResolve?.(e.data.result)
      }
      else {
        this.currentReject?.(new Error(e.data.error))
      }
      this.processNextTask() // Notify the manager to process the next task
    }

    this.worker.onerror = (error) => {
      this.busy = false
      console.error('Worker error:', error)
      this.currentReject?.(new Error(error.message))
      this.processNextTask() // Notify the manager to process the next task
    }
  }

  postMessage(message: Data) {
    this.worker.postMessage(message)
  }

  terminate() {
    this.worker.terminate()
  }

  // Method to be set by the manager to process the next task
  processNextTask: () => void = () => {}
}

class WorkerPoolManager<Data, Result> {
  private workerPool: WorkerWrapper<Data, Result>[] = []
  private taskQueue: Array<{
    message: Data
    resolve: (result: Result) => void
    reject: (error: Error) => void
  }> = []

  constructor(private workerConstructor: () => Worker, private maxWorkers: number) {}

  private getIdleWorker(): WorkerWrapper<Data, Result> | undefined {
    return this.workerPool.find(worker => !worker.busy)
  }

  private createWorker(): WorkerWrapper<Data, Result> {
    const worker = new WorkerWrapper<Data, Result>(this.workerConstructor())
    worker.processNextTask = this.processNextTask.bind(this) // Set the callback to process the next task
    return worker
  }

  private processNextTask() {
    if (this.taskQueue.length === 0)
      return
    const worker = this.getIdleWorker()
    if (!worker) {
      if (this.workerPool.length < this.maxWorkers) {
        this.workerPool.push(this.createWorker())
        this.processNextTask()
      }
      return
    }
    const task = this.taskQueue.shift()
    if (!task)
      return
    worker.busy = true
    worker.currentResolve = task.resolve
    worker.currentReject = task.reject
    worker.postMessage(task.message)
  }

  public addTask(message: Data): Promise<Result> {
    return new Promise((resolve, reject) => {
      this.taskQueue.push({ message, resolve, reject })
      this.processNextTask()
    })
  }

  public terminateAllWorkers() {
    this.workerPool.forEach(worker => worker.terminate())
    this.workerPool = []
  }
}

// This module is also evaluated during SSR, where there is no navigator.
const MAX_WORKERS = import.meta.client ? (navigator.hardwareConcurrency ?? 4) : 4

type ImageData = Awaited<ReturnType<typeof decode>>
const decodeWorkerPool = new WorkerPoolManager<{
  file: File
}, ImageData>(() => new DecodeWorker(), MAX_WORKERS)
const encodeWorkerPool = new WorkerPoolManager<{
  imageData: ImageData
  filename: string
  options?: CompressOptions
}, File>(() => new EncodeWorker(), MAX_WORKERS)

export { decodeWorkerPool, encodeWorkerPool }
