/** 장소명으로 네이버 지도 검색 URL */
export function naverMapSearchUrl(query: string): string {
  return `https://map.naver.com/p/search/${encodeURIComponent(query)}`
}

/** 좌표로 네이버 지도 열기 URL */
export function naverMapCoordUrl(lat: number, lng: number, name?: string): string {
  const base = `https://map.naver.com/p/search/${encodeURIComponent(name ?? `${lat},${lng}`)}`
  return base
}
