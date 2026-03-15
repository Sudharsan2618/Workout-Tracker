"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Scale,
  TrendingUp,
  Target,
  Calendar,
  Dumbbell,
  Flame,
  Loader2,
  Plus,
  CheckCircle2,
  AlertCircle,
  ChevronRight,
} from "lucide-react"

interface WeightLog {
  id: string
  date: string
  weight_kg: number
  expected_weight_kg?: number
}

interface Profile {
  current_weight: number
  target_weight: number
  daily_calorie_goal: number
  daily_protein_goal: number
  created_at: string
}

interface ProgressClientProps {
  userId: string
  profile: Profile | null
  weightLogs: WeightLog[]
  gymAttendance: { date: string; attended: boolean }[]
  workoutSessions: {
    id: string
    date: string
    workout_type: string
    exercise_logs: { weight_kg: number; exercise_name: string }[]
  }[]
  meals: { date: string; calories: number; protein_grams: number }[]
}

export function ProgressClient({
  userId,
  profile,
  weightLogs,
  gymAttendance,
  workoutSessions,
  meals,
}: ProgressClientProps) {
  const router = useRouter()
  const supabase = createClient()

  const [showWeightModal, setShowWeightModal] = useState(false)
  const [newWeight, setNewWeight] = useState(profile?.current_weight?.toString() || "65")
  const [saving, setSaving] = useState(false)

  const currentWeight = profile?.current_weight || 65
  const targetWeight = profile?.target_weight || 75
  const startWeight = 65 // Starting weight
  const weightGained = currentWeight - startWeight
  const weightRemaining = targetWeight - currentWeight
  const progressPercent = Math.round((weightGained / (targetWeight - startWeight)) * 100)

  // Calculate expected weight based on calorie surplus
  // ~7700 kcal surplus = 1kg gain
  // Assuming 500 kcal surplus per day = 2kg per month
  const accountCreated = profile?.created_at ? new Date(profile.created_at) : new Date()
  const daysSinceStart = Math.floor((Date.now() - accountCreated.getTime()) / (1000 * 60 * 60 * 24))
  const expectedWeightGain = (daysSinceStart * 500) / 7700 // Based on 500 kcal surplus
  const expectedWeight = Math.min(startWeight + expectedWeightGain, targetWeight)

  const handleSaveWeight = async () => {
    setSaving(true)
    const today = new Date().toISOString().split('T')[0]
    const weight = parseFloat(newWeight)

    // Save weight log
    await supabase.from("weight_logs").insert({
      user_id: userId,
      date: today,
      weight_kg: weight,
      expected_weight_kg: expectedWeight,
    })

    // Update profile
    await supabase
      .from("profiles")
      .update({ current_weight: weight, updated_at: new Date().toISOString() })
      .eq("id", userId)

    setShowWeightModal(false)
    setSaving(false)
    router.refresh()
  }

  // Calculate stats
  const thisMonth = new Date().toISOString().slice(0, 7)
  const thisMonthAttendance = gymAttendance.filter(a => a.date.startsWith(thisMonth) && a.attended).length
  const totalWorkouts = gymAttendance.filter(a => a.attended).length

  // Aggregate daily meals
  const dailyMeals = meals.reduce((acc, meal) => {
    if (!acc[meal.date]) {
      acc[meal.date] = { calories: 0, protein: 0 }
    }
    acc[meal.date].calories += meal.calories || 0
    acc[meal.date].protein += meal.protein_grams || 0
    return acc
  }, {} as Record<string, { calories: number; protein: number }>)

  const daysHitCalorieGoal = Object.values(dailyMeals).filter(
    d => d.calories >= (profile?.daily_calorie_goal || 3000)
  ).length
  const daysHitProteinGoal = Object.values(dailyMeals).filter(
    d => d.protein >= (profile?.daily_protein_goal || 135)
  ).length

  // Progressive overload tracking - find weight increases
  const exerciseProgress: Record<string, { first: number; latest: number; increase: number }> = {}
  workoutSessions.forEach((session) => {
    session.exercise_logs.forEach((log) => {
      if (!exerciseProgress[log.exercise_name]) {
        exerciseProgress[log.exercise_name] = {
          first: log.weight_kg,
          latest: log.weight_kg,
          increase: 0,
        }
      }
      // Update first (oldest) and latest
      exerciseProgress[log.exercise_name].latest = log.weight_kg
    })
  })

  // Calculate increases
  Object.keys(exerciseProgress).forEach((name) => {
    const prog = exerciseProgress[name]
    prog.increase = prog.latest - prog.first
  })

  const topProgressExercises = Object.entries(exerciseProgress)
    .filter(([, data]) => data.increase > 0)
    .sort((a, b) => b[1].increase - a[1].increase)
    .slice(0, 5)

  return (
    <div className="p-4 pb-24">
      <header className="mb-6">
        <h1 className="text-2xl font-bold text-foreground">Progress</h1>
        <p className="text-muted-foreground">Track your journey to 75kg</p>
      </header>

      {/* Weight Progress Card */}
      <div className="bg-card border border-border rounded-xl p-6 mb-6">
        <div className="flex items-start justify-between mb-4">
          <div>
            <p className="text-sm text-muted-foreground">Current Weight</p>
            <p className="text-4xl font-bold text-foreground">{currentWeight}kg</p>
          </div>
          <Button
            onClick={() => setShowWeightModal(true)}
            size="sm"
            className="bg-primary hover:bg-primary/90"
          >
            <Plus className="w-4 h-4 mr-1" />
            Log Weight
          </Button>
        </div>

        {/* Progress Bar */}
        <div className="mb-4">
          <div className="flex items-center justify-between text-sm mb-2">
            <span className="text-muted-foreground">{startWeight}kg</span>
            <span className="text-primary font-medium">{targetWeight}kg goal</span>
          </div>
          <div className="h-4 bg-muted rounded-full overflow-hidden relative">
            <div
              className="h-full bg-primary rounded-full transition-all"
              style={{ width: `${Math.max(progressPercent, 0)}%` }}
            />
            {/* Expected marker */}
            <div
              className="absolute top-0 bottom-0 w-0.5 bg-warning"
              style={{ left: `${((expectedWeight - startWeight) / (targetWeight - startWeight)) * 100}%` }}
            />
          </div>
          <div className="flex items-center justify-between mt-2">
            <span className="text-xs text-muted-foreground">
              {weightGained > 0 ? `+${weightGained.toFixed(1)}kg gained` : "Starting point"}
            </span>
            <span className="text-xs text-muted-foreground">
              {weightRemaining.toFixed(1)}kg to go
            </span>
          </div>
        </div>

        {/* Expected vs Actual */}
        <div className="bg-muted/50 rounded-lg p-3 flex items-center gap-3">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
            currentWeight >= expectedWeight ? "bg-accent/20" : "bg-warning/20"
          }`}>
            {currentWeight >= expectedWeight ? (
              <CheckCircle2 className="w-5 h-5 text-accent" />
            ) : (
              <AlertCircle className="w-5 h-5 text-warning" />
            )}
          </div>
          <div>
            <p className="text-sm font-medium text-foreground">
              {currentWeight >= expectedWeight ? "On Track!" : "Slightly Behind"}
            </p>
            <p className="text-xs text-muted-foreground">
              Expected: {expectedWeight.toFixed(1)}kg | Actual: {currentWeight}kg
            </p>
          </div>
        </div>
      </div>

      {/* Weight History Chart */}
      {weightLogs.length > 0 && (
        <div className="bg-card border border-border rounded-xl p-4 mb-6">
          <h2 className="font-semibold text-foreground mb-3">Weight History</h2>
          <div className="h-32 flex items-end gap-1">
            {weightLogs.slice(-12).map((log, i) => {
              const minWeight = Math.min(...weightLogs.map(l => l.weight_kg)) - 1
              const maxWeight = Math.max(...weightLogs.map(l => l.weight_kg), targetWeight)
              const heightPercent = ((log.weight_kg - minWeight) / (maxWeight - minWeight)) * 100
              return (
                <div key={log.id} className="flex-1 flex flex-col items-center gap-1">
                  <div className="w-full bg-muted rounded-t relative" style={{ height: "100px" }}>
                    <div
                      className="absolute bottom-0 left-0 right-0 bg-primary rounded-t transition-all"
                      style={{ height: `${heightPercent}%` }}
                    />
                  </div>
                  <span className="text-[10px] text-muted-foreground">
                    {new Date(log.date).toLocaleDateString("en-US", { month: "short" }).charAt(0)}
                  </span>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Stats Grid */}
      <div className="grid grid-cols-2 gap-3 mb-6">
        <div className="bg-card border border-border rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <Dumbbell className="w-5 h-5 text-primary" />
            <span className="text-sm text-muted-foreground">Workouts</span>
          </div>
          <p className="text-2xl font-bold text-foreground">{totalWorkouts}</p>
          <p className="text-xs text-muted-foreground">{thisMonthAttendance} this month</p>
        </div>

        <div className="bg-card border border-border rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <Calendar className="w-5 h-5 text-accent" />
            <span className="text-sm text-muted-foreground">Consistency</span>
          </div>
          <p className="text-2xl font-bold text-foreground">
            {totalWorkouts > 0 ? Math.round((thisMonthAttendance / 16) * 100) : 0}%
          </p>
          <p className="text-xs text-muted-foreground">of expected workouts</p>
        </div>

        <div className="bg-card border border-border rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <Flame className="w-5 h-5 text-chart-1" />
            <span className="text-sm text-muted-foreground">Calorie Goals</span>
          </div>
          <p className="text-2xl font-bold text-foreground">{daysHitCalorieGoal}</p>
          <p className="text-xs text-muted-foreground">days hit goal</p>
        </div>

        <div className="bg-card border border-border rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <Target className="w-5 h-5 text-chart-2" />
            <span className="text-sm text-muted-foreground">Protein Goals</span>
          </div>
          <p className="text-2xl font-bold text-foreground">{daysHitProteinGoal}</p>
          <p className="text-xs text-muted-foreground">days hit goal</p>
        </div>
      </div>

      {/* Progressive Overload */}
      {topProgressExercises.length > 0 && (
        <div className="bg-card border border-border rounded-xl p-4 mb-6">
          <div className="flex items-center gap-2 mb-3">
            <TrendingUp className="w-5 h-5 text-accent" />
            <h2 className="font-semibold text-foreground">Progressive Overload</h2>
          </div>
          <div className="space-y-3">
            {topProgressExercises.map(([name, data]) => (
              <div key={name} className="flex items-center justify-between">
                <span className="text-sm text-foreground">{name}</span>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">
                    {data.first}kg → {data.latest}kg
                  </span>
                  <span className="text-xs font-medium text-accent bg-accent/10 px-2 py-0.5 rounded">
                    +{data.increase}kg
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tips */}
      <div className="bg-primary/10 border border-primary/20 rounded-xl p-4">
        <h3 className="font-semibold text-foreground mb-2">Tips to Reach 75kg</h3>
        <ul className="space-y-2 text-sm text-foreground">
          <li className="flex items-start gap-2">
            <ChevronRight className="w-4 h-4 text-primary shrink-0 mt-0.5" />
            Maintain 500+ calorie surplus daily
          </li>
          <li className="flex items-start gap-2">
            <ChevronRight className="w-4 h-4 text-primary shrink-0 mt-0.5" />
            Hit 135g protein consistently for muscle synthesis
          </li>
          <li className="flex items-start gap-2">
            <ChevronRight className="w-4 h-4 text-primary shrink-0 mt-0.5" />
            Progressive overload - increase weights by 2.5kg when possible
          </li>
          <li className="flex items-start gap-2">
            <ChevronRight className="w-4 h-4 text-primary shrink-0 mt-0.5" />
            Get 7+ hours of sleep for optimal recovery
          </li>
        </ul>
      </div>

      {/* Weight Modal */}
      {showWeightModal && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-2xl w-full max-w-sm p-6">
            <div className="text-center mb-6">
              <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                <Scale className="w-8 h-8 text-primary" />
              </div>
              <h2 className="text-xl font-bold text-foreground">Log Your Weight</h2>
              <p className="text-sm text-muted-foreground mt-1">
                Update monthly to track progress
              </p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-sm text-muted-foreground mb-1 block">Weight (kg)</label>
                <Input
                  type="number"
                  step="0.1"
                  value={newWeight}
                  onChange={(e) => setNewWeight(e.target.value)}
                  className="text-center text-2xl h-14"
                />
              </div>

              <div className="flex gap-3">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => setShowWeightModal(false)}
                >
                  Cancel
                </Button>
                <Button
                  className="flex-1 bg-primary hover:bg-primary/90"
                  onClick={handleSaveWeight}
                  disabled={saving}
                >
                  {saving ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    "Save"
                  )}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
