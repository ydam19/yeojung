export type PlaceCategory = 'attraction' | 'restaurant' | 'cafe' | 'activity'

export const CATEGORY_LABELS: Record<PlaceCategory, string> = {
  attraction: '관광지',
  restaurant: '맛집',
  cafe: '카페',
  activity: '액티비티',
}

export const CATEGORY_EMOJI: Record<PlaceCategory, string> = {
  attraction: '🏛️',
  restaurant: '🍽️',
  cafe: '☕',
  activity: '🎯',
}

/** 카테고리별 기본 체류 시간 (분) */
export const DEFAULT_STAY_MINUTES: Record<PlaceCategory, number> = {
  attraction: 90,
  restaurant: 60,
  cafe: 45,
  activity: 120,
}

export interface PlaceItem {
  id: string
  regionId: string
  name: string
  category: PlaceCategory
  description: string
  tags: string[]
  /** 위도 (없으면 지역 중심 좌표로 대체) */
  lat?: number
  /** 경도 (없으면 지역 중심 좌표로 대체) */
  lng?: number
}

/** 지역 중심 좌표 (좌표 없는 장소의 fallback) */
export const REGION_CENTERS: Record<string, { lat: number; lng: number }> = {
  jeju:     { lat: 33.3617, lng: 126.5292 },
  busan:    { lat: 35.1796, lng: 129.0756 },
  gyeongju: { lat: 35.8354, lng: 129.2191 },
  seoul:    { lat: 37.5665, lng: 126.9780 },
  gangwon:  { lat: 38.1225, lng: 128.4659 },
  jeonju:   { lat: 35.8147, lng: 127.1530 },
  incheon:  { lat: 37.4563, lng: 126.7052 },
  daegu:    { lat: 35.8714, lng: 128.6014 },
}

const PLACES: PlaceItem[] = [
  // ── 제주도 ──────────────────────────────────────────────────────────
  { id: 'jeju-1', regionId: 'jeju', name: '성산일출봉',    category: 'attraction', lat: 33.4580, lng: 126.9425, description: '유네스코 세계자연유산, 일출이 아름다운 분화구',   tags: ['뷰맛집', '세계유산'] },
  { id: 'jeju-2', regionId: 'jeju', name: '한라산 백록담', category: 'attraction', lat: 33.3617, lng: 126.5292, description: '제주의 상징, 정상에서 보는 전망이 압도적',        tags: ['등산', '자연'] },
  { id: 'jeju-3', regionId: 'jeju', name: '협재 해수욕장', category: 'attraction', lat: 33.3942, lng: 126.2393, description: '에메랄드빛 투명한 바다와 백사장',               tags: ['해변', '스노쿨링'] },
  { id: 'jeju-4', regionId: 'jeju', name: '흑돼지 거리',   category: 'restaurant', lat: 33.4890, lng: 126.4983, description: '제주 제일의 흑돼지 전문점들이 모인 거리',         tags: ['흑돼지', '현지맛집'] },
  { id: 'jeju-5', regionId: 'jeju', name: '고집돌우럭',    category: 'restaurant', lat: 33.5140, lng: 126.5242, description: '제주 특산 우럭 조림으로 유명한 향토 음식점',      tags: ['해산물', '현지음식'] },
  { id: 'jeju-6', regionId: 'jeju', name: '카페 델문도',   category: 'cafe',       lat: 33.2454, lng: 126.4108, description: '바다 전망이 탁 트인 오션뷰 카페',              tags: ['오션뷰', '감성'] },
  { id: 'jeju-7', regionId: 'jeju', name: '이니스프리 카페', category: 'cafe',     lat: 33.3083, lng: 126.2936, description: '제주 녹차밭 속 힐링 카페',                    tags: ['녹차', '자연친화'] },
  { id: 'jeju-8', regionId: 'jeju', name: '제주 서핑',     category: 'activity',   lat: 33.4798, lng: 126.4426, description: '중문·이호 해수욕장에서 즐기는 서핑 레슨',       tags: ['서핑', '해양스포츠'] },
  { id: 'jeju-9', regionId: 'jeju', name: '승마 체험',     category: 'activity',   lat: 33.3150, lng: 126.7053, description: '제주 목장에서 즐기는 승마 & 말 먹이주기',      tags: ['말', '체험'] },

  // ── 부산 ──────────────────────────────────────────────────────────
  { id: 'busan-1', regionId: 'busan', name: '해운대 해수욕장',    category: 'attraction', lat: 35.1587, lng: 129.1603, description: '국내 최대 해수욕장, 마린시티 야경까지',     tags: ['해변', '야경'] },
  { id: 'busan-2', regionId: 'busan', name: '감천문화마을',       category: 'attraction', lat: 35.0975, lng: 129.0103, description: '알록달록 계단식 마을, 부산의 산토리니',     tags: ['포토존', '벽화'] },
  { id: 'busan-3', regionId: 'busan', name: '광안대교',           category: 'attraction', lat: 35.1533, lng: 129.1186, description: '광안리 바다 위의 야경 명소',              tags: ['야경', '야간추천'] },
  { id: 'busan-4', regionId: 'busan', name: '국제시장 씨앗호떡',  category: 'restaurant', lat: 35.0993, lng: 129.0268, description: '부산 여행자라면 필수, 바삭한 씨앗호떡',    tags: ['길거리음식', '국제시장'] },
  { id: 'busan-5', regionId: 'busan', name: '자갈치시장',         category: 'restaurant', lat: 35.0975, lng: 129.0302, description: '싱싱한 회와 해산물의 성지',              tags: ['회', '해산물'] },
  { id: 'busan-6', regionId: 'busan', name: '카페 아홉산숲',      category: 'cafe',       lat: 35.2630, lng: 129.2250, description: '대나무 숲 속 비밀스러운 카페',            tags: ['숲뷰', '힐링'] },
  { id: 'busan-7', regionId: 'busan', name: '웨이브온 커피',      category: 'cafe',       lat: 35.1740, lng: 129.2100, description: '송정 해변 앞 서핑 감성 카페',            tags: ['오션뷰', '서핑감성'] },
  { id: 'busan-8', regionId: 'busan', name: '오션월드 스카이캡슐', category: 'activity',  lat: 35.1762, lng: 129.2137, description: '해변을 달리는 투명 캡슐 열차',            tags: ['이색체험', '오션뷰'] },
  { id: 'busan-9', regionId: 'busan', name: '송도 해상 케이블카', category: 'activity',   lat: 35.0745, lng: 129.0160, description: '부산 앞바다를 하늘에서 감상',             tags: ['케이블카', '뷰'] },

  // ── 경주 ──────────────────────────────────────────────────────────
  { id: 'gyeongju-1', regionId: 'gyeongju', name: '불국사',            category: 'attraction', lat: 35.7885, lng: 129.3320, description: '유네스코 세계문화유산, 신라 최대 사찰',     tags: ['세계유산', '사찰'] },
  { id: 'gyeongju-2', regionId: 'gyeongju', name: '첨성대',            category: 'attraction', lat: 35.8354, lng: 129.2191, description: '동양 최고(最古) 천문대, 야경도 아름다움', tags: ['역사', '야경'] },
  { id: 'gyeongju-3', regionId: 'gyeongju', name: '황리단길',          category: 'restaurant', lat: 35.8343, lng: 129.2248, description: '경주 힙한 골목, 한옥 카페와 맛집 즐비',   tags: ['골목', '트렌디'] },
  { id: 'gyeongju-4', regionId: 'gyeongju', name: '교리김밥',          category: 'restaurant', lat: 35.8361, lng: 129.2256, description: '경주 로컬 명물, 줄 서서 먹는 김밥',      tags: ['분식', '줄맛집'] },
  { id: 'gyeongju-5', regionId: 'gyeongju', name: '카페 어니언 경주',  category: 'cafe',       lat: 35.8342, lng: 129.2236, description: '한옥을 개조한 감성 베이커리 카페',        tags: ['한옥카페', '베이커리'] },
  { id: 'gyeongju-6', regionId: 'gyeongju', name: '동궁과 월지 야경 투어', category: 'activity', lat: 35.8348, lng: 129.2243, description: '신라 별궁 야경 감상 & 해설 투어',   tags: ['야경투어', '역사'] },

  // ── 서울 ──────────────────────────────────────────────────────────
  { id: 'seoul-1', regionId: 'seoul', name: '경복궁',          category: 'attraction', lat: 37.5796, lng: 126.9770, description: '조선 제일의 궁궐, 수문장 교대식 볼거리', tags: ['궁궐', '역사'] },
  { id: 'seoul-2', regionId: 'seoul', name: '북촌한옥마을',    category: 'attraction', lat: 37.5826, lng: 126.9830, description: '서울 도심 속 전통 한옥 골목',          tags: ['한옥', '포토존'] },
  { id: 'seoul-3', regionId: 'seoul', name: '광장시장',        category: 'restaurant', lat: 37.5700, lng: 126.9994, description: '빈대떡·마약김밥·육회 등 서울 대표 먹거리', tags: ['시장', '먹자골목'] },
  { id: 'seoul-4', regionId: 'seoul', name: '을지로 맛골목',   category: 'restaurant', lat: 37.5660, lng: 126.9907, description: '힙한 을지로 뒷골목의 숨은 맛집들',     tags: ['힙스터', '골목'] },
  { id: 'seoul-5', regionId: 'seoul', name: '성수동 카페 거리', category: 'cafe',      lat: 37.5445, lng: 127.0558, description: '트렌디한 카페와 팝업스토어의 성지',     tags: ['트렌디', '성수'] },
  { id: 'seoul-6', regionId: 'seoul', name: '한강 자전거',     category: 'activity',   lat: 37.5285, lng: 126.9682, description: '한강변 자전거 대여 & 라이딩',          tags: ['자전거', '한강'] },

  // ── 강원도 ────────────────────────────────────────────────────────
  { id: 'gangwon-1', regionId: 'gangwon', name: '설악산 케이블카',   category: 'attraction', lat: 38.1225, lng: 128.4659, description: '권금성까지 오르는 짜릿한 케이블카',           tags: ['케이블카', '단풍'] },
  { id: 'gangwon-2', regionId: 'gangwon', name: '속초 중앙시장',    category: 'restaurant', lat: 38.2070, lng: 128.5916, description: '닭강정·아바이순대·오징어 명물 시장',          tags: ['시장', '닭강정'] },
  { id: 'gangwon-3', regionId: 'gangwon', name: '강릉 안목 커피거리', category: 'cafe',      lat: 37.7725, lng: 128.9445, description: '강릉 커피 문화의 발상지, 바다 앞 카페 줄지어', tags: ['커피', '오션뷰'] },
  { id: 'gangwon-4', regionId: 'gangwon', name: '서핑 양양',        category: 'activity',   lat: 38.0765, lng: 128.6294, description: '서퍼들의 성지, 인구해변 서핑 레슨',           tags: ['서핑', '해양스포츠'] },

  // ── 전주 ──────────────────────────────────────────────────────────
  { id: 'jeonju-1', regionId: 'jeonju', name: '전주 한옥마을',  category: 'attraction', lat: 35.8147, lng: 127.1530, description: '700채 이상의 한옥이 모인 전통 마을', tags: ['한옥', '전통'] },
  { id: 'jeonju-2', regionId: 'jeonju', name: '전주 비빔밥',    category: 'restaurant', lat: 35.8148, lng: 127.1524, description: '전주 정통 비빔밥, 한정식 한 상 차림', tags: ['비빔밥', '한식'] },
  { id: 'jeonju-3', regionId: 'jeonju', name: '객리단길',       category: 'cafe',       lat: 35.8144, lng: 127.1506, description: '한옥마을 인근 트렌디한 카페 거리',   tags: ['감성', '골목'] },
  { id: 'jeonju-4', regionId: 'jeonju', name: '한지 공예 체험', category: 'activity',   lat: 35.8166, lng: 127.1556, description: '전통 한지로 만드는 나만의 공예품',   tags: ['체험', '전통공예'] },

  // ── 인천 ──────────────────────────────────────────────────────────
  { id: 'incheon-1', regionId: 'incheon', name: '차이나타운',        category: 'attraction', lat: 37.4751, lng: 126.6175, description: '국내 유일 차이나타운, 짜장면 발상지',      tags: ['이색', '차이나타운'] },
  { id: 'incheon-2', regionId: 'incheon', name: '월미도',            category: 'attraction', lat: 37.4749, lng: 126.5933, description: '유람선·놀이공원·바다의 복합 명소',       tags: ['놀이공원', '바다'] },
  { id: 'incheon-3', regionId: 'incheon', name: '공화춘',            category: 'restaurant', lat: 37.4754, lng: 126.6172, description: '짜장면을 처음 만든 원조 중화요리집',     tags: ['원조짜장', '역사맛집'] },
  { id: 'incheon-4', regionId: 'incheon', name: '강화도 갯벌 체험', category: 'activity',   lat: 37.7162, lng: 126.5013, description: '강화 갯벌에서 조개잡이 체험',           tags: ['갯벌', '체험'] },

  // ── 대구 ──────────────────────────────────────────────────────────
  { id: 'daegu-1', regionId: 'daegu', name: '근대골목 투어',   category: 'attraction', lat: 35.8698, lng: 128.5934, description: '일제강점기 근대 건축물이 남아있는 골목', tags: ['역사', '근대'] },
  { id: 'daegu-2', regionId: 'daegu', name: '팔공산 갓바위',   category: 'attraction', lat: 35.9774, lng: 128.6965, description: '소원을 들어준다는 갓바위 석불',        tags: ['등산', '소원'] },
  { id: 'daegu-3', regionId: 'daegu', name: '동성로 막창골목', category: 'restaurant', lat: 35.8689, lng: 128.5983, description: '대구 명물 막창구이의 성지',            tags: ['막창', '야식'] },
  { id: 'daegu-4', regionId: 'daegu', name: '카페 봉리단길',   category: 'cafe',       lat: 35.8618, lng: 128.6075, description: '봉산문화거리 인근 감성 카페 밀집지',   tags: ['감성', '골목카페'] },
]

export function getPlacesByRegion(regionId: string): PlaceItem[] {
  return PLACES.filter(p => p.regionId === regionId)
}

export function searchPlaces(regionId: string, query: string): PlaceItem[] {
  const q = query.trim().toLowerCase()
  return PLACES.filter(p =>
    p.regionId === regionId &&
    (p.name.toLowerCase().includes(q) ||
     p.description.toLowerCase().includes(q) ||
     p.tags.some(t => t.toLowerCase().includes(q)))
  )
}
