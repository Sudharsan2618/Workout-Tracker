// Proactive bulking recommender.
// Given what's left of today's calorie/protein goal and the food catalog,
// suggest specific foods (with serving counts) that close the gap.

export interface CatalogFood {
  id: string
  slug: string
  name: string
  name_tamil: string | null
  category: string
  food_type: string
  serving_label: string
  serving_grams: number | null
  calories: number
  protein_g: number
  carbs_g: number
  fat_g: number
  fiber_g: number
  image_url: string | null
  source: string | null
  tags: string[]
  is_cheat: boolean
}

export interface Suggestion {
  food: CatalogFood
  /** a sensible starting quantity (always small — the user adjusts it) */
  servings: number
  calories: number
  protein: number
  /** short, plain-English tag for why this is suggested */
  reason: string
}

export interface RecommendOptions {
  vegOnly?: boolean
  includeCheat?: boolean
  max?: number
}

const isVeg = (f: CatalogFood) => f.food_type !== "non_veg"

const round1 = (n: number) => Math.round(n * 10) / 10

/**
 * Rank catalog foods into a short, actionable list that helps the user hit the
 * remaining calorie/protein targets. Protein gap is prioritised (the usual
 * binding constraint on a bulk); a calorie-dense filler is added when there are
 * still lots of calories to go but protein is mostly handled.
 */
export function recommendFoods(
  foods: CatalogFood[],
  remainingCalories: number,
  remainingProtein: number,
  opts: RecommendOptions = {},
): Suggestion[] {
  const { vegOnly = false, includeCheat = false, max = 5 } = opts

  if (remainingCalories <= 0 && remainingProtein <= 0) return []

  let pool = foods.filter((f) => (includeCheat ? true : !f.is_cheat))
  if (vegOnly) pool = pool.filter(isVeg)

  const suggestions: Suggestion[] = []
  const used = new Set<string>()

  // A suggestion is always ONE serving by default; the user bumps the quantity
  // themselves on the card. We never pre-multiply into unrealistic amounts.
  const pushFor = (food: CatalogFood, reason: string) => {
    if (used.has(food.id)) return
    used.add(food.id)
    suggestions.push({
      food,
      servings: 1,
      calories: Math.round(food.calories),
      protein: round1(food.protein_g),
      reason,
    })
  }

  // ---- 1. Protein-first suggestions (ranked by leanness) ----
  if (remainingProtein > 0) {
    const proteinFoods = pool
      .filter((f) => f.protein_g >= 5)
      .sort((a, b) => b.protein_g / b.calories - a.protein_g / a.calories)
    for (const food of proteinFoods) {
      if (suggestions.length >= Math.min(max, 4)) break
      pushFor(food, "High protein")
    }
  }

  // ---- 2. Calorie filler when protein is mostly covered but calories lag ----
  if (remainingCalories > 300 && suggestions.length < max) {
    const dense = pool
      .filter((f) => !used.has(f.id) && f.calories >= 100)
      .sort((a, b) => b.calories - a.calories)
    for (const food of dense) {
      if (suggestions.length >= max) break
      pushFor(food, "Calorie-dense")
    }
  }

  return suggestions.slice(0, max)
}

/** One-line plain-English headline for the current gap. */
export function gapHeadline(remainingCalories: number, remainingProtein: number): string {
  if (remainingCalories <= 0 && remainingProtein <= 0) {
    return "Goals smashed for today. Anything extra is a bonus surplus. 💪"
  }
  const parts: string[] = []
  if (remainingProtein > 0) parts.push(`${Math.round(remainingProtein)}g protein`)
  if (remainingCalories > 0) parts.push(`${Math.round(remainingCalories)} kcal`)
  return `You still need ${parts.join(" and ")} today. Here's how to get there:`
}
