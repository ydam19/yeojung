/**
 * Kakao Mobility 자동차 길찾기 (Directions) REST API
 *
 * ─ 필요 설정 ──────────────────────────────────────────────────────────────
 *  1. .env.local → VITE_KAKAO_REST_KEY=<REST API 키>
 *  2. vite.config.ts → /api/kakao-directions 프록시 (apis-navi.kakaomobility.com)
 *
 * ─ 실제 API 응답 구조 (확인된 필드명) ─────────────────────────────────────
 *  routes[0].result_code                  : 0 = 성공
 *  routes[0].summary.distance             : 전체 거리 (m)
 *  routes[0].summary.duration             : 전체 소요시간 (초)
 *  routes[0].summary.fare                 : { taxi, toll }
 *  routes[0].sections[].roads[].vertexes  : [lng1,lat1,lng2,lat2,...] flat array
 * ──────────────────────────────────────────────────────────────────────────
 */

const REST_KEY = import.meta.env.VITE_KAKAO_REST_KEY as string | undefined

export const HAS_DIRECTIONS_KEY =
  !!REST_KEY && REST_KEY !== '여기에_카카오_REST_키_입력'

// ─── 캐시 ─────────────────────────────────────────────────────────────────────

/** 경유 경로 결과 캐시: 키 = "lng,lat|lng,lat|..." */
const _cache = new Map<string, [number, number][] | null>()

function _routeKey(stops: Array<{ lat: number; lng: number }>): string {
  return stops.map(s => `${s.lng.toFixed(5)},${s.lat.toFixed(5)}`).join('|')
}

// ─── 단일 Directions API 호출 ─────────────────────────────────────────────────

/**
 * origin → [waypoints...] → destination 경로를 API 한 번으로 조회.
 * 성공 시 도로 좌표 [lng, lat][] 반환, 실패 시 null.
 *
 * waypoints는 최대 5개 (API 제한).
 */
async function _callDirections(
  origin: { lat: number; lng: number },
  destination: { lat: number; lng: number },
  waypoints: Array<{ lat: number; lng: number }> = [],
): Promise<[number, number][] | null> {
  if (!HAS_DIRECTIONS_KEY) return null

  const base = import.meta.env.DEV
    ? '/api/kakao-directions'
    : 'https://apis-navi.kakaomobility.com'

  const params = new URLSearchParams({
    origin:      `${origin.lng},${origin.lat}`,
    destination: `${destination.lng},${destination.lat}`,
    priority:    'RECOMMEND',
  })
  if (waypoints.length > 0) {
    params.set('waypoints', waypoints.map(w => `${w.lng},${w.lat}`).join('|'))
  }

  const url = `${base}/v1/directions?${params}`

  try {
    const res = await fetch(url, {
      headers: { Authorization: `KakaoAK ${REST_KEY}` },
    })

    if (!res.ok) {
      if (import.meta.env.DEV) {
        const text = await res.text().catch(() => '(응답 없음)')
        console.warn(`[kakaoDirections] API 오류 ${res.status}\nURL: ${url}\n${text}`)
      }
      return null
    }

    const json = await res.json()

    if (import.meta.env.DEV) {
      console.log('[kakaoDirections] raw response:', JSON.stringify(json, null, 2))
    }

    const route = json.routes?.[0]
    if (!route || route.result_code !== 0) {
      if (import.meta.env.DEV) {
        console.warn('[kakaoDirections] result_code 오류:', route?.result_code, route?.result_msg)
      }
      return null
    }

    // routes[0].sections[].roads[].vertexes = [lng1, lat1, lng2, lat2, ...]
    const points: [number, number][] = []
    const sections: any[] = Array.isArray(route.sections) ? route.sections : []
    for (const section of sections) {
      const roads: any[] = Array.isArray(section.roads) ? section.roads : []
      for (const road of roads) {
        const vx: number[] = Array.isArray(road.vertexes) ? road.vertexes : []
        for (let i = 0; i + 1 < vx.length; i += 2) {
          points.push([vx[i], vx[i + 1]])
        }
      }
    }

    if (import.meta.env.DEV) {
      console.log(`[kakaoDirections] 경로 포인트 수: ${points.length}`)
    }

    return points.length >= 2 ? points : null
  } catch (e) {
    if (import.meta.env.DEV) console.error('[kakaoDirections] fetch 예외:', e)
    return null
  }
}

// ─── 공개 API ─────────────────────────────────────────────────────────────────

/**
 * 하루 경유지 전체 경로를 자동차 길찾기 API로 조회합니다.
 *
 * - stops: 순서대로 나열된 좌표 배열 (숙소·장소 포함, 최소 2개)
 * - 중간 경유지 수가 5개 이하면 단일 요청으로 처리.
 * - 6개 이상이면 절반으로 재귀 분할 후 결과를 이어붙입니다.
 * - 성공 시 도로 좌표 [lng, lat][] 반환, 실패 시 null.
 * - 결과는 캐시되어 동일 경로 재요청 시 API 호출 없이 반환됩니다.
 */
export async function fetchDayCarRoute(
  stops: Array<{ lat: number; lng: number }>,
): Promise<[number, number][] | null> {
  if (stops.length < 2) return null

  const key = _routeKey(stops)
  if (_cache.has(key)) return _cache.get(key) ?? null

  const origin      = stops[0]
  const destination = stops[stops.length - 1]
  const middle      = stops.slice(1, -1)

  let result: [number, number][] | null

  if (middle.length <= 5) {
    // API 제한 내 → 단일 요청
    result = await _callDirections(origin, destination, middle)
  } else {
    // 경유지 과다 → 중간 지점 기준 재귀 분할
    const mid = Math.floor(stops.length / 2)
    const [first, second] = await Promise.all([
      fetchDayCarRoute(stops.slice(0, mid + 1)),
      fetchDayCarRoute(stops.slice(mid)),
    ])
    if (!first && !second) {
      result = null
    } else {
      result = [...(first ?? []), ...(second ?? [])]
    }
  }

  _cache.set(key, result)
  return result
}

export function clearDirectionsCache(): void {
  _cache.clear()
}
