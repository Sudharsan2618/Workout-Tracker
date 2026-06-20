import { createClient } from "@/lib/supabase/server"
import { FoodsClient } from "@/components/foods-client"
import type { CatalogFood } from "@/lib/recommend"

export default async function FoodsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const today = new Date().toISOString().split("T")[0]

  const [
    { data: profile },
    { data: todayMeals },
    { data: catalog },
    { data: favorites },
  ] = await Promise.all([
    supabase.from("profiles").select("*").eq("id", user!.id).single(),
    supabase.from("meals").select("calories, protein_grams").eq("user_id", user!.id).eq("date", today),
    supabase.from("food_catalog").select("*").eq("is_active", true).order("sort_order", { ascending: true }),
    supabase.from("user_food_favorites").select("food_id").eq("user_id", user!.id),
  ])

  const totalCalories = todayMeals?.reduce((s, m) => s + (m.calories || 0), 0) || 0
  const totalProtein = todayMeals?.reduce((s, m) => s + (Number(m.protein_grams) || 0), 0) || 0
  const favoriteIds = (favorites || []).map((f) => f.food_id as string)

  return (
    <FoodsClient
      userId={user!.id}
      profile={profile}
      catalog={(catalog || []) as CatalogFood[]}
      favoriteIds={favoriteIds}
      totalCalories={totalCalories}
      totalProtein={totalProtein}
    />
  )
}
