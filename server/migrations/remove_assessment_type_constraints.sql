-- Remove CHECK constraints on assessment_type to allow dynamic types
-- This allows admins to create new assessment types without database schema changes

-- Drop constraint on assessments table
IF EXISTS (
  SELECT * FROM INFORMATION_SCHEMA.CHECK_CONSTRAINTS 
  WHERE CONSTRAINT_NAME = 'CK_assessments_assessment_type'
)
BEGIN
  ALTER TABLE assessments
  DROP CONSTRAINT CK_assessments_assessment_type;
  PRINT '✅ Removed CHECK constraint from assessments table';
END
ELSE
BEGIN
  PRINT 'ℹ️  No constraint on assessments table';
END

-- Drop constraint on assessment_questions table if it exists
IF EXISTS (
  SELECT * FROM INFORMATION_SCHEMA.CHECK_CONSTRAINTS 
  WHERE CONSTRAINT_NAME = 'CK_assessment_questions_type'
)
BEGIN
  ALTER TABLE assessment_questions
  DROP CONSTRAINT CK_assessment_questions_type;
  PRINT '✅ Removed CHECK constraint from assessment_questions table';
END
ELSE
BEGIN
  PRINT 'ℹ️  No constraint on assessment_questions table';
END

-- Drop any other assessment type constraints
DECLARE @ConstraintName NVARCHAR(200);
DECLARE @SQL NVARCHAR(MAX);

-- Find all CHECK constraints containing 'assessment_type'
DECLARE constraint_cursor CURSOR FOR
SELECT CONSTRAINT_NAME
FROM INFORMATION_SCHEMA.CHECK_CONSTRAINTS
WHERE CONSTRAINT_NAME LIKE '%assessment%type%';

OPEN constraint_cursor;
FETCH NEXT FROM constraint_cursor INTO @ConstraintName;

WHILE @@FETCH_STATUS = 0
BEGIN
  SET @SQL = 'ALTER TABLE ' + 
    (SELECT TABLE_NAME FROM INFORMATION_SCHEMA.CHECK_CONSTRAINTS WHERE CONSTRAINT_NAME = @ConstraintName) +
    ' DROP CONSTRAINT ' + @ConstraintName;
  
  EXEC sp_executesql @SQL;
  PRINT '✅ Removed constraint: ' + @ConstraintName;
  
  FETCH NEXT FROM constraint_cursor INTO @ConstraintName;
END

CLOSE constraint_cursor;
DEALLOCATE constraint_cursor;

PRINT '';
PRINT '✅ All assessment type constraints removed!';
PRINT '💡 Assessment types are now fully dynamic.';
