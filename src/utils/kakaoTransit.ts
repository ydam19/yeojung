/**
 * Kakao Mobility 대중교통 경로 조회 REST API
 *
 * ─ 필요 설정 ──────────────────────────────────────────────────────────────
 *  1. .env.local → VITE_KAKAO_REST_KEY=<REST API 키>
 *     (카카오 개발자 콘솔 → 내 애플리케이션 → 앱 키 → REST API 키)
 *
 *  개발 중 CORS 우회: vite.config.ts server.proxy 로 처리
 *  (카카오 콘솔 도메인 등록 없이도 개발 가능)
 *
 * ─ 실제 API 응답 구조 (확인된 필드명) ─────────────────────────────────────
 *  status                               : "OK"
 *  routes[0].properties.totalTime       : 전체 소요시간 (초)
 *  routes[0].properties.totalDistance   : 전체 거리 (m)
 *  routes[0].properties.transfers       : 환승 횟수
 *  routes[0].properties.fare            : { adult?: number, ... }
 *  routes[0].steps[].properties.type    : "WALKING" | "BUS" | "SUBWAY" | ...
 *  routes[0].steps[].properties.time    : 구간 소요시간 (초)
 *  routes[0].steps[].properties.distance: 구간 거리 (m)
 *  routes[0].steps[].properties.vehicles: [{ name, color, ... }]  (버스/지하철)
 *  routes[0].steps[].path.points        : [[경도, 위도], ...]
 * ──────────────────────────────────────────────────────────────────────────
 */

export type TransitSectionMode = 'WALK' | 'BUS' | 'SUBWAY' | 'EXPRESSBUS' | 'TRAIN' | 'FERRY'

export interface TransitSection {
  mode: TransitSectionMode
  /** 구간 소요시간 (초) */
  sectionTime: number
  /** 구간 거리 (m) */
  distance: number
  /** 노선명 (버스 번호, 지하철 호선 등) */
  lineName?: string
  /** 노선 색상 hex ('#' 없음, e.g. "374BFF") */
  lineColor?: string
  /**
   * API properties.guidance — 노선/구간 설명
   * 예: "좌석 42 (수영구보건소 > 광안리해수욕장)"
   */
  guidance?: string
  /**
   * 경유 정류장/역 이름 배열 (출발역 포함, 도착역 포함)
   * stops[0] = 탑승, stops[stops.length-1] = 하차
   */
  stops?: string[]
  /**
   * 경로 좌표 배열 (API 응답 step.path.points 그대로)
   * 각 원소: [경도, 위도]
   */
  points: number[][]
}

export interface TransitLeg {
  /** 총 소요시간 (초) */
  durationSecs: number
  /** 환승 횟수 */
  transferCount: number
  /** 성인 기준 요금 (원) */
  fare: number
  sections: TransitSection[]
}

// ─── 모듈 단위 캐시 ───────────────────────────────────────────────────────────
const _cache = new Map<string, TransitLeg | null>()

function _key(fLat: number, fLng: number, tLat: number, tLng: number): string {
  return `${fLat.toFixed(5)},${fLng.toFixed(5)}|${tLat.toFixed(5)},${tLng.toFixed(5)}`
}

const REST_KEY = import.meta.env.VITE_KAKAO_REST_KEY as string | undefined
export const HAS_TRANSIT_KEY =
  !!REST_KEY && REST_KEY !== '여기에_카카오_REST_키_입력'

// ─── API 타입 → 내부 모드 변환 ───────────────────────────────────────────────
/**
 * API 응답의 type 문자열을 TransitSectionMode 로 변환.
 * "WALKING" → "WALK", 나머지는 대문자 그대로.
 */
function toSectionMode(raw: string): TransitSectionMode {
  if (raw === 'WALKING') return 'WALK'
  const upper = raw.toUpperCase() as TransitSectionMode
  return upper
}

// ─── API 호출 ─────────────────────────────────────────────────────────────────

/**
 * 두 좌표 간 대중교통 최적 경로를 조회합니다 (캐시 적용).
 * API 실패 / CORS 오류 / 키 미설정 → null 반환.
 *
 * 엔드포인트: GET /v2/routing/publictraffic
 *   ?start_x={출발경도}&start_y={출발위도}&end_x={도착경도}&end_y={도착위도}
 */
export async function fetchTransitLeg(
  fLat: number, fLng: number,
  tLat: number, tLng: number,
): Promise<TransitLeg | null> {
  if (!HAS_TRANSIT_KEY) return null

  const key = _key(fLat, fLng, tLat, tLng)
  if (_cache.has(key)) return _cache.get(key) ?? null

  try {
    const base = import.meta.env.DEV
      ? '/api/kakao-transit'
      : 'https://dapi.kakao.com'

    const url = `${base}/v2/routing/publictraffic?start_x=${fLng}&start_y=${fLat}&end_x=${tLng}&end_y=${tLat}`
    const res = await fetch(url, {
      headers: { Authorization: `KakaoAK ${REST_KEY}` },
    })

    if (!res.ok) {
      if (import.meta.env.DEV) {
        const errText = await res.text().catch(() => '(응답 없음)')
        console.warn(`[kakaoTransit] API 오류 ${res.status} ${res.statusText}\nURL: ${url}\n${errText}`)
      }
      _cache.set(key, null)
      return null
    }

    const json = await res.json()

    if (import.meta.env.DEV) {
      console.log('[kakaoTransit] raw response:', JSON.stringify(json, null, 2))
    }

    // ── 유효성 확인: routes[0].steps 배열 존재 여부로 판단 ──────────────────
    const route = json.routes?.[0]
    if (!route || !Array.isArray(route.steps)) {
      if (import.meta.env.DEV) {
        console.warn('[kakaoTransit] 유효한 route.steps 없음:', JSON.stringify(json))
      }
      _cache.set(key, null)
      return null
    }

    // ── route.properties: 전체 경로 요약 ─────────────────────────────────────
    const rp = route.properties ?? {}

    // ── route.steps: 구간별 상세 ──────────────────────────────────────────────
    const sections: TransitSection[] = (route.steps as any[]).map(step => {
      const sp = step.properties ?? {}

      // 노선 정보: vehicles 배열의 첫 번째 항목 (버스번호, 지하철 호선 등)
      const vehicles: any[] = Array.isArray(sp.vehicles) ? sp.vehicles : []
      const vehicle = vehicles[0] ?? null

      return {
        mode: toSectionMode(sp.type ?? 'WALKING'),
        sectionTime: sp.time ?? 0,
        distance: sp.distance ?? 0,
        lineName: vehicle?.name ?? undefined,
        lineColor: vehicle?.color ?? undefined,
        guidance: typeof sp.guidance === 'string' ? sp.guidance : undefined,
        stops: Array.isArray(sp.stops)
          ? (sp.stops as any[]).map((s: any) => typeof s === 'string' ? s : (s.name ?? ''))
          : undefined,
        // step.path.points = [[경도, 위도], ...]
        points: Array.isArray(step.path?.points) ? (step.path.points as number[][]) : [],
      }
    })

    const leg: TransitLeg = {
      durationSecs: rp.totalTime ?? 0,
      transferCount: rp.transfers ?? 0,
      // fare 필드 구조: { adult: number } 또는 숫자 직접 값
      fare: typeof rp.fare === 'number'
        ? rp.fare
        : (rp.fare?.adult ?? 0),
      sections,
    }

    _cache.set(key, leg)
    return leg
  } catch (e) {
    if (import.meta.env.DEV) console.error('[kakaoTransit] fetch 예외:', e)
    _cache.set(key, null)
    return null
  }
}

/**
 * pre-fetch 이후 캐시에서 동기적으로 결과를 반환합니다.
 */
export function getTransitLegCached(
  fLat: number, fLng: number,
  tLat: number, tLng: number,
): TransitLeg | null | undefined {
  const key = _key(fLat, fLng, tLat, tLng)
  return _cache.has(key) ? (_cache.get(key) ?? null) : undefined
}

/**
 * 주어진 좌표 집합의 모든 순서쌍 경로를 병렬로 pre-fetch합니다.
 */
export async function prefetchTransitTimes(
  points: ReadonlyArray<{ lat: number; lng: number }>,
): Promise<void> {
  const promises: Promise<TransitLeg | null>[] = []
  for (let i = 0; i < points.length; i++) {
    for (let j = 0; j < points.length; j++) {
      if (i !== j) {
        promises.push(
          fetchTransitLeg(points[i].lat, points[i].lng, points[j].lat, points[j].lng),
        )
      }
    }
  }
  await Promise.all(promises)
}

export function clearTransitCache(): void { _cache.clear() }
