import type { ReactNode } from 'react'
import { go } from '../hooks/useRoute'
import type { Route } from '../hooks/useRoute'

const NAV: { route: Route; label: string; icon: string }[] = [
  { route: 'home', label: 'Home', icon: '🏠' },
  { route: 'chat', label: 'Talk', icon: '💬' },
  { route: 'video', label: 'My Video', icon: '🎥' },
  { route: 'contacts', label: 'Contact', icon: '🤝' },
  { route: 'plan', label: 'Safety plan', icon: '🌱' },
  { route: 'settings', label: 'Privacy', icon: '🔒' },
]

interface LayoutProps {
  route: Route
  children: ReactNode
}

export function Layout({ route, children }: LayoutProps) {
  return (
    <div className="app">
      <header className="header">
        <a className="brand" href="#/home" aria-label="Amulya home">
          <span className="brand-name">
            <img src="/logo.png" alt="Amulya logo" className="brand-logo" /> AMULYA
          </span>
          <span className="brand-tag">Every Life Is Priceless • Hope & Connection</span>
        </a>
        {/* Always visible, calm but clear. Never hidden behind a menu. */}
        <button className="btn btn-help" onClick={() => go('emergency')}>
          <span className="help-pulse" aria-hidden="true" />
          <span>Need help now?</span>
        </button>
      </header>

      <nav className="nav" aria-label="Main">
        {NAV.map((item) => (
          <a
            key={item.route}
            href={`#/${item.route}`}
            className={route === item.route ? 'nav-link active' : 'nav-link'}
            aria-current={route === item.route ? 'page' : undefined}
          >
            <span aria-hidden="true">{item.icon}</span>
            <span>{item.label}</span>
          </a>
        ))}
      </nav>

      <main className="main">{children}</main>

      <footer className="footer">
        <p><strong>Amulya</strong>: You are valuable, and your story matters. Tomorrow needs you.</p>
        <p className="small muted">
          Prototype only • Not a replacement for professional clinical care • Emergency: <strong>112</strong> & <strong>14416</strong>
        </p>
      </footer>
    </div>
  )
}
