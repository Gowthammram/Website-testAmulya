import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { Notice } from '../components/Notice'
import { api } from '../services/api'

const toLines = (items: string[]): string => items.join('\n')
const fromLines = (text: string): string[] =>
  text.split('\n').map((l) => l.trim()).filter((l) => l.length > 0)

export function SafetyPlanPage() {
  const [activities, setActivities] = useState('')
  const [people, setPeople] = useState('')
  const [steps, setSteps] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    api
      .getPlan()
      .then((plan) => {
        setActivities(toLines(plan.activities))
        setPeople(toLines(plan.people))
        setSteps(toLines(plan.professional_steps))
      })
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false))
  }, [])

  async function submit(event: FormEvent) {
    event.preventDefault()
    setError(null)
    setSaved(false)
    try {
      await api.savePlan({
        activities: fromLines(activities),
        people: fromLines(people),
        professional_steps: fromLines(steps),
      })
      setSaved(true)
    } catch (e) {
      setError((e as Error).message)
    }
  }

  if (loading) return <p className="muted">Loading…</p>

  return (
    <section>
      <h1>My safety plan</h1>
      <p>
        A plan made while you feel okay can help when things feel heavy. Write one item per line. Small and simple is
        fine.
      </p>
      {error && <Notice kind="error">{error}</Notice>}
      {saved && <Notice kind="success">Your safety plan is saved on this computer.</Notice>}

      <form className="card" onSubmit={submit}>
        <label className="field">
          <span>Things that help me feel a little better</span>
          <textarea rows={4} value={activities} onChange={(e) => setActivities(e.target.value)}
            placeholder={'Walk outside\nListen to a favourite song\nDrink some water'} />
        </label>
        <label className="field">
          <span>People I can contact</span>
          <textarea rows={4} value={people} onChange={(e) => setPeople(e.target.value)}
            placeholder={'Name and phone number'} />
        </label>
        <label className="field">
          <span>Steps to reach professional support</span>
          <textarea rows={4} value={steps} onChange={(e) => setSteps(e.target.value)}
            placeholder={'Call Tele-MANAS 14416\nCall my doctor or counsellor'} />
        </label>
        <button className="btn btn-primary" type="submit">Save plan</button>
      </form>
    </section>
  )
}
