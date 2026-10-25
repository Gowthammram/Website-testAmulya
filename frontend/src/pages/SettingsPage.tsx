import { useEffect, useState } from 'react'
import { Notice } from '../components/Notice'
import { api } from '../services/api'
import { clearLocalSettings, getDisplayName, setDisplayName } from '../services/storage'
import { deleteVideo } from '../services/videoStore'
import type { AppEvent, Health } from '../types'

type PermissionLabel = 'granted' | 'denied' | 'prompt' | 'unknown'

async function checkPermission(name: string): Promise<PermissionLabel> {
  try {
    const status = await navigator.permissions.query({ name: name as PermissionName })
    return status.state
  } catch {
    return 'unknown' // some browsers (e.g. Safari) cannot report this
  }
}

const LABELS: Record<PermissionLabel, string> = {
  granted: 'Allowed',
  denied: 'Blocked',
  prompt: 'Not asked yet',
  unknown: 'Unknown (check your browser settings)',
}

export function SettingsPage() {
  const [health, setHealth] = useState<Health | null>(null)
  const [camera, setCamera] = useState<PermissionLabel>('unknown')
  const [location, setLocation] = useState<PermissionLabel>('unknown')
  const [events, setEvents] = useState<AppEvent[]>([])
  const [name, setName] = useState(getDisplayName())
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    api.health().then(setHealth).catch(() => setHealth(null))
    api.events().then(setEvents).catch(() => setEvents([]))
    void checkPermission('camera').then(setCamera)
    void checkPermission('geolocation').then(setLocation)
  }, [])

  function saveName() {
    setDisplayName(name)
    setMessage('Saved in this browser only.')
  }

  async function deleteEverything() {
    if (!window.confirm('Delete your trusted contact, safety plan, test events, video and settings from this device?')) return
    setError(null)
    try {
      await api.deleteAllData()
      await deleteVideo()
      clearLocalSettings()
      setEvents([])
      setName('')
      setMessage('Everything was deleted from this device.')
    } catch (e) {
      setError((e as Error).message)
    }
  }

  return (
    <section>
      <h1>Privacy and permissions</h1>
      {message && <Notice kind="success">{message}</Notice>}
      {error && <Notice kind="error">{error}</Notice>}

      <div className="card">
        <h3>Permissions</h3>
        <dl className="details">
          <dt>Camera</dt>
          <dd>{LABELS[camera]}</dd>
          <dt>Location</dt>
          <dd>{LABELS[location]}</dd>
        </dl>
        <p>
          Amulya asks only when you press a button that needs it. A website cannot remove a permission by itself. To
          revoke it, click the lock icon next to the address bar and switch Camera or Location to “Block”. Demo location
          sharing also stops by itself when you leave the Help page, or when you press “Stop sharing”.
        </p>
      </div>

      <div className="card">
        <h3>Display name (optional)</h3>
        <p>If you add a name, it appears in the message to your trusted contact. It stays in this browser.</p>
        <label className="field">
          <span>Name</span>
          <input value={name} onChange={(e) => setName(e.target.value)} maxLength={40} />
        </label>
        <button className="btn" onClick={saveName}>Save name</button>
      </div>

      <div className="card">
        <h3>Prototype status</h3>
        <ul>
          <li>Server: {health ? 'running' : 'not reachable'}</li>
          <li>Demo mode: {health ? (health.demo_mode ? 'ON. No real messages can be sent.' : 'OFF') : 'unknown'}</li>
          <li>AI replies: {health ? (health.ai_configured ? 'AI key found' : 'no AI key set, so simple fallback replies are used') : 'unknown'}</li>
        </ul>
        <h4>Test events recorded on this computer</h4>
        {events.length === 0 && <p className="muted">None yet.</p>}
        <ul className="log">
          {events.slice(0, 10).map((ev) => (
            <li key={ev.id}>
              {new Date(ev.created_at).toLocaleString()}: {ev.kind} ({ev.status})
            </li>
          ))}
        </ul>
      </div>

      <div className="card">
        <h3>Privacy policy (prototype)</h3>
        <details>
          <summary>Read what is stored and shared</summary>
          <ul>
            <li><strong>Personal video:</strong> stored only in this browser. Never uploaded. Never sent to anyone.</li>
            <li><strong>Trusted contact, safety plan and test events:</strong> stored in a database file on the computer running the Amulya server. Not encrypted in this prototype.</li>
            <li><strong>Chat messages:</strong> not saved by Amulya. Each message is sent through the server to an AI service so it can write a reply, and that service has its own privacy rules.</li>
            <li><strong>Location:</strong> read only when you ask. In this prototype it is used for previews and test events and is not sent to anyone.</li>
            <li><strong>Messages to your contact:</strong> simulated only. Nothing is sent.</li>
            <li><strong>Limits:</strong> Amulya is not a replacement for professional care and cannot predict or prevent suicide.</li>
          </ul>
        </details>
      </div>

      <div className="card">
        <h3>Welcome walkthrough</h3>
        <p>Review the introductory guide, what Amulya is, and how personal information is handled.</p>
        <a className="btn" href="#/welcome" style={{ textDecoration: 'none', display: 'inline-block' }}>
          👋 Replay Welcome Tour
        </a>
      </div>

      <div className="card">
        <h3>Delete my data</h3>
        <p>Removes your trusted contact, safety plan, test events, saved video and settings from this device.</p>
        <button className="btn btn-ghost" onClick={deleteEverything}>Delete everything</button>
      </div>
    </section>
  )
}
