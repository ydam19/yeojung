import { useLocalStorage } from '../hooks/useLocalStorage'
import type { ShareToken } from '../types'
import { v4 as uuid } from 'uuid'

const SHARE_KEY = 'yeojung_share'

export function useShareStore() {
  const [shareTokens, setShareTokens] = useLocalStorage<ShareToken[]>(SHARE_KEY, [])

  function createShareToken(tripId: string, permissions: 'view' | 'edit'): ShareToken {
    const token: ShareToken = {
      token: uuid().replace(/-/g, '').slice(0, 8),
      tripId,
      createdAt: new Date().toISOString(),
      permissions,
    }
    setShareTokens([...shareTokens, token])
    return token
  }

  function getShareToken(token: string): ShareToken | undefined {
    return shareTokens.find(t => t.token === token)
  }

  function getTokensForTrip(tripId: string): ShareToken[] {
    return shareTokens.filter(t => t.tripId === tripId)
  }

  function revokeShareToken(token: string) {
    setShareTokens(shareTokens.filter(t => t.token !== token))
  }

  return { shareTokens, createShareToken, getShareToken, getTokensForTrip, revokeShareToken }
}
