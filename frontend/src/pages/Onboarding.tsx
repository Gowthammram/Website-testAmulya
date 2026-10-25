import { useState } from 'react'
import { ContactsPage } from './ContactsPage'
import { VideoPage } from './VideoPage'

interface OnboardingProps {
  onFinish: () => void
}

const STEPS = ['Welcome', 'How it works', 'Video', 'Trusted contact']

export function Onboarding({ onFinish }: OnboardingProps) {
  const [step, setStep] = useState(0)
  const [understood, setUnderstood] = useState(false)
  const next = () => setStep((s) => s + 1)

  return (
    <div className="app onboarding">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
        <p className="steps" style={{ margin: 0 }} aria-label={`Step ${step + 1} of ${STEPS.length}`}>
          Step {step + 1} of {STEPS.length}: {STEPS[step]}
        </p>
        <button
          type="button"
          className="btn btn-ghost"
          style={{ fontSize: '0.85rem', padding: '4px 10px' }}
          onClick={onFinish}
        >
          Skip to home &times;
        </button>
      </div>

      {step === 0 && (
        <section className="hero">
          <img src="/logo.png" alt="Amulya logo" className="hero-logo" />
          <h1 className="hero-name">AMULYA</h1>
          <p className="hero-tag">Every Life Is Priceless.</p>
          <p className="lead">
            A calm place to talk about how you feel, keep a message for your future self, and connect with real people
            who can help.
          </p>
          <button className="btn btn-primary btn-big" onClick={next}>Get started</button>
        </section>
      )}

      {step === 1 && (
        <section>
          <h1>Before you begin</h1>
          <div className="card">
            <h3>What Amulya is, and is not</h3>
            <ul>
              <li>Amulya is a supportive companion that helps you reach people. It is <strong>not</strong> a therapist, a doctor, or an emergency service.</li>
              <li>It cannot predict or prevent suicide, and it cannot guarantee anyone's safety.</li>
              <li>If you are in danger, call <strong>112</strong> or Tele-MANAS <strong>14416</strong>. The “Need help now?” button is always at the top.</li>
            </ul>
          </div>
          <div className="card">
            <h3>Your information</h3>
            <ul>
              <li><strong>Stored on your device:</strong> your personal video, and small settings.</li>
              <li><strong>Stored on the Amulya server (your computer in this prototype):</strong> your trusted contact, safety plan and test events.</li>
              <li><strong>Sent to an AI service:</strong> only the messages you write in the chat, to produce replies.</li>
              <li><strong>Never shared automatically:</strong> your video, location and chats are never sent to anyone unless you review and confirm it. In this prototype, sending is simulated.</li>
            </ul>
          </div>
          <label className="check">
            <input type="checkbox" checked={understood} onChange={(e) => setUnderstood(e.target.checked)} />
            <span>I understand how Amulya works and its limits.</span>
          </label>
          <button className="btn btn-primary" onClick={next} disabled={!understood}>Continue</button>
        </section>
      )}

      {step === 2 && <VideoPage onDone={next} onSkip={next} />}
      {step === 3 && <ContactsPage onDone={onFinish} onSkip={onFinish} />}
    </div>
  )
}
