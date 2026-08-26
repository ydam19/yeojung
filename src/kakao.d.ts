// 카카오맵 JavaScript SDK 타입 선언
// https://apis.map.kakao.com/web/documentation/

declare namespace kakao {
  namespace maps {
    function load(callback: () => void): void

    class Map {
      constructor(container: HTMLElement, options: MapOptions)
      setCenter(latlng: LatLng): void
      setLevel(level: number): void
      getCenter(): LatLng
      setBounds(bounds: LatLngBounds, paddingTop?: number, paddingRight?: number, paddingBottom?: number, paddingLeft?: number): void
    }

    interface MapOptions {
      center: LatLng
      level?: number
    }

    class LatLng {
      constructor(lat: number, lng: number)
      getLat(): number
      getLng(): number
    }

    class LatLngBounds {
      constructor(sw?: LatLng, ne?: LatLng)
      extend(latlng: LatLng): void
      isEmpty(): boolean
    }

    class CustomOverlay {
      constructor(options: CustomOverlayOptions)
      setMap(map: Map | null): void
    }

    interface CustomOverlayOptions {
      position: LatLng
      content: string | HTMLElement
      map?: Map
      yAnchor?: number
      xAnchor?: number
      zIndex?: number
    }

    class Polyline {
      constructor(options: PolylineOptions)
      setMap(map: Map | null): void
    }

    interface PolylineOptions {
      path: LatLng[]
      strokeWeight?: number
      strokeColor?: string
      strokeOpacity?: number
      strokeStyle?: string
      map?: Map
    }

    namespace services {
      class Places {
        keywordSearch(
          keyword: string,
          callback: (result: PlaceSearchResult[], status: string, pagination: Pagination) => void,
          options?: PlaceSearchOptions
        ): void
      }

      interface PlaceSearchResult {
        id: string
        place_name: string
        category_name: string
        category_group_name: string
        phone: string
        address_name: string
        road_address_name: string
        /** 경도 (longitude) — 문자열 */
        x: string
        /** 위도 (latitude) — 문자열 */
        y: string
        place_url: string
        distance: string
      }

      interface PlaceSearchOptions {
        location?: LatLng
        radius?: number
        bounds?: LatLngBounds
        category_group_code?: string
        page?: number
        size?: number
      }

      interface Pagination {
        totalCount: number
        hasNextPage: boolean
        hasPrevPage: boolean
        current: number
      }

      const Status: {
        OK: string
        ZERO_RESULT: string
        ERROR: string
      }
    }
  }
}

interface Window {
  kakao: typeof kakao
}
