const KAKAO_KEY = import.meta.env.VITE_KAKAO_MAP_KEY as string

// 디버그: 환경변수 로드 확인 (확인 후 삭제 가능)
console.log('[kakaoLoader] VITE_KAKAO_MAP_KEY:', KAKAO_KEY ? `${KAKAO_KEY.slice(0, 6)}... (length: ${KAKAO_KEY.length})` : 'undefined')

export const HAS_KAKAO_KEY =
  !!KAKAO_KEY && KAKAO_KEY !== '여기에_카카오_JavaScript_키_입력'

/**
 * 카카오맵 SDK(+ services 라이브러리)를 로드하고 초기화가 완료되면 resolve.
 * 이미 로드된 경우 즉시 resolve.
 */
export function loadKakaoSdk(): Promise<void> {
  return new Promise((resolve, reject) => {
    if (!HAS_KAKAO_KEY) {
      reject(new Error('카카오맵 키가 설정되지 않았어요'))
      return
    }

    // 이미 완전히 로드된 경우
    if (window.kakao?.maps?.services) {
      resolve()
      return
    }

    const existing = document.getElementById('kakao-maps-sdk')
    if (existing) {
      // 스크립트 태그는 있지만 아직 load 중인 경우
      existing.addEventListener('load', () => window.kakao.maps.load(resolve))
      existing.addEventListener('error', () => reject(new Error('카카오맵 SDK 로드 실패')))
      return
    }

    const script = document.createElement('script')
    script.id = 'kakao-maps-sdk'
    // services 라이브러리 포함 (장소 검색 API)
    script.src = `//dapi.kakao.com/v2/maps/sdk.js?appkey=${KAKAO_KEY}&autoload=false&libraries=services`
    script.onload = () => window.kakao.maps.load(resolve)
    script.onerror = () => reject(new Error('카카오맵 SDK 로드 실패'))
    document.head.appendChild(script)
  })
}
