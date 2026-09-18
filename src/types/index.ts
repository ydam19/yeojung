export interface LatLng {
  lat: number
  lng: number
}

export type PlaceCategory =
  | 'attraction'
  | 'restaurant'
  | 'cafe'
  | 'accommodation'
  | 'transport'
  | 'shopping'
  | 'other'

export const PLACE_CATEGORY_LABELS: Record<PlaceCategory, string> = {
  attraction: '명소',
  restaurant: '식당',
  cafe: '카페',
  accommodation: '숙소',
  transport: '교통',
  shopping: '쇼핑',
  other: '기타',
}

export const PLACE_CATEGORY_EMOJI: Record<PlaceCategory, string> = {
  attraction: '🏛️',
  restaurant: '🍽️',
  cafe: '☕',
  accommodation: '🏨',
  transport: '🚌',
  shopping: '🛍️',
  other: '📍',
}

export interface Place {
  id: string
  name: string
  address?: string
  coordinates?: LatLng
  category: PlaceCategory
  startTime?: string
  endTime?: string
  notes?: string
  order: number
}

export interface TripDay {
  date: string
  places: Place[]
}

export interface Collaborator {
  id: string
  nickname: string
  avatarColor: string
  addedAt: string
}

export interface Accommodation {
  id: string
  name: string
  address?: string
  latitude: number
  longitude: number
  checkIn: string
  checkOut: string
  pricePerNight: number
}

export interface Trip {
  id: string
  title: string
  destination: string
  coverImageBase64?: string
  startDate: string
  endDate: string
  days: TripDay[]
  accommodations: Accommodation[]
  collaborators: Collaborator[]
  createdAt: string
  updatedAt: string
}

export type MoodEmoji = '😄' | '😊' | '😐' | '😢' | '😍' | '🤩' | '😴'

export const MOOD_EMOJIS: MoodEmoji[] = ['😄', '😊', '😐', '😢', '😍', '🤩', '😴']

export interface DiaryPhoto {
  id: string
  base64: string
  caption?: string
}

export interface DiaryEntry {
  id: string
  tripId: string
  date: string
  title: string
  memo: string
  photos: DiaryPhoto[]
  mood?: MoodEmoji
  createdAt: string
  updatedAt: string
}

export interface ShareToken {
  token: string
  tripId: string
  createdAt: string
  expiresAt?: string
  permissions: 'view' | 'edit'
}

export interface AppStorage {
  trips: Trip[]
  diaryEntries: DiaryEntry[]
  shareTokens: ShareToken[]
}
