"use client"

import { useState, useRef } from "react"
import { useRouter } from "next/navigation"
import Image from "next/image"
import { createClient } from "@/lib/supabase/client"
import { ProgressRing } from "@/components/progress-ring"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Camera,
  Upload,
  Flame,
  Target,
  Plus,
  Loader2,
  Trash2,
  AlertCircle,
  Lightbulb,
  X,
} from "lucide-react"

interface Meal {
  id: string
  meal_type: string
  description: string
  calories: number
  protein_grams: number
  image_url?: string
  ai_analysis?: string
  created_at: string
}

interface MealsClientProps {
  userId: string
  profile: {
    daily_calorie_goal: number
    daily_protein_goal: number
  } | null
  todayMeals: Meal[]
  totalCalories: number
  totalProtein: number
  weekData: Record<string, { calories: number; protein: number }>
}

export function MealsClient({
  userId,
  profile,
  todayMeals,
  totalCalories,
  totalProtein,
  weekData,
}: MealsClientProps) {
  const router = useRouter()
  const supabase = createClient()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [showAddModal, setShowAddModal] = useState(false)
  const [selectedMealType, setSelectedMealType] = useState<string>("breakfast")
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [imageBase64, setImageBase64] = useState<string | null>(null)
  const [description, setDescription] = useState("")
  const [analyzing, setAnalyzing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [imagePublicUrl, setImagePublicUrl] = useState<string | null>(null)
  const [analysisResult, setAnalysisResult] = useState<{
    calories: number
    protein: number
    description: string
    items: { name: string; calories: number; protein: number }[]
    tips: string | null
  } | null>(null)

  const calorieGoal = profile?.daily_calorie_goal || 3000
  const proteinGoal = profile?.daily_protein_goal || 135
  const calorieProgress = Math.round((totalCalories / calorieGoal) * 100)
  const proteinProgress = Math.round((totalProtein / proteinGoal) * 100)

  const mealTypes = [
    { value: "breakfast", label: "Breakfast", time: "6-10 AM" },
    { value: "lunch", label: "Lunch", time: "12-2 PM" },
    { value: "dinner", label: "Dinner", time: "7-9 PM" },
    { value: "snack", label: "Snack", time: "Anytime" },
  ]

  const handleImageSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      // 1. Show local preview immediately
      const reader = new FileReader()
      reader.onloadend = () => {
        const base64 = reader.result as string
        setImagePreview(base64)
        setImageBase64(base64.split(",")[1])
      }
      reader.readAsDataURL(file)

      // 2. Upload to Supabase Storage
      setUploading(true)
      try {
        const fileExt = file.name.split('.').pop()
        const fileName = `${userId}/${Date.now()}.${fileExt}`
        const filePath = `meals/${fileName}`

        const { error } = await supabase.storage
          .from('meal-images')
          .upload(filePath, file, {
            cacheControl: '3600',
            upsert: false
          })

        if (error) throw error

        const { data: { publicUrl } } = supabase.storage
          .from('meal-images')
          .getPublicUrl(filePath)

        setImagePublicUrl(publicUrl)
      } catch (error) {
        console.error("Upload failed:", error)
      } finally {
        setUploading(false)
      }
    }
  }

  const analyzeImage = async () => {
    if (!imageBase64 && !description) return

    setAnalyzing(true)
    try {
      const response = await fetch("/api/analyze-meal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageBase64, mealDescription: description }),
      })

      if (response.ok) {
        const result = await response.json()
        setAnalysisResult(result)
      }
    } catch (error) {
      console.error("Analysis failed:", error)
    }
    setAnalyzing(false)
  }

  const saveMeal = async () => {
    if (!analysisResult) return

    setSaving(true)
    const today = new Date().toISOString().split('T')[0]

    await supabase.from("meals").insert({
      user_id: userId,
      date: today,
      meal_type: selectedMealType,
      description: analysisResult.description,
      calories: analysisResult.calories,
      protein_grams: analysisResult.protein,
      image_url: imagePublicUrl,
      ai_analysis: JSON.stringify(analysisResult),
    })

    // Reset and close
    setShowAddModal(false)
    setImagePreview(null)
    setImageBase64(null)
    setDescription("")
    setAnalysisResult(null)
    setImagePublicUrl(null)
    setSaving(false)
    router.refresh()
  }

  const deleteMeal = async (mealId: string) => {
    await supabase.from("meals").delete().eq("id", mealId)
    router.refresh()
  }

  const getRemainingTip = () => {
    const remainingCalories = calorieGoal - totalCalories
    const remainingProtein = proteinGoal - totalProtein

    if (remainingCalories <= 0 && remainingProtein <= 0) {
      return "Great job! You've hit your daily goals!"
    }

    if (remainingProtein > 50) {
      return `Add ${Math.round(remainingProtein / 30)} scoops of whey protein (~${remainingProtein}g needed)`
    }

    if (remainingCalories > 500) {
      return `Consider a mass gainer shake or peanut butter sandwich (~${remainingCalories} kcal needed)`
    }

    return `${remainingCalories} kcal and ${remainingProtein}g protein remaining today`
  }

  // Get week day data for mini chart
  const weekDays = Array.from({ length: 7 }, (_, i) => {
    const date = new Date()
    date.setDate(date.getDate() - (6 - i))
    const dateStr = date.toISOString().split('T')[0]
    const data = weekData[dateStr] || { calories: 0, protein: 0 }
    return {
      day: date.toLocaleDateString("en-US", { weekday: "short" }).charAt(0),
      calories: data.calories,
      protein: data.protein,
      isToday: i === 6,
    }
  })

  return (
    <div className="p-4 pb-24">
      <header className="mb-6">
        <h1 className="text-2xl font-bold text-foreground">Meals</h1>
        <p className="text-muted-foreground">Track your nutrition</p>
      </header>

      {/* Today's Progress */}
      <div className="bg-card border border-border rounded-xl p-4 mb-6">
        <div className="flex items-center justify-around">
          <div className="flex flex-col items-center">
            <ProgressRing progress={calorieProgress} size={80} strokeWidth={6} color="hsl(var(--chart-1))">
              <Flame className="w-5 h-5 text-chart-1" />
            </ProgressRing>
            <p className="text-lg font-bold mt-2">{totalCalories}</p>
            <p className="text-xs text-muted-foreground">/ {calorieGoal} kcal</p>
          </div>

          <div className="h-16 w-px bg-border" />

          <div className="flex flex-col items-center">
            <ProgressRing progress={proteinProgress} size={80} strokeWidth={6} color="hsl(var(--chart-2))">
              <Target className="w-5 h-5 text-chart-2" />
            </ProgressRing>
            <p className="text-lg font-bold mt-2">{totalProtein}g</p>
            <p className="text-xs text-muted-foreground">/ {proteinGoal}g protein</p>
          </div>
        </div>

        {/* Proactive Tip */}
        <div className="mt-4 p-3 bg-primary/10 rounded-lg flex items-start gap-2">
          <Lightbulb className="w-4 h-4 text-primary shrink-0 mt-0.5" />
          <p className="text-xs text-foreground">{getRemainingTip()}</p>
        </div>
      </div>

      {/* Week Mini Chart */}
      <div className="bg-card border border-border rounded-xl p-4 mb-6">
        <h2 className="text-sm font-semibold text-foreground mb-3">This Week</h2>
        <div className="flex items-end justify-between gap-1 h-20">
          {weekDays.map((day, i) => {
            const heightPercent = Math.min((day.calories / calorieGoal) * 100, 100)
            return (
              <div key={i} className="flex-1 flex flex-col items-center gap-1">
                <div className="w-full bg-muted rounded-sm relative" style={{ height: "60px" }}>
                  <div
                    className={`absolute bottom-0 left-0 right-0 rounded-sm transition-all ${
                      day.isToday ? "bg-primary" : "bg-primary/60"
                    }`}
                    style={{ height: `${heightPercent}%` }}
                  />
                </div>
                <span className={`text-xs ${day.isToday ? "text-primary font-bold" : "text-muted-foreground"}`}>
                  {day.day}
                </span>
              </div>
            )
          })}
        </div>
      </div>

      {/* Today's Meals */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-semibold text-foreground">Today&apos;s Meals</h2>
          <Button
            onClick={() => setShowAddModal(true)}
            size="sm"
            className="bg-primary hover:bg-primary/90"
          >
            <Plus className="w-4 h-4 mr-1" />
            Add Meal
          </Button>
        </div>

        {todayMeals.length === 0 ? (
          <div className="bg-card border border-border border-dashed rounded-xl p-8 text-center">
            <Camera className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
            <p className="text-muted-foreground">No meals logged yet today</p>
            <p className="text-xs text-muted-foreground mt-1">
              Take a photo of your meal to get started
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {todayMeals.map((meal) => (
              <div key={meal.id} className="bg-card border border-border rounded-xl p-4">
                <div className="flex items-start gap-4 justify-between">
                  <div className="flex gap-4">
                    {meal.image_url && (
                      <div className="shrink-0">
                        <Image
                          src={meal.image_url}
                          alt={meal.description}
                          width={60}
                          height={60}
                          className="rounded-lg object-cover w-[60px] h-[60px]"
                        />
                      </div>
                    )}
                    <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-medium text-primary capitalize bg-primary/10 px-2 py-0.5 rounded">
                        {meal.meal_type}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {new Date(meal.created_at).toLocaleTimeString("en-US", {
                          hour: "numeric",
                          minute: "2-digit",
                        })}
                      </span>
                    </div>
                    <p className="font-medium text-foreground">{meal.description}</p>
                    <div className="flex items-center gap-4 mt-2">
                      <span className="text-sm text-chart-1 flex items-center gap-1">
                        <Flame className="w-3 h-3" />
                        {meal.calories} kcal
                      </span>
                      <span className="text-sm text-chart-2 flex items-center gap-1">
                        <Target className="w-3 h-3" />
                        {meal.protein_grams}g protein
                      </span>
                    </div>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-muted-foreground hover:text-destructive"
                    onClick={() => deleteMeal(meal.id)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add Meal Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-[100] flex flex-col justify-end sm:justify-center sm:items-center">
          <div className="bg-card border border-border rounded-t-2xl sm:rounded-2xl w-full sm:max-w-md max-h-[85vh] flex flex-col">
            <div className="shrink-0 bg-card border-b border-border p-4 flex items-center justify-between rounded-t-2xl">
              <h2 className="font-semibold text-foreground">Log Meal</h2>
              <Button variant="ghost" size="icon" onClick={() => {
                setShowAddModal(false)
                setImagePreview(null)
                setImageBase64(null)
                setDescription("")
                setAnalysisResult(null)
              }}>
                <X className="w-5 h-5" />
              </Button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {/* Meal Type Selection */}
              <div className="grid grid-cols-4 gap-2">
                {mealTypes.map((type) => (
                  <button
                    key={type.value}
                    onClick={() => setSelectedMealType(type.value)}
                    className={`p-2 rounded-xl text-center transition-colors ${
                      selectedMealType === type.value
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted text-muted-foreground hover:bg-muted/80"
                    }`}
                  >
                    <p className="text-xs font-medium">{type.label}</p>
                  </button>
                ))}
              </div>

              {/* Image Upload */}
              <div
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-colors ${
                  imagePreview ? "border-primary" : "border-border hover:border-primary/50"
                }`}
              >
                {imagePreview ? (
                  <div className="relative">
                    <Image
                      src={imagePreview}
                      alt="Meal preview"
                      width={300}
                      height={200}
                      className="rounded-lg mx-auto object-cover"
                    />
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        setImagePreview(null)
                        setImageBase64(null)
                        setAnalysisResult(null)
                      }}
                      className="absolute top-2 right-2 p-1 bg-background/80 rounded-full"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <>
                    {uploading ? (
                      <Loader2 className="w-8 h-8 text-primary mx-auto mb-2 animate-spin" />
                    ) : (
                      <Upload className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                    )}
                    <p className="text-sm text-muted-foreground">
                      {uploading ? "Uploading..." : "Tap to take a photo or choose from gallery"}
                    </p>
                  </>
                )}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleImageSelect}
                  className="hidden"
                />
              </div>

              {/* Optional Description */}
              <Input
                placeholder="Optional: describe your meal..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="bg-muted border-border"
              />

              {/* Analysis Result */}
              {analysisResult && (
                <div className="space-y-4">
                  <div className="bg-accent/10 border border-accent/20 rounded-xl p-4">
                    <p className="font-medium text-foreground mb-2">{analysisResult.description}</p>
                    <div className="flex items-center gap-4">
                      <span className="text-lg font-bold text-chart-1 flex items-center gap-1">
                        <Flame className="w-4 h-4" />
                        {analysisResult.calories} kcal
                      </span>
                      <span className="text-lg font-bold text-chart-2 flex items-center gap-1">
                        <Target className="w-4 h-4" />
                        {analysisResult.protein}g protein
                      </span>
                    </div>
                  </div>

                  {analysisResult.items.length > 0 && (
                    <div className="bg-muted/50 rounded-xl p-3">
                      <p className="text-xs font-medium text-muted-foreground mb-2">Breakdown:</p>
                      <div className="space-y-1">
                        {analysisResult.items.map((item, i) => (
                          <div key={i} className="flex items-center justify-between text-sm">
                            <span className="text-foreground">{item.name}</span>
                            <span className="text-muted-foreground">
                              {item.calories} kcal, {item.protein}g
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {analysisResult.tips && (
                    <div className="flex items-start gap-2 p-3 bg-primary/10 rounded-lg">
                      <AlertCircle className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                      <p className="text-xs text-foreground">{analysisResult.tips}</p>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Sticky Footer for Actions */}
            {((imageBase64 || description) && !analysisResult || analysisResult) && (
              <div className="shrink-0 p-4 border-t border-border bg-card sm:rounded-b-2xl">
                {!analysisResult ? (
                  <Button
                    onClick={analyzeImage}
                    disabled={analyzing}
                    className="w-full h-12 bg-primary hover:bg-primary/90"
                  >
                    {analyzing ? (
                      <>
                        <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                        Analyzing...
                      </>
                    ) : (
                      <>
                        <Camera className="w-5 h-5 mr-2" />
                        Analyze Meal
                      </>
                    )}
                  </Button>
                ) : (
                  <Button
                    onClick={saveMeal}
                    disabled={saving}
                    className="w-full h-12 bg-accent hover:bg-accent/90 text-accent-foreground"
                  >
                    {saving ? (
                      <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                      "Save Meal"
                    )}
                  </Button>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
