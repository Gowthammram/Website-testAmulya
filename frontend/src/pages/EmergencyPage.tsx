import { useEffect, useState } from 'react'
import { AlertFlow } from '../components/AlertFlow'
import { LocationDemo } from '../components/LocationDemo'
import { Notice } from '../components/Notice'
import { go } from '../hooks/useRoute'
import { api } from '../services/api'
import { FALLBACK_RESOURCES } from '../services/support'
import { loadVideo } from '../services/videoStore'
import type { Contact, Resource } from '../types'

export function EmergencyPage() {
  const [resources, setResources] = useState<Resource[]>(FALLBACK_RESOURCES)
  const [offline, setOffline] = useState(false)
  const [contact, setContact] = useState<Contact | null>(null)
  const [alertOpen, setAlertOpen] = useState(false)
  const [videoUrl, setVideoUrl] = useState<string | null>(null)
  const [showVideo, setShowVideo] = useState(false)

  useEffect(() => {
    api.resources().then(setResources).catch(() => setOffline(true))
    api.getContact().then(setContact).catch(() => setContact(null))
    let url: string | null = null
    loadVideo()
      .then((blob) => {
        if (blob) {
          url = URL.createObjectURL(blob)
          setVideoUrl(url)
        }
      })
      .catch(() => undefined)
    return () => {
      if (url) URL.revokeObjectURL(url)
    }
  }, [])

  const emergency = resources.find((r) => r.id === 'emergency-112') ?? resources[0]
  const crisisLine = resources.find((r) => r.id === 'tele-manas') ?? resources[1] ?? resources[0]

  return (
    <section>
      <h1>Help is available</h1>
      <p>You don't have to handle this alone. Choose what feels right. Each option explains what it does.</p>
      {offline && (
        <Notice kind="warn">
          The Amulya server isn't reachable, so the basic numbers are shown. Calling still works from your phone.
        </Notice>
      )}

      <div className="card card-strong">
        <h2>If you are in immediate danger</h2>
        <a className="btn btn-primary btn-big" href={`tel:${emergency.number}`}>Call {emergency.number}</a>
        <p>
          <strong>What happens:</strong> this opens your phone's dialer with {emergency.number} ready. You press call
          yourself. Amulya does not place the call and cannot tell whether it connects. On a computer without calling,
          dial from a phone.
        </p>
      </div>

      <div className="card">
        <h2>Talk to a trained counsellor</h2>
        <a className="btn btn-big" href={`tel:${crisisLine.number}`}>Call {crisisLine.name} ({crisisLine.number})</a>
        <p>
          <strong>What happens:</strong> this opens your dialer. {crisisLine.description}
        </p>
        {resources.some((r) => !r.verified) && (
          <p className="muted small">Prototype note: these numbers must be re-verified before a public release.</p>
        )}
      </div>

      <div className="card">
        <h2>Let someone you trust know</h2>
        {!contact && !alertOpen && (
          <>
            <p>You haven't added a trusted contact yet.</p>
            <button className="btn" onClick={() => go('contacts')}>Add a trusted contact</button>
          </>
        )}
        {contact && !alertOpen && (
          <>
            <p>
              <strong>What happens:</strong> you will first see a preview of the message for {contact.name}. Nothing is
              sent until you confirm. In this prototype, confirming only records a test event.
            </p>
            <button className="btn btn-primary" onClick={() => setAlertOpen(true)}>Prepare a message to {contact.name}</button>
          </>
        )}
        {alertOpen && <AlertFlow onClose={() => setAlertOpen(false)} />}
      </div>

      <div className="card">
        <h2>My video reminder (optional)</h2>
        {!videoUrl && (
          <>
            <p>You haven't recorded a video. That's okay. All the help above works without it.</p>
            <button className="btn btn-ghost" onClick={() => go('video')}>Record one when you're ready</button>
          </>
        )}
        {videoUrl && !showVideo && (
          <>
            <p>You can watch your own message if it feels helpful. You never have to watch it to get help.</p>
            <button className="btn" onClick={() => setShowVideo(true)}>Watch my video</button>
          </>
        )}
        {videoUrl && showVideo && (
          <>
            <video className="video" src={videoUrl} controls autoPlay playsInline aria-label="Your personal video" />
            {contact && !alertOpen && (
              <button className="btn" onClick={() => setAlertOpen(true)}>
                I'm struggling: prepare a message to {contact.name}
              </button>
            )}
            <p className="muted small">The video is never sent to anyone.</p>
          </>
        )}
      </div>

      <LocationDemo />
    </section>
  )
}
