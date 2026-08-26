import { haversineDistance } from './geoUtils'

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
 * 총 소요 시간(분)으로 여행 강도를 계산
 */
function calcIntensity(totalMinutes: number): Intensity {
  if (totalMinutes < INTENSITY_THRESHOLDS.relaxed) return 'relaxed'
  if (totalMinutes < INTENSITY_THRESHOLDS.normal)  return 'normal'
  return 'packed'
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

function buildDayPlan(day: number, unsortedPlaces: PlaceInput[]): DayPlan {
  const places = nearestNeighborSort(unsortedPlaces)

  // 이동 거리 합산 (연속된 장소 사이)
  let totalDistanceKm = 0
  for (let i = 0; i < places.length - 1; i++) {
    totalDistanceKm += distKm(places[i], places[i + 1])
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
  }
}

// ─── 메인 함수 ───────────────────────────────────────────────────────────────

/**
 * 장소 목록과 여행 일수를 받아 일자별 최적 동선을 반환
 *
 * @param places   장소 목록 (위도·경도·체류시간 포함)
 * @param numDays  여행 일수 (박+1)
 * @returns        일자별 동선 계획 및 전체 통계
 */
export function planRoute(places: PlaceInput[], numDays: number): RoutePlan {
  if (places.length === 0) {
    return {
      days: Array.from({ length: numDays }, (_, i) => ({
        day: i + 1,
        places: [],
        totalDistanceKm: 0,
        totalMinutes: 0,
        intensity: 'relaxed' as Intensity,
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
    buildDayPlan(i + 1, cluster)
  )

  // 빈 일자 패딩 (장소 < numDays인 경우)
  while (days.length < numDays) {
    days.push(buildDayPlan(days.length + 1, []))
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
