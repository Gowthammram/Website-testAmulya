import { useState } from 'react'
import { api } from '../services/api'
import { getPosition } from '../services/geo'
import { getDisplayName } from '../services/storage'
import type { AlertOptions, AlertPreview, AlertResult } from '../types'
import { Notice } from './Notice'

interface AlertFlowProps {
  onClose: () => void
}

/**
 * Preview -> confirm -> (demo) send.
 * Nothing leaves the computer until the person presses the confirm button.
 */
export function AlertFlow({ onClose }: AlertFlowProps) {
  const [shareLocation, setShareLocation] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [options, setOptions] = useState<AlertOptions | null>(null)
  const [preview, setPreview] = useState<AlertPreview | null>(null)
  const [result, setResult] = useState<AlertResult | null>(null)

  async function buildPreview() {
    setBusy(true)
    setError(null)
    try {
      const next: AlertOptions = { share_location: false, sender_name: getDisplayName() || undefined }
      if (shareLocation) {
        try {
          const pos = await getPosition()
          next.share_location = true
          next.latitude = pos.latitude
          next.longitude = pos.longitude
          next.accuracy_m = pos.accuracy
        } catch (geoError) {
          // Location failed: tell the person and continue WITHOUT location.
          setError(`${(geoError as Error).message} The alert preview below does not include location.`)
        }
      }
      setOptions(next)
      setPreview(await api.alertPreview(next))
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setBusy(false)
    }
  }

  async function confirmSend() {
    if (!options) return
    setBusy(true)
    setError(null)
    try {
      setResult(await api.alertSend(options, true))
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setBusy(false)
    }
  }

  if (result) {
    const kind = result.status === 'failed' ? 'error' : 'success'
    return (
      <div className="card">
        <Notice kind={kind}>{result.detail}</Notice>
        {result.status === 'failed' && <p>Please call or message your trusted contact directly.</p>}
        <button className="btn" onClick={onClose}>Done</button>
      </div>
    )
  }

  return (
    <div className="card" aria-live="polite">
      <h3>Let my trusted contact know</h3>
      {!preview && (
        <>
          <p>
            You will see exactly what would be shared <strong>before</strong> anything happens. Nothing is sent until
            you confirm.
          </p>
          <label className="check">
            <input type="checkbox" checked={shareLocation} onChange={(e) => setShareLocation(e.target.checked)} />
            <span>Include my approximate location (your browser will ask for permission)</span>
          </label>
          {error && <Notice kind="warn">{error}</Notice>}
          <div className="row">
            <button className="btn btn-primary" onClick={buildPreview} disabled={busy}>
              {busy ? 'Preparing…' : 'Show me the preview'}
            </button>
            <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
          </div>
        </>
      )}

      {preview && (
        <>
          <Notice kind={preview.demo_mode ? 'info' : 'warn'}>{preview.note}</Notice>
          {error && <Notice kind="warn">{error}</Notice>}
          <dl className="details">
            <dt>To</dt>
            <dd>{preview.recipient_name} ({preview.recipient_phone_masked})</dd>
            <dt>Message</dt>
            <dd className="quote">{preview.message}</dd>
            <dt>What will be shared</dt>
            <dd>
              <ul>{preview.shared_items.map((s) => <li key={s}>{s}</li>)}</ul>
            </dd>
            <dt>What will not be shared</dt>
            <dd>
              <ul>{preview.not_shared.map((s) => <li key={s}>{s}</li>)}</ul>
            </dd>
          </dl>
          {error === null && <p className="muted">You can cancel at any time.</p>}
          <div className="row">
            <button className="btn btn-primary" onClick={confirmSend} disabled={busy}>
              {busy ? 'Working…' : preview.demo_mode ? 'Record a test alert (nothing is sent)' : 'Send this message'}
            </button>
            <button className="btn btn-ghost" onClick={onClose} disabled={busy}>Cancel</button>
          </div>
        </>
      )}
    </div>
  )
}
