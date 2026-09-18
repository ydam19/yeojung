import { useLocalStorage } from '../hooks/useLocalStorage'
import type { PlaceItem } from '../data/places'

export type RouteMode = 'auto' | 'manual'
export type TravelMode = 'car' | 'transit'

/** 플래닝 단계에서 임시로 저장하는 숙소 위치 */
export interface PlanAccommodation {
  name: string
  lat: number
  lng: number
}

export interface PlanState {
  regionId: string
  regionName: string
  days: number
  selectedPlaces: PlaceItem[]
  routeMode: RouteMode
  travelMode: TravelMode
  /** 지역 선택 단계에서 등록한 숙소 (장소 추천 거리 정렬에 사용) */
  planAccommodation?: PlanAccommodation
  /**
   * 날짜별 장소 ID 배정 (null = 아직 계산 안 됨).
   * 이동수단과 독립적으로 유지됨 — 클러스터링은 초기값 생성에만 사용.
   * 외부: string[][] (각 원소 = 해당 일차 장소 ID 배열)
   */
  dayAssignment: string[][] | null
  /**
   * 이 플랜이 연결된 실제 저장 여행의 ID.
   * 설정되어 있으면 해당 여행의 숙소 데이터를 동선 결과에서 사용한다.
   */
  tripId?: string
  /**
   * 장소별 체류 시간 커스텀 오버라이드 (분).
   * 키: place.id, 값: 사용자가 슬라이더로 설정한 체류 분
   */
  stayOverrides?: Record<string, number>
}

const INITIAL: PlanState = {
  regionId: '',
  regionName: '',
  days: 1,
  selectedPlaces: [],
  routeMode: 'auto',
  travelMode: 'car',
  planAccommodation: undefined,
  dayAssignment: null,
  stayOverrides: {},
}

const PLAN_KEY = 'yeojung_plan'

export function usePlanStore() {
  const [plan, setPlan] = useLocalStorage<PlanState>(PLAN_KEY, INITIAL)

  function setRegion(regionId: string, regionName: string, days: number, tripId?: string) {
    setPlan({
      ...plan,
      regionId, regionName, days,
      selectedPlaces: [], routeMode: 'auto', travelMode: 'car',
      planAccommodation: undefined, dayAssignment: null,
      // 명시적으로 tripId가 전달되면 덮어씀, 없으면 기존 값 유지
      tripId: tripId !== undefined ? tripId : plan.tripId,
    })
  }

  function setPlanAccommodation(accom: PlanAccommodation | undefined) {
    setPlan({ ...plan, planAccommodation: accom })
  }

  function setDayAssignment(assignment: string[][] | null) {
    setPlan({ ...plan, dayAssignment: assignment })
  }

  function togglePlace(place: PlaceItem) {
    const exists = plan.selectedPlaces.some(p => p.id === place.id)
    if (exists) {
      // 제거: dayAssignment에서 해당 ID만 삭제 (나머지 배정은 유지)
      const newAssignment = plan.dayAssignment
        ? plan.dayAssignment.map(ids => ids.filter(id => id !== place.id))
        : null
      setPlan({
        ...plan,
        selectedPlaces: plan.selectedPlaces.filter(p => p.id !== place.id),
        dayAssignment: newAssignment,
      })
    } else {
      // 추가: 배정 초기화 (추가된 장소를 어느 날에 넣을지 재계산 필요)
      setPlan({
        ...plan,
        selectedPlaces: [...plan.selectedPlaces, place],
        dayAssignment: null,
      })
    }
  }

  function isSelected(placeId: string) {
    return plan.selectedPlaces.some(p => p.id === placeId)
  }

  /** 드래그 후 새로운 순서로 교체 */
  function reorderPlaces(newOrder: PlaceItem[]) {
    setPlan({ ...plan, selectedPlaces: newOrder })
  }

  /** 자동/수동 모드 전환 */
  function setRouteMode(mode: RouteMode) {
    setPlan({ ...plan, routeMode: mode })
  }

  /** 이동수단 전환 */
  function setTravelMode(mode: TravelMode) {
    setPlan({ ...plan, travelMode: mode })
  }

  /** 이 플랜을 특정 저장 여행에 연결 */
  function setTripId(tripId: string | undefined) {
    setPlan({ ...plan, tripId })
  }

  /** 장소별 체류 시간 오버라이드 저장 */
  function setStayOverride(placeId: string, minutes: number) {
    setPlan({ ...plan, stayOverrides: { ...(plan.stayOverrides ?? {}), [placeId]: minutes } })
  }

  function clearPlan() {
    setPlan(INITIAL)
  }

  return { plan, setRegion, togglePlace, isSelected, reorderPlaces, setRouteMode, setTravelMode, setPlanAccommodation, setDayAssignment, setTripId, setStayOverride, clearPlan }
}
