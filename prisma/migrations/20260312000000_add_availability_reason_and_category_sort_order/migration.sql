-- AlterTable: Add reason to availability
ALTER TABLE "availability" ADD COLUMN "reason" TEXT;

-- AlterTable: Add sort_order to categories
ALTER TABLE "categories" ADD COLUMN "sort_order" INTEGER NOT NULL DEFAULT 0;

-- Backfill: Assign sequential sortOrder based on alphabetical name order
WITH ordered AS (
  SELECT id, ROW_NUMBER() OVER (ORDER BY name ASC) - 1 AS new_order
  FROM categories
)
UPDATE categories
SET sort_order = ordered.new_order
FROM ordered
WHERE categories.id = ordered.id;
