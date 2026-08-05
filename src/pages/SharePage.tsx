import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useTripStore } from '../store/useTripStore'
import { useShareStore } from '../store/useShareStore'
import { TopBar } from '../components/layout/TopBar'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Input'
import { EmptyState } from '../components/ui/EmptyState'
import { formatDateRange } from '../utils/dateUtils'

interface SharePageProps {
  readOnly?: boolean
}

export function SharePage({ readOnly = false }: SharePageProps) {
  const { tripId, shareToken: tokenParam } = useParams<{ tripId?: string; shareToken?: string }>()
  const navigate = useNavigate()
  const { getTrip, addCollaborator, removeCollaborator } = useTripStore()
  const { createShareToken, getShareToken, getTokensForTrip, revokeShareToken } = useShareStore()

  const [copied, setCopied] = useState(false)
  const [nickname, setNickname] = useState('')

  // 공유 링크로 진입한 경우
  if (readOnly && tokenParam) {
    const tokenData = getShareToken(tokenParam)
    if (!tokenData) {
      return (
        <div className="flex flex-col min-h-full">
          <TopBar title="공유된 여행" showBack={false} />
          <EmptyState emoji="😅" title="링크가 유효하지 않아요" subtitle="이미 만료됐거나 삭제된 링크예요" />
        </div>
      )
    }
    const sharedTrip = getTrip(tokenData.tripId)
    if (!sharedTrip) {
      return (
        <div className="flex flex-col min-h-full">
          <TopBar title="공유된 여행" showBack={false} />
          <EmptyState emoji="😅" title="여행을 찾을 수 없어요" />
        </div>
      )
    }
    return (
      <div className="flex flex-col min-h-full">
        <TopBar title="공유된 여행" showBack={false} />
        <div className="flex-1 p-5">
          <div className="bg-white rounded-2xl p-5 border border-gray-100">
            <p className="text-xs text-[#3182F6] font-semibold mb-1">공유받은 여행</p>
            <h2 className="text-xl font-bold text-gray-900">{sharedTrip.title}</h2>
            <p className="text-sm text-gray-500 mt-1">📍 {sharedTrip.destination}</p>
            <p className="text-xs text-gray-400 mt-0.5">{formatDateRange(sharedTrip.startDate, sharedTrip.endDate)}</p>
          </div>
          <div className="mt-4 bg-blue-50 rounded-2xl p-4 text-sm text-blue-700">
            이 여행은 읽기 전용으로 공유됐어요.
          </div>
        </div>
      </div>
    )
  }

  // 내 여행 공유 페이지
  const trip = getTrip(tripId!)
  if (!trip) { navigate('/'); return null }

  const tokens = getTokensForTrip(tripId!)
  const shareUrl = tokens[0] ? `${window.location.origin}/shared/${tokens[0].token}` : null

  function handleCreateLink() {
    const token = createShareToken(tripId!, 'view')
    const url = `${window.location.origin}/shared/${token.token}`
    navigator.clipboard.writeText(url).then(() => setCopied(true))
    setTimeout(() => setCopied(false), 2000)
  }

  function handleCopy() {
    if (!shareUrl) return
    navigator.clipboard.writeText(shareUrl).then(() => setCopied(true))
    setTimeout(() => setCopied(false), 2000)
  }

  function handleAddFriend() {
    if (!nickname.trim()) return
    addCollaborator(tripId!, nickname.trim())
    setNickname('')
  }

  return (
    <div className="flex flex-col min-h-full">
      <TopBar title="공유 & 동행" />

      <div className="flex-1 overflow-y-auto p-5 flex flex-col gap-6">
        {/* 공유 링크 */}
        <div>
          <h2 className="font-bold text-gray-900 mb-3">🔗 공유 링크</h2>
          {shareUrl ? (
            <div className="bg-gray-50 rounded-2xl p-4 flex flex-col gap-3">
              <p className="text-xs text-gray-500 break-all font-mono">{shareUrl}</p>
              <div className="flex gap-2">
                <Button variant="secondary" size="sm" onClick={handleCopy} className="flex-1">
                  {copied ? '✅ 복사됨' : '링크 복사'}
                </Button>
                <Button variant="ghost" size="sm" onClick={() => revokeShareToken(tokens[0].token)}>
                  삭제
                </Button>
              </div>
            </div>
          ) : (
            <Button fullWidth variant="secondary" onClick={handleCreateLink}>
              + 공유 링크 만들기
            </Button>
          )}
        </div>

        {/* 동행자 */}
        <div>
          <h2 className="font-bold text-gray-900 mb-3">👥 동행자</h2>
          {trip.collaborators.length > 0 && (
            <div className="flex flex-col gap-2 mb-3">
              {trip.collaborators.map(c => (
                <div key={c.id} className="flex items-center justify-between bg-white rounded-xl px-4 py-3 border border-gray-100">
                  <div className="flex items-center gap-3">
                    <div
                      style={{ backgroundColor: c.avatarColor }}
                      className="w-9 h-9 rounded-full flex items-center justify-center text-white font-bold text-sm"
                    >
                      {c.nickname[0]}
                    </div>
                    <span className="font-medium text-gray-900 text-sm">{c.nickname}</span>
                  </div>
                  <button
                    onClick={() => removeCollaborator(tripId!, c.id)}
                    className="text-gray-300 hover:text-red-400 transition-colors"
                  >×</button>
                </div>
              ))}
            </div>
          )}
          <div className="flex gap-2">
            <div className="flex-1">
              <Input
                placeholder="동행자 이름"
                value={nickname}
                onChange={e => setNickname(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') handleAddFriend() }}
              />
            </div>
            <Button onClick={handleAddFriend} disabled={!nickname.trim()}>추가</Button>
          </div>
        </div>
      </div>
    </div>
  )
}
