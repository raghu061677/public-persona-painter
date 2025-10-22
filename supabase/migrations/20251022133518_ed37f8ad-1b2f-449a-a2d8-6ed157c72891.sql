-- Change total_sqft from integer to numeric to support decimal values
ALTER TABLE media_assets 
ALTER COLUMN total_sqft TYPE NUMERIC(10,2);

-- Add comment to document the change
COMMENT ON COLUMN media_assets.total_sqft IS 'Total square feet - supports decimal values for precise measurements';