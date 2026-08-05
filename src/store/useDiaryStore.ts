import { useLocalStorage } from '../hooks/useLocalStorage'
import type { DiaryEntry } from '../types'
import { v4 as uuid } from 'uuid'

const DIARY_KEY = 'yeojung_diary'

export function useDiaryStore() {
  const [entries, setEntries] = useLocalStorage<DiaryEntry[]>(DIARY_KEY, [])

  function getEntriesForTrip(tripId: string): DiaryEntry[] {
    return entries.filter(e => e.tripId === tripId)
  }

  function getEntry(id: string): DiaryEntry | undefined {
    return entries.find(e => e.id === id)
  }

  function createEntry(input: Omit<DiaryEntry, 'id' | 'createdAt' | 'updatedAt'>): DiaryEntry {
    const now = new Date().toISOString()
    const entry: DiaryEntry = { ...input, id: uuid(), createdAt: now, updatedAt: now }
    setEntries([...entries, entry])
    return entry
  }

  function updateEntry(id: string, patch: Partial<Omit<DiaryEntry, 'id' | 'tripId' | 'createdAt'>>) {
    setEntries(entries.map(e => e.id === id ? { ...e, ...patch, updatedAt: new Date().toISOString() } : e))
  }

  function deleteEntry(id: string) {
    setEntries(entries.filter(e => e.id !== id))
  }

  return { entries, getEntriesForTrip, getEntry, createEntry, updateEntry, deleteEntry }
}
