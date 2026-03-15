
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

async function setupStorage() {
  const { data, error } = await supabase.storage.createBucket('meal-images', {
    public: true,
    fileSizeLimit: 5242880, // 5MB
    allowedMimeTypes: ['image/png', 'image/jpeg', 'image/jpg', 'image/webp']
  })

  if (error) {
    if (error.message.includes('already exists')) {
      console.log('Bucket meal-images already exists')
    } else {
      console.error('Error creating bucket:', error)
      process.exit(1)
    }
  } else {
    console.log('Bucket meal-images created successfully')
  }

  // Set up public access policy if not already present
  // This is often handled automatically if public: true, but good to check
}

setupStorage()
