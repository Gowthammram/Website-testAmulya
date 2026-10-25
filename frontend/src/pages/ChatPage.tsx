import { useEffect, useRef, useState } from 'react'
import type { FormEvent } from 'react'
import { go } from '../hooks/useRoute'
import { api } from '../services/api'
import { LOCAL_FALLBACK_REPLY } from '../services/support'
import { loadVideo } from '../services/videoStore'
import type { ChatMessage } from '../types'

const GREETING =
  "Hi, I'm here to listen. You can tell me how you're feeling, with no pressure. I'm an AI, not a therapist, and I can't replace people who can help in person."

export function ChatPage() {
  // Conversation lives only in memory. Refreshing the page clears it.
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [showHelp, setShowHelp] = useState(false)
  const [videoUrl, setVideoUrl] = useState<string | null>(null)
  const bottomRef = useRef<HTMLDivElement>(null)

  async function refreshVideo() {
    try {
      const blob = await loadVideo()
      if (blob) {
        setVideoUrl(URL.createObjectURL(blob))
      } else {
        setVideoUrl(null)
      }
    } catch {
      setVideoUrl(null)
    }
  }

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading, showHelp, videoUrl])

  useEffect(() => {
    refreshVideo()
  }, [])

  async function sendMessage(textToSend: string) {
    const text = textToSend.trim()
    if (!text || loading) return
    const history = messages.slice(-10)
    setMessages((m) => [...m, { role: 'user', content: text }])
    setInput('')
    setLoading(true)

    // Immediate client-side check for crisis terms so help and video trigger without delay
    const isCrisis = /\b(want|wanna|need)\s+to\s+die\b|\bkill\s+(myself|my\s+life)\b|\bcommit\s+suicide\b|\bend\s+my\s+life\b|\bhurt\s+myself\b/i.test(text)
    if (isCrisis) {
      setShowHelp(true)
      refreshVideo()
    }

    try {
      const response = await api.chat(text, history)
      setMessages((m) => [...m, { role: 'assistant', content: response.reply }])
      if (response.emergency_suggested || response.risk_level === 'urgent' || isCrisis) {
        setShowHelp(true)
        refreshVideo()
      }
    } catch {
      // Server unreachable: still give a kind reply and keep help one tap away.
      setMessages((m) => [...m, { role: 'assistant', content: LOCAL_FALLBACK_REPLY }])
      setShowHelp(true)
      refreshVideo()
    } finally {
      setLoading(false)
    }
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault()
    sendMessage(input)
  }

  return (
    <section className="chat">
      <h1>Talk it through</h1>

      <div className="messages" role="log" aria-live="polite" aria-label="Conversation">
        <div className="bubble bubble-assistant">{GREETING}</div>
        {messages.map((m, i) => (
          <div key={i} className={m.role === 'user' ? 'bubble bubble-user' : 'bubble bubble-assistant'}>
            {m.content}
          </div>
        ))}
        {loading && <div className="bubble bubble-assistant muted">Listening with care…</div>}

        {/* Immediate Crisis Support & Personal Video Reminder Card rendered right in the chat stream */}
        {showHelp && (
          <div
            className="card card-strong"
            style={{
              marginTop: '12px',
              marginBottom: '12px',
              border: '2.5px solid var(--coral)',
              borderRadius: '16px',
            }}
            aria-live="assertive"
          >
            <h3 style={{ color: 'var(--coral)', display: 'flex', alignItems: 'center', gap: '8px', margin: '0 0 8px' }}>
              <span>💛</span> You don't have to carry this alone
            </h3>
            <p style={{ margin: '0 0 12px' }}>
              It sounds like things are deeply painful right now. Your life is priceless, and real human support is right here for you.
            </p>

            {videoUrl ? (
              <div style={{ marginTop: '12px', marginBottom: '14px' }}>
                <p style={{ fontWeight: 600, color: 'var(--navy)', marginBottom: '8px' }}>
                  🎥 <strong>A reminder from you, to you:</strong> Listen to your own voice and the reasons you saved to keep going:
                </p>
                <video
                  className="video"
                  src={videoUrl}
                  controls
                  autoPlay
                  playsInline
                  aria-label="Your personal reminder video"
                  style={{ maxHeight: '280px', width: '100%', borderRadius: '12px' }}
                />
              </div>
            ) : (
              <div
                className="notice notice-info"
                style={{ marginTop: '10px', marginBottom: '12px', padding: '12px 14px' }}
              >
                <p style={{ fontWeight: 600, marginBottom: '4px' }}>
                  🎥 Personal Video Reminder: Not recorded yet
                </p>
                <p className="small" style={{ marginBottom: '8px' }}>
                  You haven't recorded a personal video reminder yet. Having a message of your reasons to stay can be a grounding anchor.
                </p>
                <button
                  className="btn btn-primary"
                  onClick={() => go('video')}
                  style={{ minHeight: '38px', padding: '6px 16px', fontSize: '0.88rem' }}
                >
                  📹 Record or upload my video now
                </button>
              </div>
            )}

            <div className="row" style={{ marginTop: '8px' }}>
              <a className="btn btn-help" href="tel:112">📞 Call 112 (Emergency)</a>
              <a className="btn btn-primary" href="tel:14416">📞 Call Tele-MANAS (14416)</a>
              <button className="btn btn-ghost" onClick={() => go('emergency')}>More help & trusted contact</button>
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {messages.length === 0 && (
        <div style={{ marginBottom: '14px' }}>
          <p className="small muted" style={{ marginBottom: '6px' }}>Not sure where to begin? Tap a starter:</p>
          <div className="chips-container">
            <button
              type="button"
              className="chip-btn"
              onClick={() => sendMessage("I'm feeling very overwhelmed today")}
            >
              🌿 I'm feeling overwhelmed today
            </button>
            <button
              type="button"
              className="chip-btn"
              onClick={() => sendMessage("Can we do a gentle breathing exercise together?")}
            >
              🌬️ Breathe with me
            </button>
            <button
              type="button"
              className="chip-btn"
              onClick={() => sendMessage("I need a reminder of hope and why life matters")}
            >
              💛 I need a reminder of hope
            </button>
            <button
              type="button"
              className="chip-btn"
              onClick={() => sendMessage("I just need a kind listening ear right now")}
            >
              ☕ Just need someone to listen
            </button>
          </div>
        </div>
      )}

      <form className="composer" onSubmit={handleSubmit}>
        <label htmlFor="chat-input" className="sr-only">Your message</label>
        <textarea
          id="chat-input"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Write whatever is on your mind…"
          rows={2}
          maxLength={2000}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault()
              e.currentTarget.form?.requestSubmit()
            }
          }}
        />
        <button className="btn btn-primary" type="submit" disabled={loading || !input.trim()}>Send</button>
      </form>
      <p className="muted small">Your messages are not saved by Amulya. They are sent to an AI service to write a reply.</p>
    </section>
  )
}
