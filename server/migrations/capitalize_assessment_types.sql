-- Capitalize assessment types in database
-- This script updates all assessment type references to have proper capitalization
-- Example: "advanced" -> "Advanced", "core" -> "Core", "frontier" -> "Frontier"

-- Update assessments table
UPDATE assessments 
SET assessment_type = UPPER(LEFT(assessment_type, 1)) + LOWER(SUBSTRING(assessment_type, 2, LEN(assessment_type)))
WHERE assessment_type IS NOT NULL;

-- Update assessment_type_configs table
UPDATE assessment_type_configs 
SET type_name = UPPER(LEFT(type_name, 1)) + LOWER(SUBSTRING(type_name, 2, LEN(type_name)))
WHERE type_name IS NOT NULL;

-- Update assessment_questions table
UPDATE assessment_questions 
SET assessment_type = UPPER(LEFT(assessment_type, 1)) + LOWER(SUBSTRING(assessment_type, 2, LEN(assessment_type)))
WHERE assessment_type IS NOT NULL;

-- Update assessment_responses table if it has assessment_type column
IF EXISTS (SELECT * FROM INFORMATION_SCHEMA.COLUMNS 
           WHERE TABLE_NAME = 'assessment_responses' AND COLUMN_NAME = 'assessment_type')
BEGIN
    UPDATE assessment_responses 
    SET assessment_type = UPPER(LEFT(assessment_type, 1)) + LOWER(SUBSTRING(assessment_type, 2, LEN(assessment_type)))
    WHERE assessment_type IS NOT NULL;
END

-- Verify changes
SELECT DISTINCT assessment_type FROM assessments ORDER BY assessment_type;
SELECT DISTINCT type_name FROM assessment_type_configs ORDER BY type_name;
SELECT DISTINCT assessment_type FROM assessment_questions ORDER BY assessment_type;

PRINT 'Assessment types capitalized successfully!';
