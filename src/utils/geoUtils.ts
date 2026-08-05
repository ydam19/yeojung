import type { LatLng, Place } from '../types'

const SEOUL_DEFAULT: LatLng = { lat: 37.5665, lng: 126.978 }

export function haversineDistance(a: LatLng, b: LatLng): number {
  const R = 6371
  const dLat = ((b.lat - a.lat) * Math.PI) / 180
  const dLng = ((b.lng - a.lng) * Math.PI) / 180
  const x =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((a.lat * Math.PI) / 180) * Math.cos((b.lat * Math.PI) / 180) * Math.sin(dLng / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x))
}

export function defaultCenter(places: Place[]): LatLng {
  const coords = places.map(p => p.coordinates).filter(Boolean) as LatLng[]
  if (coords.length === 0) return SEOUL_DEFAULT
  const lat = coords.reduce((s, c) => s + c.lat, 0) / coords.length
  const lng = coords.reduce((s, c) => s + c.lng, 0) / coords.length
  return { lat, lng }
}

export function getBounds(coords: LatLng[]): [[number, number], [number, number]] | null {
  if (coords.length === 0) return null
  const lats = coords.map(c => c.lat)
  const lngs = coords.map(c => c.lng)
  return [
    [Math.min(...lats), Math.min(...lngs)],
    [Math.max(...lats), Math.max(...lngs)],
  ]
}
