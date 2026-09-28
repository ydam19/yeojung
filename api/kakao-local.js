const ALLOWED_ORIGINS = [
  'https://yeojung.apps.tossmini.com',
  'https://yeojung.private-apps.tossmini.com',
  'https://yeojung.web.tossmini.com',
  'https://yeojung.private-web.tossmini.com',
]

function setCorsHeaders(req, res) {
  const origin = req.headers.origin ?? ''
  const allowed =
    ALLOWED_ORIGINS.includes(origin) ||
    /^https?:\/\/localhost(:\d+)?$/.test(origin)
  if (allowed) {
    res.setHeader('Access-Control-Allow-Origin', origin)
  }
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
  res.setHeader('Access-Control-Max-Age', '86400')
}

export default async function handler(req, res) {
  setCorsHeaders(req, res)

  if (req.method === 'OPTIONS') {
    return res.status(200).end()
  }

  const restKey = process.env.KAKAO_REST_KEY
  if (!restKey) {
    return res.status(500).json({ error: 'KAKAO_REST_KEY 환경변수가 설정되지 않았습니다.' })
  }

  const params = new URLSearchParams(
    Object.fromEntries(
      Object.entries(req.query).map(([k, v]) => [k, Array.isArray(v) ? v[0] : v]),
    ),
  )
  const upstream = `https://dapi.kakao.com/v2/local/search/keyword.json?${params}`

  try {
    const kakaoRes = await fetch(upstream, {
      headers: { Authorization: `KakaoAK ${restKey}` },
    })
    const data = await kakaoRes.json()
    return res.status(kakaoRes.status).json(data)
  } catch (err) {
    return res.status(502).json({ error: 'upstream fetch failed', detail: String(err) })
  }
}
