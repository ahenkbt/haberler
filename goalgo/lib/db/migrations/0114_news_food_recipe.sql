ALTER TABLE news ADD COLUMN IF NOT EXISTS is_food_recipe boolean NOT NULL DEFAULT false;
ALTER TABLE news ADD COLUMN IF NOT EXISTS food_recipe_category_slug text;
