import { haversineDistance } from './geoUtils'
import {
  fetchTransitLeg,
  getTransitLegCached,
  prefetchTransitTimes,
} from './kakaoTransit'
export type { TransitLeg } from './kakaoTransit'
import type { TransitLeg } from './kakaoTransit'

// ─── 타입 ────────────────────────────────────────────────────────────────────

export interface PlaceInput {
  id: string
  name: string
  lat: number
  lng: number
  /** 체류 시간 (분) */
  stayMinutes: number
}

/** 여행 강도 */
export type Intensity = 'relaxed' | 'normal' | 'packed'

export const INTENSITY_LABELS: Record<Intensity, string> = {
  relaxed: '여유',
  normal: '보통',
  packed: '빡빡함',
}

/** 숙소 고정 제약 조건 (특정 날짜의 출발·도착지) */
export interface AccomConstraint {
  id: string
  name: string
  lat: number
  lng: number
  checkIn: string
  checkOut: string
}

export interface DayPlan {
  /** 1-indexed 일차 */
  day: number
  /** 이동 최적화된 순서의 장소 목록 */
  places: PlaceInput[]
  /** 하루 총 이동 거리 (km) */
  totalDistanceKm: number
  /** 이동시간 + 체류시간 합계 (분) */
  totalMinutes: number
  /** 여행 강도 */
  intensity: Intensity
  /** 해당 날 숙소 (있으면 출발·귀환지로 고정됨) */
  accommodation?: AccomConstraint
  /**
   * 대중교통 모드에서의 구간별 이동 정보
   * - 숙소 있음: [accom→p0, p0→p1, ..., pN→accom]  (places.length+1 개)
   * - 숙소 없음: [p0→p1, ..., p(N-1)→pN]           (places.length-1 개)
   */
  transitLegs?: TransitLeg[]
}

export interface RoutePlan {
  days: DayPlan[]
  /** 전체 이동 거리 (km) */
  totalDistanceKm: number
  /** 전체 예상 소요 시간 (분) */
  totalMinutes: number
}

// ─── 상수 ────────────────────────────────────────────────────────────────────

/** 관광지 이동 평균 속도 (km/h) — 도보+대중교통 혼합 */
const AVG_SPEED_KMH = 30

/** 하루 관광 가용 시간 (분) — 09:00~21:00 기준 */
const DAILY_AVAILABLE_MINUTES = 720

/** 강도 임계값 (분) */
const INTENSITY_THRESHOLDS = {
  relaxed: 480,  // 8h 미만 → 여유
  normal: 600,   // 8~10h → 보통
  // 10h 초과 → 빡빡함
} as const

// ─── 내부 유틸 ───────────────────────────────────────────────────────────────

function distKm(a: PlaceInput, b: PlaceInput): number {
  return haversineDistance(
    { lat: a.lat, lng: a.lng },
    { lat: b.lat, lng: b.lng },
  )
}

/**
 * 이동 거리(km)를 이동 시간(분)으로 변환
 */
function travelMinutes(km: number): number {
  return (km / AVG_SPEED_KMH) * 60
}

/**
 * 총 소요 시간(분)과 환승 횟수(대중교통 전용)로 여행 강도를 계산.
 * transferCount 제공 시: 6회 초과 → 빡빡, 3회 초과 → 최소 보통.
 * 시간 기준과 환승 기준 중 더 높은(빡빡한) 등급 반환.
 */
function calcIntensity(totalMinutes: number, transferCount?: number): Intensity {
  const RANK: Record<Intensity, number> = { relaxed: 0, normal: 1, packed: 2 }

  const timeGrade: Intensity =
    totalMinutes < INTENSITY_THRESHOLDS.relaxed ? 'relaxed' :
    totalMinutes < INTENSITY_THRESHOLDS.normal  ? 'normal'  :
    'packed'

  if (transferCount == null) return timeGrade

  const transferGrade: Intensity =
    transferCount > 6 ? 'packed' :
    transferCount > 3 ? 'normal' :
    'relaxed'

  return RANK[transferGrade] > RANK[timeGrade] ? transferGrade : timeGrade
}

// ─── K-means 클러스터링 ──────────────────────────────────────────────────────

interface Centroid { lat: number; lng: number }

/**
 * K-means++ 초기 centroid 선택
 * 첫 centroid는 무작위, 이후는 거리² 비례 확률로 선택
 */
function initCentroids(places: PlaceInput[], k: number): Centroid[] {
  const centroids: Centroid[] = []

  // 첫 centroid: 인덱스 0 (재현성을 위해 고정)
  centroids.push({ lat: places[0].lat, lng: places[0].lng })

  for (let i = 1; i < k; i++) {
    // 각 장소에서 가장 가까운 기존 centroid까지 거리²
    const weights = places.map(p => {
      const minDist = Math.min(
        ...centroids.map(c =>
          haversineDistance({ lat: p.lat, lng: p.lng }, c) ** 2
        )
      )
      return minDist
    })

    // 가중치 비례 랜덤 선택 (결정론적으로 누적합 이용)
    const total = weights.reduce((s, w) => s + w, 0)
    let threshold = total * 0.5 // 결정론적 선택: 중앙값 누적점
    let cumulative = 0
    let chosen = places[places.length - 1]
    for (let j = 0; j < places.length; j++) {
      cumulative += weights[j]
      if (cumulative >= threshold) {
        chosen = places[j]
        break
      }
    }
    centroids.push({ lat: chosen.lat, lng: chosen.lng })
  }

  return centroids
}

/**
 * 장소 배열을 k개 클러스터(일자)로 분할
 * 좌표가 없는 장소는 분류 후 균등 배분
 */
function kMeansClusters(places: PlaceInput[], k: number): PlaceInput[][] {
  if (places.length === 0) return Array.from({ length: k }, () => [])
  if (k >= places.length) {
    // 장소 수보다 일수가 많으면 1개씩 배분 후 나머지는 빈 배열
    return places.map(p => [p]).concat(
      Array.from({ length: k - places.length }, () => [])
    )
  }

  let centroids = initCentroids(places, k)
  let assignments: number[] = new Array(places.length).fill(0)

  for (let iter = 0; iter < 100; iter++) {
    // 각 장소를 가장 가까운 centroid에 할당
    const newAssignments = places.map(p =>
      centroids.reduce(
        (best, c, ci) => {
          const d = haversineDistance({ lat: p.lat, lng: p.lng }, c)
          return d < best.dist ? { idx: ci, dist: d } : best
        },
        { idx: 0, dist: Infinity }
      ).idx
    )

    // 수렴 확인
    const converged = newAssignments.every((a, i) => a === assignments[i])
    assignments = newAssignments
    if (converged) break

    // centroid 재계산 (평균 위치)
    centroids = centroids.map((_, ci) => {
      const members = places.filter((_, pi) => assignments[pi] === ci)
      if (members.length === 0) return centroids[ci] // 빈 클러스터는 유지
      return {
        lat: members.reduce((s, p) => s + p.lat, 0) / members.length,
        lng: members.reduce((s, p) => s + p.lng, 0) / members.length,
      }
    })
  }

  const clusters: PlaceInput[][] = Array.from({ length: k }, () => [])
  places.forEach((p, i) => clusters[assignments[i]].push(p))
  return clusters
}

// ─── 최근접 이웃 정렬 (greedy TSP) ──────────────────────────────────────────

/**
 * 임의의 시작 좌표에서 출발하는 최근접 이웃 정렬
 * 숙소처럼 좌표는 있지만 PlaceInput이 아닌 출발지에 사용
 */
function nearestNeighborSortFrom(
  start: { lat: number; lng: number },
  places: PlaceInput[],
): PlaceInput[] {
  if (places.length === 0) return []
  const unvisited = [...places]
  const sorted: PlaceInput[] = []
  let curLat = start.lat
  let curLng = start.lng

  while (unvisited.length > 0) {
    let nearestIdx = 0
    let nearestDist = Infinity
    unvisited.forEach((p, i) => {
      const d = haversineDistance({ lat: curLat, lng: curLng }, { lat: p.lat, lng: p.lng })
      if (d < nearestDist) { nearestDist = d; nearestIdx = i }
    })
    const next = unvisited.splice(nearestIdx, 1)[0]
    sorted.push(next)
    curLat = next.lat
    curLng = next.lng
  }
  return sorted
}

/**
 * 출발점을 기준으로 매 단계 가장 가까운 미방문 장소를 선택
 * 시작 장소: 위도 기준 최남단 (지도상 아래쪽 → 위로 이동)
 */
function nearestNeighborSort(places: PlaceInput[]): PlaceInput[] {
  if (places.length <= 1) return [...places]

  const unvisited = [...places]
  // 최남단 장소 출발
  const startIdx = unvisited.reduce(
    (minI, p, i) => (p.lat < unvisited[minI].lat ? i : minI),
    0
  )
  const sorted: PlaceInput[] = [unvisited.splice(startIdx, 1)[0]]

  while (unvisited.length > 0) {
    const last = sorted[sorted.length - 1]
    let nearestIdx = 0
    let nearestDist = Infinity

    unvisited.forEach((p, i) => {
      const d = distKm(last, p)
      if (d < nearestDist) { nearestDist = d; nearestIdx = i }
    })

    sorted.push(unvisited.splice(nearestIdx, 1)[0])
  }

  return sorted
}

// ─── DayPlan 생성 ────────────────────────────────────────────────────────────

function buildDayPlan(day: number, unsortedPlaces: PlaceInput[], accom?: AccomConstraint): DayPlan {
  let places: PlaceInput[]
  let totalDistanceKm = 0

  if (accom && unsortedPlaces.length > 0) {
    // 숙소를 출발지로 고정 → 최근접 이웃 정렬
    places = nearestNeighborSortFrom(accom, unsortedPlaces)

    // 거리 계산: 숙소 → 장소1 → ... → 장소N → 숙소
    totalDistanceKm += haversineDistance(
      { lat: accom.lat, lng: accom.lng },
      { lat: places[0].lat, lng: places[0].lng },
    )
    for (let i = 0; i < places.length - 1; i++) {
      totalDistanceKm += distKm(places[i], places[i + 1])
    }
    totalDistanceKm += haversineDistance(
      { lat: places[places.length - 1].lat, lng: places[places.length - 1].lng },
      { lat: accom.lat, lng: accom.lng },
    )
  } else {
    // 숙소 없음 → 기존 최남단 출발 로직
    places = nearestNeighborSort(unsortedPlaces)
    for (let i = 0; i < places.length - 1; i++) {
      totalDistanceKm += distKm(places[i], places[i + 1])
    }
  }

  // 이동 시간 + 체류 시간
  const travelMins = travelMinutes(totalDistanceKm)
  const stayMins = places.reduce((s, p) => s + p.stayMinutes, 0)
  const totalMinutes = Math.round(travelMins + stayMins)

  return {
    day,
    places,
    totalDistanceKm: Math.round(totalDistanceKm * 10) / 10,
    totalMinutes,
    intensity: calcIntensity(totalMinutes),
    ...(accom && { accommodation: accom }),
  }
}

// ─── 메인 함수 ───────────────────────────────────────────────────────────────

/**
 * 장소 목록과 여행 일수를 받아 일자별 최적 동선을 반환
 *
 * @param places             장소 목록 (위도·경도·체류시간 포함)
 * @param numDays            여행 일수 (박+1)
 * @param dayAccommodations  일자 인덱스(0-based) → 숙소 제약 (출발·귀환지 고정)
 * @returns                  일자별 동선 계획 및 전체 통계
 */
export function planRoute(
  places: PlaceInput[],
  numDays: number,
  dayAccommodations?: Map<number, AccomConstraint>,
): RoutePlan {
  if (places.length === 0) {
    return {
      days: Array.from({ length: numDays }, (_, i) => ({
        day: i + 1,
        places: [],
        totalDistanceKm: 0,
        totalMinutes: 0,
        intensity: 'relaxed' as Intensity,
        ...(dayAccommodations?.get(i) && { accommodation: dayAccommodations.get(i) }),
      })),
      totalDistanceKm: 0,
      totalMinutes: 0,
    }
  }

  const k = Math.min(numDays, places.length)
  const clusters = kMeansClusters(places, k)

  // 빈 클러스터가 생긴 경우: 가장 많은 장소를 가진 클러스터에서 분배
  redistributeEmptyClusters(clusters, numDays)

  const days: DayPlan[] = clusters.map((cluster, i) =>
    buildDayPlan(i + 1, cluster, dayAccommodations?.get(i))
  )

  // 빈 일자 패딩 (장소 < numDays인 경우)
  while (days.length < numDays) {
    days.push(buildDayPlan(days.length + 1, [], dayAccommodations?.get(days.length)))
  }

  const totalDistanceKm =
    Math.round(days.reduce((s, d) => s + d.totalDistanceKm, 0) * 10) / 10
  const totalMinutes = days.reduce((s, d) => s + d.totalMinutes, 0)

  return { days, totalDistanceKm, totalMinutes }
}

/**
 * 클러스터링 결과 중 빈 클러스터가 있으면,
 * 가장 큰 클러스터에서 절반을 떼어 채움
 */
function redistributeEmptyClusters(
  clusters: PlaceInput[][],
  targetLength: number
): void {
  // targetLength만큼 슬롯 확보
  while (clusters.length < targetLength) clusters.push([])

  for (let i = 0; i < clusters.length; i++) {
    if (clusters[i].length > 0) continue

    // 가장 장소가 많은 클러스터 찾기
    const largestIdx = clusters.reduce(
      (maxI, c, ci) => (c.length > clusters[maxI].length ? ci : maxI),
      0
    )
    if (clusters[largestIdx].length <= 1) break

    // 절반을 빈 클러스터로 이동
    const half = Math.ceil(clusters[largestIdx].length / 2)
    clusters[i] = clusters[largestIdx].splice(half)
  }
}

// ─── 날짜 배정 계산 (이동수단과 독립) ────────────────────────────────────────

/**
 * k-means 클러스터링으로 장소를 날짜별로 배정하고 ID 배열을 반환.
 * 이동수단과 무관하게 초기값 생성에만 사용.
 */
export function computeAutoAssignment(places: PlaceInput[], numDays: number): string[][] {
  if (places.length === 0) return Array.from({ length: numDays }, () => [])
  const k = Math.min(numDays, places.length)
  const clusters = kMeansClusters(places, k)
  redistributeEmptyClusters(clusters, numDays)
  while (clusters.length < numDays) clusters.push([])
  return clusters.map(cluster => cluster.map(p => p.id))
}

/**
 * 수동 모드: 사용자 입력 순서 그대로 날짜별 균등 배분.
 */
export function computeManualAssignment(places: PlaceInput[], numDays: number): string[][] {
  if (places.length === 0) return Array.from({ length: numDays }, () => [])
  const perDay = Math.ceil(places.length / numDays)
  return Array.from({ length: numDays }, (_, i) =>
    places.slice(i * perDay, (i + 1) * perDay).map(p => p.id)
  )
}

/**
 * 날짜 배정(string[][])을 기반으로 동선 계획을 생성.
 * preserveOrder=true: 배정 내 순서 유지 (수동 모드).
 * preserveOrder=false: nearest-neighbor 재정렬 (자동 모드).
 */
export function planRouteFromAssignment(
  assignment: string[][],
  allPlaces: PlaceInput[],
  numDays: number,
  dayAccommodations?: Map<number, AccomConstraint>,
  preserveOrder = false,
): RoutePlan {
  const placeMap = new Map(allPlaces.map(p => [p.id, p]))
  const days: DayPlan[] = assignment.map((ids, i) => {
    const cluster = ids.map(id => placeMap.get(id)).filter(Boolean) as PlaceInput[]
    if (preserveOrder) {
      // 순서 유지 — 거리 계산만 수행, 재정렬 없음
      const accom = dayAccommodations?.get(i)
      let dist = 0
      if (accom && cluster.length > 0) {
        dist += haversineDistance({ lat: accom.lat, lng: accom.lng }, { lat: cluster[0].lat, lng: cluster[0].lng })
        for (let j = 0; j < cluster.length - 1; j++) {
          dist += haversineDistance({ lat: cluster[j].lat, lng: cluster[j].lng }, { lat: cluster[j+1].lat, lng: cluster[j+1].lng })
        }
        dist += haversineDistance({ lat: cluster[cluster.length-1].lat, lng: cluster[cluster.length-1].lng }, { lat: accom.lat, lng: accom.lng })
      } else {
        for (let j = 0; j < cluster.length - 1; j++) {
          dist += haversineDistance({ lat: cluster[j].lat, lng: cluster[j].lng }, { lat: cluster[j+1].lat, lng: cluster[j+1].lng })
        }
      }
      const travelMins = Math.round((dist / 30) * 60)
      const stayMins = cluster.reduce((s, p) => s + p.stayMinutes, 0)
      const total = travelMins + stayMins
      return {
        day: i + 1,
        places: cluster,
        totalDistanceKm: Math.round(dist * 10) / 10,
        totalMinutes: total,
        intensity: calcIntensity(total),
        ...(accom && { accommodation: accom }),
      }
    }
    return buildDayPlan(i + 1, cluster, dayAccommodations?.get(i))
  })

  // numDays보다 assignment가 짧으면 패딩
  while (days.length < numDays) {
    days.push(buildDayPlan(days.length + 1, [], dayAccommodations?.get(days.length)))
  }

  const totalDistanceKm = Math.round(days.reduce((s, d) => s + d.totalDistanceKm, 0) * 10) / 10
  const totalMinutes = days.reduce((s, d) => s + d.totalMinutes, 0)
  return { days, totalDistanceKm, totalMinutes }
}

/**
 * 날짜 배정(string[][])을 기반으로 대중교통 동선 계획 생성 (비동기).
 */
export async function planRouteTransitFromAssignment(
  assignment: string[][],
  allPlaces: PlaceInput[],
  numDays: number,
  dayAccommodations?: Map<number, AccomConstraint>,
): Promise<RoutePlan> {
  const placeMap = new Map(allPlaces.map(p => [p.id, p]))
  const clusters = assignment.map(ids =>
    ids.map(id => placeMap.get(id)).filter(Boolean) as PlaceInput[]
  )

  // 모든 클러스터 대중교통 시간 병렬 pre-fetch
  await Promise.all(
    clusters.map((cluster, dayIdx) => {
      const accom = dayAccommodations?.get(dayIdx)
      const points: Array<{ lat: number; lng: number }> = [
        ...(accom ? [accom] : []),
        ...cluster,
      ]
      return prefetchTransitTimes(points)
    })
  )

  const dayPromises: Promise<DayPlan>[] = [
    ...clusters.map((cluster, i) =>
      buildTransitDayPlan(i + 1, cluster, dayAccommodations?.get(i))
    ),
    ...Array.from({ length: Math.max(0, numDays - clusters.length) }, (_, j) =>
      buildTransitDayPlan(clusters.length + j + 1, [], dayAccommodations?.get(clusters.length + j))
    ),
  ]

  const days = await Promise.all(dayPromises)
  const totalDistanceKm = Math.round(days.reduce((s, d) => s + d.totalDistanceKm, 0) * 10) / 10
  const totalMinutes = days.reduce((s, d) => s + d.totalMinutes, 0)
  return { days, totalDistanceKm, totalMinutes }
}

// ─── 포맷 헬퍼 ───────────────────────────────────────────────────────────────

/** 분 → "X시간 Y분" 문자열 */
export function formatMinutes(minutes: number): string {
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  if (h === 0) return `${m}분`
  if (m === 0) return `${h}시간`
  return `${h}시간 ${m}분`
}

/** 하루 가용 시간 대비 사용 비율 (0~1) */
export function dayUsageRatio(totalMinutes: number): number {
  return Math.min(totalMinutes / DAILY_AVAILABLE_MINUTES, 1)
}

// ─── 대중교통 모드 ────────────────────────────────────────────────────────────

/**
 * places[placeIdx] → places[placeIdx+1] 구간의 TransitLeg 반환.
 * 숙소가 있으면 transitLegs[0]이 accom→places[0]이므로 offset=1.
 */
export function getDayTransitLeg(dayPlan: DayPlan, placeIdx: number): TransitLeg | undefined {
  if (!dayPlan.transitLegs) return undefined
  const offset = dayPlan.accommodation ? 1 : 0
  return dayPlan.transitLegs[placeIdx + offset]
}

// 대중교통 시간 기반 nearest-neighbor (캐시에서 동기 조회 — pre-fetch 이후 사용)
function nearestNeighborTransit(
  start: { lat: number; lng: number },
  places: PlaceInput[],
): PlaceInput[] {
  if (places.length === 0) return []
  const unvisited = [...places]
  const sorted: PlaceInput[] = []
  let cur = start

  while (unvisited.length > 0) {
    let bestIdx = 0
    let bestSecs = Infinity
    for (let i = 0; i < unvisited.length; i++) {
      const cached = getTransitLegCached(cur.lat, cur.lng, unvisited[i].lat, unvisited[i].lng)
      const secs =
        cached != null
          ? cached.durationSecs
          : (haversineDistance(cur, unvisited[i]) / 30) * 3600
      if (secs < bestSecs) { bestSecs = secs; bestIdx = i }
    }
    const next = unvisited.splice(bestIdx, 1)[0]
    sorted.push(next)
    cur = { lat: next.lat, lng: next.lng }
  }
  return sorted
}

async function buildTransitDayPlan(
  day: number,
  unsortedPlaces: PlaceInput[],
  accom?: AccomConstraint,
): Promise<DayPlan> {
  if (unsortedPlaces.length === 0) {
    return {
      day, places: [], totalDistanceKm: 0, totalMinutes: 0, intensity: 'relaxed',
      ...(accom && { accommodation: accom }),
      transitLegs: [],
    }
  }

  // 1. Nearest-neighbor 정렬 (캐시 동기 조회)
  let places: PlaceInput[]
  if (accom) {
    places = nearestNeighborTransit(accom, unsortedPlaces)
  } else {
    const startIdx = unsortedPlaces.reduce(
      (minI, p, i) => (p.lat < unsortedPlaces[minI].lat ? i : minI), 0,
    )
    const start = unsortedPlaces[startIdx]
    const rest = unsortedPlaces.filter((_, i) => i !== startIdx)
    places = [start, ...nearestNeighborTransit(start, rest)]
  }

  // 2. 이동 시퀀스 구성: [accom?, p0, …, pN, accom?]
  const seq: Array<{ lat: number; lng: number }> = [
    ...(accom ? [accom] : []),
    ...places,
    ...(accom && places.length > 0 ? [accom] : []),
  ]

  let totalDistKm = 0
  let totalTransitSecs = 0
  const transitLegs: TransitLeg[] = []

  for (let i = 0; i < seq.length - 1; i++) {
    const f = seq[i]
    const t = seq[i + 1]
    const leg = await fetchTransitLeg(f.lat, f.lng, t.lat, t.lng)
    if (leg) {
      transitLegs.push(leg)
      totalTransitSecs += leg.durationSecs
      totalDistKm += leg.sections.reduce((s, sec) => s + sec.distance / 1000, 0)
    } else {
      const km = haversineDistance(f, t)
      totalDistKm += km
      const secs = Math.round((km / 30) * 3600)
      totalTransitSecs += secs
      transitLegs.push({ durationSecs: secs, transferCount: 0, fare: 0, sections: [] })
    }
  }

  const stayMins = places.reduce((s, p) => s + p.stayMinutes, 0)
  const totalMinutes = Math.round(totalTransitSecs / 60) + stayMins
  const totalTransfers = transitLegs.reduce((s, leg) => s + leg.transferCount, 0)

  return {
    day, places,
    totalDistanceKm: Math.round(totalDistKm * 10) / 10,
    totalMinutes,
    intensity: calcIntensity(totalMinutes, totalTransfers),
    ...(accom && { accommodation: accom }),
    transitLegs,
  }
}

/**
 * 대중교통 기반 동선 계획 (비동기).
 * 클러스터링은 기존과 동일, 일자 내 정렬만 실제 대중교통 시간 사용.
 * API 실패 구간은 haversine 거리 기반 시간으로 fallback.
 */
export async function planRouteTransit(
  places: PlaceInput[],
  numDays: number,
  dayAccommodations?: Map<number, AccomConstraint>,
): Promise<RoutePlan> {
  if (places.length === 0) {
    return {
      days: Array.from({ length: numDays }, (_, i) => ({
        day: i + 1, places: [], totalDistanceKm: 0, totalMinutes: 0, intensity: 'relaxed' as Intensity,
        ...(dayAccommodations?.get(i) && { accommodation: dayAccommodations.get(i) }),
        transitLegs: [],
      })),
      totalDistanceKm: 0, totalMinutes: 0,
    }
  }

  const k = Math.min(numDays, places.length)
  const clusters = kMeansClusters(places, k)
  redistributeEmptyClusters(clusters, numDays)

  // 모든 클러스터의 대중교통 경로 일괄 pre-fetch (병렬)
  await Promise.all(
    clusters.map((cluster, dayIdx) => {
      const accom = dayAccommodations?.get(dayIdx)
      const points: Array<{ lat: number; lng: number }> = [
        ...(accom ? [accom] : []),
        ...cluster,
      ]
      return prefetchTransitTimes(points)
    }),
  )

  // 일자별 DayPlan 빌드 (캐시 사용 → 사실상 동기)
  const dayPromises: Promise<DayPlan>[] = [
    ...clusters.map((cluster, i) =>
      buildTransitDayPlan(i + 1, cluster, dayAccommodations?.get(i)),
    ),
    // 빈 일자 패딩
    ...Array.from({ length: Math.max(0, numDays - clusters.length) }, (_, j) =>
      buildTransitDayPlan(clusters.length + j + 1, [], dayAccommodations?.get(clusters.length + j)),
    ),
  ]

  const days = await Promise.all(dayPromises)
  const totalDistanceKm = Math.round(days.reduce((s, d) => s + d.totalDistanceKm, 0) * 10) / 10
  const totalMinutes = days.reduce((s, d) => s + d.totalMinutes, 0)

  return { days, totalDistanceKm, totalMinutes }
}
