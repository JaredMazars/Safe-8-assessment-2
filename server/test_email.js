import { sendAssessmentResults } from './services/emailService.js';

// Dummy user data
const userData = {
  contact_name: 'Shane Cooper',
  email: 'shane.cooper@forvismazars.com',
  company_name: 'Forvis Mazars'
};

// Dummy assessment data
const assessmentData = {
  overall_score: 78.5,
  assessment_type: 'CORE',
  completed_at: new Date(),
  dimension_scores: [
    { pillar_name: 'Strategy & Governance', pillar_short_name: 'STR', score: 85.0 },
    { pillar_name: 'Data & Analytics', pillar_short_name: 'DATA', score: 72.5 },
    { pillar_name: 'Technology Infrastructure', pillar_short_name: 'TECH', score: 80.0 },
    { pillar_name: 'Talent & Culture', pillar_short_name: 'TAL', score: 75.0 },
    { pillar_name: 'Ethics & Compliance', pillar_short_name: 'ETH', score: 82.5 }
  ],
  insights: {
    score_category: 'AI Adopter',
    gap_analysis: [
      'Data quality and governance processes need strengthening',
      'AI talent acquisition and retention strategies require development',
      'Cross-functional collaboration on AI initiatives could be improved'
    ],
    service_recommendations: [
      'AI Strategy Workshop - Develop a comprehensive AI roadmap aligned with business objectives',
      'Data Governance Assessment - Implement robust data quality and management frameworks',
      'AI Skills Training Program - Upskill teams in machine learning and data science capabilities',
      'Ethics Framework Development - Establish responsible AI guidelines and governance'
    ],
    risk_assessment: [
      'Data privacy compliance gaps identified in AI processing workflows',
      'Limited disaster recovery plans for AI systems',
      'Insufficient AI model monitoring and bias detection mechanisms'
    ],
    completion_time_ms: 342000
  }
};

console.log('📧 Sending test assessment email...');
console.log('To:', userData.email);

sendAssessmentResults(userData, assessmentData)
  .then(result => {
    if (result.success) {
      console.log('✅ Test email sent successfully!');
      console.log('Message ID:', result.messageId);
    } else {
      console.log('❌ Email failed:', result.error);
    }
    process.exit(0);
  })
  .catch(error => {
    console.error('❌ Error:', error);
    process.exit(1);
  });
