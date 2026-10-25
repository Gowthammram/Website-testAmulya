import type {
  AlertOptions,
  AlertPreview,
  AlertResult,
  AppEvent,
  ChatMessage,
  ChatResponse,
  Contact,
  ContactInput,
  Health,
  LocationPreview,
  Resource,
  SafetyPlan,
} from '../types'

const BASE = '/api'

export class ApiError extends Error {
  status: number

  constructor(message: string, status: number) {
    super(message)
    this.status = status
  }
}

/** FastAPI sends errors as { detail: "text" } or { detail: [ {msg: "..."} ] }. */
export function detailToMessage(detail: unknown, fallback: string): string {
  if (typeof detail === 'string') return detail
  if (Array.isArray(detail) && detail.length > 0) {
    const first = detail[0] as { msg?: string }
    if (first && typeof first.msg === 'string') return first.msg.replace(/^Value error, /, '')
  }
  return fallback
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  let response: Response
  try {
    response = await fetch(BASE + path, {
      headers: { 'Content-Type': 'application/json' },
      ...init,
    })
  } catch {
    throw new ApiError('Cannot reach the Amulya server. Is the backend running?', 0)
  }
  if (!response.ok) {
    let detail: unknown = null
    try {
      detail = (await response.json()).detail
    } catch {
      /* the server sent no JSON body */
    }
    throw new ApiError(detailToMessage(detail, 'Something went wrong. Please try again.'), response.status)
  }
  return (await response.json()) as T
}

const json = (body: unknown): RequestInit => ({ body: JSON.stringify(body) })

export const api = {
  health: () => request<Health>('/health'),

  chat: (message: string, history: ChatMessage[]) =>
    request<ChatResponse>('/chat', { method: 'POST', ...json({ message, history }) }),

  getContact: async () => (await request<{ contact: Contact | null }>('/contact')).contact,
  saveContact: async (input: ContactInput) =>
    (
      await request<{ contact: Contact }>('/contact', {
        method: 'PUT',
        ...json({
          name: input.name,
          phone: input.phone,
          relationship: input.relationship || null,
          consent: input.consent,
        }),
      })
    ).contact,
  deleteContact: () => request<{ contact: null }>('/contact', { method: 'DELETE' }),

  getPlan: () => request<SafetyPlan>('/safety-plan'),
  savePlan: (plan: SafetyPlan) => request<SafetyPlan>('/safety-plan', { method: 'PUT', ...json(plan) }),

  resources: async () => (await request<{ resources: Resource[] }>('/emergency/resources')).resources,
  alertPreview: (options: AlertOptions) =>
    request<AlertPreview>('/emergency/alert-preview', { method: 'POST', ...json(options) }),
  alertSend: (options: AlertOptions, confirm: boolean) =>
    request<AlertResult>('/emergency/alert-send', { method: 'POST', ...json({ ...options, confirm }) }),

  locationPreview: (latitude: number, longitude: number, accuracy_m: number) =>
    request<LocationPreview>('/location/preview', {
      method: 'POST',
      ...json({ latitude, longitude, accuracy_m }),
    }),
  locationDemoUpdate: (latitude: number, longitude: number, sequence: number) =>
    request<{ status: string }>('/location/demo-update', {
      method: 'POST',
      ...json({ latitude, longitude, sequence }),
    }),

  events: async () => (await request<{ events: AppEvent[] }>('/events')).events,
  deleteAllData: () => request<{ deleted: boolean }>('/data', { method: 'DELETE' }),
}
