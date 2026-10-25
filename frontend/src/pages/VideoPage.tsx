import { useEffect, useRef, useState } from 'react'
import type { ChangeEvent } from 'react'
import { Notice } from '../components/Notice'
import { deleteVideo, describeCameraError, isRecordingSupported, loadVideo, saveVideo } from '../services/videoStore'

type Phase = 'loading' | 'none' | 'preview' | 'recording' | 'saved'

function formatTime(totalSeconds: number): string {
  const mins = Math.floor(totalSeconds / 60)
  const secs = totalSeconds % 60
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
}

interface VideoPageProps {
  /** When shown inside onboarding, these let the person continue or skip. */
  onDone?: () => void
  onSkip?: () => void
}

export function VideoPage({ onDone, onSkip }: VideoPageProps) {
  const [phase, setPhase] = useState<Phase>('loading')
  const [error, setError] = useState<string | null>(null)
  const [infoNotice, setInfoNotice] = useState<string | null>(null)
  const [url, setUrl] = useState<string | null>(null)
  const [durationLimit, setDurationLimit] = useState<number>(() => {
    try {
      const saved = localStorage.getItem('amulya_video_duration_pref')
      return saved !== null ? Number(saved) : 0 // 0 means no limit
    } catch {
      return 0
    }
  })
  const [elapsedSeconds, setElapsedSeconds] = useState(0)
  const timerIntervalRef = useRef<number | null>(null)

  const liveRef = useRef<HTMLVideoElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const recorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const blobRef = useRef<Blob | null>(null)
  const stopTimer = useRef<number | null>(null)
  const supported = isRecordingSupported()

  const urlRef = useRef<string | null>(null)

  function setVideoUrl(next: string | null) {
    if (urlRef.current) URL.revokeObjectURL(urlRef.current)
    urlRef.current = next
    setUrl(next)
  }

  function stopCamera() {
    streamRef.current?.getTracks().forEach((t) => t.stop())
    streamRef.current = null
    if (stopTimer.current !== null) {
      window.clearTimeout(stopTimer.current)
      stopTimer.current = null
    }
    if (timerIntervalRef.current !== null) {
      window.clearInterval(timerIntervalRef.current)
      timerIntervalRef.current = null
    }
  }

  // Load any saved video when page opens
  useEffect(() => {
    let cancelled = false
    loadVideo()
      .then((blob) => {
        if (cancelled) return
        if (blob) {
          blobRef.current = blob
          setVideoUrl(URL.createObjectURL(blob))
          setPhase('saved')
        } else {
          setPhase('none')
        }
      })
      .catch(() => !cancelled && setPhase('none'))
    return () => {
      cancelled = true
      stopCamera()
      if (urlRef.current) URL.revokeObjectURL(urlRef.current)
    }
  }, [])

  // Hook stream into live video preview element
  useEffect(() => {
    if ((phase === 'preview' || phase === 'recording') && liveRef.current && streamRef.current) {
      liveRef.current.srcObject = streamRef.current
    }
  }, [phase])

  async function startCamera() {
    setError(null)
    setInfoNotice(null)
    try {
      // 1. Try audio + video
      streamRef.current = await navigator.mediaDevices.getUserMedia({ video: true, audio: true })
      setPhase('preview')
    } catch (err) {
      try {
        // 2. Fallback: video only if microphone is unavailable/blocked
        streamRef.current = await navigator.mediaDevices.getUserMedia({ video: true, audio: false })
        setInfoNotice('Microphone access is unavailable or denied. Recording video without sound.')
        setPhase('preview')
      } catch (fallbackErr) {
        setError(describeCameraError(err))
        setPhase(blobRef.current ? 'saved' : 'none')
      }
    }
  }

  function startRecording() {
    if (!streamRef.current) return
    chunksRef.current = []
    setElapsedSeconds(0)
    setError(null)

    // Select the best supported mimeType for the current browser
    const candidates = [
      'video/webm;codecs=vp9,opus',
      'video/webm;codecs=vp8,opus',
      'video/webm;codecs=h264,opus',
      'video/webm',
      'video/mp4',
    ]
    const mimeType = candidates.find(
      (m) => typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported(m)
    )
    const options: MediaRecorderOptions = mimeType ? { mimeType } : {}

    try {
      const recorder = new MediaRecorder(streamRef.current, options)
      recorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) chunksRef.current.push(event.data)
      }
      recorder.onstop = async () => {
        try {
          const finalType = recorder.mimeType || mimeType || 'video/webm'
          const blob = new Blob(chunksRef.current, { type: finalType })
          blobRef.current = blob
          stopCamera()
          // Automatically save immediately into IndexedDB
          await saveVideo(blob)
          setVideoUrl(URL.createObjectURL(blob))
          setPhase('saved')
        } catch (saveErr) {
          setError((saveErr as Error).message)
        }
      }

      try {
        recorder.start(1000)
      } catch {
        recorder.start()
      }

      recorderRef.current = recorder
      setPhase('recording')

      timerIntervalRef.current = window.setInterval(() => {
        setElapsedSeconds((prev) => prev + 1)
      }, 1000)

      if (durationLimit > 0) {
        stopTimer.current = window.setTimeout(() => stopRecording(), durationLimit * 1000)
      }
    } catch (recorderErr) {
      setError(`Could not start recorder: ${(recorderErr as Error).message}`)
      stopCamera()
      setPhase(blobRef.current ? 'saved' : 'none')
    }
  }

  function stopRecording() {
    if (timerIntervalRef.current !== null) {
      window.clearInterval(timerIntervalRef.current)
      timerIntervalRef.current = null
    }
    if (stopTimer.current !== null) {
      window.clearTimeout(stopTimer.current)
      stopTimer.current = null
    }
    if (recorderRef.current && recorderRef.current.state !== 'inactive') {
      recorderRef.current.stop()
    }
  }

  async function handleFileUpload(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    if (!file) return
    setError(null)
    setInfoNotice(null)
    try {
      await saveVideo(file)
      blobRef.current = file
      setVideoUrl(URL.createObjectURL(file))
      setPhase('saved')
    } catch (err) {
      setError(`Could not save uploaded video: ${(err as Error).message}`)
    }
  }

  function discard() {
    setVideoUrl(null)
    blobRef.current = null
    setPhase('none')
  }

  async function remove() {
    if (!window.confirm('Delete your personal video from this device? This cannot be undone.')) return
    try {
      await deleteVideo()
      discard()
    } catch (e) {
      setError((e as Error).message)
    }
  }

  return (
    <section>
      <h1>Your personal video</h1>
      <p>
        Record a message for yourself: your goals, the people who matter to you, and something encouraging for
        your future self. It is completely optional.
      </p>

      <div className="card">
        <h3>Where your video lives</h3>
        <ul>
          <li><strong>On this device only.</strong> It is stored locally in this browser (IndexedDB) and never uploaded.</li>
          <li><strong>Not shared.</strong> It is never sent to your trusted contact or anyone else.</li>
          <li>
            <strong>Used in times of need:</strong> Whenever you feel overwhelmed or in crisis, Amulya will automatically
            present your saved video to remind you of your reasons for living.
          </li>
        </ul>
      </div>

      {!supported && (
        <Notice kind="warn">
          Camera recording is not fully supported in this browser. You can still choose an existing video file below, or
          try Chrome / Edge / Firefox.
        </Notice>
      )}
      {error && <Notice kind="error">{error}</Notice>}
      {infoNotice && <Notice kind="info">{infoNotice}</Notice>}
      {phase === 'loading' && <p className="muted">Loading…</p>}

      {(phase === 'preview' || phase === 'recording') && (
        <div className="card">
          <video ref={liveRef} className="video" autoPlay muted playsInline aria-label="Live camera preview" />
          {phase === 'preview' ? (
            <>
              <div className="field" style={{ maxWidth: '380px', marginTop: '12px' }}>
                <label htmlFor="duration-limit">
                  <span>Recording duration preference:</span>
                </label>
                <select
                  id="duration-limit"
                  value={durationLimit}
                  onChange={(e) => {
                    const val = Number(e.target.value)
                    setDurationLimit(val)
                    try {
                      localStorage.setItem('amulya_video_duration_pref', String(val))
                    } catch {
                      // ignore
                    }
                  }}
                >
                  <option value={0}>No limit (record as long as you want)</option>
                  <option value={120}>2 minutes (quick reminder)</option>
                  <option value={300}>5 minutes</option>
                  <option value={600}>10 minutes</option>
                  <option value={900}>15 minutes</option>
                </select>
              </div>
              <div className="row">
                <button className="btn btn-primary" onClick={startRecording}>Start recording</button>
                <button
                  className="btn btn-ghost"
                  onClick={() => {
                    stopCamera()
                    setPhase(blobRef.current ? 'saved' : 'none')
                  }}
                >
                  Cancel
                </button>
              </div>
            </>
          ) : (
            <div className="row" style={{ alignItems: 'center' }}>
              <button className="btn btn-primary" onClick={stopRecording}>Stop recording</button>
              <span style={{ fontWeight: 600, color: 'var(--warm-strong)', display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
                <span
                  style={{
                    display: 'inline-block',
                    width: '10px',
                    height: '10px',
                    borderRadius: '50%',
                    backgroundColor: '#d32f2f',
                  }}
                />
                Recording: {formatTime(elapsedSeconds)}
                {durationLimit > 0 ? ` / ${formatTime(durationLimit)}` : ' (No limit — stop whenever you are ready)'}
              </span>
            </div>
          )}
        </div>
      )}

      {phase === 'saved' && url && (
        <div className="card">
          <Notice kind="success">Your video is saved and ready on this device!</Notice>
          <video className="video" src={url} controls playsInline aria-label="Your saved video" />
          <div className="row">
            <button className="btn btn-primary" onClick={startCamera} disabled={!supported}>
              📹 Re-record with camera
            </button>
            <label className="btn btn-ghost" style={{ cursor: 'pointer' }}>
              📁 Replace with another video
              <input type="file" accept="video/*" style={{ display: 'none' }} onChange={handleFileUpload} />
            </label>
            <button className="btn btn-ghost" onClick={remove}>Delete video</button>
          </div>
        </div>
      )}

      {phase === 'none' && (
        <div className="card">
          <p>
            You can record a video using your camera, or upload a video file from your device.
          </p>
          <div className="row">
            <button className="btn btn-primary" onClick={startCamera} disabled={!supported}>
              📹 Allow camera and start recording
            </button>
            <label className="btn btn-ghost" style={{ cursor: 'pointer' }}>
              📁 Or choose a video file
              <input type="file" accept="video/*" style={{ display: 'none' }} onChange={handleFileUpload} />
            </label>
          </div>
        </div>
      )}

      {(onDone || onSkip) && (
        <div className="row" style={{ marginTop: '16px' }}>
          {phase === 'saved' && onDone && <button className="btn btn-primary" onClick={onDone}>Continue</button>}
          {onSkip && <button className="btn btn-ghost" onClick={onSkip}>Skip for now</button>}
        </div>
      )}
    </section>
  )
}
