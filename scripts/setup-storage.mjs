import { createClient } from '@supabase/supabase-js'
import { loadEnvFile } from 'node:process'
import * as path from 'path'

loadEnvFile(path.join(process.cwd(), '.env'))

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase env vars')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

const BUCKETS = [
  { name: 'meal-images', limit: 5242880 },   // user meal photos
  { name: 'food-images', limit: 5242880 },    // catalog reference photos
]

async function ensureBucket({ name, limit }) {
  const { error } = await supabase.storage.createBucket(name, {
    public: true,
    fileSizeLimit: limit,
    allowedMimeTypes: ['image/png', 'image/jpeg', 'image/jpg', 'image/webp'],
  })
  if (error) {
    if (error.message.toLowerCase().includes('already exists')) {
      console.log(`Bucket ${name} already exists`)
    } else {
      console.error(`Error creating bucket ${name}:`, error.message)
      process.exitCode = 1
    }
  } else {
    console.log(`Bucket ${name} created successfully`)
  }
}

for (const b of BUCKETS) await ensureBucket(b)
