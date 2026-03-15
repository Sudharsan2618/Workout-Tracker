import { createClient } from "@/lib/supabase/server"
import { SleepClient } from "@/components/sleep-client"

export default async function SleepPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  const today = new Date().toISOString().split('T')[0]

  const [
    { data: profile },
    { data: todaySleep },
    { data: weekSleep },
  ] = await Promise.all([
    supabase.from("profiles").select("*").eq("id", user!.id).single(),
    supabase
      .from("sleep_logs")
      .select("*")
      .eq("user_id", user!.id)
      .eq("date", today)
      .single(),
    supabase
      .from("sleep_logs")
      .select("*")
      .eq("user_id", user!.id)
      .gte("date", new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0])
      .order("date", { ascending: false }),
  ])

  return (
    <SleepClient
      userId={user!.id}
      profile={profile}
      todaySleep={todaySleep}
      weekSleep={weekSleep || []}
    />
  )
}
