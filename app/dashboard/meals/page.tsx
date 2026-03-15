import { createClient } from "@/lib/supabase/server"
import { MealsClient } from "@/components/meals-client"

export default async function MealsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  const today = new Date().toISOString().split('T')[0]

  const [
    { data: profile },
    { data: todayMeals },
    { data: weekMeals },
  ] = await Promise.all([
    supabase.from("profiles").select("*").eq("id", user!.id).single(),
    supabase
      .from("meals")
      .select("*")
      .eq("user_id", user!.id)
      .eq("date", today)
      .order("created_at", { ascending: true }),
    supabase
      .from("meals")
      .select("date, calories, protein_grams")
      .eq("user_id", user!.id)
      .gte("date", new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0])
      .order("date", { ascending: false }),
  ])

  const totalCalories = todayMeals?.reduce((sum, meal) => sum + (meal.calories || 0), 0) || 0
  const totalProtein = todayMeals?.reduce((sum, meal) => sum + (meal.protein_grams || 0), 0) || 0

  // Aggregate week data by date
  const weekData = weekMeals?.reduce((acc, meal) => {
    if (!acc[meal.date]) {
      acc[meal.date] = { calories: 0, protein: 0 }
    }
    acc[meal.date].calories += meal.calories || 0
    acc[meal.date].protein += meal.protein_grams || 0
    return acc
  }, {} as Record<string, { calories: number; protein: number }>)

  return (
    <MealsClient
      userId={user!.id}
      profile={profile}
      todayMeals={todayMeals || []}
      totalCalories={totalCalories}
      totalProtein={totalProtein}
      weekData={weekData || {}}
    />
  )
}
