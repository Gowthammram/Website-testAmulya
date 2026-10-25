import { useEffect, useRef, useState } from 'react'
import { api } from '../services/api'
import { getPosition, QUICK_DEMO_SECONDS, REALISTIC_SECONDS } from '../services/geo'
import type { GeoPosition, LocationPreview } from '../types'
import { Notice } from './Notice'

/**
 * Location sharing DEMO. It checks your location and records TEST events only.
 * No real location is ever sent to anyone. It runs only while this page is open.
 */
export function LocationDemo() {
  const [position, setPosition] = useState<GeoPosition | null>(null)
  const [preview, setPreview] = useState<LocationPreview | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [running, setRunning] = useState(false)
  const [seconds, setSeconds] = useState(QUICK_DEMO_SECONDS)
  const [log, setLog] = useState<string[]>([])
  const timer = useRef<number | null>(null)
  const sequence = useRef(0)

  function stop() {
    if (timer.current !== null) window.clearInterval(timer.current)
    timer.current = null
    setRunning(false)
  }

  // Safety: stop automatically when the person leaves this page.
  useEffect(() => stop, [])

  async function check() {
    setBusy(true)
    setError(null)
    try {
      const pos = await getPosition()
      setPosition(pos)
      setPreview(await api.locationPreview(pos.latitude, pos.longitude, pos.accuracy))
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setBusy(false)
    }
  }

  async function tick() {
    sequence.current += 1
    const n = sequence.current
    const time = new Date().toLocaleTimeString()
    try {
      const pos = await getPosition()
      await api.locationDemoUpdate(pos.latitude, pos.longitude, n)
      setLog((old) => [`${time}: demo update ${n} recorded (nothing was sent)`, ...old].slice(0, 8))
    } catch (e) {
      setLog((old) => [`${time}: update ${n} failed. ${(e as Error).message}`, ...old].slice(0, 8))
    }
  }

  function start() {
    sequence.current = 0
    setLog([])
    setRunning(true)
    void tick()
    timer.current = window.setInterval(() => void tick(), seconds * 1000)
  }

  return (
    <div className="card">
      <h3>Location sharing (demo)</h3>
      <p>
        In a real emergency, the idea is to update your trusted contact about every 5 to 6 minutes. This prototype only{' '}
        <strong>simulates</strong> that. Your location is used to show a preview and to record test events on this
        computer.
      </p>
      <Notice kind="warn">
        A web page cannot reliably track location in the background. Updates pause or stop if you close this page, lock
        your phone, or switch tabs. Dependable background sharing needs the future mobile app.
      </Notice>

      {error && <Notice kind="error">{error}</Notice>}

      {!position && (
        <button className="btn" onClick={check} disabled={busy}>
          {busy ? 'Looking…' : 'Check my location (asks permission)'}
        </button>
      )}

      {position && preview && (
        <>
          <dl className="details">
            <dt>Coordinates</dt>
            <dd>{position.latitude.toFixed(5)}, {position.longitude.toFixed(5)} (about {Math.round(position.accuracy)} m)</dd>
            <dt>What would be shared</dt>
            <dd><ul>{preview.shared_items.map((s) => <li key={s}>{s}</li>)}</ul></dd>
            <dt>What would not be shared</dt>
            <dd><ul>{preview.not_shared.map((s) => <li key={s}>{s}</li>)}</ul></dd>
          </dl>

          <label className="field">
            <span>Demo update speed</span>
            <select value={seconds} onChange={(e) => setSeconds(Number(e.target.value))} disabled={running}>
              <option value={QUICK_DEMO_SECONDS}>Every {QUICK_DEMO_SECONDS} seconds (quick demo)</option>
              <option value={REALISTIC_SECONDS}>Every 5 minutes (realistic)</option>
            </select>
          </label>

          <div className="row">
            {!running ? (
              <button className="btn btn-primary" onClick={start}>Start demo sharing</button>
            ) : (
              <button className="btn btn-primary" onClick={stop}>Stop sharing</button>
            )}
            <button className="btn btn-ghost" onClick={() => { stop(); setPosition(null); setPreview(null) }}>
              Reset
            </button>
          </div>
          {running && <p className="muted">Demo sharing is on. Press “Stop sharing” any time.</p>}
          {log.length > 0 && (
            <ul className="log">{log.map((line, i) => <li key={`${i}-${line}`}>{line}</li>)}</ul>
          )}
        </>
      )}
    </div>
  )
}
