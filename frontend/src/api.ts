const API_BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:8000/api'

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  })
  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: 'Request failed' }))
    throw new Error(error.detail ?? 'Request failed')
  }
  return response.json()
}

export type ConversionResult = {
  base_currency: string
  target_currency: string
  amount: number
  rate: number
  converted_amount: number
}

export type Favorite = {
  id: number
  source_currency: string
  target_currency: string
}

export type TravelResult = {
  currency: string
  amount: number
  rate: number
}

export const convert = (base_currency: string, target_currency: string, amount: number) =>
  request<ConversionResult>('/convert', {
    method: 'POST',
    body: JSON.stringify({ base_currency, target_currency, amount }),
  })

export const getFavorites = () => request<{ favorites: Favorite[] }>('/favorites')

export const addFavorite = (source_currency: string, target_currency: string) =>
  request('/favorites', {
    method: 'POST',
    body: JSON.stringify({ source_currency, target_currency }),
  })

export const deleteFavorite = (id: number) => request(`/favorites/${id}`, { method: 'DELETE' })

export const getTravelBudget = (base_currency: string, amount: number) =>
  request<{ base_currency: string; amount: number; results: TravelResult[] }>('/travel-budget', {
    method: 'POST',
    body: JSON.stringify({ base_currency, amount }),
  })
