import { useLocalStorage } from '../hooks/useLocalStorage'
import type { PlaceItem } from '../data/places'

export type RouteMode = 'auto' | 'manual'

export interface PlanState {
  regionId: string
  regionName: string
  days: number
  selectedPlaces: PlaceItem[]
  routeMode: RouteMode
}

const INITIAL: PlanState = {
  regionId: '',
  regionName: '',
  days: 1,
  selectedPlaces: [],
  routeMode: 'auto',
}

const PLAN_KEY = 'yeojung_plan'

export function usePlanStore() {
  const [plan, setPlan] = useLocalStorage<PlanState>(PLAN_KEY, INITIAL)

  function setRegion(regionId: string, regionName: string, days: number) {
    setPlan({ ...plan, regionId, regionName, days, selectedPlaces: [], routeMode: 'auto' })
  }

  function togglePlace(place: PlaceItem) {
    const exists = plan.selectedPlaces.some(p => p.id === place.id)
    setPlan({
      ...plan,
      selectedPlaces: exists
        ? plan.selectedPlaces.filter(p => p.id !== place.id)
        : [...plan.selectedPlaces, place],
    })
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

  function clearPlan() {
    setPlan(INITIAL)
  }

  return { plan, setRegion, togglePlace, isSelected, reorderPlaces, setRouteMode, clearPlan }
}
