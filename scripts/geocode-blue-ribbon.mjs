// 블루리본 큐레이션(전국·전체등급)을 카카오 Local(키워드, 음식점 FD6)로 지오코딩
// 실행: KAKAO_REST_KEY=... node scripts/geocode-blue-ribbon.mjs
import { writeFileSync } from 'node:fs'
import { BLUE_RIBBON_ENTRIES } from '../src/lib/data/blue-ribbon.ts'

const KEY = process.env.KAKAO_REST_KEY
if (!KEY) {
  console.error('KAKAO_REST_KEY 없음')
  process.exit(1)
}

async function geocode(query) {
  const url = `https://dapi.kakao.com/v2/local/search/keyword.json?query=${encodeURIComponent(query)}&category_group_code=FD6&size=5`
  const res = await fetch(url, { headers: { Authorization: `KakaoAK ${KEY}` } })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return (await res.json()).documents ?? []
}

const out = []
for (const e of BLUE_RIBBON_ENTRIES) {
  try {
    const docs = await geocode(e.query)
    // 해당 지역(region) 주소 결과 우선 → 없으면 첫 결과
    const d =
      docs.find((x) =>
        (x.road_address_name || x.address_name || '').startsWith(e.region),
      ) ??
      docs[0] ??
      null
    if (!d) {
      console.log(`❌ ${e.nameKo} (${e.query}) — 결과 없음`)
      continue
    }
    const addr = d.road_address_name || d.address_name
    const inRegion = addr.startsWith(e.region)
    out.push({
      nameKo: e.nameKo,
      ribbons: e.ribbons,
      year: e.year,
      region: e.region,
      placeName: d.place_name,
      addressRoad: addr,
      category: d.category_name,
      lat: Number(d.y),
      lng: Number(d.x),
    })
    console.log(
      `${inRegion ? '✅' : '⚠️ '}${e.nameKo.padEnd(12)} → ${d.place_name} | ${d.category_name} | ${addr}`,
    )
  } catch (err) {
    console.log(`⚠️ ${e.nameKo}: ${err.message}`)
  }
}
writeFileSync(
  'src/lib/data/blue-ribbon.geocoded.json',
  JSON.stringify(out, null, 2) + '\n',
)
console.log(`\n💾 ${out.length}곳 저장 → src/lib/data/blue-ribbon.geocoded.json`)
