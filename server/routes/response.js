// routes/responseRouter.js
import express from 'express';
import Response from '../models/Response.js';
import Lead from '../models/Lead.js';
import database from '../config/database.js';

const responseRouter = express.Router();

// GET assessment type configurations for home screen (PUBLIC)
responseRouter.get('/assessment-types-config', async (req, res) => {
  try {
    // Default configurations for built-in types
    const defaultConfigs = {
      'CORE': {
        type: 'core',
        title: 'Core Assessment',
        description: 'Essential AI readiness evaluation for leadership teams',
        duration: '25 questions • ~5 minutes',
        icon: 'fas fa-rocket',
        features: ['AI strategy alignment', 'Governance essentials', 'Basic readiness factors'],
        audience: 'Executives & Leaders',
        audienceColor: 'green'
      },
      'ADVANCED': {
        type: 'advanced',
        title: 'Advanced Assessment',
        description: 'Deep dive into technical capabilities and infrastructure',
        duration: '45 questions • ~9 minutes',
        icon: 'fas fa-cogs',
        features: ['Technical infrastructure', 'Data pipeline maturity', 'Advanced capabilities'],
        audience: 'CIOs & Technical Leaders',
        audienceColor: 'blue'
      },
      'FRONTIER': {
        type: 'frontier',
        title: 'Frontier Assessment',
        description: 'Cutting-edge AI capabilities and innovation readiness',
        duration: '60 questions • ~12 minutes',
        icon: 'fas fa-brain',
        features: ['Next-gen capabilities', 'Multi-agent orchestration', 'Cutting-edge readiness'],
        audience: 'AI Centers of Excellence',
        audienceColor: 'purple'
      },
      'TEST': {
        type: 'test',
        title: 'Test Assessment',
        description: 'Quality assurance and testing maturity evaluation',
        duration: '20 questions • ~4 minutes',
        icon: 'fas fa-flask',
        features: ['QA automation maturity', 'Testing infrastructure', 'Quality metrics tracking'],
        audience: 'QA & Testing Teams',
        audienceColor: 'orange'
      }
    };

    // Check if config table exists first
    const tableCheckSql = `
      SELECT COUNT(*) as count
      FROM INFORMATION_SCHEMA.TABLES 
      WHERE TABLE_NAME = 'assessment_types_config'
    `;
    const tableCheck = await database.query(tableCheckSql);
    const tableExists = (tableCheck?.recordset || tableCheck)[0]?.count > 0;

    let activeTypesFromConfig = [];
    let configMap = {};

    if (tableExists) {
      // Get ONLY active types from config (this is the source of truth for enabled/disabled)
      const configSql = `
        SELECT 
          assessment_type,
          title,
          description,
          duration,
          icon,
          features,
          audience,
          audience_color,
          display_order
        FROM assessment_types_config
        WHERE is_active = 1
        ORDER BY display_order, assessment_type;
      `;
      const configResult = await database.query(configSql);
      const configs = configResult?.recordset || configResult;
      
      // Build a map of configs by assessment type
      if (Array.isArray(configs)) {
        configs.forEach(c => {
          activeTypesFromConfig.push(c.assessment_type);
          configMap[c.assessment_type] = {
            type: c.assessment_type.toLowerCase(),
            title: c.title,
            description: c.description,
            duration: c.duration,
            icon: c.icon,
            features: c.features ? JSON.parse(c.features) : [],
            audience: c.audience,
            audienceColor: c.audience_color
          };
        });
      }
    } else {
      // If config table doesn't exist, fall back to questions table
      const questionsSql = `
        SELECT DISTINCT assessment_type
        FROM assessment_questions
        WHERE is_active = 1
        ORDER BY assessment_type;
      `;
      const questionsResult = await database.query(questionsSql);
      const allTypes = Array.isArray(questionsResult) ? questionsResult : questionsResult?.recordset || [];
      activeTypesFromConfig = allTypes.map(t => t.assessment_type);
    }

    // Build final configs array - ONLY for active types from config
    const finalConfigs = activeTypesFromConfig.map(type => {
      // Priority: 1. Database config, 2. Hardcoded default, 3. Generic fallback
      return configMap[type] || defaultConfigs[type] || {
        type: type.toLowerCase(),
        title: `${type} Assessment`,
        description: '',
        duration: '~10 minutes',
        icon: 'fas fa-clipboard-check',
        features: ['Comprehensive evaluation'],
        audience: 'All Users',
        audienceColor: 'blue'
      };
    });
    
    res.json({
      success: true,
      configs: finalConfigs
    });
  } catch (error) {
    console.error('❌ Error getting assessment type configs:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to fetch assessment type configurations',
      configs: []
    });
  }
});

// GET all assessment questions
responseRouter.get('/questions/:type', async (req, res) => {
    try {
        const { type } = req.params;
        const allQuestions = await Response.getAll();

        console.log('Questions from DB:', allQuestions); // ✅ Confirm it's an array

        if (!Array.isArray(allQuestions)) {
            console.error('Expected an array but got:', typeof allQuestions);
            return res.status(500).json({ message: 'Internal error: questions not loaded properly' });
        }

        const filteredQuestions = allQuestions.filter(q =>
            q.assessment_type?.toLowerCase() === type.toLowerCase()
        );

        res.json({ questions: filteredQuestions });
    } catch (error) {
        console.error('Error fetching questions:', error.message);
        res.status(500).json({ message: 'Failed to fetch questions' });
    }
});

// GET all responses for a specific user
responseRouter.get('/responses/:leadUserId', async (req, res) => {
  try {
    const leadUserId = parseInt(req.params.leadUserId);
    const responses = await Response.getByUser(leadUserId);
    res.json({ success: true, data: responses });
  } catch (error) {
    console.error('Error fetching responses:', error.message);
    res.status(500).json({ success: false, message: 'Failed to fetch responses' });
  }
});

// POST route to create a new lead
responseRouter.post('/lead', async (req, res) => {
  try {
    const leadData = req.body;
    console.log('📝 Creating lead with data:', leadData);
    
    // Use updateOrCreate to handle duplicate emails
    const result = await Lead.updateOrCreate(leadData);
    console.log('Lead result:', result);
    
    if (result.success) {
      res.status(result.isNew ? 201 : 200).json({
        success: true,
        message: result.isNew ? 'Lead created successfully' : 'Lead updated successfully',
        leadId: result.leadId,
        isNew: result.isNew
      });
    } else {
      res.status(500).json({
        success: false,
        message: 'Failed to process lead'
      });
    }
  } catch (error) {
    console.error(`❌ Error processing lead: ${error.message}`);
    res.status(500).json({
      success: false,
      message: 'Failed to process lead'
    });
  }
});

export default responseRouter;