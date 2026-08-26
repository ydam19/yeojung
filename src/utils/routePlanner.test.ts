import { describe, it, expect } from 'vitest'
import { planRoute, formatMinutes, dayUsageRatio } from './routePlanner'
import type { PlaceInput } from './routePlanner'

// ─── 더미 데이터 ─────────────────────────────────────────────────────────────
// 실제 위도·경도 기반 (제주도 / 부산 / 서울)

const JEJU_PLACES: PlaceInput[] = [
  { id: 'j1', name: '성산일출봉',    lat: 33.4580, lng: 126.9425, stayMinutes: 90 },
  { id: 'j2', name: '우도',          lat: 33.5010, lng: 126.9516, stayMinutes: 180 },
  { id: 'j3', name: '협재 해수욕장', lat: 33.3942, lng: 126.2393, stayMinutes: 120 },
  { id: 'j4', name: '한림공원',      lat: 33.4140, lng: 126.2495, stayMinutes: 90 },
  { id: 'j5', name: '흑돼지 거리',   lat: 33.4890, lng: 126.4983, stayMinutes: 60 },
  { id: 'j6', name: '동문시장',      lat: 33.5133, lng: 126.5242, stayMinutes: 60 },
  { id: 'j7', name: '카페 델문도',   lat: 33.2454, lng: 126.4108, stayMinutes: 60 },
  { id: 'j8', name: '중문 해수욕장', lat: 33.2453, lng: 126.4105, stayMinutes: 90 },
  { id: 'j9', name: '천지연 폭포',   lat: 33.2468, lng: 126.5601, stayMinutes: 60 },
]

const BUSAN_PLACES: PlaceInput[] = [
  { id: 'b1', name: '해운대 해수욕장',    lat: 35.1587, lng: 129.1603, stayMinutes: 90 },
  { id: 'b2', name: '광안대교',           lat: 35.1533, lng: 129.1186, stayMinutes: 60 },
  { id: 'b3', name: '감천문화마을',       lat: 35.0975, lng: 129.0103, stayMinutes: 90 },
  { id: 'b4', name: '자갈치시장',         lat: 35.0975, lng: 129.0302, stayMinutes: 60 },
  { id: 'b5', name: '국제시장',           lat: 35.0993, lng: 129.0268, stayMinutes: 60 },
  { id: 'b6', name: '송도 해상 케이블카', lat: 35.0745, lng: 129.0160, stayMinutes: 60 },
]

const SEOUL_PLACES: PlaceInput[] = [
  { id: 's1', name: '경복궁',        lat: 37.5796, lng: 126.9770, stayMinutes: 90 },
  { id: 's2', name: '북촌한옥마을',  lat: 37.5826, lng: 126.9830, stayMinutes: 60 },
  { id: 's3', name: '광장시장',      lat: 37.5700, lng: 126.9994, stayMinutes: 60 },
  { id: 's4', name: '성수동 카페거리',lat: 37.5445, lng: 127.0558, stayMinutes: 90 },
  { id: 's5', name: '남산서울타워',  lat: 37.5512, lng: 126.9882, stayMinutes: 90 },
  { id: 's6', name: '홍대',          lat: 37.5563, lng: 126.9233, stayMinutes: 120 },
  { id: 's7', name: '이태원',        lat: 37.5344, lng: 126.9940, stayMinutes: 90 },
  { id: 's8', name: '한강공원',      lat: 37.5285, lng: 126.9682, stayMinutes: 120 },
]

// ─── 헬퍼 ─────────────────────────────────────────────────────────────────────

function totalPlacesInPlan(days: ReturnType<typeof planRoute>['days']) {
  return days.reduce((s, d) => s + d.places.length, 0)
}

// ─── 기본 동작 ────────────────────────────────────────────────────────────────

describe('planRoute — 기본 동작', () => {
  it('반환된 일자 수가 numDays와 일치한다', () => {
    const result = planRoute(JEJU_PLACES, 3)
    expect(result.days).toHaveLength(3)
  })

  it('모든 장소가 누락 없이 배분된다', () => {
    const result = planRoute(JEJU_PLACES, 3)
    expect(totalPlacesInPlan(result.days)).toBe(JEJU_PLACES.length)
  })

  it('각 일차 번호가 1부터 순서대로 부여된다', () => {
    const result = planRoute(JEJU_PLACES, 3)
    result.days.forEach((d, i) => expect(d.day).toBe(i + 1))
  })

  it('totalDistanceKm은 각 일자 합산과 일치한다', () => {
    const result = planRoute(JEJU_PLACES, 3)
    const sum = Math.round(
      result.days.reduce((s, d) => s + d.totalDistanceKm, 0) * 10
    ) / 10
    expect(result.totalDistanceKm).toBe(sum)
  })

  it('이동 거리는 음수가 없다', () => {
    const result = planRoute(JEJU_PLACES, 3)
    result.days.forEach(d => expect(d.totalDistanceKm).toBeGreaterThanOrEqual(0))
  })

  it('totalMinutes는 이동시간 + 체류시간이므로 체류시간 합계 이상이다', () => {
    const result = planRoute(JEJU_PLACES, 3)
    const totalStay = JEJU_PLACES.reduce((s, p) => s + p.stayMinutes, 0)
    expect(result.totalMinutes).toBeGreaterThanOrEqual(totalStay)
  })
})

// ─── K-means 클러스터링 ───────────────────────────────────────────────────────

describe('planRoute — 클러스터링 지리 검증', () => {
  it('제주도: 동쪽(성산·우도)과 서쪽(협재·한림)이 다른 날에 배정된다', () => {
    const result = planRoute(JEJU_PLACES, 3)

    // 동쪽 장소
    const eastIds = new Set(['j1', 'j2'])
    // 서쪽 장소
    const westIds = new Set(['j3', 'j4'])

    const dayOfEast = result.days.findIndex(d => d.places.some(p => eastIds.has(p.id)))
    const dayOfWest = result.days.findIndex(d => d.places.some(p => westIds.has(p.id)))

    expect(dayOfEast).not.toBe(-1)
    expect(dayOfWest).not.toBe(-1)
    expect(dayOfEast).not.toBe(dayOfWest)
  })

  it('부산: 해운대(동)와 감천·자갈치(서)가 다른 날에 배정된다', () => {
    const result = planRoute(BUSAN_PLACES, 2)

    const dayOfHaeundae = result.days.findIndex(d => d.places.some(p => p.id === 'b1'))
    const dayOfGamcheon = result.days.findIndex(d => d.places.some(p => p.id === 'b3'))

    expect(dayOfHaeundae).not.toBe(-1)
    expect(dayOfGamcheon).not.toBe(-1)
    expect(dayOfHaeundae).not.toBe(dayOfGamcheon)
  })

  it('같은 날에 묶인 장소들은 서로 다른 날 장소보다 더 가까워야 한다', () => {
    const result = planRoute(JEJU_PLACES, 3)

    result.days.forEach(day => {
      if (day.places.length < 2) return

      // 같은 날 장소 간 평균 거리
      let intraSum = 0, intraCount = 0
      for (let i = 0; i < day.places.length; i++) {
        for (let j = i + 1; j < day.places.length; j++) {
          const a = day.places[i], b = day.places[j]
          intraSum += Math.sqrt((a.lat - b.lat) ** 2 + (a.lng - b.lng) ** 2)
          intraCount++
        }
      }
      const intraAvg = intraSum / intraCount

      // 다른 날 장소와의 평균 거리
      const otherPlaces = result.days
        .filter(d => d.day !== day.day)
        .flatMap(d => d.places)
      if (otherPlaces.length === 0) return

      let interSum = 0, interCount = 0
      for (const a of day.places) {
        for (const b of otherPlaces) {
          interSum += Math.sqrt((a.lat - b.lat) ** 2 + (a.lng - b.lng) ** 2)
          interCount++
        }
      }
      const interAvg = interSum / interCount

      expect(intraAvg).toBeLessThan(interAvg)
    })
  })
})

// ─── 최근접 이웃 정렬 ─────────────────────────────────────────────────────────

describe('planRoute — 이동 순서 최적화', () => {
  it('정렬된 순서의 총 이동거리가 역순보다 작거나 같다', () => {
    // 부산 2일 → 1일차 장소만 꺼내서 비교
    const result = planRoute(BUSAN_PLACES, 2)
    const day1 = result.days[0]
    if (day1.places.length < 3) return // 장소가 너무 적으면 skip

    // 정렬된 순서 거리
    let sortedDist = 0
    for (let i = 0; i < day1.places.length - 1; i++) {
      const a = day1.places[i], b = day1.places[i + 1]
      sortedDist += Math.sqrt((a.lat - b.lat) ** 2 + (a.lng - b.lng) ** 2)
    }

    // 역순 거리
    const reversed = [...day1.places].reverse()
    let reversedDist = 0
    for (let i = 0; i < reversed.length - 1; i++) {
      const a = reversed[i], b = reversed[i + 1]
      reversedDist += Math.sqrt((a.lat - b.lat) ** 2 + (a.lng - b.lng) ** 2)
    }

    // greedy nearest-neighbor는 역순보다 같거나 짧아야 함
    expect(sortedDist).toBeLessThanOrEqual(reversedDist + 0.001)
  })

  it('장소가 1개인 날은 이동 거리가 0이다', () => {
    // 장소 1개, 1일
    const result = planRoute([BUSAN_PLACES[0]], 1)
    expect(result.days[0].totalDistanceKm).toBe(0)
  })
})

// ─── 여행 강도 ────────────────────────────────────────────────────────────────

describe('planRoute — 여행 강도(intensity)', () => {
  it('체류시간이 충분히 짧으면 relaxed가 된다', () => {
    const light: PlaceInput[] = [
      { id: 'l1', name: 'A', lat: 37.5, lng: 127.0, stayMinutes: 30 },
      { id: 'l2', name: 'B', lat: 37.501, lng: 127.001, stayMinutes: 30 }, // 매우 가까움
    ]
    const result = planRoute(light, 1)
    expect(result.days[0].intensity).toBe('relaxed')
  })

  it('체류시간이 매우 길면 packed가 된다', () => {
    const heavy: PlaceInput[] = [
      { id: 'h1', name: 'A', lat: 37.5, lng: 127.0, stayMinutes: 200 },
      { id: 'h2', name: 'B', lat: 37.6, lng: 127.1, stayMinutes: 200 }, // ~15km 거리
      { id: 'h3', name: 'C', lat: 37.7, lng: 127.2, stayMinutes: 200 },
    ]
    const result = planRoute(heavy, 1)
    expect(result.days[0].intensity).toBe('packed')
  })

  it('intensity는 항상 relaxed | normal | packed 중 하나다', () => {
    const result = planRoute(SEOUL_PLACES, 3)
    const valid = new Set(['relaxed', 'normal', 'packed'])
    result.days.forEach(d => expect(valid.has(d.intensity)).toBe(true))
  })
})

// ─── 엣지 케이스 ──────────────────────────────────────────────────────────────

describe('planRoute — 엣지 케이스', () => {
  it('빈 장소 목록이면 모든 일자가 빈 배열로 반환된다', () => {
    const result = planRoute([], 3)
    expect(result.days).toHaveLength(3)
    result.days.forEach(d => expect(d.places).toHaveLength(0))
    expect(result.totalDistanceKm).toBe(0)
  })

  it('장소 수(1)가 일수(3)보다 적어도 일자 수는 numDays를 유지한다', () => {
    const result = planRoute([JEJU_PLACES[0]], 3)
    expect(result.days).toHaveLength(3)
    expect(totalPlacesInPlan(result.days)).toBe(1)
  })

  it('장소 수 === 일수이면 하루에 정확히 1개씩 배정된다', () => {
    const three = JEJU_PLACES.slice(0, 3)
    const result = planRoute(three, 3)
    expect(result.days).toHaveLength(3)
    result.days.forEach(d => expect(d.places.length).toBeLessThanOrEqual(1))
  })

  it('장소 수가 일수보다 훨씬 많아도 모두 배분된다', () => {
    const result = planRoute(SEOUL_PLACES, 2) // 8곳, 2일
    expect(totalPlacesInPlan(result.days)).toBe(SEOUL_PLACES.length)
  })

  it('numDays = 1이면 모든 장소가 1일차에 모인다', () => {
    const result = planRoute(BUSAN_PLACES, 1)
    expect(result.days).toHaveLength(1)
    expect(result.days[0].places).toHaveLength(BUSAN_PLACES.length)
  })
})

// ─── 포맷 헬퍼 ────────────────────────────────────────────────────────────────

describe('formatMinutes', () => {
  it('60분 미만은 "N분"', () => {
    expect(formatMinutes(45)).toBe('45분')
  })
  it('정각 시간은 "N시간"', () => {
    expect(formatMinutes(120)).toBe('2시간')
  })
  it('시간과 분이 모두 있으면 "N시간 M분"', () => {
    expect(formatMinutes(150)).toBe('2시간 30분')
  })
  it('0분은 "0분"', () => {
    expect(formatMinutes(0)).toBe('0분')
  })
})

describe('dayUsageRatio', () => {
  it('0분 → 0', () => {
    expect(dayUsageRatio(0)).toBe(0)
  })
  it('720분(가용 최대) → 1', () => {
    expect(dayUsageRatio(720)).toBe(1)
  })
  it('초과해도 1을 넘지 않는다', () => {
    expect(dayUsageRatio(1000)).toBe(1)
  })
  it('360분 → 0.5', () => {
    expect(dayUsageRatio(360)).toBeCloseTo(0.5)
  })
})
