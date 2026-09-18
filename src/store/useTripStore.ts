import { useLocalStorage } from '../hooks/useLocalStorage'
import type { Trip, TripDay, Place, Accommodation } from '../types'
import { eachDayOfInterval, parseISO } from 'date-fns'
import { v4 as uuid } from 'uuid'

const TRIPS_KEY = 'yeojung_trips'

export function useTripStore() {
  const [trips, setTrips] = useLocalStorage<Trip[]>(TRIPS_KEY, [])

  function createTrip(input: {
    title: string
    destination: string
    startDate: string
    endDate: string
    coverImageBase64?: string
  }): Trip {
    const dates = eachDayOfInterval({
      start: parseISO(input.startDate),
      end: parseISO(input.endDate),
    })
    // toISOString()은 UTC 기준이라 한국(UTC+9) 등 동쪽 타임존에서 날짜가 하루 뒤로 밀림.
    // getFullYear/Month/Date()는 로컬 타임존 기준이므로 올바른 날짜 문자열을 생성.
    const localDateStr = (d: Date): string =>
      `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`

    const days: TripDay[] = dates.map(d => ({
      date: localDateStr(d),
      places: [],
    }))
    const now = new Date().toISOString()
    const trip: Trip = {
      id: uuid(),
      title: input.title,
      destination: input.destination,
      startDate: input.startDate,
      endDate: input.endDate,
      coverImageBase64: input.coverImageBase64,
      days,
      accommodations: [],
      collaborators: [],
      createdAt: now,
      updatedAt: now,
    }
    setTrips([trip, ...trips])
    return trip
  }

  function getTrip(id: string): Trip | undefined {
    const trip = trips.find(t => t.id === id)
    if (!trip) return undefined
    // 구버전 데이터에 accommodations 필드가 없을 수 있으므로 기본값 보장
    return { ...trip, accommodations: trip.accommodations ?? [] }
  }

  function updateTrip(id: string, patch: Partial<Omit<Trip, 'id' | 'createdAt'>>) {
    setTrips(trips.map(t => t.id === id ? { ...t, ...patch, updatedAt: new Date().toISOString() } : t))
  }

  function deleteTrip(id: string) {
    setTrips(trips.filter(t => t.id !== id))
  }

  function addPlace(tripId: string, dayIndex: number, place: Omit<Place, 'id' | 'order'>) {
    setTrips(trips.map(t => {
      if (t.id !== tripId) return t
      const days = t.days.map((d, i) => {
        if (i !== dayIndex) return d
        const newPlace: Place = { ...place, id: uuid(), order: d.places.length }
        return { ...d, places: [...d.places, newPlace] }
      })
      return { ...t, days, updatedAt: new Date().toISOString() }
    }))
  }

  function addPlacesBulk(tripId: string, dayIndex: number, places: Omit<Place, 'id' | 'order'>[]) {
    setTrips(trips.map(t => {
      if (t.id !== tripId) return t
      const days = t.days.map((d, i) => {
        if (i !== dayIndex) return d
        const newPlaces: Place[] = places.map((p, idx) => ({ ...p, id: uuid(), order: d.places.length + idx }))
        return { ...d, places: [...d.places, ...newPlaces] }
      })
      return { ...t, days, updatedAt: new Date().toISOString() }
    }))
  }

  function updatePlace(tripId: string, dayIndex: number, placeId: string, patch: Partial<Place>) {
    setTrips(trips.map(t => {
      if (t.id !== tripId) return t
      const days = t.days.map((d, i) => {
        if (i !== dayIndex) return d
        return { ...d, places: d.places.map(p => p.id === placeId ? { ...p, ...patch } : p) }
      })
      return { ...t, days, updatedAt: new Date().toISOString() }
    }))
  }

  function deletePlace(tripId: string, dayIndex: number, placeId: string) {
    setTrips(trips.map(t => {
      if (t.id !== tripId) return t
      const days = t.days.map((d, i) => {
        if (i !== dayIndex) return d
        const places = d.places.filter(p => p.id !== placeId).map((p, idx) => ({ ...p, order: idx }))
        return { ...d, places }
      })
      return { ...t, days, updatedAt: new Date().toISOString() }
    }))
  }

  function reorderPlaces(tripId: string, dayIndex: number, newOrder: Place[]) {
    setTrips(trips.map(t => {
      if (t.id !== tripId) return t
      const days = t.days.map((d, i) => {
        if (i !== dayIndex) return d
        return { ...d, places: newOrder.map((p, idx) => ({ ...p, order: idx })) }
      })
      return { ...t, days, updatedAt: new Date().toISOString() }
    }))
  }

  function addAccommodation(tripId: string, accom: Omit<Accommodation, 'id'>) {
    setTrips(trips.map(t => {
      if (t.id !== tripId) return t
      const newAccom: Accommodation = { ...accom, id: uuid() }
      return { ...t, accommodations: [...(t.accommodations ?? []), newAccom], updatedAt: new Date().toISOString() }
    }))
  }

  function updateAccommodation(tripId: string, accomId: string, patch: Partial<Omit<Accommodation, 'id'>>) {
    setTrips(trips.map(t => {
      if (t.id !== tripId) return t
      return {
        ...t,
        accommodations: (t.accommodations ?? []).map(a => a.id === accomId ? { ...a, ...patch } : a),
        updatedAt: new Date().toISOString(),
      }
    }))
  }

  function deleteAccommodation(tripId: string, accomId: string) {
    setTrips(trips.map(t => {
      if (t.id !== tripId) return t
      return {
        ...t,
        accommodations: (t.accommodations ?? []).filter(a => a.id !== accomId),
        updatedAt: new Date().toISOString(),
      }
    }))
  }

  function addCollaborator(tripId: string, nickname: string) {
    const colors = ['#3182F6', '#F59E0B', '#10B981', '#EF4444', '#8B5CF6', '#EC4899']
    const color = colors[Math.floor(Math.random() * colors.length)]
    setTrips(trips.map(t => {
      if (t.id !== tripId) return t
      const collaborator = {
        id: uuid(),
        nickname,
        avatarColor: color,
        addedAt: new Date().toISOString(),
      }
      return { ...t, collaborators: [...t.collaborators, collaborator], updatedAt: new Date().toISOString() }
    }))
  }

  function removeCollaborator(tripId: string, collaboratorId: string) {
    setTrips(trips.map(t => {
      if (t.id !== tripId) return t
      return { ...t, collaborators: t.collaborators.filter(c => c.id !== collaboratorId), updatedAt: new Date().toISOString() }
    }))
  }

  return { trips, getTrip, createTrip, updateTrip, deleteTrip, addPlace, addPlacesBulk, updatePlace, deletePlace, reorderPlaces, addAccommodation, updateAccommodation, deleteAccommodation, addCollaborator, removeCollaborator }
}
