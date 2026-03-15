import { createClient } from "@/lib/supabase/server"
import { ProgressClient } from "@/components/progress-client"

export default async function ProgressPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const [
    { data: profile },
    { data: weightLogs },
    { data: gymAttendance },
    { data: workoutSessions },
    { data: meals },
  ] = await Promise.all([
    supabase.from("profiles").select("*").eq("id", user!.id).single(),
    supabase
      .from("weight_logs")
      .select("*")
      .eq("user_id", user!.id)
      .order("date", { ascending: true }),
    supabase
      .from("gym_attendance")
      .select("*")
      .eq("user_id", user!.id)
      .order("date", { ascending: false }),
    supabase
      .from("workout_sessions")
      .select("*, exercise_logs(*)")
      .eq("user_id", user!.id)
      .order("date", { ascending: false }),
    supabase
      .from("meals")
      .select("date, calories, protein_grams")
      .eq("user_id", user!.id)
      .gte("date", new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]),
  ])

  return (
    <ProgressClient
      userId={user!.id}
      profile={profile}
      weightLogs={weightLogs || []}
      gymAttendance={gymAttendance || []}
      workoutSessions={workoutSessions || []}
      meals={meals || []}
    />
  )
}
