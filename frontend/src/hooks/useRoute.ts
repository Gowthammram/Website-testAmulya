import { useEffect, useState } from 'react'

export type Route = 'home' | 'chat' | 'video' | 'contacts' | 'plan' | 'emergency' | 'settings' | 'welcome'

const ROUTES: Route[] = ['home', 'chat', 'video', 'contacts', 'plan', 'emergency', 'settings', 'welcome']

export function parseRoute(hash: string): Route {
  const name = hash.replace(/^#\/?/, '')
  return (ROUTES as string[]).includes(name) ? (name as Route) : 'home'
}

/** A tiny router: the page is chosen from the part of the address after '#'. */
export function useRoute(): Route {
  const [route, setRoute] = useState<Route>(() => parseRoute(window.location.hash))
  useEffect(() => {
    const onChange = () => setRoute(parseRoute(window.location.hash))
    window.addEventListener('hashchange', onChange)
    return () => window.removeEventListener('hashchange', onChange)
  }, [])
  return route
}

export function go(route: Route): void {
  window.location.hash = `#/${route}`
}
