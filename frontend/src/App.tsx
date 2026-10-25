import { useState } from 'react'
import { Layout } from './components/Layout'
import { useRoute } from './hooks/useRoute'
import { ChatPage } from './pages/ChatPage'
import { ContactsPage } from './pages/ContactsPage'
import { Dashboard } from './pages/Dashboard'
import { EmergencyPage } from './pages/EmergencyPage'
import { Onboarding } from './pages/Onboarding'
import { SafetyPlanPage } from './pages/SafetyPlanPage'
import { SettingsPage } from './pages/SettingsPage'
import { VideoPage } from './pages/VideoPage'
import { isOnboarded, setOnboarded } from './services/storage'

export default function App() {
  const route = useRoute()
  const [onboarded, setDone] = useState(isOnboarded())

  // New visitors see onboarding first, or anyone visiting #/welcome to review it.
  if ((!onboarded || route === 'welcome') && route !== 'emergency') {
    return (
      <Onboarding
        onFinish={() => {
          setOnboarded()
          setDone(true)
          window.location.hash = '#/home'
        }}
      />
    )
  }

  return (
    <Layout route={route}>
      {route === 'home' && <Dashboard />}
      {route === 'chat' && <ChatPage />}
      {route === 'video' && <VideoPage />}
      {route === 'contacts' && <ContactsPage />}
      {route === 'plan' && <SafetyPlanPage />}
      {route === 'emergency' && <EmergencyPage />}
      {route === 'settings' && <SettingsPage />}
    </Layout>
  )
}
