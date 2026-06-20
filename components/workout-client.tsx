"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ProgressRing } from "@/components/progress-ring"
import { WORKOUT_SCHEDULE, type Exercise } from "@/lib/workout-data"
import {
  Dumbbell, Plus, Minus, Check, ChevronDown, ChevronUp, TrendingUp,
  Loader2, Lightbulb, History, Trophy, Flame,
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
    exercise_logs: { exercise_name: string; weight_kg: number; reps: number }[]
  }[]
}

type ExerciseLog = {
  exercise: Exercise
  sets: { reps: number; weight: number; completed: boolean }[]
  expanded: boolean
}

const WORKOUT_TYPES = [
  { type: "chest_triceps", label: "Chest & Triceps", short: "Chest", day: 1 },
  { type: "back_biceps", label: "Back & Biceps", short: "Back", day: 2 },
  { type: "legs", label: "Legs", short: "Legs", day: 4 },
  { type: "shoulders", label: "Shoulders", short: "Shoulders", day: 5 },
]

const EXERCISE_TIPS: Record<string, string> = {
  "Bench Press": "Retract your shoulder blades, lower to mid-chest, drive through your feet.",
  "Incline Dumbbell Press": "Set the bench to 30–45° and control the descent.",
  "Chest Fly": "Keep a slight elbow bend and squeeze at the top.",
  "Tricep Pushdown": "Pin your elbows to your sides — only the forearms move.",
  "Dips": "Lean forward for more chest, stay upright for triceps.",
  "Pull Ups": "Full hang to chin over the bar, no swinging.",
  "Lat Pulldown": "Pull to your upper chest, drive your elbows down.",
  "Barbell Row": "Hinge to ~45° and pull to your lower ribs.",
  "Dumbbell Curl": "No swinging — full range, squeeze at the top.",
  "Hammer Curl": "Neutral grip, slow and controlled tempo.",
  "Squats": "Brace your core, knees track your toes, hit depth.",
  "Leg Press": "Don't lock your knees, control the negative.",
  "Romanian Deadlift": "Soft knees, hinge at the hips, feel the hamstrings.",
  "Calf Raises": "Full stretch at the bottom, pause at the top.",
  "Overhead Press": "Brace hard, bar over mid-foot, no leg drive.",
  "Lateral Raises": "Lead with your elbows, slight forward lean.",
  "Rear Delt Fly": "Thumbs slightly down, squeeze the rear delts.",
  "Shrugs": "Straight up, hold for a beat at the top.",
}

const findDef = (type: string) =>
  Object.values(WORKOUT_SCHEDULE).find((w) => w !== "rest" && (w as any).type === type) as any

export function WorkoutClient({ userId, dayOfWeek, todaySession, exerciseHistory, allSessions }: WorkoutClientProps) {
  const router = useRouter()
  const supabase = createClient()

  const scheduledType = WORKOUT_TYPES.find((w) => w.day === dayOfWeek)?.type || null
  const [activeWorkoutType, setActiveWorkoutType] = useState<string | null>(todaySession?.workout_type || scheduledType)

  const activeWorkout = activeWorkoutType ? findDef(activeWorkoutType) : null

  const initializeLogs = (workoutDef: any): ExerciseLog[] => {
    if (!workoutDef) return []
    return workoutDef.exercises.map((exercise: Exercise) => {
      const existingLogs = todaySession?.exercise_logs.filter((log) => log.exercise_name === exercise.name) || []
      const lastWeight = exerciseHistory[exercise.name]?.weight || 20
      const targetRepsMatch = exercise.targetReps.match(/\d+/)
      const defaultReps = targetRepsMatch ? parseInt(targetRepsMatch[0]) : 10
      const sets = Array.from({ length: exercise.targetSets }, (_, i) => {
        const existingSet = existingLogs.find((log) => log.set_number === i + 1)
        return {
          reps: existingSet?.reps || defaultReps,
          weight: existingSet?.weight_kg || lastWeight,
          completed: !!existingSet,
        }
      })
      return { exercise, sets, expanded: !sets.every((s) => s.completed) }
    })
  }

  const [exerciseLogs, setExerciseLogs] = useState<ExerciseLog[]>(() => initializeLogs(activeWorkout))
  const [saving, setSaving] = useState(false)
  const [activeSessionId, setActiveSessionId] = useState<string | null>(todaySession?.id || null)

  const selectWorkout = (type: string) => {
    setActiveWorkoutType(type)
    setExerciseLogs(initializeLogs(findDef(type)))
    setActiveSessionId(type === todaySession?.workout_type ? todaySession?.id ?? null : null)
  }

  const updateSet = (ei: number, si: number, field: "reps" | "weight", value: number) => {
    setExerciseLogs((prev) => {
      const updated = [...prev]
      updated[ei].sets[si][field] = value
      return updated
    })
  }

  const toggleSetComplete = async (ei: number, si: number) => {
    const log = exerciseLogs[ei]
    const set = log.sets[si]
    setSaving(true)
    try {
      let sessionId = activeSessionId
      if (!sessionId) {
        const { data: newSession } = await supabase
          .from("workout_sessions")
          .insert({ user_id: userId, workout_type: activeWorkoutType, date: new Date().toISOString().split("T")[0] })
          .select().single()
        sessionId = newSession?.id
        setActiveSessionId(sessionId!)
      }
      if (!set.completed) {
        await supabase.from("exercise_logs").insert({
          session_id: sessionId, user_id: userId, exercise_name: log.exercise.name,
          set_number: si + 1, reps: set.reps, weight_kg: set.weight,
        })
      } else {
        await supabase.from("exercise_logs").delete()
          .eq("session_id", sessionId).eq("exercise_name", log.exercise.name).eq("set_number", si + 1)
      }
      setExerciseLogs((prev) => {
        const updated = [...prev]
        updated[ei].sets[si].completed = !set.completed
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

  const completedSets = exerciseLogs.reduce((s, l) => s + l.sets.filter((x) => x.completed).length, 0)
  const totalSets = exerciseLogs.reduce((s, l) => s + l.sets.length, 0)
  const exercisesDone = exerciseLogs.filter((l) => l.sets.every((s) => s.completed)).length
  const totalVolume = Math.round(
    exerciseLogs.reduce((s, l) => s + l.sets.filter((x) => x.completed).reduce((a, x) => a + x.weight * x.reps, 0), 0),
  )
  const pct = totalSets ? Math.round((completedSets / totalSets) * 100) : 0
  const allDone = totalSets > 0 && completedSets === totalSets

  const today = new Date()

  return (
    <div className="p-4 pb-24">
      <header className="mb-4 flex items-center justify-between">
        <div>
          <p className="text-muted-foreground text-sm">
            {today.toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric" })}
          </p>
          <h1 className="text-2xl font-bold text-foreground">Workout</h1>
        </div>
        {saving && <Loader2 className="w-5 h-5 animate-spin text-primary" />}
      </header>

      {/* Day selector */}
      <div className="flex gap-2 overflow-x-auto pb-2 mb-4 -mx-1 px-1">
        {WORKOUT_TYPES.map((w) => {
          const isActive = activeWorkoutType === w.type
          const isToday = scheduledType === w.type
          return (
            <button
              key={w.type}
              onClick={() => selectWorkout(w.type)}
              className={`shrink-0 px-3.5 py-2 rounded-xl text-sm font-medium transition-colors border ${
                isActive
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-card text-muted-foreground border-border hover:border-primary/40"
              }`}
            >
              {w.short}
              {isToday && (
                <span className={`ml-1.5 text-[10px] font-semibold ${isActive ? "text-primary-foreground/80" : "text-primary"}`}>
                  • Today
                </span>
              )}
            </button>
          )
        })}
      </div>

      {!activeWorkoutType ? (
        <RestDay onPick={selectWorkout} />
      ) : (
        <>
          {/* Summary */}
          <div className="bg-card border border-border rounded-2xl shadow-sm p-4 mb-4">
            <div className="flex items-center gap-4">
              <ProgressRing progress={pct} size={76} strokeWidth={7} color="var(--primary)" bgColor="var(--muted)">
                <div className="text-center">
                  <span className="text-base font-bold text-foreground">{pct}%</span>
                </div>
              </ProgressRing>
              <div className="grid grid-cols-3 gap-2 flex-1 text-center">
                <Stat label="Sets" value={`${completedSets}/${totalSets}`} />
                <Stat label="Exercises" value={`${exercisesDone}/${exerciseLogs.length}`} />
                <Stat label="Volume" value={totalVolume ? `${totalVolume}` : "0"} unit="kg" />
              </div>
            </div>
          </div>

          {allDone ? (
            <div className="bg-primary/10 border border-primary/20 rounded-2xl p-4 mb-4 flex items-center gap-3">
              <Trophy className="w-6 h-6 text-primary shrink-0" />
              <div>
                <p className="font-semibold text-foreground">Workout complete! 🎉</p>
                <p className="text-xs text-muted-foreground">{totalVolume} kg lifted across {totalSets} sets. Now hit your protein.</p>
              </div>
            </div>
          ) : (
            <div className="bg-secondary/50 border border-border rounded-2xl p-3 mb-4 flex items-start gap-3">
              <TrendingUp className="w-5 h-5 text-primary shrink-0 mt-0.5" />
              <p className="text-xs text-muted-foreground">
                <span className="font-medium text-foreground">Progressive overload:</span> weights are pre-filled from your
                last session. Add 1–2.5 kg once you complete all sets cleanly.
              </p>
            </div>
          )}

          {/* Exercises */}
          <div className="space-y-3">
            {exerciseLogs.map((log, ei) => {
              const last = exerciseHistory[log.exercise.name]
              const doneInEx = log.sets.filter((s) => s.completed).length
              const allEx = log.sets.every((s) => s.completed)
              const tip = EXERCISE_TIPS[log.exercise.name]
              return (
                <div key={log.exercise.name} className="bg-card border border-border rounded-2xl shadow-sm overflow-hidden">
                  <button onClick={() => toggleExpanded(ei)} className="w-full p-4 flex items-center justify-between text-left">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${allEx ? "bg-primary/15" : "bg-muted"}`}>
                        {allEx ? <Check className="w-5 h-5 text-primary" /> : <Dumbbell className="w-5 h-5 text-muted-foreground" />}
                      </div>
                      <div className="min-w-0">
                        <p className="font-semibold text-foreground truncate">{log.exercise.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {log.exercise.targetSets} × {log.exercise.targetReps} reps
                          {last && <> · last {last.weight}kg×{last.reps}</>}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className={`text-xs font-semibold px-2 py-1 rounded-full ${allEx ? "bg-primary/15 text-primary" : "bg-muted text-muted-foreground"}`}>
                        {doneInEx}/{log.sets.length}
                      </span>
                      {log.expanded ? <ChevronUp className="w-5 h-5 text-muted-foreground" /> : <ChevronDown className="w-5 h-5 text-muted-foreground" />}
                    </div>
                  </button>

                  {log.expanded && (
                    <div className="px-4 pb-4 space-y-3">
                      {tip && (
                        <div className="flex items-start gap-2 p-2.5 bg-muted/60 rounded-lg">
                          <Lightbulb className="w-4 h-4 text-warning shrink-0 mt-0.5" />
                          <p className="text-xs text-muted-foreground">{tip}</p>
                        </div>
                      )}

                      {log.sets.map((set, si) => (
                        <div
                          key={si}
                          className={`rounded-xl p-3 border ${set.completed ? "bg-primary/5 border-primary/20" : "bg-muted/40 border-transparent"}`}
                        >
                          <div className="flex items-center justify-between mb-3">
                            <span className="text-sm font-semibold text-foreground">Set {si + 1}</span>
                            {set.completed && (
                              <span className="text-[11px] font-medium text-primary flex items-center gap-1">
                                <Check className="w-3.5 h-3.5" /> Logged
                              </span>
                            )}
                          </div>
                          <div className="grid grid-cols-2 gap-3 mb-3">
                            <Stepper label="Weight (kg)" value={set.weight} step={2.5} min={0} disabled={set.completed}
                              onChange={(v) => updateSet(ei, si, "weight", v)} />
                            <Stepper label="Reps" value={set.reps} step={1} min={1} disabled={set.completed}
                              onChange={(v) => updateSet(ei, si, "reps", v)} />
                          </div>
                          <Button
                            onClick={() => toggleSetComplete(ei, si)}
                            disabled={saving}
                            variant={set.completed ? "outline" : "default"}
                            className={`w-full h-10 ${set.completed ? "border-primary/30 text-primary" : "bg-primary hover:bg-primary/90"}`}
                          >
                            {set.completed ? <>Completed — tap to undo</> : <><Check className="w-4 h-4 mr-1.5" /> Complete set</>}
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </>
      )}

      {/* Recent workouts */}
      {allSessions.length > 0 && (
        <div className="mt-8">
          <h2 className="font-semibold text-foreground mb-3 flex items-center gap-2">
            <History className="w-4 h-4 text-muted-foreground" /> Recent workouts
          </h2>
          <div className="space-y-2">
            {allSessions.slice(0, 6).map((session) => {
              const vol = Math.round(session.exercise_logs.reduce((a, x) => a + x.weight_kg * x.reps, 0))
              return (
                <div key={session.id} className="bg-card border border-border rounded-xl p-3 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-lg bg-muted flex items-center justify-center">
                      <Dumbbell className="w-4 h-4 text-muted-foreground" />
                    </div>
                    <div>
                      <p className="font-medium text-foreground capitalize text-sm">{session.workout_type.replace("_", " & ")}</p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(session.date).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold text-foreground">{session.exercise_logs.length} sets</p>
                    {vol > 0 && <p className="text-xs text-muted-foreground flex items-center justify-end gap-1"><Flame className="w-3 h-3 text-chart-1" />{vol} kg</p>}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}

function Stat({ label, value, unit }: { label: string; value: string; unit?: string }) {
  return (
    <div>
      <p className="text-lg font-bold text-foreground leading-none">
        {value}
        {unit && <span className="text-xs font-medium text-muted-foreground ml-0.5">{unit}</span>}
      </p>
      <p className="text-[11px] text-muted-foreground mt-1">{label}</p>
    </div>
  )
}

function Stepper({
  label, value, step, min = 0, disabled, onChange,
}: {
  label: string; value: number; step: number; min?: number; disabled?: boolean; onChange: (v: number) => void
}) {
  return (
    <div>
      <p className="text-[11px] text-muted-foreground mb-1 text-center">{label}</p>
      <div className="flex items-center gap-1.5 bg-background border border-border rounded-lg p-1">
        <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" disabled={disabled}
          onClick={() => onChange(Math.max(min, Math.round((value - step) * 10) / 10))}>
          <Minus className="w-3.5 h-3.5" />
        </Button>
        <Input
          type="number" inputMode="decimal" value={value} disabled={disabled}
          onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
          className="h-8 text-center text-sm font-semibold border-0 bg-transparent px-0 focus-visible:ring-0"
        />
        <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" disabled={disabled}
          onClick={() => onChange(Math.round((value + step) * 10) / 10)}>
          <Plus className="w-3.5 h-3.5" />
        </Button>
      </div>
    </div>
  )
}

function RestDay({ onPick }: { onPick: (type: string) => void }) {
  return (
    <div className="bg-card border border-border rounded-2xl shadow-sm p-6 text-center">
      <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
        <Trophy className="w-8 h-8 text-primary" />
      </div>
      <h2 className="text-lg font-semibold text-foreground mb-2">Rest Day</h2>
      <p className="text-muted-foreground text-sm mb-6 max-w-xs mx-auto">
        Your muscles grow during rest. Hit your protein goal and get quality sleep — or start a session anyway.
      </p>
      <div className="grid grid-cols-2 gap-2">
        {WORKOUT_TYPES.map((w) => (
          <Button key={w.type} variant="outline" onClick={() => onPick(w.type)}>{w.label}</Button>
        ))}
      </div>
    </div>
  )
}
