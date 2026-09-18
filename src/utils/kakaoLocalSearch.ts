/**
 * Kakao Local Search REST API — 키워드 검색
 *
 * 장소 키워드 검색은 JavaScript SDK가 아닌 REST API를 사용한다.
 * SDK의 kakao.maps.services.Places 는 JS 키 + 도메인 등록이 필요하지만,
 * REST API는 VITE_KAKAO_REST_KEY만 있으면 localhost에서도 동작한다.
 *
 * 엔드포인트: GET /v2/local/search/keyword.json
 *   Authorization: KakaoAK {REST_KEY}
 *   query, x(경도), y(위도), radius, size
 *
 * 개발 중 CORS 우회: vite.config.ts server.proxy['/api/kakao-local'] 처리
 */

const REST_KEY = import.meta.env.VITE_KAKAO_REST_KEY as string | undefined

/** VITE_KAKAO_REST_KEY가 설정되어 있으면 true */
export const HAS_LOCAL_KEY =
  !!REST_KEY && REST_KEY !== '여기에_카카오_REST_키_입력'

/** Kakao Local Search API 응답 문서 1건 */
export interface LocalSearchResult {
  id: string
  place_name: string
  category_name: string
  category_group_code: string
  category_group_name: string
  address_name: string
  road_address_name: string
  /** 경도 (longitude) — 문자열 */
  x: string
  /** 위도 (latitude) — 문자열 */
  y: string
  phone: string
  place_url: string
  distance: string
}

/**
 * 카카오 키워드 장소 검색 (REST API, 캐시 없음).
 * REST 키 미설정 시 빈 배열 반환.
 *
 * @param query  검색어
 * @param opts   center: 검색 중심 좌표 { lat, lng }, radius: 반경(m), size: 결과 수(최대 45)
 */
export async function searchKeyword(
  query: string,
  opts?: { center?: { lat: number; lng: number }; radius?: number; size?: number },
): Promise<LocalSearchResult[]> {
  if (!HAS_LOCAL_KEY || !query.trim()) return []

  const params = new URLSearchParams({
    query: query.trim(),
    size: String(opts?.size ?? 15),
  })
  if (opts?.center) {
    // Kakao API: x = 경도(longitude), y = 위도(latitude)
    params.set('x', String(opts.center.lng))
    params.set('y', String(opts.center.lat))
  }
  if (opts?.radius != null) {
    params.set('radius', String(opts.radius))
  }

  const base = import.meta.env.DEV ? '/api/kakao-local' : 'https://dapi.kakao.com'
  const url = `${base}/v2/local/search/keyword.json?${params}`

  try {
    const res = await fetch(url, {
      headers: { Authorization: `KakaoAK ${REST_KEY}` },
    })
    if (!res.ok) {
      if (import.meta.env.DEV) {
        const text = await res.text().catch(() => '')
        console.warn(`[kakaoLocalSearch] API 오류 ${res.status}: ${text}`)
      }
      return []
    }
    const json = await res.json()
    return (json.documents ?? []) as LocalSearchResult[]
  } catch (e) {
    if (import.meta.env.DEV) console.error('[kakaoLocalSearch] fetch 예외:', e)
    return []
  }
}
