import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { Notice } from '../components/Notice'
import { api } from '../services/api'
import type { Contact } from '../types'

interface ContactsPageProps {
  onDone?: () => void
  onSkip?: () => void
}

export function ContactsPage({ onDone, onSkip }: ContactsPageProps) {
  const [contact, setContact] = useState<Contact | null>(null)
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [relationship, setRelationship] = useState('')
  const [consent, setConsent] = useState(false)

  useEffect(() => {
    api
      .getContact()
      .then((c) => {
        setContact(c)
        setEditing(c === null)
      })
      .catch((e: Error) => {
        setError(e.message)
        setEditing(true)
      })
      .finally(() => setLoading(false))
  }, [])

  function startEdit() {
    if (contact) {
      setName(contact.name)
      setPhone(contact.phone)
      setRelationship(contact.relationship ?? '')
    }
    setConsent(false) // consent is asked again whenever details change
    setSaved(false)
    setEditing(true)
  }

  async function submit(event: FormEvent) {
    event.preventDefault()
    setError(null)
    try {
      const next = await api.saveContact({ name, phone, relationship, consent })
      setContact(next)
      setEditing(false)
      setSaved(true)
    } catch (e) {
      setError((e as Error).message)
    }
  }

  async function remove() {
    if (!window.confirm('Remove your trusted contact?')) return
    try {
      await api.deleteContact()
      setContact(null)
      setName('')
      setPhone('')
      setRelationship('')
      setEditing(true)
      setSaved(false)
    } catch (e) {
      setError((e as Error).message)
    }
  }

  if (loading) return <p className="muted">Loading…</p>

  return (
    <section>
      <h1>Trusted contact</h1>
      <p>Choose one person you trust. You decide if and when they are contacted. It is always your choice.</p>
      {error && <Notice kind="error">{error}</Notice>}
      {saved && <Notice kind="success">Saved. Your trusted contact is stored on this computer.</Notice>}

      {contact && !editing && (
        <div className="card">
          <h3>{contact.name}</h3>
          <p>{contact.phone}{contact.relationship ? ` · ${contact.relationship}` : ''}</p>
          <p className="muted">Consent given: {new Date(contact.consented_at).toLocaleString()}</p>
          <div className="row">
            <button className="btn" onClick={startEdit}>Edit</button>
            <button className="btn btn-ghost" onClick={remove}>Remove</button>
          </div>
        </div>
      )}

      {editing && (
        <form className="card" onSubmit={submit}>
          <label className="field">
            <span>Name</span>
            <input value={name} onChange={(e) => setName(e.target.value)} required maxLength={80} autoComplete="off" />
          </label>
          <label className="field">
            <span>Phone number (with country code)</span>
            <input
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              required
              inputMode="tel"
              placeholder="+919876543210"
              autoComplete="off"
            />
          </label>
          <label className="field">
            <span>Relationship (optional)</span>
            <input value={relationship} onChange={(e) => setRelationship(e.target.value)} maxLength={40} />
          </label>

          <Notice>
            <strong>How this works:</strong> if you choose to, Amulya can prepare a short message for this person. You
            will see the message and what it contains first, and nothing is sent until you confirm. This prototype only
            simulates sending. Your video, chats and safety plan are never shared with them.
          </Notice>

          <label className="check">
            <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} />
            <span>I understand, and I agree that this person can be contacted only when I choose.</span>
          </label>

          <div className="row">
            <button className="btn btn-primary" type="submit" disabled={!consent}>Save contact</button>
            {contact && <button className="btn btn-ghost" type="button" onClick={() => setEditing(false)}>Cancel</button>}
          </div>
        </form>
      )}

      {(onDone || onSkip) && (
        <div className="row">
          {contact && !editing && onDone && <button className="btn btn-primary" onClick={onDone}>Continue</button>}
          {onSkip && <button className="btn btn-ghost" onClick={onSkip}>Skip for now</button>}
        </div>
      )}
    </section>
  )
}
