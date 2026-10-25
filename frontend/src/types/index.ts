export type Role = 'user' | 'assistant'

export interface ChatMessage {
  role: Role
  content: string
}

export interface ChatResponse {
  reply: string
  risk_level: 'none' | 'elevated' | 'urgent'
  emergency_suggested: boolean
  ai_used: boolean
  used_fallback: boolean
  disclaimer: string
}

export interface Contact {
  name: string
  phone: string
  relationship: string | null
  consented_at: string
}

export interface ContactInput {
  name: string
  phone: string
  relationship: string
  consent: boolean
}

export interface SafetyPlan {
  activities: string[]
  people: string[]
  professional_steps: string[]
}

export interface Resource {
  id: string
  name: string
  number: string
  description: string
  verified?: boolean
}

export interface AlertOptions {
  share_location: boolean
  latitude?: number
  longitude?: number
  accuracy_m?: number
  sender_name?: string
}

export interface AlertPreview {
  recipient_name: string
  recipient_phone_masked: string
  message: string
  shared_items: string[]
  not_shared: string[]
  demo_mode: boolean
  note: string
}

export interface AlertResult {
  status: 'simulated' | 'sent' | 'failed'
  delivered: boolean
  detail: string
}

export interface LocationPreview {
  maps_link: string
  shared_items: string[]
  not_shared: string[]
}

export interface AppEvent {
  id: number
  created_at: string
  kind: string
  status: string
  detail: Record<string, unknown>
}

export interface Health {
  status: string
  demo_mode: boolean
  ai_configured: boolean
}

export interface GeoPosition {
  latitude: number
  longitude: number
  accuracy: number
}
