# Food Catalog — how it's built & how to extend

Turns Fit-Check from a passive logger into a proactive bulking guide.

## What was added
- **DB** (`003_food_catalog.sql`): `food_catalog` (global, read-only reference),
  `user_food_favorites` (per-user), plus new columns on `meals`
  (`food_id`, `servings`, `source`) and on `profiles`
  (`age`, `sex`, `activity_level`, `daily_carb_goal`, `daily_fat_goal`).
- **Seed data** (`food-seed-data.mjs`): 49 foods — Tamil Nadu staples, whole
  meals (biryani, curd rice, idli+sambar, dosa, pongal…), daily protein/nuts/
  fruit, supplements (whey, creatine) and a cheat-meal section.
  Nutrition per serving sourced from **USDA FoodData Central** and
  **IFCT 2017 (ICMR-NIN)**; composite dishes estimated from IFCT ingredients.
  Each row stores its `source` citation.
- **Images**: `seed-catalog.mjs` pulls a free-licensed photo per food from
  Wikimedia/Wikipedia, uploads it to the `food-images` Supabase bucket, and
  writes the public URL into `food_catalog.image_url`.
- **App**: `/dashboard/foods` (browse, search, veg/favorites/category filters,
  one-tap add with servings), `lib/recommend.ts` (smart "eat this to close your
  gap" engine), nav entry, and CTAs on the dashboard + meals pages.

## Re-run / extend
```bash
cd b_KViUDTUTV9L-1773579896112
node scripts/setup-storage.mjs        # ensure buckets exist
node scripts/seed-catalog.mjs         # idempotent upsert by slug + (re)fetch images
```
To add foods: append entries to `food-seed-data.mjs` (give each a unique `slug`
and a `wiki` lookup term for the photo) and re-run `seed-catalog.mjs`.

## Open item
Calorie/protein targets still use the app defaults (3000 kcal / 135 g protein).
135 g is low for a 75 kg bulk goal (~1.6–2.2 g/kg → ~120–165 g). Update the
user's `profiles` row (or recompute from real weight/age/sex/activity) so the
recommender math reflects their actual targets.
