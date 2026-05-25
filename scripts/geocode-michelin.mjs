// 미쉐린 서울 목록을 카카오 Local(키워드) API로 지오코딩 → 좌표/주소 출력
// 실행: KAKAO_REST_KEY=... node scripts/geocode-michelin.mjs
import { MICHELIN_SEOUL_2025 } from '../src/lib/data/michelin-seoul.ts'

const KEY = process.env.KAKAO_REST_KEY
if (!KEY) {
  console.error('KAKAO_REST_KEY 환경변수가 없습니다.')
  process.exit(1)
}

async function geocode(query) {
  const url = `https://dapi.kakao.com/v2/local/search/keyword.json?query=${encodeURIComponent(query)}&size=1`
  const res = await fetch(url, { headers: { Authorization: `KakaoAK ${KEY}` } })
  if (!res.ok) throw new Error(`HTTP ${res.status} ${await res.text()}`)
  const json = await res.json()
  return json.documents?.[0] ?? null
}

const out = []
for (const e of MICHELIN_SEOUL_2025) {
  try {
    const d = await geocode(e.query)
    if (!d) {
      console.log(`❌ ${e.nameKo} (${e.query}) — 검색 결과 없음`)
      continue
    }
    const row = {
      nameKo: e.nameKo,
      nameEn: e.nameEn,
      stars: e.stars,
      year: e.year,
      placeName: d.place_name,
      addressRoad: d.road_address_name || d.address_name,
      category: d.category_name,
      lat: Number(d.y),
      lng: Number(d.x),
    }
    out.push(row)
    console.log(
      `✅ ${e.nameKo.padEnd(8)} → ${d.place_name} | ${row.addressRoad} | ${row.lat},${row.lng}`,
    )
  } catch (err) {
    console.log(`⚠️ ${e.nameKo}: ${err.message}`)
  }
}

import { writeFileSync } from 'node:fs'
const outPath = 'src/lib/data/michelin-seoul.geocoded.json'
writeFileSync(outPath, JSON.stringify(out, null, 2) + '\n')
console.log(`\n💾 ${out.length}곳 저장 → ${outPath}`)
