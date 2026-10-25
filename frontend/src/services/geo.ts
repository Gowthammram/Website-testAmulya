import type { GeoPosition } from '../types'

/** Maps the browser's numeric location error codes to calm, helpful sentences. */
export function describeGeoError(code: number): string {
  switch (code) {
    case 1:
      return 'Location access was blocked. You can allow it from the lock icon next to the address bar, or continue without sharing location.'
    case 2:
      return 'Your location is not available right now. Check that location is turned on for your device.'
    case 3:
      return 'Finding your location took too long. Please try again.'
    default:
      return 'Your location could not be found.'
  }
}

/** Asks the browser for the current position. Only call this after the person clicks a button. */
export function getPosition(timeoutMs = 10000): Promise<GeoPosition> {
  return new Promise((resolve, reject) => {
    if (typeof navigator === 'undefined' || !('geolocation' in navigator)) {
      reject(new Error('This browser does not support location.'))
      return
    }
    navigator.geolocation.getCurrentPosition(
      (pos) =>
        resolve({
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
          accuracy: pos.coords.accuracy,
        }),
      (err) => reject(new Error(describeGeoError(err.code))),
      { enableHighAccuracy: true, timeout: timeoutMs, maximumAge: 0 },
    )
  })
}

export const QUICK_DEMO_SECONDS = 10
export const REALISTIC_SECONDS = 300
