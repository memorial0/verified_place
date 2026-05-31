#!/usr/bin/env node
// restaurants 테이블을 CSV로 덤프하는 스크립트 (읽기 전용)
//
// 사용법:
//   node scripts/dump-restaurants.mjs
//   node scripts/dump-restaurants.mjs --out data/restaurants.csv
//
// .env.local 의 NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY 를 읽습니다.
// (RLS 우회를 위해 service role 키 사용 — 서버/로컬 전용. 절대 커밋 금지)

import { readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { createClient } from '@supabase/supabase-js'

// --- .env.local 간단 파서 (dotenv 의존성 없이) ---
function loadEnv(file) {
  try {
    const raw = readFileSync(resolve(process.cwd(), file), 'utf8')
    for (const line of raw.split('\n')) {
      const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)
      if (!m) continue
      const key = m[1]
      let val = m[2].trim().replace(/^["']|["']$/g, '')
      if (!(key in process.env)) process.env[key] = val
    }
  } catch {
    // 파일 없으면 무시 (이미 환경변수로 주입된 경우)
  }
}
loadEnv('.env.local')

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const key =
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!url || !key) {
  console.error(
    '❌ NEXT_PUBLIC_SUPABASE_URL 와 SUPABASE_SERVICE_ROLE_KEY(또는 ANON_KEY)가 필요합니다.\n' +
      '   .env.local 에 설정되어 있는지 확인하세요.'
  )
  process.exit(1)
}

// --- 출력 경로 ---
const outArgIdx = process.argv.indexOf('--out')
const outPath = outArgIdx !== -1 ? process.argv[outArgIdx + 1] : 'data/restaurants.csv'

// --- 내보낼 컬럼 (id·name + 주소/전화 관련) ---
// 실제 스키마(supabase/migrations/0001,0004): 주소는 address_road/address_jibun/sido/sigungu, 전화는 phone
const COLUMNS = [
  'id',
  'name',
  'branch_name',
  'sido',
  'sigungu',
  'address_road',
  'address_jibun',
  'phone',
]

// --- CSV 셀 이스케이프 (RFC 4180) ---
function csvCell(v) {
  if (v === null || v === undefined) return ''
  const s = typeof v === 'object' ? JSON.stringify(v) : String(v)
  return /[",\n\r]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s
}

const supabase = createClient(url, key, { auth: { persistSession: false } })

// --- 페이지네이션으로 전체 행 조회 (1000행 기본 제한 회피) ---
async function fetchAll() {
  const pageSize = 1000
  let from = 0
  const rows = []
  for (;;) {
    const { data, error } = await supabase
      .from('restaurants')
      .select(COLUMNS.join(','))
      .order('id', { ascending: true })
      .range(from, from + pageSize - 1)
    if (error) throw error
    rows.push(...data)
    if (data.length < pageSize) break
    from += pageSize
  }
  return rows
}

try {
  const rows = await fetchAll()
  const header = COLUMNS.map(csvCell).join(',')
  const body = rows.map((r) => COLUMNS.map((c) => csvCell(r[c])).join(',')).join('\n')
  const csv = '﻿' + header + '\n' + body + '\n' // BOM: 엑셀 한글 깨짐 방지
  writeFileSync(resolve(process.cwd(), outPath), csv, 'utf8')
  console.log(`✅ ${rows.length}개 행을 ${outPath} 에 저장했습니다.`)
} catch (e) {
  console.error('❌ 덤프 실패:', e.message || e)
  process.exit(1)
}
