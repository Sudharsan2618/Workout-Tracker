"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { ProgressRing } from "@/components/progress-ring"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Moon,
  Sun,
  Clock,
  TrendingUp,
  TrendingDown,
  Minus,
  AlertCircle,
  CheckCircle2,
  Loader2,
  Star,
} from "lucide-react"

interface SleepLog {
  id: string
  date: string
  sleep_time: string
  wake_time: string
  duration_hours: number
  quality_rating: number
  notes?: string
}

interface SleepClientProps {
  userId: string
  profile: {
    sleep_goal_hours: number
  } | null
  todaySleep: SleepLog | null
  weekSleep: SleepLog[]
}

export function SleepClient({
  userId,
  profile,
  todaySleep,
  weekSleep,
}: SleepClientProps) {
  const router = useRouter()
  const supabase = createClient()

  const sleepGoal = profile?.sleep_goal_hours || 7

  const [sleepTime, setSleepTime] = useState(todaySleep?.sleep_time || "23:00")
  const [wakeTime, setWakeTime] = useState(todaySleep?.wake_time || "06:00")
  const [quality, setQuality] = useState(todaySleep?.quality_rating || 3)
  const [saving, setSaving] = useState(false)
  const [showEdit, setShowEdit] = useState(!todaySleep)

  const calculateDuration = (sleep: string, wake: string) => {
    const [sleepH, sleepM] = sleep.split(":").map(Number)
    const [wakeH, wakeM] = wake.split(":").map(Number)
    
    let sleepMinutes = sleepH * 60 + sleepM
    let wakeMinutes = wakeH * 60 + wakeM
    
    // Handle overnight sleep
    if (wakeMinutes < sleepMinutes) {
      wakeMinutes += 24 * 60
    }
    
    return (wakeMinutes - sleepMinutes) / 60
  }

  const duration = calculateDuration(sleepTime, wakeTime)
  const progress = Math.round((duration / sleepGoal) * 100)

  const handleSave = async () => {
    setSaving(true)
    const today = new Date().toISOString().split('T')[0]

    await supabase.from("sleep_logs").upsert({
      user_id: userId,
      date: today,
      sleep_time: sleepTime,
      wake_time: wakeTime,
      duration_hours: duration,
      quality_rating: quality,
    })

    setShowEdit(false)
    setSaving(false)
    router.refresh()
  }

  // Calculate averages and trends
  const recentSleep = weekSleep.slice(0, 7)
  const avgDuration = recentSleep.length > 0
    ? recentSleep.reduce((sum, log) => sum + log.duration_hours, 0) / recentSleep.length
    : 0
  const avgQuality = recentSleep.length > 0
    ? recentSleep.reduce((sum, log) => sum + log.quality_rating, 0) / recentSleep.length
    : 0

  // Wake time consistency
  const wakeTimes = recentSleep.map(log => {
    const [h, m] = log.wake_time.split(":").map(Number)
    return h * 60 + m
  })
  const avgWakeMinutes = wakeTimes.length > 0 
    ? wakeTimes.reduce((a, b) => a + b, 0) / wakeTimes.length
    : 0
  const wakeVariance = wakeTimes.length > 0
    ? Math.sqrt(wakeTimes.reduce((sum, t) => sum + Math.pow(t - avgWakeMinutes, 2), 0) / wakeTimes.length)
    : 0
  const isConsistent = wakeVariance < 30 // Less than 30 minutes variance

  const formatTime = (minutes: number) => {
    const h = Math.floor(minutes / 60) % 24
    const m = Math.round(minutes % 60)
    return `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}`
  }

  const getSleepTip = () => {
    if (duration < 6) {
      return {
        type: "warning",
        message: "Less than 6 hours affects muscle recovery. Aim for 7+ hours for optimal gains.",
      }
    }
    if (!isConsistent && weekSleep.length > 3) {
      return {
        type: "warning",
        message: "Inconsistent wake times can affect your body's recovery rhythm. Try to wake up within 30 minutes of the same time daily.",
      }
    }
    if (duration >= sleepGoal) {
      return {
        type: "success",
        message: "Great sleep duration! Quality sleep is when muscles repair and grow.",
      }
    }
    return {
      type: "info",
      message: `Try to get ${(sleepGoal - duration).toFixed(1)} more hours. Sleep is crucial for muscle protein synthesis.`,
    }
  }

  const tip = getSleepTip()

  return (
    <div className="p-4 pb-24">
      <header className="mb-6">
        <h1 className="text-2xl font-bold text-foreground">Sleep</h1>
        <p className="text-muted-foreground">Track your recovery</p>
      </header>

      {/* Today's Sleep */}
      <div className="bg-card border border-border rounded-xl p-6 mb-6">
        <div className="flex items-center justify-center mb-4">
          <ProgressRing progress={progress} size={140} strokeWidth={10} color="hsl(var(--chart-3))">
            <div className="text-center">
              <Moon className="w-6 h-6 mx-auto text-chart-3 mb-1" />
              <span className="text-2xl font-bold">{duration.toFixed(1)}h</span>
              <p className="text-xs text-muted-foreground">of {sleepGoal}h goal</p>
            </div>
          </ProgressRing>
        </div>

        {!showEdit && todaySleep ? (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Moon className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">Slept at</span>
              </div>
              <span className="font-medium">{todaySleep.sleep_time}</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sun className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">Woke at</span>
              </div>
              <span className="font-medium">{todaySleep.wake_time}</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Star className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">Quality</span>
              </div>
              <div className="flex gap-1">
                {[1, 2, 3, 4, 5].map((star) => (
                  <Star
                    key={star}
                    className={`w-4 h-4 ${
                      star <= todaySleep.quality_rating
                        ? "text-warning fill-warning"
                        : "text-muted-foreground"
                    }`}
                  />
                ))}
              </div>
            </div>
            <Button
              variant="outline"
              className="w-full"
              onClick={() => setShowEdit(true)}
            >
              Edit Today&apos;s Sleep
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm text-muted-foreground mb-1 block">Sleep Time</label>
                <div className="relative">
                  <Moon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    type="time"
                    value={sleepTime}
                    onChange={(e) => setSleepTime(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              <div>
                <label className="text-sm text-muted-foreground mb-1 block">Wake Time</label>
                <div className="relative">
                  <Sun className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    type="time"
                    value={wakeTime}
                    onChange={(e) => setWakeTime(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
            </div>

            <div>
              <label className="text-sm text-muted-foreground mb-2 block">Sleep Quality</label>
              <div className="flex justify-center gap-2">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    onClick={() => setQuality(star)}
                    className="p-2"
                  >
                    <Star
                      className={`w-8 h-8 transition-colors ${
                        star <= quality
                          ? "text-warning fill-warning"
                          : "text-muted-foreground hover:text-warning"
                      }`}
                    />
                  </button>
                ))}
              </div>
            </div>

            <Button
              onClick={handleSave}
              disabled={saving}
              className="w-full h-12 bg-primary hover:bg-primary/90"
            >
              {saving ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                "Save Sleep Log"
              )}
            </Button>
          </div>
        )}
      </div>

      {/* Proactive Tip */}
      <div className={`p-4 rounded-xl flex items-start gap-3 mb-6 ${
        tip.type === "warning" ? "bg-warning/10 border border-warning/20" :
        tip.type === "success" ? "bg-accent/10 border border-accent/20" :
        "bg-primary/10 border border-primary/20"
      }`}>
        {tip.type === "warning" ? (
          <AlertCircle className="w-5 h-5 text-warning shrink-0 mt-0.5" />
        ) : tip.type === "success" ? (
          <CheckCircle2 className="w-5 h-5 text-accent shrink-0 mt-0.5" />
        ) : (
          <Moon className="w-5 h-5 text-primary shrink-0 mt-0.5" />
        )}
        <p className="text-sm text-foreground">{tip.message}</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        <div className="bg-card border border-border rounded-xl p-3 text-center">
          <p className="text-2xl font-bold text-foreground">{avgDuration.toFixed(1)}h</p>
          <p className="text-xs text-muted-foreground">Avg Duration</p>
        </div>
        <div className="bg-card border border-border rounded-xl p-3 text-center">
          <p className="text-2xl font-bold text-foreground">{formatTime(avgWakeMinutes)}</p>
          <p className="text-xs text-muted-foreground">Avg Wake</p>
        </div>
        <div className="bg-card border border-border rounded-xl p-3 text-center">
          <div className="flex items-center justify-center gap-1">
            {isConsistent ? (
              <CheckCircle2 className="w-5 h-5 text-accent" />
            ) : (
              <AlertCircle className="w-5 h-5 text-warning" />
            )}
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            {isConsistent ? "Consistent" : "Inconsistent"}
          </p>
        </div>
      </div>

      {/* Week Chart */}
      <div className="bg-card border border-border rounded-xl p-4">
        <h2 className="font-semibold text-foreground mb-3">Last 7 Days</h2>
        <div className="space-y-2">
          {recentSleep.slice(0, 7).reverse().map((log) => {
            const percentage = (log.duration_hours / sleepGoal) * 100
            return (
              <div key={log.id} className="flex items-center gap-3">
                <span className="text-xs text-muted-foreground w-8">
                  {new Date(log.date).toLocaleDateString("en-US", { weekday: "short" })}
                </span>
                <div className="flex-1 h-6 bg-muted rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full ${
                      log.duration_hours >= sleepGoal ? "bg-accent" : "bg-chart-3"
                    }`}
                    style={{ width: `${Math.min(percentage, 100)}%` }}
                  />
                </div>
                <span className="text-xs font-medium w-10 text-right">
                  {log.duration_hours.toFixed(1)}h
                </span>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
