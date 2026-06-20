"use client"

import { useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import Image from "next/image"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { recommendFoods, gapHeadline, type CatalogFood } from "@/lib/recommend"
import {
  Flame, Target, Plus, Minus, Search, Star, X, Sparkles, Check, Leaf, Drumstick, Loader2, PlusCircle,
} from "lucide-react"

interface FoodsClientProps {
  userId: string
  profile: { daily_calorie_goal: number; daily_protein_goal: number } | null
  catalog: CatalogFood[]
  favoriteIds: string[]
  totalCalories: number
  totalProtein: number
}

const CATEGORY_LABELS: Record<string, string> = {
  whole_meal: "Meals", protein: "Protein", staple: "Staples", nuts_seeds: "Nuts & Seeds",
  fruit: "Fruits", dairy: "Dairy", beverage: "Drinks", supplement: "Supplements",
  condiment: "Fats & Oils", vegetable: "Vegetables", cheat: "Cheat 🍕",
}
const CATEGORY_ORDER = [
  "whole_meal", "protein", "staple", "nuts_seeds", "dairy", "fruit",
  "beverage", "supplement", "condiment", "vegetable", "cheat",
]

function defaultMealType(): string {
  const h = new Date().getHours()
  if (h < 11) return "breakfast"
  if (h < 15) return "lunch"
  if (h < 18) return "snack"
  return "dinner"
}

export function FoodsClient({
  userId, profile, catalog, favoriteIds, totalCalories, totalProtein,
}: FoodsClientProps) {
  const router = useRouter()
  const supabase = createClient()

  const calorieGoal = profile?.daily_calorie_goal || 3000
  const proteinGoal = profile?.daily_protein_goal || 135
  const remainingCalories = Math.max(0, calorieGoal - totalCalories)
  const remainingProtein = Math.max(0, proteinGoal - totalProtein)

  const [search, setSearch] = useState("")
  const [activeCat, setActiveCat] = useState<string>("all")
  const [vegOnly, setVegOnly] = useState(false)
  const [favsOnly, setFavsOnly] = useState(false)
  const [includeCheat, setIncludeCheat] = useState(false)
  const [favs, setFavs] = useState<Set<string>>(new Set(favoriteIds))

  const [selected, setSelected] = useState<CatalogFood | null>(null)
  const [servings, setServings] = useState(1)
  const [mealType, setMealType] = useState(defaultMealType())
  const [saving, setSaving] = useState(false)
  const [justAdded, setJustAdded] = useState<string | null>(null)

  // per-suggestion chosen quantity (default 1×)
  const [sugQty, setSugQty] = useState<Record<string, number>>({})
  const getQ = (id: string) => sugQty[id] ?? 1
  const setQ = (id: string, n: number) => setSugQty((m) => ({ ...m, [id]: Math.max(1, Math.round(n)) }))

  // create-food form
  const emptyForm = { name: "", category: "whole_meal", food_type: "veg", serving_label: "1 serving", calories: "", protein_g: "", carbs_g: "", fat_g: "", image_url: "" }
  const [showCreate, setShowCreate] = useState(false)
  const [creating, setCreating] = useState(false)
  const [createErr, setCreateErr] = useState<string | null>(null)
  const [form, setForm] = useState({ ...emptyForm })
  const setF = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }))

  const createFood = async () => {
    if (!form.name.trim()) { setCreateErr("Please enter a name"); return }
    setCreating(true); setCreateErr(null)
    try {
      const res = await fetch("/api/foods", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          calories: Number(form.calories) || 0,
          protein_g: Number(form.protein_g) || 0,
          carbs_g: Number(form.carbs_g) || 0,
          fat_g: Number(form.fat_g) || 0,
        }),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(json.error || "Failed to create food")
      setShowCreate(false)
      setForm({ ...emptyForm })
      router.refresh()
    } catch (e: any) {
      setCreateErr(e.message)
    } finally {
      setCreating(false)
    }
  }

  const categories = useMemo(() => {
    const present = new Set(catalog.map((f) => f.category))
    return ["all", ...CATEGORY_ORDER.filter((c) => present.has(c))]
  }, [catalog])

  const suggestions = useMemo(
    () => recommendFoods(catalog, remainingCalories, remainingProtein, { vegOnly, includeCheat, max: 5 }),
    [catalog, remainingCalories, remainingProtein, vegOnly, includeCheat],
  )

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return catalog.filter((f) => {
      if (activeCat !== "all" && f.category !== activeCat) return false
      if (vegOnly && f.food_type === "non_veg") return false
      if (favsOnly && !favs.has(f.id)) return false
      if (q && !(`${f.name} ${f.name_tamil ?? ""} ${f.tags.join(" ")}`.toLowerCase().includes(q))) return false
      return true
    })
  }, [catalog, activeCat, vegOnly, favsOnly, favs, search])

  const openAdd = (food: CatalogFood, presetServings = 1) => {
    setSelected(food)
    setServings(presetServings)
    setMealType(defaultMealType())
  }

  const toggleFav = async (food: CatalogFood) => {
    const next = new Set(favs)
    if (next.has(food.id)) {
      next.delete(food.id)
      setFavs(next)
      await supabase.from("user_food_favorites").delete().eq("user_id", userId).eq("food_id", food.id)
    } else {
      next.add(food.id)
      setFavs(next)
      await supabase.from("user_food_favorites").insert({ user_id: userId, food_id: food.id })
    }
  }

  const addToToday = async (food: CatalogFood, qty: number, type: string) => {
    setSaving(true)
    const today = new Date().toISOString().split("T")[0]
    const { error } = await supabase.from("meals").insert({
      user_id: userId,
      date: today,
      meal_type: type,
      description: qty === 1 ? food.name : `${food.name} × ${qty}`,
      calories: Math.round(food.calories * qty),
      protein_grams: Math.round(food.protein_g * qty * 10) / 10,
      image_url: food.image_url,
      food_id: food.id,
      servings: qty,
      source: "catalog",
    })
    setSaving(false)
    if (!error) {
      setSelected(null)
      setJustAdded(food.id)
      setTimeout(() => setJustAdded(null), 1800)
      router.refresh()
    } else {
      console.error("Add failed:", error.message)
    }
  }

  const calPct = Math.min(100, Math.round((totalCalories / calorieGoal) * 100))
  const proPct = Math.min(100, Math.round((totalProtein / proteinGoal) * 100))

  return (
    <div className="p-4 pb-24">
      <header className="mb-4 flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Food Guide</h1>
          <p className="text-muted-foreground">Browse, see the macros, tap to add</p>
        </div>
        <Button size="sm" className="shrink-0 bg-primary hover:bg-primary/90" onClick={() => { setForm({ ...emptyForm }); setCreateErr(null); setShowCreate(true) }}>
          <PlusCircle className="w-4 h-4 mr-1" /> New food
        </Button>
      </header>

      {/* Remaining-today summary */}
      <div className="bg-card border border-border rounded-xl p-4 mb-4">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs text-muted-foreground flex items-center gap-1"><Flame className="w-3 h-3 text-chart-1" /> Calories left</span>
              <span className="text-xs font-medium">{remainingCalories}/{calorieGoal}</span>
            </div>
            <div className="h-2 bg-muted rounded-full overflow-hidden">
              <div className="h-full bg-chart-1 rounded-full" style={{ width: `${calPct}%` }} />
            </div>
          </div>
          <div>
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs text-muted-foreground flex items-center gap-1"><Target className="w-3 h-3 text-chart-2" /> Protein left</span>
              <span className="text-xs font-medium">{Math.round(remainingProtein)}g/{proteinGoal}g</span>
            </div>
            <div className="h-2 bg-muted rounded-full overflow-hidden">
              <div className="h-full bg-chart-2 rounded-full" style={{ width: `${proPct}%` }} />
            </div>
          </div>
        </div>
      </div>

      {/* Smart suggestions */}
      <div className="bg-primary/5 border border-primary/20 rounded-xl p-4 mb-5">
        <div className="flex items-center gap-2 mb-2">
          <Sparkles className="w-4 h-4 text-primary" />
          <h2 className="font-semibold text-foreground text-sm">Smart suggestions</h2>
        </div>
        <p className="text-xs text-muted-foreground mb-3">{gapHeadline(remainingCalories, remainingProtein)}</p>
        {suggestions.length > 0 ? (
          <div className="flex gap-3 overflow-x-auto pb-1 -mx-1 px-1">
            {suggestions.map((s) => {
              const q = getQ(s.food.id)
              return (
                <div key={s.food.id} className="shrink-0 w-48 bg-card border border-border rounded-xl p-3">
                  <div className="flex items-center gap-2 mb-1.5">
                    {s.food.image_url ? (
                      <Image src={s.food.image_url} alt={s.food.name} width={40} height={40} className="rounded-lg object-cover w-10 h-10 shrink-0" />
                    ) : (
                      <div className="w-10 h-10 rounded-lg bg-muted shrink-0" />
                    )}
                    <div className="min-w-0">
                      <p className="text-xs font-semibold leading-tight text-foreground line-clamp-2">{s.food.name}</p>
                      <span className="text-[10px] font-medium text-primary">{s.reason}</span>
                    </div>
                  </div>
                  <p className="text-[11px] text-muted-foreground mb-2">
                    {s.food.serving_label} · {s.food.calories} kcal · {s.food.protein_g}g P
                  </p>

                  {/* quantity picker */}
                  <div className="flex items-center justify-between bg-muted rounded-lg p-1 mb-2">
                    <button onClick={() => setQ(s.food.id, q - 1)} className="w-7 h-7 rounded-md bg-card flex items-center justify-center"><Minus className="w-3.5 h-3.5" /></button>
                    <span className="text-sm font-bold text-foreground">{q}×</span>
                    <button onClick={() => setQ(s.food.id, q + 1)} className="w-7 h-7 rounded-md bg-card flex items-center justify-center"><Plus className="w-3.5 h-3.5" /></button>
                  </div>

                  <p className="text-[11px] text-center text-muted-foreground mb-2">
                    = <span className="text-chart-1 font-medium">{Math.round(s.food.calories * q)} kcal</span>
                    {" · "}
                    <span className="text-chart-2 font-medium">{Math.round(s.food.protein_g * q * 10) / 10}g P</span>
                  </p>

                  <Button size="sm" className="w-full h-8 bg-primary hover:bg-primary/90"
                    onClick={() => addToToday(s.food, q, defaultMealType())} disabled={saving}>
                    {justAdded === s.food.id ? <><Check className="w-3 h-3 mr-1" /> Added</> : <><Plus className="w-3 h-3 mr-1" /> Add</>}
                  </Button>
                </div>
              )
            })}
          </div>
        ) : (
          <p className="text-xs text-muted-foreground">No suggestions — you've hit today's targets. 🎉</p>
        )}
      </div>

      {/* Search + toggles */}
      <div className="space-y-3 mb-4">
        <div className="relative">
          <Search className="w-4 h-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
          <Input value={search} onChange={(e) => setSearch(e.target.value)}
            placeholder="Search foods (e.g. paneer, biryani)..." className="pl-9 bg-muted border-border" />
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <button onClick={() => setVegOnly(!vegOnly)}
            className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${vegOnly ? "bg-accent text-accent-foreground" : "bg-muted text-muted-foreground"}`}>
            <Leaf className="w-3 h-3" /> Veg only
          </button>
          <button onClick={() => setFavsOnly(!favsOnly)}
            className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${favsOnly ? "bg-chart-4 text-white" : "bg-muted text-muted-foreground"}`}>
            <Star className="w-3 h-3" /> Favorites
          </button>
          <button onClick={() => setIncludeCheat(!includeCheat)}
            className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${includeCheat ? "bg-chart-1 text-white" : "bg-muted text-muted-foreground"}`}>
            🍕 Cheat in tips
          </button>
        </div>
      </div>

      {/* Category chips */}
      <div className="flex gap-2 overflow-x-auto pb-2 mb-4 -mx-1 px-1">
        {categories.map((c) => (
          <button key={c} onClick={() => setActiveCat(c)}
            className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${activeCat === c ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}>
            {c === "all" ? "All" : CATEGORY_LABELS[c] ?? c}
          </button>
        ))}
      </div>

      {/* Catalog grid */}
      {filtered.length === 0 ? (
        <p className="text-center text-sm text-muted-foreground py-10">No foods match your filters.</p>
      ) : (
        <div className="grid grid-cols-2 gap-3">
          {filtered.map((food) => (
            <div key={food.id} className="bg-card border border-border rounded-xl overflow-hidden flex flex-col">
              <div className="relative h-24 bg-muted">
                {food.image_url && (
                  <Image src={food.image_url} alt={food.name} fill className="object-cover" sizes="(max-width:768px) 50vw, 200px" />
                )}
                <button onClick={() => toggleFav(food)}
                  className="absolute top-1.5 right-1.5 p-1.5 rounded-full bg-background/80 backdrop-blur">
                  <Star className={`w-3.5 h-3.5 ${favs.has(food.id) ? "fill-chart-4 text-chart-4" : "text-muted-foreground"}`} />
                </button>
                {food.is_cheat && (
                  <span className="absolute top-1.5 left-1.5 text-[10px] bg-chart-1 text-white px-1.5 py-0.5 rounded-full font-medium">cheat</span>
                )}
                {food.food_type === "non_veg" && (
                  <span className="absolute bottom-1.5 left-1.5"><Drumstick className="w-3.5 h-3.5 text-chart-1 drop-shadow" /></span>
                )}
              </div>
              <div className="p-2.5 flex flex-col flex-1">
                <p className="text-sm font-semibold text-foreground leading-tight line-clamp-1">{food.name}</p>
                {food.name_tamil && <p className="text-[11px] text-muted-foreground line-clamp-1">{food.name_tamil}</p>}
                <p className="text-[11px] text-muted-foreground mb-2">{food.serving_label}</p>
                <div className="flex items-center gap-2 text-[11px] mb-2 mt-auto">
                  <span className="text-chart-1 font-medium">{food.calories} kcal</span>
                  <span className="text-chart-2 font-medium">{food.protein_g}g P</span>
                </div>
                <Button size="sm" variant="secondary" className="w-full h-8" onClick={() => openAdd(food)}>
                  {justAdded === food.id ? (<><Check className="w-3 h-3 mr-1 text-accent" /> Added</>) : (<><Plus className="w-3 h-3 mr-1" /> Add</>)}
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add modal */}
      {selected && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-[100] flex items-end sm:items-center justify-center">
          <div className="bg-card border border-border rounded-t-2xl sm:rounded-2xl w-full sm:max-w-md">
            <div className="flex items-center justify-between p-4 border-b border-border">
              <h2 className="font-semibold text-foreground">Add to today</h2>
              <Button variant="ghost" size="icon" onClick={() => setSelected(null)}><X className="w-5 h-5" /></Button>
            </div>
            <div className="p-4 space-y-4">
              <div className="flex items-center gap-3">
                {selected.image_url ? (
                  <Image src={selected.image_url} alt={selected.name} width={56} height={56} className="rounded-xl object-cover w-14 h-14" />
                ) : <div className="w-14 h-14 rounded-xl bg-muted" />}
                <div>
                  <p className="font-semibold text-foreground">{selected.name}</p>
                  <p className="text-xs text-muted-foreground">{selected.serving_label} · {selected.source}</p>
                </div>
              </div>

              {/* Meal type */}
              <div className="grid grid-cols-4 gap-2">
                {["breakfast", "lunch", "dinner", "snack"].map((t) => (
                  <button key={t} onClick={() => setMealType(t)}
                    className={`p-2 rounded-xl text-xs font-medium capitalize transition-colors ${mealType === t ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}>
                    {t}
                  </button>
                ))}
              </div>

              {/* Servings stepper */}
              <div className="flex items-center justify-between bg-muted rounded-xl p-3">
                <span className="text-sm font-medium text-foreground">Servings</span>
                <div className="flex items-center gap-3">
                  <Button size="icon" variant="secondary" className="h-8 w-8" onClick={() => setServings((s) => Math.max(0.5, Math.round((s - 0.5) * 10) / 10))}><Minus className="w-4 h-4" /></Button>
                  <span className="w-10 text-center font-bold text-foreground">{servings}</span>
                  <Button size="icon" variant="secondary" className="h-8 w-8" onClick={() => setServings((s) => Math.round((s + 0.5) * 10) / 10)}><Plus className="w-4 h-4" /></Button>
                </div>
              </div>

              {/* Computed totals */}
              <div className="flex items-center justify-around bg-accent/10 border border-accent/20 rounded-xl p-3">
                <div className="text-center">
                  <p className="text-lg font-bold text-chart-1">{Math.round(selected.calories * servings)}</p>
                  <p className="text-[11px] text-muted-foreground">kcal</p>
                </div>
                <div className="text-center">
                  <p className="text-lg font-bold text-chart-2">{Math.round(selected.protein_g * servings * 10) / 10}g</p>
                  <p className="text-[11px] text-muted-foreground">protein</p>
                </div>
                <div className="text-center">
                  <p className="text-lg font-bold text-foreground">{Math.round(selected.carbs_g * servings)}g</p>
                  <p className="text-[11px] text-muted-foreground">carbs</p>
                </div>
                <div className="text-center">
                  <p className="text-lg font-bold text-foreground">{Math.round(selected.fat_g * servings)}g</p>
                  <p className="text-[11px] text-muted-foreground">fat</p>
                </div>
              </div>

              <Button className="w-full h-12 bg-primary hover:bg-primary/90" disabled={saving}
                onClick={() => addToToday(selected, servings, mealType)}>
                {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <>Add {servings}× to {mealType}</>}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Create food modal */}
      {showCreate && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-[100] flex items-end sm:items-center justify-center">
          <div className="bg-card border border-border rounded-t-2xl sm:rounded-2xl w-full sm:max-w-md max-h-[88vh] flex flex-col">
            <div className="flex items-center justify-between p-4 border-b border-border shrink-0">
              <h2 className="font-semibold text-foreground">Create a food</h2>
              <Button variant="ghost" size="icon" onClick={() => setShowCreate(false)}><X className="w-5 h-5" /></Button>
            </div>
            <div className="p-4 space-y-3 overflow-y-auto">
              <div>
                <label className="text-xs text-muted-foreground">Name *</label>
                <Input value={form.name} onChange={(e) => setF("name", e.target.value)} placeholder="e.g. Mutton Kola Urundai" className="bg-muted border-border" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-muted-foreground">Category</label>
                  <select value={form.category} onChange={(e) => setF("category", e.target.value)} className="w-full h-10 rounded-md bg-muted border border-border px-2 text-sm text-foreground">
                    {Object.entries(CATEGORY_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs text-muted-foreground">Type</label>
                  <select value={form.food_type} onChange={(e) => setF("food_type", e.target.value)} className="w-full h-10 rounded-md bg-muted border border-border px-2 text-sm text-foreground">
                    <option value="veg">Veg</option>
                    <option value="non_veg">Non-veg</option>
                    <option value="egg">Egg</option>
                    <option value="vegan">Vegan</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="text-xs text-muted-foreground">Serving</label>
                <Input value={form.serving_label} onChange={(e) => setF("serving_label", e.target.value)} placeholder="e.g. 1 plate (300 g)" className="bg-muted border-border" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-muted-foreground">Calories (kcal)</label>
                  <Input type="number" inputMode="numeric" value={form.calories} onChange={(e) => setF("calories", e.target.value)} placeholder="0" className="bg-muted border-border" />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground">Protein (g)</label>
                  <Input type="number" inputMode="decimal" value={form.protein_g} onChange={(e) => setF("protein_g", e.target.value)} placeholder="0" className="bg-muted border-border" />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground">Carbs (g)</label>
                  <Input type="number" inputMode="decimal" value={form.carbs_g} onChange={(e) => setF("carbs_g", e.target.value)} placeholder="0" className="bg-muted border-border" />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground">Fat (g)</label>
                  <Input type="number" inputMode="decimal" value={form.fat_g} onChange={(e) => setF("fat_g", e.target.value)} placeholder="0" className="bg-muted border-border" />
                </div>
              </div>
              <div>
                <label className="text-xs text-muted-foreground">Image URL (optional)</label>
                <Input value={form.image_url} onChange={(e) => setF("image_url", e.target.value)} placeholder="https://..." className="bg-muted border-border" />
              </div>
              {createErr && <p className="text-xs text-destructive">{createErr}</p>}
            </div>
            <div className="p-4 border-t border-border shrink-0">
              <Button className="w-full h-12 bg-primary hover:bg-primary/90" disabled={creating} onClick={createFood}>
                {creating ? <Loader2 className="w-5 h-5 animate-spin" /> : "Create food"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
