import type { Resource } from '../types'

/**
 * Used when the backend cannot be reached, so emergency numbers are ALWAYS on screen.
 * VERIFY these numbers before any real release.
 */
export const FALLBACK_RESOURCES: Resource[] = [
  {
    id: 'emergency-112',
    name: 'India emergency number',
    number: '112',
    description: 'For immediate danger to life. Connects to police, ambulance and fire services.',
    verified: false,
  },
  {
    id: 'tele-manas',
    name: 'Tele-MANAS',
    number: '14416',
    description: 'Free mental-health support line run by the Government of India.',
    verified: false,
  },
]

export const LOCAL_FALLBACK_REPLY =
  "I can't reach my service right now, but I'm still here with you. Try breathing in for 4 counts and out for 6, a few times. " +
  'If you may be in danger, please use the Emergency button above, or call 112 or Tele-MANAS (14416).'
