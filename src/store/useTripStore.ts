import { useLocalStorage } from '../hooks/useLocalStorage'
import type { Trip, TripDay, Place } from '../types'
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
    const days: TripDay[] = dates.map(d => ({
      date: d.toISOString().slice(0, 10),
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
      collaborators: [],
      createdAt: now,
      updatedAt: now,
    }
    setTrips([trip, ...trips])
    return trip
  }

  function getTrip(id: string): Trip | undefined {
    return trips.find(t => t.id === id)
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

  return { trips, getTrip, createTrip, updateTrip, deleteTrip, addPlace, addPlacesBulk, updatePlace, deletePlace, reorderPlaces, addCollaborator, removeCollaborator }
}
