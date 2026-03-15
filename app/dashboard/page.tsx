import { createClient } from "@/lib/supabase/server"
import { DashboardClient } from "@/components/dashboard-client"

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  const today = new Date().toISOString().split('T')[0]
  const dayOfWeek = new Date().getDay()
  const workoutDays = [1, 2, 4, 5] // Mon, Tue, Thu, Fri
  const isWorkoutDay = workoutDays.includes(dayOfWeek)

  // Fetch today's data
  const [
    { data: profile },
    { data: todayMeals },
    { data: todaySleep },
    { data: todayWorkout },
    { data: todayAttendance },
    { data: weekAttendance },
  ] = await Promise.all([
    supabase.from("profiles").select("*").eq("id", user!.id).single(),
    supabase.from("meals").select("*").eq("user_id", user!.id).eq("date", today),
    supabase.from("sleep_logs").select("*").eq("user_id", user!.id).eq("date", today).single(),
    supabase.from("workout_sessions").select("*").eq("user_id", user!.id).eq("date", today).single(),
    supabase.from("gym_attendance").select("*").eq("user_id", user!.id).eq("date", today).single(),
    supabase.from("gym_attendance")
      .select("*")
      .eq("user_id", user!.id)
      .gte("date", new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0])
      .order("date", { ascending: false }),
  ])

  const totalCalories = todayMeals?.reduce((sum, meal) => sum + (meal.calories || 0), 0) || 0
  const totalProtein = todayMeals?.reduce((sum, meal) => sum + (meal.protein_grams || 0), 0) || 0
  const sleepHours = todaySleep?.duration_hours || 0

  return (
    <DashboardClient
      profile={profile}
      totalCalories={totalCalories}
      totalProtein={totalProtein}
      sleepHours={sleepHours}
      hasWorkedOut={!!todayWorkout}
      hasMarkedAttendance={!!todayAttendance}
      isWorkoutDay={isWorkoutDay}
      weekAttendance={weekAttendance || []}
      userId={user!.id}
    />
  )
}
