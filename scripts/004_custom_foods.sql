-- 004_custom_foods.sql
-- Let users add their own foods on demand. Additive only.

ALTER TABLE food_catalog ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES profiles(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_food_catalog_created_by ON food_catalog(created_by);
