# Adding New Assessment Types - Complete Guide

## Overview
This guide explains how to add new assessment types (like CORE, ADVANCED, FRONTIER, TEST) to the SAFE-8 application without running into database constraint issues.

---

## Prerequisites
- Admin access to the database
- Node.js environment set up
- Backend server access

---

## Step-by-Step Process

### 1. **Update Database CHECK Constraint**

The `assessments` table has a CHECK constraint that validates allowed assessment types. You MUST update this constraint before creating questions or taking assessments.

#### Option A: Add to Existing Constraint (Recommended)
```javascript
// Run this script: server/add_new_assessment_type.js
import database from './config/database.js';

async function addAssessmentType(newType) {
  try {
    // 1. Drop existing constraint
    await database.query(`
      ALTER TABLE assessments 
      DROP CONSTRAINT CK_assessments_assessment_type;
    `);
    
    // 2. Get current types
    const currentTypes = ['CORE', 'ADVANCED', 'FRONTIER', 'TEST'];
    const allTypes = [...currentTypes, newType.toUpperCase()];
    
    // 3. Create new constraint with all types
    const constraint = allTypes.map(t => `[assessment_type]='${t}'`).join(' OR ');
    await database.query(`
      ALTER TABLE assessments 
      ADD CONSTRAINT CK_assessments_assessment_type 
      CHECK (${constraint});
    `);
    
    console.log(`✅ Added ${newType} to assessment types`);
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    process.exit();
  }
}

// Usage: addAssessmentType('CUSTOM');
```

#### Option B: Remove Constraint Entirely (Most Flexible)
```sql
-- Allow ANY assessment type without restrictions
ALTER TABLE assessments 
DROP CONSTRAINT CK_assessments_assessment_type;
```

**Note:** If you remove the constraint, validation happens only at the application level.

---

### 2. **Create Assessment Questions**

Add questions for your new assessment type to the `assessment_questions` table:

```javascript
// server/create_[type]_assessment.js
import database from './config/database.js';

const questions = [
  { pillar: 'Strategy & Leadership', short: 'STRAT', text: 'Question 1...', order: 1 },
  { pillar: 'Technology & Infrastructure', short: 'TECH', text: 'Question 2...', order: 2 },
  // Add 15-60 questions distributed across 8 pillars
];

for (const q of questions) {
  await database.query(`
    INSERT INTO assessment_questions (
      assessment_type, pillar_name, pillar_short_name, 
      question_text, question_order, is_active
    )
    VALUES (?, ?, ?, ?, ?, 1)
  `, ['YOUR_TYPE', q.pillar, q.short, q.text, q.order]);
}
```

**Pillar Distribution** (for proper radar chart visualization):
- Strategy & Leadership
- Technology & Infrastructure  
- Data Readiness
- Skills & Talent
- Security & Compliance
- Governance & Ethics
- Culture & Change
- Performance & ROI

---

### 3. **Update Frontend - WelcomeScreen.jsx**

Add a new AssessmentCard to display your assessment on the homepage:

```jsx
// src/components/WelcomeScreen.jsx
// Around line 250-300, add:

<AssessmentCard
  type="your_type"
  title="Your Assessment Name"
  duration="25 questions • ~5 minutes"
  icon="fas fa-your-icon"
  features={[
    "Feature 1 description",
    "Feature 2 description",
    "Feature 3 description"
  ]}
  audience="Target Audience"
  audienceColor="color" // green, blue, purple, orange, teal
  isSelected={selectedAssessmentType === 'your_type'}
  onClick={() => onAssessmentTypeSelect('your_type')}
/>
```

**Icon Options** (Font Awesome):
- `fas fa-rocket` - Core/Basics
- `fas fa-cogs` - Advanced/Technical
- `fas fa-brain` - AI/Intelligence
- `fas fa-flask` - Testing/Experimental
- `fas fa-shield-alt` - Security
- `fas fa-chart-line` - Analytics/Performance

---

### 4. **Update Frontend - UserDashboard.jsx**

Add a filter tab so users can filter their assessment history:

```jsx
// src/components/UserDashboard.jsx
// Around line 280-310, add:

<button 
  className={`filter-tab ${filterType === 'your_type' ? 'active' : ''}`}
  onClick={() => handleFilterChange('your_type')}
>
  Your Type Name
</button>
```

---

### 5. **Backend Verification**

The backend routes automatically support any assessment type! No changes needed in:
- `/api/questions/questions/:type` - Filters questions by type
- `/api/assessments/submit-complete` - Accepts any type
- `/api/assessments/user/:id/history` - Filters by type

**BUT** verify these files don't have hardcoded type checks:
- `server/routes/response.js`
- `server/routes/assessments.js`
- `server/models/Assessment.js`

---

## Quick Reference Script

Save this as `server/add_new_assessment_type.js`:

```javascript
import database from './config/database.js';

const NEW_TYPE = 'CUSTOM'; // Change this
const NUM_QUESTIONS = 25;  // Change this

async function setupNewAssessmentType() {
  try {
    console.log(`\n🚀 Setting up ${NEW_TYPE} assessment type...\n`);
    
    // Step 1: Update constraint
    console.log('Step 1: Updating database constraint...');
    await database.query(`
      ALTER TABLE assessments 
      DROP CONSTRAINT CK_assessments_assessment_type;
    `);
    
    const types = ['CORE', 'ADVANCED', 'FRONTIER', 'TEST', NEW_TYPE];
    const constraint = types.map(t => `[assessment_type]='${t}'`).join(' OR ');
    await database.query(`
      ALTER TABLE assessments 
      ADD CONSTRAINT CK_assessments_assessment_type 
      CHECK (${constraint});
    `);
    console.log('✅ Constraint updated\n');
    
    // Step 2: Verify questions don't exist
    const existing = await database.query(`
      SELECT COUNT(*) as count 
      FROM assessment_questions 
      WHERE assessment_type = ?
    `, [NEW_TYPE]);
    
    const count = existing.recordset ? existing.recordset[0].count : existing[0].count;
    if (count > 0) {
      console.log(`⚠️  Found ${count} existing ${NEW_TYPE} questions`);
      console.log('   Create questions manually or use create_[type]_assessment.js\n');
    } else {
      console.log(`ℹ️  No questions found. Create ${NUM_QUESTIONS} questions for ${NEW_TYPE}\n`);
    }
    
    console.log('✅ Database ready!');
    console.log('\nNext steps:');
    console.log('1. Create questions using create_[type]_assessment.js');
    console.log('2. Update src/components/WelcomeScreen.jsx');
    console.log('3. Update src/components/UserDashboard.jsx');
    console.log('4. Test complete flow!\n');
    
  } catch (error) {
    console.error('\n❌ Error:', error.message);
  } finally {
    process.exit();
  }
}

setupNewAssessmentType();
```

---

## Testing Checklist

After adding a new assessment type:

- [ ] Database constraint updated (run `node check_constraints.js`)
- [ ] Questions created (run `node check_questions.js`)
- [ ] WelcomeScreen shows new card
- [ ] Card click selects assessment
- [ ] Industry selection works
- [ ] Registration/login works
- [ ] All questions load correctly (20+ questions)
- [ ] Answers save automatically
- [ ] Assessment submits successfully
- [ ] Results page displays scores
- [ ] Radar chart shows 8 pillars
- [ ] Dashboard filter tab works
- [ ] Assessment appears in history
- [ ] PDF download works

---

## Common Errors & Solutions

### Error: "CHECK constraint conflicted"
**Cause:** Constraint doesn't include your assessment type  
**Fix:** Run constraint update script (Step 1)

### Error: "No questions found"
**Cause:** No questions in database for this type  
**Fix:** Create questions (Step 2)

### Error: "Assessment card not visible"
**Cause:** Frontend not updated  
**Fix:** Update WelcomeScreen.jsx (Step 3)

### Error: "Filter doesn't work"
**Cause:** Dashboard filter not added  
**Fix:** Update UserDashboard.jsx (Step 4)

---

## Current Assessment Types

As of January 2026:
- **CORE** - 25 questions, 5 minutes, for Executives
- **ADVANCED** - 45 questions, 9 minutes, for CIOs
- **FRONTIER** - 60 questions, 12 minutes, for AI Centers
- **TEST** - 20 questions, 4 minutes, for QA Teams

**Database Constraint:**
```sql
CHECK (
  [assessment_type]='CORE' OR 
  [assessment_type]='ADVANCED' OR 
  [assessment_type]='FRONTIER' OR 
  [assessment_type]='TEST'
)
```

---

## File Locations Reference

**Database Scripts:**
- `server/add_test_to_constraint.js` - Update constraint
- `server/check_constraints.js` - View current constraint
- `server/create_test_assessment.js` - Question creation template
- `server/check_questions.js` - Verify questions

**Frontend:**
- `src/components/WelcomeScreen.jsx` - Homepage cards
- `src/components/UserDashboard.jsx` - Filter tabs
- `src/components/AssessmentQuestions.jsx` - Question display
- `src/components/AssessmentResults.jsx` - Results page

**Backend:**
- `server/routes/response.js` - Question loading
- `server/routes/assessments.js` - Assessment submission
- `server/models/Assessment.js` - Database operations

---

## Best Practices

1. **Always update the constraint FIRST** before creating questions
2. **Distribute questions evenly** across all 8 pillars for balanced radar charts
3. **Use uppercase** for assessment type values (CORE, not core)
4. **Test end-to-end** from homepage → questions → results → dashboard
5. **Question count guidelines:**
   - Quick: 15-25 questions (~3-5 min)
   - Standard: 25-45 questions (~5-9 min)
   - Comprehensive: 45-60 questions (~9-12 min)
6. **Keep pillar short names consistent:** STRAT, TECH, DATA, SKILL, SEC, GOV, CULT, PERF

---

## Automation Script (Future Enhancement)

For fully automated setup:
```bash
node scripts/add-assessment-type.js --name=CUSTOM --questions=30 --icon=fa-star
```

This could:
1. Update database constraint
2. Generate question templates
3. Create frontend components
4. Run tests
5. Display setup checklist

---

**Last Updated:** January 27, 2026  
**Maintainer:** Development Team  
**Version:** 1.0
