import { createClient } from '@supabase/supabase-js'
import { loadEnvFile } from 'node:process'
import * as path from 'path'
import { FOODS } from './food-seed-data.mjs'

loadEnvFile(path.join(process.cwd(), '.env'))

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
if (!supabaseUrl || !serviceKey) { console.error('Missing Supabase env vars'); process.exit(1) }

const supabase = createClient(supabaseUrl, serviceKey)
const UA = 'FitCheckSeed/1.0 (https://fitcheck.app; bulking tracker)'
const BUCKET = 'food-images'

const extFromType = (t) => t?.includes('png') ? 'png' : t?.includes('webp') ? 'webp' : 'jpg'

// Resolve a free-licensed image URL from Wikipedia/Wikimedia for a search term.
async function resolveImageUrl(term) {
  // 1) REST summary (gives originalimage / thumbnail)
  try {
    const r = await fetch(`https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(term)}`,
      { headers: { 'User-Agent': UA, Accept: 'application/json' } })
    if (r.ok) {
      const j = await r.json()
      const thumb = j?.thumbnail?.source
      const orig = j?.originalimage?.source
      const origW = j?.originalimage?.width || 0
      // use the thumbnail as-is (valid Wikimedia render); fall back to a
      // reasonably-sized original only when it won't blow the 5 MB bucket cap
      if (thumb) return thumb
      if (orig && origW && origW <= 1600) return orig
    }
  } catch {}
  // 2) pageimages via search generator (handles wrong/redirected titles)
  try {
    const u = new URL('https://en.wikipedia.org/w/api.php')
    u.search = new URLSearchParams({
      action: 'query', format: 'json', generator: 'search', gsrsearch: term, gsrlimit: '1',
      prop: 'pageimages', piprop: 'thumbnail', pithumbsize: '640', redirects: '1',
    }).toString()
    const r = await fetch(u, { headers: { 'User-Agent': UA } })
    if (r.ok) {
      const j = await r.json()
      const pages = j?.query?.pages || {}
      const first = Object.values(pages)[0]
      if (first?.thumbnail?.source) return first.thumbnail.source
    }
  } catch {}
  return null
}

async function uploadImage(slug, imageUrl) {
  const r = await fetch(imageUrl, { headers: { 'User-Agent': UA } })
  if (!r.ok) throw new Error(`download ${r.status}`)
  const type = r.headers.get('content-type') || 'image/jpeg'
  if (type.includes('svg')) throw new Error('svg not allowed')
  const buf = Buffer.from(await r.arrayBuffer())
  const ext = extFromType(type)
  const file = `${slug}.${ext}`
  const { error } = await supabase.storage.from(BUCKET).upload(file, buf, {
    contentType: type.split(';')[0], upsert: true, cacheControl: '2592000',
  })
  if (error) throw new Error(`upload: ${error.message}`)
  return supabase.storage.from(BUCKET).getPublicUrl(file).data.publicUrl
}

async function run() {
  let ok = 0, noImg = 0, fail = 0
  for (let i = 0; i < FOODS.length; i++) {
    const f = FOODS[i]
    let image_url = null
    try {
      const src = await resolveImageUrl(f.wiki || f.name)
      if (src) image_url = await uploadImage(f.slug, src)
      else noImg++
    } catch (e) {
      noImg++
      console.warn(`  image fail [${f.slug}]: ${e.message}`)
    }

    const row = {
      slug: f.slug, name: f.name, name_tamil: f.name_tamil ?? null,
      category: f.category, food_type: f.food_type,
      serving_label: f.serving_label, serving_grams: f.serving_grams ?? null,
      calories: f.calories, protein_g: f.protein_g, carbs_g: f.carbs_g ?? 0,
      fat_g: f.fat_g ?? 0, fiber_g: f.fiber_g ?? 0,
      image_url, source: f.source ?? null, tags: f.tags ?? [],
      is_cheat: f.is_cheat ?? false, is_active: true, sort_order: i,
    }
    const { error } = await supabase.from('food_catalog').upsert(row, { onConflict: 'slug' })
    if (error) { fail++; console.error(`✗ ${f.slug}: ${error.message}`) }
    else { ok++; console.log(`✓ ${f.slug}${image_url ? '' : ' (no image)'}`) }
  }
  console.log(`\nDone. upserted=${ok} fail=${fail} missingImages=${noImg} total=${FOODS.length}`)
}

run()
