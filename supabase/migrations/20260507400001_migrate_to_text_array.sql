-- Migration: Convert text fields to text[] for better querying
-- Fields: source, person_in_charge

BEGIN;

-- 1. Add new columns with text[] type
ALTER TABLE customer_leads 
  ADD COLUMN source_array text[],
  ADD COLUMN person_in_charge_array text[];

-- 2. Migrate existing data from text to text[]
-- Split by ", " and convert to array
UPDATE customer_leads
SET 
  source_array = CASE 
    WHEN source IS NOT NULL AND source != '' 
    THEN string_to_array(source, ', ')
    ELSE NULL
  END,
  person_in_charge_array = CASE 
    WHEN person_in_charge IS NOT NULL AND person_in_charge != '' 
    THEN string_to_array(person_in_charge, ', ')
    ELSE NULL
  END;

-- 3. Drop old columns
ALTER TABLE customer_leads 
  DROP COLUMN source,
  DROP COLUMN person_in_charge;

-- 4. Rename new columns to original names
ALTER TABLE customer_leads 
  RENAME COLUMN source_array TO source;

ALTER TABLE customer_leads 
  RENAME COLUMN person_in_charge_array TO person_in_charge;

-- 5. Create GIN indexes for efficient querying
CREATE INDEX idx_customer_leads_source ON customer_leads USING GIN (source);
CREATE INDEX idx_customer_leads_person_in_charge ON customer_leads USING GIN (person_in_charge);

-- 6. Add comments
COMMENT ON COLUMN customer_leads.source IS 'Array of source platforms (Facebook, Zalo, etc.)';
COMMENT ON COLUMN customer_leads.person_in_charge IS 'Array of person names in charge';

COMMIT;
