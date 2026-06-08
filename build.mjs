// Curated hotel image library builder (ADDITIVE) — runs inside the imagery repo.
//
//   node build.mjs [target]
//
// Reads UNSPLASH/VITE key from .env, appends new de-duplicated images per
// category into ./<category>/, updates ./manifest.json. Rate-limit aware
// (50 req/hr demo): skips full categories, stops cleanly, re-run to continue.
// Commit + push afterwards → GitHub Pages serves the new images and manifest,
// and the design system picks them up at runtime (no DS rebuild needed).
import { writeFileSync, mkdirSync, readFileSync, existsSync } from 'node:fs'

const ROOT = process.cwd()
const MANIFEST = `${ROOT}/manifest.json`
const API = 'https://api.unsplash.com'
const UTM = '?utm_source=presto_ds&utm_medium=referral'
const TARGET = Number(process.argv[2]) || 8

const env = readFileSync(`${ROOT}/.env`, 'utf8')
const KEY = (env.match(/(?:VITE_)?UNSPLASH_ACCESS_KEY=(.+)/) || [])[1]?.trim()
if (!KEY) { console.error('Missing UNSPLASH_ACCESS_KEY in .env'); process.exit(1) }

const CATS = [
  { key: 'rooms', q: 'hotel room interior modern' },
  { key: 'suites', q: 'luxury hotel suite living room' },
  { key: 'lobby', q: 'hotel lobby interior design' },
  { key: 'pool', q: 'hotel infinity pool resort' },
  { key: 'spa', q: 'hotel spa wellness treatment' },
  { key: 'dining', q: 'hotel restaurant fine dining interior' },
  { key: 'bar', q: 'hotel bar lounge cocktail' },
  { key: 'bathroom', q: 'luxury hotel bathroom marble' },
  { key: 'exterior', q: 'luxury hotel building exterior' },
  { key: 'views', q: 'hotel room balcony ocean view' },
  { key: 'destinations', q: 'travel destination landmark city' },
  { key: 'guests', q: 'travelers vacation people' },
  { key: 'amenities', q: 'hotel gym fitness center' },
]

const manifest = existsSync(MANIFEST) ? JSON.parse(readFileSync(MANIFEST, 'utf8')) : {}
let rate = Infinity, added = 0, tracked = 0
const apiGet = async (url) => {
  const res = await fetch(`${url}${url.includes('?') ? '&' : '?'}client_id=${KEY}`)
  const r = res.headers.get('x-ratelimit-remaining'); if (r !== null) rate = Number(r)
  if (!res.ok) throw new Error(String(res.status)); return res.json()
}

const ordered = [...CATS].sort((a, b) => (manifest[a.key]?.length || 0) - (manifest[b.key]?.length || 0));
for (const { key, q } of ordered) {
  const existing = manifest[key] || []
  if (existing.length >= TARGET) { console.log(`• ${key}: ${existing.length}/${TARGET}, skip`); continue }
  if (rate <= 1) { console.log('! rate limit — re-run next hour'); break }
  mkdirSync(`${ROOT}/${key}`, { recursive: true })
  const seen = new Set(existing.map((e) => e.id).filter(Boolean))
  let results = []
  try { results = (await apiGet(`${API}/search/photos?query=${encodeURIComponent(q)}&per_page=20&orientation=landscape&content_filter=high`)).results || [] }
  catch (e) { console.log(`! search ${key} ${e.message}`); if (e.message === '403') break; else continue }
  let n = existing.length
  for (const p of results) {
    if (n >= TARGET) break
    if (seen.has(p.id)) continue
    const file = `${key}/${key}-${n + 1}.jpg`
    try {
      const img = await fetch(`${p.urls.raw}&w=1100&q=70&fm=jpg&fit=crop&crop=entropy`)
      if (!img.ok) throw new Error(String(img.status))
      writeFileSync(`${ROOT}/${file}`, Buffer.from(await img.arrayBuffer()))
      existing.push({ file, alt: p.alt_description || p.description || `${key} photo`, color: p.color, credit: p.user?.name || 'Unsplash', creditUrl: (p.user?.links?.html || 'https://unsplash.com') + UTM, id: p.id })
      seen.add(p.id); n++; added++
      if (rate > 5 && p.links?.download_location) { try { await apiGet(p.links.download_location); tracked++ } catch {} }
    } catch (e) { console.log(`  · skip ${file} ${e.message}`) }
  }
  manifest[key] = existing
  console.log(`✓ ${key}: ${existing.length}/${TARGET} (rate ~${rate})`)
}
writeFileSync(MANIFEST, JSON.stringify(manifest, null, 2) + '\n')
const total = Object.values(manifest).reduce((s, a) => s + a.length, 0)
console.log(`\n${total} images / ${Object.keys(manifest).length} categories. added=${added} tracked=${tracked} rate=${rate}`)
