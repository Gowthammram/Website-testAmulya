import { describe, expect, it } from 'vitest'
import { detailToMessage } from './api'
import { describeGeoError } from './geo'
import { FALLBACK_RESOURCES } from './support'
import { describeCameraError } from './videoStore'
import { parseRoute } from '../hooks/useRoute'

describe('camera permission denial and other camera errors', () => {
  it('explains a blocked camera and says skipping is fine', () => {
    const message = describeCameraError(new DOMException('denied', 'NotAllowedError'))
    expect(message).toContain('blocked')
    expect(message).toContain('skip')
  })

  it('handles a missing camera and an unknown error', () => {
    expect(describeCameraError(new DOMException('x', 'NotFoundError'))).toContain('No camera')
    expect(describeCameraError(new Error('weird'))).toContain('could not be started')
    expect(describeCameraError(undefined)).toContain('could not be started')
  })
})

describe('location errors', () => {
  it('explains permission denial (code 1)', () => {
    expect(describeGeoError(1)).toContain('blocked')
  })
  it('explains unavailable (2), timeout (3) and unknown codes', () => {
    expect(describeGeoError(2)).toContain('not available')
    expect(describeGeoError(3)).toContain('too long')
    expect(describeGeoError(99)).toContain('could not be found')
  })
})

describe('emergency resources', () => {
  it('always include 112 and Tele-MANAS 14416 even without the server', () => {
    const numbers = FALLBACK_RESOURCES.map((r) => r.number)
    expect(numbers).toContain('112')
    expect(numbers).toContain('14416')
  })
})

describe('api error messages', () => {
  it('reads string and validation-style details', () => {
    expect(detailToMessage('Add a trusted contact first.', 'x')).toBe('Add a trusted contact first.')
    expect(detailToMessage([{ msg: 'Value error, consent is required' }], 'x')).toBe('consent is required')
    expect(detailToMessage(null, 'fallback')).toBe('fallback')
  })
})

describe('routing', () => {
  it('maps hashes to pages and defaults to home', () => {
    expect(parseRoute('#/emergency')).toBe('emergency')
    expect(parseRoute('#/nonsense')).toBe('home')
    expect(parseRoute('')).toBe('home')
  })
})
