import { useEffect, useState } from 'react'
import { api } from '../services/api'
import { loadVideo } from '../services/videoStore'

interface Tile {
  href: string
  icon: string
  title: string
  text: string
  status?: string
}

const AFFIRMATIONS = [
  'The world is brighter and richer with you in it.',
  'You have survived 100% of your hardest days so far. Tomorrow needs you.',
  'There are people you have not met yet and moments of joy you have not lived yet.',
  'You do not have to carry the whole future right now—just this single gentle breath.',
  'Your life has quiet, immense worth, exactly as you are right now.',
  'Even the darkest night always ends, and the morning sun always rises.',
]

export function Dashboard() {
  const [hasVideo, setHasVideo] = useState<boolean | null>(null)
  const [hasContact, setHasContact] = useState<boolean | null>(null)
  const [affirmationIndex, setAffirmationIndex] = useState(0)
  const [showBreathing, setShowBreathing] = useState(false)

  useEffect(() => {
    loadVideo().then((b) => setHasVideo(b !== null)).catch(() => setHasVideo(false))
    api.getContact().then((c) => setHasContact(c !== null)).catch(() => setHasContact(null))
    // Random affirmation on load
    setAffirmationIndex(Math.floor(Math.random() * AFFIRMATIONS.length))
  }, [])

  function nextAffirmation() {
    setAffirmationIndex((prev) => (prev + 1) % AFFIRMATIONS.length)
  }

  const tiles: Tile[] = [
    {
      href: '#/chat',
      icon: '💬',
      title: 'Talk it through',
      text: 'A kind, private space to express whatever is on your mind without judgment.',
    },
    {
      href: '#/video',
      icon: '🎥',
      title: 'Personal video',
      text: 'A message from you, to you—your goals, reasons to hold on, and future dreams.',
      status: hasVideo === null ? undefined : hasVideo ? 'Saved on device' : 'Not recorded yet',
    },
    {
      href: '#/contacts',
      icon: '🤝',
      title: 'Trusted contact',
      text: 'Someone in your corner. They are only contacted if you explicitly choose.',
      status: hasContact === null ? undefined : hasContact ? 'Ready' : 'Not added yet',
    },
    {
      href: '#/plan',
      icon: '🌱',
      title: 'Safety plan',
      text: 'Your personal toolkit of comforting activities, safe places, and steps.',
    },
    {
      href: '#/emergency',
      icon: '🛡️',
      title: 'Emergency support',
      text: 'Immediate human help: call 112 or Tele-MANAS (14416) right away.',
    },
    {
      href: '#/settings',
      icon: '🔒',
      title: 'Privacy & control',
      text: 'Check your stored data, camera permissions, and manage everything safely.',
    },
  ]

  return (
    <section>
      {/* Radiant Hope Banner */}
      <div className="hope-banner">
        <span className="hope-pill">☀️ A Gentle Reminder of Hope</span>
        <h2>"{AFFIRMATIONS[affirmationIndex]}"</h2>
        <p>Take things one breath, one minute, one day at a time. What would feel most supportive right now?</p>
        <div className="row">
          <button className="btn btn-ghost" onClick={nextAffirmation} style={{ background: 'rgba(255,255,255,0.95)' }}>
            ✨ Another thought
          </button>
          <button
            className="btn"
            onClick={() => setShowBreathing(!showBreathing)}
            style={{ background: 'rgba(255,255,255,0.95)', borderColor: 'transparent' }}
          >
            {showBreathing ? 'Close breathing exercise' : '🌬️ Take a 30s breathing pause'}
          </button>
          <a
            className="btn btn-ghost"
            href="#/welcome"
            style={{ background: 'rgba(255,255,255,0.95)', textDecoration: 'none' }}
            title="Replay the introductory welcome guide"
          >
            👋 Welcome Tour
          </a>
        </div>
      </div>

      {/* Interactive Calming Breathing Widget */}
      {showBreathing && (
        <div className="breathing-box card" aria-live="polite">
          <h3>Box Breathing for Calm</h3>
          <p className="muted">Follow the circle: Inhale gently for 4, hold for 4, exhale slowly for 6.</p>
          <div className="breathing-circle">
            <span>Breathe</span>
          </div>
          <p className="small muted">Feel your feet on the ground and release the tension in your shoulders.</p>
        </div>
      )}

      {/* Navigation Grid */}
      <div className="grid">
        {tiles.map((t) => (
          <a key={t.href} className="tile" href={t.href}>
            <span className="tile-icon" aria-hidden="true">{t.icon}</span>
            <span className="tile-title">{t.title}</span>
            <span className="tile-text">{t.text}</span>
            {t.status && <span className="badge">{t.status}</span>}
          </a>
        ))}
      </div>
    </section>
  )
}
