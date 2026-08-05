import type { PlaceCategory } from '../types'

export interface Attraction {
  id: string
  name: string
  address: string
  category: PlaceCategory
  lat: number
  lng: number
  description?: string
}

export interface Region {
  id: string
  name: string
  emoji: string
  color: string
  attractions: Attraction[]
}

export const REGIONS: Region[] = [
  {
    id: 'seoul',
    name: '서울',
    emoji: '🏙️',
    color: 'from-blue-500 to-indigo-600',
    attractions: [
      { id: 's1', name: '경복궁', address: '서울 종로구 사직로 161', category: 'attraction', lat: 37.5796, lng: 126.9770, description: '조선 왕조의 정궁' },
      { id: 's2', name: 'N서울타워', address: '서울 용산구 남산공원길 105', category: 'attraction', lat: 37.5512, lng: 126.9882, description: '서울의 랜드마크 전망대' },
      { id: 's3', name: '북촌한옥마을', address: '서울 종로구 계동길 37', category: 'attraction', lat: 37.5826, lng: 126.9830, description: '전통 한옥이 모여있는 마을' },
      { id: 's4', name: '인사동', address: '서울 종로구 인사동길', category: 'shopping', lat: 37.5742, lng: 126.9858, description: '전통 공예품과 갤러리' },
      { id: 's5', name: '홍대 거리', address: '서울 마포구 어울마당로', category: 'attraction', lat: 37.5563, lng: 126.9237, description: '젊은이들의 문화 거리' },
      { id: 's6', name: '광장시장', address: '서울 종로구 창경궁로 88', category: 'restaurant', lat: 37.5700, lng: 126.9994, description: '100년 역사의 전통시장' },
      { id: 's7', name: '롯데월드타워', address: '서울 송파구 올림픽로 300', category: 'attraction', lat: 37.5125, lng: 127.1025, description: '123층 초고층 빌딩' },
      { id: 's8', name: '창덕궁', address: '서울 종로구 율곡로 99', category: 'attraction', lat: 37.5794, lng: 126.9910, description: '유네스코 세계문화유산' },
      { id: 's9', name: 'DDP 동대문', address: '서울 중구 을지로 281', category: 'attraction', lat: 37.5669, lng: 127.0096, description: '자하 하디드가 설계한 복합문화공간' },
      { id: 's10', name: '한강공원', address: '서울 영등포구 여의도동', category: 'attraction', lat: 37.5283, lng: 126.9326, description: '도심 속 자연 휴식 공간' },
      { id: 's11', name: '이태원', address: '서울 용산구 이태원로', category: 'restaurant', lat: 37.5347, lng: 126.9938 },
      { id: 's12', name: '성수동', address: '서울 성동구 성수동', category: 'cafe', lat: 37.5447, lng: 127.0567 },
      { id: 's13', name: '덕수궁', address: '서울 중구 세종대로 99', category: 'attraction', lat: 37.5660, lng: 126.9751 },
      { id: 's14', name: '서촌', address: '서울 종로구 사직동', category: 'attraction', lat: 37.5786, lng: 126.9680 },
      { id: 's15', name: '강남 코엑스몰', address: '서울 강남구 영동대로 513', category: 'shopping', lat: 37.5115, lng: 127.0594 },
    ],
  },
  {
    id: 'busan',
    name: '부산',
    emoji: '🌊',
    color: 'from-cyan-500 to-blue-600',
    attractions: [
      { id: 'b1', name: '해운대 해수욕장', address: '부산 해운대구 해운대해변로', category: 'attraction', lat: 35.1587, lng: 129.1603, description: '대한민국 대표 해수욕장' },
      { id: 'b2', name: '감천문화마을', address: '부산 사하구 감내2로 203', category: 'attraction', lat: 35.0979, lng: 129.0107, description: '알록달록 계단식 벽화마을' },
      { id: 'b3', name: '광안리 해수욕장', address: '부산 수영구 광안해변로', category: 'attraction', lat: 35.1531, lng: 129.1186, description: '광안대교 야경 명소' },
      { id: 'b4', name: '자갈치시장', address: '부산 중구 자갈치해안로 52', category: 'restaurant', lat: 35.0976, lng: 129.0303, description: '신선한 해산물의 천국' },
      { id: 'b5', name: '태종대', address: '부산 영도구 전망로 24', category: 'attraction', lat: 35.0508, lng: 129.0851, description: '기암절벽과 바다 전망' },
      { id: 'b6', name: '국제시장', address: '부산 중구 신창동 4가', category: 'shopping', lat: 35.0988, lng: 129.0287, description: '영화 국제시장 배경지' },
      { id: 'b7', name: '용두산공원', address: '부산 중구 용두산길 37-55', category: 'attraction', lat: 35.1011, lng: 129.0325, description: '부산타워와 시내 전망' },
      { id: 'b8', name: '부산영화의전당', address: '부산 해운대구 수영강변대로 120', category: 'attraction', lat: 35.1694, lng: 129.1275, description: '부산국제영화제 개최지' },
      { id: 'b9', name: '송정 해수욕장', address: '부산 해운대구 송정해변로 62', category: 'attraction', lat: 35.1797, lng: 129.2014 },
      { id: 'b10', name: '흰여울문화마을', address: '부산 영도구 흰여울길', category: 'attraction', lat: 35.0820, lng: 129.0350, description: '절벽 위의 작은 마을' },
      { id: 'b11', name: '기장 죽성성당', address: '부산 기장군 기장읍 죽성리', category: 'attraction', lat: 35.2457, lng: 129.2292 },
      { id: 'b12', name: '남포동 BIFF광장', address: '부산 중구 남포동', category: 'attraction', lat: 35.0974, lng: 129.0308 },
    ],
  },
  {
    id: 'jeju',
    name: '제주도',
    emoji: '🌺',
    color: 'from-green-500 to-teal-600',
    attractions: [
      { id: 'j1', name: '성산일출봉', address: '제주 서귀포시 성산읍 일출로 284-12', category: 'attraction', lat: 33.4589, lng: 126.9425, description: '일출 명소 유네스코 세계유산' },
      { id: 'j2', name: '한라산', address: '제주 제주시 1100로 2070-61', category: 'attraction', lat: 33.3617, lng: 126.5292, description: '대한민국 최고봉 1,950m' },
      { id: 'j3', name: '협재 해수욕장', address: '제주 제주시 한림읍 협재리', category: 'attraction', lat: 33.3941, lng: 126.2394, description: '에메랄드빛 바다와 비양도 전망' },
      { id: 'j4', name: '만장굴', address: '제주 제주시 구좌읍 만장굴길 182', category: 'attraction', lat: 33.5282, lng: 126.7711, description: '세계 최장 용암동굴' },
      { id: 'j5', name: '우도', address: '제주 제주시 우도면', category: 'attraction', lat: 33.5008, lng: 126.9681, description: '성산항에서 배로 15분' },
      { id: 'j6', name: '천지연 폭포', address: '제주 서귀포시 천지동 667-7', category: 'attraction', lat: 33.2463, lng: 126.5535, description: '22m 높이의 웅장한 폭포' },
      { id: 'j7', name: '섭지코지', address: '제주 서귀포시 성산읍 섭지코지로 107', category: 'attraction', lat: 33.4289, lng: 126.9316, description: '드라마 올인 촬영지' },
      { id: 'j8', name: '올레시장', address: '제주 서귀포시 서귀동 277', category: 'restaurant', lat: 33.2481, lng: 126.5109, description: '제주 대표 먹거리 시장' },
      { id: 'j9', name: '사려니 숲길', address: '제주 제주시 조천읍 교래리', category: 'attraction', lat: 33.3868, lng: 126.5799, description: '신비로운 원시림 트레킹 코스' },
      { id: 'j10', name: '한림공원', address: '제주 제주시 한림읍 한림로 300', category: 'attraction', lat: 33.4067, lng: 126.2390, description: '아열대 식물원과 용암동굴' },
      { id: 'j11', name: '카멜리아힐', address: '제주 서귀포시 안덕면 병악로 166', category: 'attraction', lat: 33.2923, lng: 126.3696 },
      { id: 'j12', name: '중문 색달 해수욕장', address: '제주 서귀포시 중문관광로 154-17', category: 'attraction', lat: 33.2460, lng: 126.4128 },
    ],
  },
  {
    id: 'gyeongju',
    name: '경주',
    emoji: '🏛️',
    color: 'from-yellow-500 to-orange-600',
    attractions: [
      { id: 'g1', name: '불국사', address: '경북 경주시 불국로 385', category: 'attraction', lat: 35.7888, lng: 129.3320, description: '유네스코 세계문화유산' },
      { id: 'g2', name: '석굴암', address: '경북 경주시 불국로 873-243', category: 'attraction', lat: 35.7953, lng: 129.3474, description: '신라 석굴 사원' },
      { id: 'g3', name: '첨성대', address: '경북 경주시 인왕동 839-1', category: 'attraction', lat: 35.8349, lng: 129.2189, description: '동아시아 최고(最古) 천문대' },
      { id: 'g4', name: '동궁과 월지', address: '경북 경주시 원화로 102', category: 'attraction', lat: 35.8337, lng: 129.2254, description: '야경이 아름다운 신라 궁궐터' },
      { id: 'g5', name: '대릉원', address: '경북 경주시 알천북로 일대', category: 'attraction', lat: 35.8336, lng: 129.2136, description: '신라 고분군' },
      { id: 'g6', name: '황리단길', address: '경북 경주시 황남동', category: 'cafe', lat: 35.8313, lng: 129.2152, description: '한옥 카페와 맛집 골목' },
      { id: 'g7', name: '경주국립박물관', address: '경북 경주시 일정로 186', category: 'attraction', lat: 35.8274, lng: 129.2219, description: '신라 문화재의 보고' },
      { id: 'g8', name: '교촌한옥마을', address: '경북 경주시 교촌길 39-2', category: 'attraction', lat: 35.8354, lng: 129.2098 },
      { id: 'g9', name: '양동마을', address: '경북 경주시 강동면 양동마을길', category: 'attraction', lat: 35.9083, lng: 129.2258, description: '유네스코 세계문화유산 한옥마을' },
      { id: 'g10', name: '경주 보문단지', address: '경북 경주시 보문로 424-33', category: 'attraction', lat: 35.8485, lng: 129.2708 },
    ],
  },
  {
    id: 'gangneung',
    name: '강릉',
    emoji: '☕',
    color: 'from-sky-500 to-blue-500',
    attractions: [
      { id: 'ga1', name: '경포해수욕장', address: '강원 강릉시 창해로 514', category: 'attraction', lat: 37.8007, lng: 128.9066, description: '강릉 대표 해수욕장' },
      { id: 'ga2', name: '안목 커피거리', address: '강원 강릉시 창해로14번길 20', category: 'cafe', lat: 37.7680, lng: 128.9290, description: '강릉 커피 문화의 시작' },
      { id: 'ga3', name: '정동진', address: '강원 강릉시 강동면 정동진리', category: 'attraction', lat: 37.6807, lng: 129.0588, description: '세계에서 바다와 가장 가까운 역' },
      { id: 'ga4', name: '오죽헌', address: '강원 강릉시 율곡로3139번길 24', category: 'attraction', lat: 37.7803, lng: 128.8802, description: '신사임당·율곡 이이 생가' },
      { id: 'ga5', name: '경포대', address: '강원 강릉시 경포로 365', category: 'attraction', lat: 37.7963, lng: 128.8999, description: '관동팔경 중 으뜸' },
      { id: 'ga6', name: '주문진 해수욕장', address: '강원 강릉시 주문진읍 해안로', category: 'attraction', lat: 37.8946, lng: 128.8253, description: '오징어 특산물 산지' },
      { id: 'ga7', name: '강릉선교장', address: '강원 강릉시 운정길 63', category: 'attraction', lat: 37.7770, lng: 128.8660, description: '조선시대 상류층 가옥' },
      { id: 'ga8', name: '강릉 중앙시장', address: '강원 강릉시 금성로 21', category: 'restaurant', lat: 37.7505, lng: 128.8762, description: '강릉 먹거리 집결지' },
      { id: 'ga9', name: '사천 해수욕장', address: '강원 강릉시 사천면 해안로', category: 'attraction', lat: 37.8400, lng: 128.9040 },
      { id: 'ga10', name: '참소리축음기박물관', address: '강원 강릉시 경포로 393', category: 'attraction', lat: 37.7957, lng: 128.9028 },
    ],
  },
  {
    id: 'jeonju',
    name: '전주',
    emoji: '🍜',
    color: 'from-orange-500 to-red-500',
    attractions: [
      { id: 'jj1', name: '전주한옥마을', address: '전북 전주시 완산구 기린대로 99', category: 'attraction', lat: 35.8187, lng: 127.1525, description: '700채 이상의 전통 한옥' },
      { id: 'jj2', name: '경기전', address: '전북 전주시 완산구 태조로 44', category: 'attraction', lat: 35.8192, lng: 127.1519, description: '태조 이성계 초상화 봉안처' },
      { id: 'jj3', name: '전동성당', address: '전북 전주시 완산구 태조로 51', category: 'attraction', lat: 35.8190, lng: 127.1502, description: '호남 최초 천주교 성당' },
      { id: 'jj4', name: '남부시장', address: '전북 전주시 완산구 풍남문3길 1', category: 'restaurant', lat: 35.8097, lng: 127.1454, description: '야시장으로 유명한 전통시장' },
      { id: 'jj5', name: '오목대', address: '전북 전주시 완산구 기린대로 55', category: 'attraction', lat: 35.8177, lng: 127.1558, description: '한옥마을 전경 조망 포인트' },
      { id: 'jj6', name: '자만벽화마을', address: '전북 전주시 완산구 자만동', category: 'attraction', lat: 35.8185, lng: 127.1576 },
      { id: 'jj7', name: '전주객사', address: '전북 전주시 완산구 객사3길 2', category: 'attraction', lat: 35.8233, lng: 127.1493 },
      { id: 'jj8', name: '풍남문', address: '전북 전주시 완산구 풍남문3길', category: 'attraction', lat: 35.8155, lng: 127.1490, description: '전주 읍성의 남문' },
      { id: 'jj9', name: '덕진공원', address: '전북 전주시 덕진구 권삼득로 390', category: 'attraction', lat: 35.8428, lng: 127.1294, description: '연꽃으로 유명한 공원' },
      { id: 'jj10', name: '전주비빔밥 거리', address: '전북 전주시 완산구 한옥마을 일대', category: 'restaurant', lat: 35.8170, lng: 127.1530, description: '전주비빔밥 맛집 밀집 지역' },
    ],
  },
  {
    id: 'yeosu',
    name: '여수',
    emoji: '🌃',
    color: 'from-purple-500 to-indigo-600',
    attractions: [
      { id: 'y1', name: '여수 밤바다 이순신광장', address: '전남 여수시 이순신광장로 2', category: 'attraction', lat: 34.7440, lng: 127.7347, description: '여수 밤바다의 중심' },
      { id: 'y2', name: '향일암', address: '전남 여수시 돌산읍 향일암로 60', category: 'attraction', lat: 34.6637, lng: 127.7828, description: '일출 명소 해안 절벽 암자' },
      { id: 'y3', name: '오동도', address: '전남 여수시 오동도로 222', category: 'attraction', lat: 34.7377, lng: 127.7644, description: '동백꽃이 아름다운 섬' },
      { id: 'y4', name: '여수 케이블카', address: '전남 여수시 돌산읍 돌산로 3600', category: 'attraction', lat: 34.7395, lng: 127.7477, description: '바다 위를 나는 케이블카' },
      { id: 'y5', name: '돌산도', address: '전남 여수시 돌산읍', category: 'attraction', lat: 34.7100, lng: 127.7700 },
      { id: 'y6', name: '엑스포 해양공원', address: '전남 여수시 박람회길 1', category: 'attraction', lat: 34.7598, lng: 127.7459, description: '2012 세계박람회 개최지' },
      { id: 'y7', name: '여수수산시장', address: '전남 여수시 교동 일대', category: 'restaurant', lat: 34.7437, lng: 127.7342 },
      { id: 'y8', name: '돌산공원', address: '전남 여수시 돌산읍 우두리', category: 'attraction', lat: 34.7324, lng: 127.7558, description: '여수 야경 최고 전망지' },
      { id: 'y9', name: '하멜등대', address: '전남 여수시 수정동', category: 'attraction', lat: 34.7380, lng: 127.7390 },
      { id: 'y10', name: '고소동 벽화마을', address: '전남 여수시 고소동', category: 'attraction', lat: 34.7408, lng: 127.7313 },
    ],
  },
  {
    id: 'incheon',
    name: '인천',
    emoji: '🛫',
    color: 'from-slate-500 to-blue-600',
    attractions: [
      { id: 'i1', name: '송도 센트럴파크', address: '인천 연수구 센트럴로 160', category: 'attraction', lat: 37.3919, lng: 126.6429, description: '해수를 이용한 공원' },
      { id: 'i2', name: '인천 차이나타운', address: '인천 중구 차이나타운로', category: 'restaurant', lat: 37.4758, lng: 126.6177, description: '짜장면 발상지' },
      { id: 'i3', name: '월미도', address: '인천 중구 월미문화로 일대', category: 'attraction', lat: 37.4720, lng: 126.5990, description: '유원지와 바다 전망' },
      { id: 'i4', name: '강화도 전등사', address: '인천 강화군 길상면 전등사로 37-41', category: 'attraction', lat: 37.6887, lng: 126.4497, description: '우리나라 최고(最古) 사찰' },
      { id: 'i5', name: '소래포구', address: '인천 남동구 소래로154번길 77', category: 'restaurant', lat: 37.4297, lng: 126.7356 },
      { id: 'i6', name: '인천 개항장거리', address: '인천 중구 신포로 23번길', category: 'attraction', lat: 37.4743, lng: 126.6226 },
      { id: 'i7', name: '을왕리 해수욕장', address: '인천 중구 영종도해안남로 373번길', category: 'attraction', lat: 37.4631, lng: 126.3739 },
      { id: 'i8', name: '자유공원', address: '인천 중구 자유공원남로 25', category: 'attraction', lat: 37.4771, lng: 126.6230 },
      { id: 'i9', name: '영종도 하늘정원', address: '인천 중구 영종도', category: 'attraction', lat: 37.4941, lng: 126.4894 },
      { id: 'i10', name: '인천 수봉공원', address: '인천 미추홀구 수봉로 170', category: 'attraction', lat: 37.4518, lng: 126.6602 },
    ],
  },
  {
    id: 'chuncheon',
    name: '춘천',
    emoji: '🦢',
    color: 'from-emerald-500 to-green-600',
    attractions: [
      { id: 'c1', name: '남이섬', address: '강원 춘천시 남산면 남이섬길 1', category: 'attraction', lat: 37.7911, lng: 127.5249, description: '드라마 겨울연가 촬영지' },
      { id: 'c2', name: '소양강스카이워크', address: '강원 춘천시 영서로 2663', category: 'attraction', lat: 37.8871, lng: 127.7259 },
      { id: 'c3', name: '닭갈비 골목', address: '강원 춘천시 낙원동 일대', category: 'restaurant', lat: 37.8817, lng: 127.7293, description: '춘천 닭갈비 원조 거리' },
      { id: 'c4', name: '강촌 레일바이크', address: '강원 춘천시 신동면 김유정로 1383', category: 'attraction', lat: 37.8062, lng: 127.6270 },
      { id: 'c5', name: '에티오피아 한국전참전기념관', address: '강원 춘천시 영서로 2137', category: 'attraction', lat: 37.8680, lng: 127.7179 },
      { id: 'c6', name: '의암호', address: '강원 춘천시 의암로 일대', category: 'attraction', lat: 37.8668, lng: 127.6932 },
      { id: 'c7', name: '춘천 명동거리', address: '강원 춘천시 조양로 79번길', category: 'shopping', lat: 37.8818, lng: 127.7249 },
      { id: 'c8', name: '삼악산 케이블카', address: '강원 춘천시 서면 삼악산로 685', category: 'attraction', lat: 37.8401, lng: 127.6720 },
      { id: 'c9', name: '김유정 문학촌', address: '강원 춘천시 신동면 김유정로 1430-14', category: 'attraction', lat: 37.8084, lng: 127.6330 },
      { id: 'c10', name: '춘천 중도', address: '강원 춘천시 중도동', category: 'attraction', lat: 37.8623, lng: 127.7009 },
    ],
  },
  {
    id: 'suwon',
    name: '수원',
    emoji: '🏯',
    color: 'from-red-500 to-rose-600',
    attractions: [
      { id: 'sw1', name: '수원화성', address: '경기 수원시 팔달구 행궁로 11', category: 'attraction', lat: 37.2862, lng: 127.0129, description: '유네스코 세계문화유산' },
      { id: 'sw2', name: '행궁동 벽화마을', address: '경기 수원시 팔달구 행궁로 21번길', category: 'attraction', lat: 37.2847, lng: 127.0098 },
      { id: 'sw3', name: '화성행궁', address: '경기 수원시 팔달구 정조로 825', category: 'attraction', lat: 37.2848, lng: 127.0114 },
      { id: 'sw4', name: '수원 통닭거리', address: '경기 수원시 팔달구 팔달로 152번길', category: 'restaurant', lat: 37.2827, lng: 127.0172, description: '수원 왕갈비통닭 원조' },
      { id: 'sw5', name: '팔달산', address: '경기 수원시 팔달구 팔달산로 46', category: 'attraction', lat: 37.2820, lng: 127.0095 },
      { id: 'sw6', name: '수원화성박물관', address: '경기 수원시 팔달구 창룡대로 21', category: 'attraction', lat: 37.2892, lng: 127.0195 },
      { id: 'sw7', name: '광교호수공원', address: '경기 수원시 영통구 광교호수로 180', category: 'attraction', lat: 37.3100, lng: 127.0560 },
      { id: 'sw8', name: '수원 남문시장', address: '경기 수원시 팔달구 팔달로3번길 1', category: 'shopping', lat: 37.2758, lng: 127.0144 },
      { id: 'sw9', name: '만석공원', address: '경기 수원시 장안구 송죽동', category: 'attraction', lat: 37.3086, lng: 127.0094 },
      { id: 'sw10', name: '연무대 국궁장', address: '경기 수원시 팔달구 매산로3가', category: 'attraction', lat: 37.2888, lng: 127.0238, description: '전통 국궁 체험' },
    ],
  },
]

// 전체 명소 검색용 flat array
export const ALL_ATTRACTIONS: (Attraction & { regionId: string; regionName: string })[] =
  REGIONS.flatMap(r => r.attractions.map(a => ({ ...a, regionId: r.id, regionName: r.name })))
