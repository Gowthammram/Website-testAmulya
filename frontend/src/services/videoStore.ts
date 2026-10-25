// The personal video is stored ONLY in this browser (IndexedDB). It is never uploaded.
const DB_NAME = 'amulya'
const STORE = 'video'
const KEY = 'personal'

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new Error('This browser cannot store video locally.'))
      return
    }
    const request = indexedDB.open(DB_NAME, 1)
    request.onupgradeneeded = () => request.result.createObjectStore(STORE)
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(new Error('Could not open local storage.'))
  })
}

async function run<T>(mode: IDBTransactionMode, action: (store: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  const db = await openDb()
  return new Promise<T>((resolve, reject) => {
    const tx = db.transaction(STORE, mode)
    const request = action(tx.objectStore(STORE))
    tx.oncomplete = () => {
      db.close()
      resolve(request.result)
    }
    tx.onerror = () => {
      db.close()
      reject(new Error('Local storage failed. The video may be too large or storage is full.'))
    }
  })
}

export const saveVideo = (blob: Blob): Promise<IDBValidKey> => run('readwrite', (s) => s.put(blob, KEY))
export const loadVideo = async (): Promise<Blob | null> => {
  const result = await run<Blob | undefined>('readonly', (s) => s.get(KEY))
  return result ?? null
}
export const deleteVideo = (): Promise<undefined> => run('readwrite', (s) => s.delete(KEY))

/** Turns the many camera error types into one calm, helpful sentence. */
export function describeCameraError(error: unknown): string {
  const name = error instanceof DOMException || error instanceof Error ? error.name : ''
  switch (name) {
    case 'NotAllowedError':
    case 'PermissionDeniedError':
      return 'Camera access was blocked. You can allow it from the lock icon next to the address bar, or skip this step. The app works without a video.'
    case 'NotFoundError':
    case 'DevicesNotFoundError':
      return 'No camera or microphone was found on this device. You can skip this step.'
    case 'NotReadableError':
    case 'TrackStartError':
      return 'The camera is being used by another app. Close it and try again, or skip this step.'
    case 'SecurityError':
      return 'The browser blocked the camera on this page. Use http://localhost:5173 or an https address.'
    default:
      return 'The camera could not be started. You can try again or skip this step.'
  }
}

export function isRecordingSupported(): boolean {
  return (
    typeof navigator !== 'undefined' &&
    !!navigator.mediaDevices &&
    typeof navigator.mediaDevices.getUserMedia === 'function' &&
    typeof MediaRecorder !== 'undefined'
  )
}
