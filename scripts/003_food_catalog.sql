-- 003_food_catalog.sql
-- Turns Fit-Check from a passive logger into a proactive bulking guide.
-- Purely ADDITIVE: new tables + new nullable columns. Nothing existing is dropped.

-- =====================================================================
-- 1. Global food reference library (shared across all users, read-only)
-- =====================================================================
CREATE TABLE IF NOT EXISTS food_catalog (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug          TEXT UNIQUE NOT NULL,          -- stable key for idempotent seeding/upsert
  name          TEXT NOT NULL,
  name_tamil    TEXT,                           -- Tamil name (e.g. முட்டை)
  category      TEXT NOT NULL CHECK (category IN (
                  'protein','staple','vegetable','fruit','nuts_seeds','dairy',
                  'supplement','whole_meal','cheat','beverage','condiment'
                )),
  food_type     TEXT NOT NULL DEFAULT 'veg' CHECK (food_type IN ('veg','non_veg','egg','vegan')),
  serving_label TEXT NOT NULL,                  -- "1 large egg", "1 cup cooked", "100 g"
  serving_grams DECIMAL(7,2),                   -- weight of one serving in grams
  calories      INTEGER NOT NULL,
  protein_g     DECIMAL(6,2) NOT NULL DEFAULT 0,
  carbs_g       DECIMAL(6,2) DEFAULT 0,
  fat_g         DECIMAL(6,2) DEFAULT 0,
  fiber_g       DECIMAL(6,2) DEFAULT 0,
  image_url     TEXT,
  source        TEXT,                           -- citation: "IFCT 2017", "USDA FDC #173424"
  tags          TEXT[] DEFAULT '{}',            -- e.g. {daily, high-protein, budget}
  is_cheat      BOOLEAN DEFAULT FALSE,
  is_active     BOOLEAN DEFAULT TRUE,
  sort_order    INTEGER DEFAULT 0,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_food_catalog_category  ON food_catalog(category);
CREATE INDEX IF NOT EXISTS idx_food_catalog_food_type ON food_catalog(food_type);
CREATE INDEX IF NOT EXISTS idx_food_catalog_tags      ON food_catalog USING GIN(tags);

-- =====================================================================
-- 2. Per-user quick-access favorites
-- =====================================================================
CREATE TABLE IF NOT EXISTS user_food_favorites (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  food_id    UUID NOT NULL REFERENCES food_catalog(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, food_id)
);

-- =====================================================================
-- 3. Extend meals so a logged item can point back to a catalog food
-- =====================================================================
ALTER TABLE meals ADD COLUMN IF NOT EXISTS food_id  UUID REFERENCES food_catalog(id);
ALTER TABLE meals ADD COLUMN IF NOT EXISTS servings DECIMAL(5,2) DEFAULT 1;
ALTER TABLE meals ADD COLUMN IF NOT EXISTS source   TEXT DEFAULT 'manual'; -- 'ai_photo' | 'catalog' | 'manual'

-- =====================================================================
-- 4. Extend profiles with the fields the guide needs for proper targets
-- =====================================================================
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS age            INTEGER;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS sex            TEXT CHECK (sex IN ('male','female'));
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS activity_level TEXT
  CHECK (activity_level IN ('sedentary','light','moderate','active','very_active'));
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS daily_carb_goal INTEGER;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS daily_fat_goal  INTEGER;

-- =====================================================================
-- 5. Row Level Security
-- =====================================================================
-- Catalog: global reference, any signed-in user can read; no client writes.
ALTER TABLE food_catalog ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "food_catalog_select_all" ON food_catalog;
CREATE POLICY "food_catalog_select_all" ON food_catalog
  FOR SELECT TO authenticated USING (true);

-- Favorites: owner-scoped.
ALTER TABLE user_food_favorites ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "fav_select_own" ON user_food_favorites;
DROP POLICY IF EXISTS "fav_insert_own" ON user_food_favorites;
DROP POLICY IF EXISTS "fav_delete_own" ON user_food_favorites;
CREATE POLICY "fav_select_own" ON user_food_favorites FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "fav_insert_own" ON user_food_favorites FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "fav_delete_own" ON user_food_favorites FOR DELETE USING (auth.uid() = user_id);

-- updated_at touch trigger for catalog
CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END; $$;

DROP TRIGGER IF EXISTS trg_food_catalog_touch ON food_catalog;
CREATE TRIGGER trg_food_catalog_touch
  BEFORE UPDATE ON food_catalog
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
