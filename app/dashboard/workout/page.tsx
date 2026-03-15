import { createClient } from "@/lib/supabase/server"
import { WorkoutClient } from "@/components/workout-client"

export default async function WorkoutPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  const today = new Date().toISOString().split('T')[0]
  const dayOfWeek = new Date().getDay()

  // Fetch today's workout session and recent exercise history
  const [
    { data: todaySession },
    { data: recentExercises },
    { data: allSessions },
  ] = await Promise.all([
    supabase
      .from("workout_sessions")
      .select("*, exercise_logs(*)")
      .eq("user_id", user!.id)
      .eq("date", today)
      .single(),
    supabase
      .from("exercise_logs")
      .select("exercise_name, weight_kg, reps, created_at")
      .eq("user_id", user!.id)
      .order("created_at", { ascending: false })
      .limit(100),
    supabase
      .from("workout_sessions")
      .select("*, exercise_logs(*)")
      .eq("user_id", user!.id)
      .order("date", { ascending: false })
      .limit(30),
  ])

  // Get last weight used for each exercise
  const exerciseHistory: Record<string, { weight: number; reps: number }> = {}
  recentExercises?.forEach((log) => {
    if (!exerciseHistory[log.exercise_name]) {
      exerciseHistory[log.exercise_name] = {
        weight: log.weight_kg,
        reps: log.reps,
      }
    }
  })

  return (
    <WorkoutClient
      userId={user!.id}
      dayOfWeek={dayOfWeek}
      todaySession={todaySession}
      exerciseHistory={exerciseHistory}
      allSessions={allSessions || []}
    />
  )
}
