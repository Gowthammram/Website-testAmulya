// Small settings kept in this browser only (never sent anywhere).
const KEYS = {
  onboarded: 'amulya.onboarded',
  displayName: 'amulya.displayName',
}

function read(key: string): string | null {
  try {
    return localStorage.getItem(key)
  } catch {
    return null
  }
}

function write(key: string, value: string): void {
  try {
    localStorage.setItem(key, value)
  } catch {
    /* storage may be blocked (private mode); the app still works */
  }
}

export const isOnboarded = (): boolean => read(KEYS.onboarded) === 'yes'
export const setOnboarded = (): void => write(KEYS.onboarded, 'yes')
export const getDisplayName = (): string => read(KEYS.displayName) ?? ''
export const setDisplayName = (name: string): void => write(KEYS.displayName, name.trim().slice(0, 40))

export function clearLocalSettings(): void {
  try {
    Object.values(KEYS).forEach((k) => localStorage.removeItem(k))
  } catch {
    /* ignore */
  }
}
