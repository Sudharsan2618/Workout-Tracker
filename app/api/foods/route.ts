import { NextResponse } from "next/server"
import { createClient as createServerClient } from "@/lib/supabase/server"
import { createClient as createAdminClient } from "@supabase/supabase-js"

const VALID_CATEGORIES = [
  "protein", "staple", "vegetable", "fruit", "nuts_seeds", "dairy",
  "supplement", "whole_meal", "cheat", "beverage", "condiment",
]
const VALID_TYPES = ["veg", "non_veg", "egg", "vegan"]

function slugify(name: string): string {
  return name.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 48)
}

export async function POST(req: Request) {
  // 1. Authenticate via the user's cookie session
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 })

  let body: any
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
  }

  const name = (body.name || "").toString().trim()
  if (!name) return NextResponse.json({ error: "Name is required" }, { status: 400 })

  const category = VALID_CATEGORIES.includes(body.category) ? body.category : "whole_meal"
  const food_type = VALID_TYPES.includes(body.food_type) ? body.food_type : "veg"
  const calories = Math.max(0, Math.round(Number(body.calories) || 0))
  const protein_g = Math.max(0, Number(body.protein_g) || 0)
  const carbs_g = Math.max(0, Number(body.carbs_g) || 0)
  const fat_g = Math.max(0, Number(body.fat_g) || 0)
  const serving_label = (body.serving_label || "1 serving").toString().trim().slice(0, 60)
  const image_url = body.image_url ? body.image_url.toString().trim() : null
  const is_cheat = category === "cheat" || !!body.is_cheat

  // 2. Insert with the service role (bypasses the read-only RLS on the catalog)
  const admin = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )

  const slug = `${slugify(name) || "food"}-${Date.now().toString(36).slice(-4)}`

  const { data, error } = await admin
    .from("food_catalog")
    .insert({
      slug, name, category, food_type, serving_label,
      calories, protein_g, carbs_g, fat_g,
      image_url, is_cheat, is_active: true, sort_order: 9999,
      source: "Custom (user)", tags: ["custom"], created_by: user.id,
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ food: data }, { status: 201 })
}
