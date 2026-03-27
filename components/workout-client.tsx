"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { WORKOUT_SCHEDULE, type Exercise } from "@/lib/workout-data"
import {
  Dumbbell,
  Plus,
  Minus,
  Check,
  ChevronDown,
  ChevronUp,
  TrendingUp,
  Clock,
  Loader2,
  AlertCircle,
} from "lucide-react"

interface WorkoutClientProps {
  userId: string
  dayOfWeek: number
  todaySession: {
    id: string
    workout_type: string
    exercise_logs: {
      id: string
      exercise_name: string
      set_number: number
      reps: number
      weight_kg: number
    }[]
  } | null
  exerciseHistory: Record<string, { weight: number; reps: number }>
  allSessions: {
    id: string
    date: string
    workout_type: string
    exercise_logs: {
      exercise_name: string
      weight_kg: number
      reps: number
    }[]
  }[]
}

type ExerciseLog = {
  exercise: Exercise
  sets: { reps: number; weight: number; completed: boolean }[]
  expanded: boolean
}

export function WorkoutClient({
  userId,
  dayOfWeek,
  todaySession,
  exerciseHistory,
  allSessions,
}: WorkoutClientProps) {
  const router = useRouter()
  const supabase = createClient()

  const workoutDays: Record<number, string> = {
    1: "chest_triceps",
    2: "back_biceps",
    4: "legs",
    5: "shoulders",
  }

  const [activeWorkoutType, setActiveWorkoutType] = useState<string | null>(todaySession?.workout_type || workoutDays[dayOfWeek] || null)

  const activeWorkout = activeWorkoutType 
    ? (Object.values(WORKOUT_SCHEDULE).find(w => w !== 'rest' && (w as any).type === activeWorkoutType) as any) 
    : null;

  // Initialize exercise logs from today's session or fresh
  const initializeLogs = (workoutDef: any): ExerciseLog[] => {
    if (!workoutDef) return []

    return workoutDef.exercises.map((exercise: Exercise) => {
      const existingLogs = todaySession?.exercise_logs.filter(
        (log) => log.exercise_name === exercise.name
      ) || []

      const lastWeight = exerciseHistory[exercise.name]?.weight || 20
      const suggestedWeight = lastWeight

      const targetRepsMatch = exercise.targetReps.match(/\d+/)
      const defaultReps = targetRepsMatch ? parseInt(targetRepsMatch[0]) : 10

      const sets = Array.from({ length: exercise.targetSets }, (_, i) => {
        const existingSet = existingLogs.find((log) => log.set_number === i + 1)
        return {
          reps: existingSet?.reps || defaultReps,
          weight: existingSet?.weight_kg || suggestedWeight,
          completed: !!existingSet,
        }
      })

      return {
        exercise,
        sets,
        expanded: !sets.every((s) => s.completed),
      }
    })
  }

  const [exerciseLogs, setExerciseLogs] = useState<ExerciseLog[]>(() => initializeLogs(activeWorkout))
  const [saving, setSaving] = useState(false)
  const [activeSessionId, setActiveSessionId] = useState<string | null>(todaySession?.id || null)

  const updateSet = (exerciseIndex: number, setIndex: number, field: "reps" | "weight", value: number) => {
    setExerciseLogs((prev) => {
      const updated = [...prev]
      updated[exerciseIndex].sets[setIndex][field] = value
      return updated
    })
  }

  const toggleSetComplete = async (exerciseIndex: number, setIndex: number) => {
    const log = exerciseLogs[exerciseIndex]
    const set = log.sets[setIndex]
    
    setSaving(true)

    try {
      // Create session if doesn't exist
      let sessionId = activeSessionId
      if (!sessionId) {
        const { data: newSession } = await supabase
          .from("workout_sessions")
          .insert({
            user_id: userId,
            workout_type: activeWorkoutType,
            date: new Date().toISOString().split('T')[0],
          })
          .select()
          .single()
        
        sessionId = newSession?.id
        setActiveSessionId(sessionId!)
      }

      if (!set.completed) {
        // Add exercise log
        await supabase.from("exercise_logs").insert({
          session_id: sessionId,
          user_id: userId,
          exercise_name: log.exercise.name,
          set_number: setIndex + 1,
          reps: set.reps,
          weight_kg: set.weight,
        })
      } else {
        // Remove exercise log
        await supabase
          .from("exercise_logs")
          .delete()
          .eq("session_id", sessionId)
          .eq("exercise_name", log.exercise.name)
          .eq("set_number", setIndex + 1)
      }

      setExerciseLogs((prev) => {
        const updated = [...prev]
        updated[exerciseIndex].sets[setIndex].completed = !set.completed
        return updated
      })
    } catch (error) {
      console.error("Error saving set:", error)
    }

    setSaving(false)
    router.refresh()
  }

  const toggleExpanded = (index: number) => {
    setExerciseLogs((prev) => {
      const updated = [...prev]
      updated[index].expanded = !updated[index].expanded
      return updated
    })
  }

  const getProgressIndicator = (exerciseName: string, currentWeight: number) => {
    const lastWeight = exerciseHistory[exerciseName]?.weight
    if (!lastWeight) return null
    
    const diff = currentWeight - lastWeight
    if (diff > 0) {
      return (
        <span className="flex items-center gap-1 text-xs text-accent">
          <TrendingUp className="w-3 h-3" />
          +{diff}kg
        </span>
      )
    }
    return null
  }

  const completedSets = exerciseLogs.reduce(
    (sum, log) => sum + log.sets.filter((s) => s.completed).length,
    0
  )
  const totalSets = exerciseLogs.reduce((sum, log) => sum + log.sets.length, 0)

  if (!activeWorkoutType) {
    return (
      <div className="p-4">
        <header className="mb-6">
          <h1 className="text-2xl font-bold text-foreground">Workout</h1>
          <p className="text-muted-foreground">Rest day - focus on recovery</p>
        </header>

        <div className="bg-card border border-border rounded-xl p-6 text-center">
          <div className="w-16 h-16 rounded-full bg-accent/10 flex items-center justify-center mx-auto mb-4">
            <Clock className="w-8 h-8 text-accent" />
          </div>
          <h2 className="text-lg font-semibold text-foreground mb-2">Rest Day</h2>
          <p className="text-muted-foreground text-sm mb-6">
            Your muscles grow during rest. Focus on hitting your protein goal and getting quality sleep.
          </p>
          <div className="flex flex-col gap-2">
            <p className="text-sm font-medium text-foreground mb-2">Or log a workout anyway:</p>
            <div className="grid grid-cols-2 gap-2">
              <Button variant="outline" onClick={() => { setActiveWorkoutType('chest_triceps'); setExerciseLogs(initializeLogs(Object.values(WORKOUT_SCHEDULE).find(w => w !== 'rest' && (w as any).type === 'chest_triceps'))); }}>Chest & Triceps</Button>
              <Button variant="outline" onClick={() => { setActiveWorkoutType('back_biceps'); setExerciseLogs(initializeLogs(Object.values(WORKOUT_SCHEDULE).find(w => w !== 'rest' && (w as any).type === 'back_biceps'))); }}>Back & Biceps</Button>
              <Button variant="outline" onClick={() => { setActiveWorkoutType('legs'); setExerciseLogs(initializeLogs(Object.values(WORKOUT_SCHEDULE).find(w => w !== 'rest' && (w as any).type === 'legs'))); }}>Legs</Button>
              <Button variant="outline" onClick={() => { setActiveWorkoutType('shoulders'); setExerciseLogs(initializeLogs(Object.values(WORKOUT_SCHEDULE).find(w => w !== 'rest' && (w as any).type === 'shoulders'))); }}>Shoulders</Button>
            </div>
          </div>
        </div>

        {/* Recent workouts */}
        <div className="mt-6">
          <h2 className="font-semibold text-foreground mb-3">Recent Workouts</h2>
          <div className="space-y-2">
            {allSessions.slice(0, 5).map((session) => (
              <div key={session.id} className="bg-card border border-border rounded-xl p-3 flex items-center justify-between">
                <div>
                  <p className="font-medium text-foreground capitalize">
                    {session.workout_type.replace("_", " & ")}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(session.date).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium text-foreground">
                    {session.exercise_logs.length} sets
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="p-4 pb-24">
      <header className="mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground capitalize">
              {activeWorkout?.name || "Workout"}
            </h1>
            <p className="text-muted-foreground">
              {completedSets}/{totalSets} sets completed
            </p>
          </div>
          {saving && <Loader2 className="w-5 h-5 animate-spin text-primary" />}
        </div>

        {/* Progress bar */}
        <div className="mt-4 h-2 bg-muted rounded-full overflow-hidden">
          <div
            className="h-full bg-primary transition-all duration-300"
            style={{ width: `${(completedSets / totalSets) * 100}%` }}
          />
        </div>
      </header>

      {/* Progressive Overload Tip */}
      <div className="bg-primary/10 border border-primary/20 rounded-xl p-3 mb-6 flex items-start gap-3">
        <TrendingUp className="w-5 h-5 text-primary shrink-0 mt-0.5" />
        <div>
          <p className="text-sm font-medium text-foreground">Progressive Overload</p>
          <p className="text-xs text-muted-foreground">
            Weights are auto-suggested based on your last session. Try to increase by 1-2.5kg when you can complete all sets.
          </p>
        </div>
      </div>

      {/* Exercise List */}
      <div className="space-y-4">
        {exerciseLogs.map((log, exerciseIndex) => (
          <div key={log.exercise.name} className="bg-card border border-border rounded-xl overflow-hidden">
            <button
              onClick={() => toggleExpanded(exerciseIndex)}
              className="w-full p-4 flex items-center justify-between"
            >
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                  log.sets.every((s) => s.completed) ? "bg-accent/20" : "bg-primary/10"
                }`}>
                  {log.sets.every((s) => s.completed) ? (
                    <Check className="w-5 h-5 text-accent" />
                  ) : (
                    <Dumbbell className="w-5 h-5 text-primary" />
                  )}
                </div>
                <div className="text-left">
                  <p className="font-medium text-foreground">{log.exercise.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {log.exercise.targetSets} sets × {log.exercise.targetReps} reps
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {getProgressIndicator(log.exercise.name, log.sets[0]?.weight || 0)}
                {log.expanded ? (
                  <ChevronUp className="w-5 h-5 text-muted-foreground" />
                ) : (
                  <ChevronDown className="w-5 h-5 text-muted-foreground" />
                )}
              </div>
            </button>

            {log.expanded && (
              <div className="px-4 pb-4 space-y-3">
                {log.exercise.notes && (
                  <div className="flex items-start gap-2 p-2 bg-muted/50 rounded-lg">
                    <AlertCircle className="w-4 h-4 text-muted-foreground shrink-0 mt-0.5" />
                    <p className="text-xs text-muted-foreground">{log.exercise.notes}</p>
                  </div>
                )}

                {log.sets.map((set, setIndex) => (
                  <div
                    key={setIndex}
                    className={`flex items-center gap-3 p-3 rounded-xl ${
                      set.completed ? "bg-accent/10 border border-accent/20" : "bg-muted/50"
                    }`}
                  >
                    <span className="text-sm font-medium text-muted-foreground w-8">
                      Set {setIndex + 1}
                    </span>

                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => updateSet(exerciseIndex, setIndex, "weight", Math.max(0, set.weight - 2.5))}
                        disabled={set.completed}
                      >
                        <Minus className="w-3 h-3" />
                      </Button>
                      <Input
                        type="number"
                        value={set.weight}
                        onChange={(e) => updateSet(exerciseIndex, setIndex, "weight", parseFloat(e.target.value) || 0)}
                        className="w-16 h-8 text-center text-sm"
                        disabled={set.completed}
                      />
                      <span className="text-xs text-muted-foreground">kg</span>
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => updateSet(exerciseIndex, setIndex, "weight", set.weight + 2.5)}
                        disabled={set.completed}
                      >
                        <Plus className="w-3 h-3" />
                      </Button>
                    </div>

                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => updateSet(exerciseIndex, setIndex, "reps", Math.max(1, set.reps - 1))}
                        disabled={set.completed}
                      >
                        <Minus className="w-3 h-3" />
                      </Button>
                      <Input
                        type="number"
                        value={set.reps}
                        onChange={(e) => updateSet(exerciseIndex, setIndex, "reps", parseInt(e.target.value) || 0)}
                        className="w-12 h-8 text-center text-sm"
                        disabled={set.completed}
                      />
                      <span className="text-xs text-muted-foreground">reps</span>
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => updateSet(exerciseIndex, setIndex, "reps", set.reps + 1)}
                        disabled={set.completed}
                      >
                        <Plus className="w-3 h-3" />
                      </Button>
                    </div>

                    <Button
                      variant={set.completed ? "default" : "outline"}
                      size="icon"
                      className={`h-8 w-8 ml-auto ${set.completed ? "bg-accent hover:bg-accent/90" : ""}`}
                      onClick={() => toggleSetComplete(exerciseIndex, setIndex)}
                      disabled={saving}
                    >
                      <Check className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
