import { format, parseISO, differenceInDays } from 'date-fns'
import { ko } from 'date-fns/locale'
import type { Trip } from '../types'

export function formatDate(iso: string): string {
  return format(parseISO(iso), 'yyyy년 M월 d일', { locale: ko })
}

export function formatDateShort(iso: string): string {
  return format(parseISO(iso), 'M/d (EEE)', { locale: ko })
}

export function formatDateRange(startDate: string, endDate: string): string {
  const start = parseISO(startDate)
  const end = parseISO(endDate)
  const nights = differenceInDays(end, start)
  return `${format(start, 'yyyy.MM.dd')} ~ ${format(end, 'yyyy.MM.dd')} (${nights}박 ${nights + 1}일)`
}

export function getDayLabel(index: number): string {
  return `Day ${index + 1}`
}

export function getDDayLabel(startDate: string): string {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const start = parseISO(startDate)
  const diff = differenceInDays(start, today)
  if (diff > 0) return `D-${diff}`
  if (diff === 0) return '오늘 출발!'
  return '여행 중'
}

export function getTripStatus(startDate: string, endDate: string): 'upcoming' | 'ongoing' | 'past' {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const start = parseISO(startDate)
  const end = parseISO(endDate)
  if (today < start) return 'upcoming'
  if (today > end) return 'past'
  return 'ongoing'
}

export function getDayIndex(trip: Trip, date: string): number {
  return trip.days.findIndex(d => d.date === date)
}
