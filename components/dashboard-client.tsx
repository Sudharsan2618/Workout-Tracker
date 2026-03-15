"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { createClient } from "@/lib/supabase/client"
import { ProgressRing } from "@/components/progress-ring"
import { Button } from "@/components/ui/button"
import { 
  Dumbbell, 
  Utensils, 
  Moon, 
  Flame, 
  Target,
  CheckCircle2,
  AlertCircle,
  ChevronRight,
  Zap,
  TrendingUp
} from "lucide-react"

interface DashboardClientProps {
  profile: {
    daily_calorie_goal: number
    daily_protein_goal: number
    sleep_goal_hours: number
    current_weight: number
    target_weight: number
  } | null
  totalCalories: number
  totalProtein: number
  sleepHours: number
  hasWorkedOut: boolean
  hasMarkedAttendance: boolean
  isWorkoutDay: boolean
  weekAttendance: { date: string; attended: boolean }[]
  userId: string
}

export function DashboardClient({
  profile,
  totalCalories,
  totalProtein,
  sleepHours,
  hasWorkedOut,
  hasMarkedAttendance,
  isWorkoutDay,
  weekAttendance,
  userId,
}: DashboardClientProps) {
  const router = useRouter()
  const supabase = createClient()
  const [marking, setMarking] = useState(false)

  const calorieGoal = profile?.daily_calorie_goal || 3000
  const proteinGoal = profile?.daily_protein_goal || 135
  const sleepGoal = profile?.sleep_goal_hours || 7

  const calorieProgress = Math.round((totalCalories / calorieGoal) * 100)
  const proteinProgress = Math.round((totalProtein / proteinGoal) * 100)
  const sleepProgress = Math.round((sleepHours / sleepGoal) * 100)

  const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]
  const today = new Date()
  const weekDays = Array.from({ length: 7 }, (_, i) => {
    const date = new Date(today)
    date.setDate(today.getDate() - (6 - i))
    return {
      name: dayNames[date.getDay()],
      date: date.toISOString().split('T')[0],
      isWorkoutDay: [1, 2, 4, 5].includes(date.getDay()),
      isToday: i === 6,
    }
  })

  const getAttendanceForDate = (date: string) => {
    return weekAttendance.find(a => a.date === date)
  }

  const handleMarkAttendance = async () => {
    setMarking(true)
    const today = new Date().toISOString().split('T')[0]
    const workoutType = getWorkoutType(new Date().getDay())
    
    await supabase.from("gym_attendance").upsert({
      user_id: userId,
      date: today,
      attended: true,
      workout_day_type: workoutType,
    })
    
    router.refresh()
    setMarking(false)
  }

  const getWorkoutType = (day: number) => {
    const types: Record<number, string> = {
      1: "chest_triceps",
      2: "back_biceps",
      4: "legs",
      5: "shoulders",
    }
    return types[day] || "rest"
  }

  const getTip = () => {
    if (totalCalories < calorieGoal * 0.5) {
      return {
        type: "warning",
        message: "You're behind on calories! Add a protein shake or snack to catch up.",
      }
    }
    if (totalProtein < proteinGoal * 0.5) {
      return {
        type: "warning",
        message: "Low on protein! Consider eggs, chicken, or paneer for your next meal.",
      }
    }
    if (isWorkoutDay && !hasWorkedOut) {
      return {
        type: "info",
        message: "Today is a workout day! Hit the gym to stay on track.",
      }
    }
    if (calorieProgress >= 80 && proteinProgress >= 80) {
      return {
        type: "success",
        message: "Great progress today! Keep pushing towards your goals.",
      }
    }
    return {
      type: "info",
      message: "Stay consistent! Every meal and workout counts towards your 75kg goal.",
    }
  }

  const tip = getTip()

  return (
    <div className="p-4 space-y-6">
      {/* Header */}
      <header className="flex items-center justify-between">
        <div>
          <p className="text-muted-foreground text-sm">
            {today.toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric" })}
          </p>
          <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
        </div>
        <Link href="/dashboard/progress">
          <div className="flex items-center gap-2 bg-card border border-border rounded-xl px-3 py-2">
            <TrendingUp className="w-4 h-4 text-primary" />
            <span className="text-sm font-medium">{profile?.current_weight || 65}kg</span>
          </div>
        </Link>
      </header>

      {/* Proactive Tip */}
      <div className={`p-4 rounded-xl flex items-start gap-3 ${
        tip.type === "warning" ? "bg-warning/10 border border-warning/20" :
        tip.type === "success" ? "bg-accent/10 border border-accent/20" :
        "bg-primary/10 border border-primary/20"
      }`}>
        {tip.type === "warning" ? (
          <AlertCircle className="w-5 h-5 text-warning shrink-0 mt-0.5" />
        ) : tip.type === "success" ? (
          <CheckCircle2 className="w-5 h-5 text-accent shrink-0 mt-0.5" />
        ) : (
          <Zap className="w-5 h-5 text-primary shrink-0 mt-0.5" />
        )}
        <p className="text-sm text-foreground">{tip.message}</p>
      </div>

      {/* Main Progress Rings */}
      <div className="grid grid-cols-3 gap-4">
        <Link href="/dashboard/meals" className="flex flex-col items-center">
          <ProgressRing progress={calorieProgress} size={90} strokeWidth={6} color="hsl(var(--chart-1))">
            <div className="text-center">
              <Flame className="w-4 h-4 mx-auto text-chart-1 mb-1" />
              <span className="text-xs font-bold">{totalCalories}</span>
            </div>
          </ProgressRing>
          <span className="text-xs text-muted-foreground mt-2">Calories</span>
          <span className="text-xs font-medium">{calorieGoal} goal</span>
        </Link>

        <Link href="/dashboard/meals" className="flex flex-col items-center">
          <ProgressRing progress={proteinProgress} size={90} strokeWidth={6} color="hsl(var(--chart-2))">
            <div className="text-center">
              <Target className="w-4 h-4 mx-auto text-chart-2 mb-1" />
              <span className="text-xs font-bold">{totalProtein}g</span>
            </div>
          </ProgressRing>
          <span className="text-xs text-muted-foreground mt-2">Protein</span>
          <span className="text-xs font-medium">{proteinGoal}g goal</span>
        </Link>

        <Link href="/dashboard/sleep" className="flex flex-col items-center">
          <ProgressRing progress={sleepProgress} size={90} strokeWidth={6} color="hsl(var(--chart-3))">
            <div className="text-center">
              <Moon className="w-4 h-4 mx-auto text-chart-3 mb-1" />
              <span className="text-xs font-bold">{sleepHours}h</span>
            </div>
          </ProgressRing>
          <span className="text-xs text-muted-foreground mt-2">Sleep</span>
          <span className="text-xs font-medium">{sleepGoal}h goal</span>
        </Link>
      </div>

      {/* Week Attendance */}
      <div className="bg-card border border-border rounded-xl p-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-foreground">This Week</h2>
          <span className="text-sm text-muted-foreground">
            {weekAttendance.filter(a => a.attended).length}/4 workouts
          </span>
        </div>
        <div className="grid grid-cols-7 gap-2">
          {weekDays.map((day) => {
            const attendance = getAttendanceForDate(day.date)
            const attended = attendance?.attended
            return (
              <div key={day.date} className="flex flex-col items-center gap-1">
                <span className={`text-xs ${day.isToday ? "text-primary font-bold" : "text-muted-foreground"}`}>
                  {day.name}
                </span>
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                  attended ? "bg-accent text-accent-foreground" :
                  day.isWorkoutDay ? "bg-muted border border-dashed border-border" :
                  "bg-muted/50"
                }`}>
                  {attended ? (
                    <CheckCircle2 className="w-4 h-4" />
                  ) : day.isWorkoutDay ? (
                    <Dumbbell className="w-3 h-3 text-muted-foreground" />
                  ) : null}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Quick Actions */}
      <div className="space-y-3">
        {isWorkoutDay && !hasMarkedAttendance && (
          <Button
            onClick={handleMarkAttendance}
            disabled={marking}
            className="w-full h-14 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold text-base"
          >
            <Dumbbell className="w-5 h-5 mr-2" />
            {marking ? "Marking..." : "Mark Gym Attendance"}
          </Button>
        )}

        <div className="grid grid-cols-2 gap-3">
          <Link href="/dashboard/workout" className="block">
            <div className="bg-card border border-border rounded-xl p-4 h-full hover:border-primary/50 transition-colors">
              <div className="flex items-center justify-between">
                <Dumbbell className="w-6 h-6 text-primary" />
                <ChevronRight className="w-4 h-4 text-muted-foreground" />
              </div>
              <p className="font-semibold mt-3 text-foreground">Log Workout</p>
              <p className="text-xs text-muted-foreground mt-1">
                {hasWorkedOut ? "Session logged" : "Start your session"}
              </p>
            </div>
          </Link>

          <Link href="/dashboard/meals" className="block">
            <div className="bg-card border border-border rounded-xl p-4 h-full hover:border-primary/50 transition-colors">
              <div className="flex items-center justify-between">
                <Utensils className="w-6 h-6 text-chart-1" />
                <ChevronRight className="w-4 h-4 text-muted-foreground" />
              </div>
              <p className="font-semibold mt-3 text-foreground">Log Meal</p>
              <p className="text-xs text-muted-foreground mt-1">
                {calorieGoal - totalCalories} kcal remaining
              </p>
            </div>
          </Link>
        </div>
      </div>

      {/* Today's Schedule */}
      <div className="bg-card border border-border rounded-xl p-4">
        <h2 className="font-semibold text-foreground mb-3">Today&apos;s Focus</h2>
        {isWorkoutDay ? (
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <Dumbbell className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="font-medium text-foreground capitalize">
                {getWorkoutType(today.getDay()).replace("_", " & ")}
              </p>
              <p className="text-xs text-muted-foreground">
                Progressive overload - aim to increase weight or reps
              </p>
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center">
              <Moon className="w-5 h-5 text-accent" />
            </div>
            <div>
              <p className="font-medium text-foreground">Rest Day</p>
              <p className="text-xs text-muted-foreground">
                Focus on nutrition and recovery. Hit your protein goal!
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
