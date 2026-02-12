import { sendAssessmentResults } from './services/emailService.js';

// Test data
const testUserData = {
  contact_name: 'John Smith',
  email: 'jared@1212.co.za',
  company_name: 'Acme Corporation'
};

const testAssessmentData = {
  assessment_type: 'CORE',
  overall_score: 72.5,
  completed_at: new Date().toISOString(),
  dimension_scores: [
    { pillar_name: 'Strategy & Vision', pillar_short_name: 'STRATEGY', score: 85, weight: 15 },
    { pillar_name: 'Data Foundation', pillar_short_name: 'DATA', score: 68, weight: 15 },
    { pillar_name: 'Technology Infrastructure', pillar_short_name: 'TECH', score: 75, weight: 12.5 },
    { pillar_name: 'Governance & Ethics', pillar_short_name: 'GOVERNANCE', score: 80, weight: 12.5 },
    { pillar_name: 'Talent & Culture', pillar_short_name: 'TALENT', score: 65, weight: 12.5 },
    { pillar_name: 'Security & Privacy', pillar_short_name: 'SECURITY', score: 70, weight: 12.5 },
    { pillar_name: 'Innovation & R&D', pillar_short_name: 'INNOVATION', score: 60, weight: 10 },
    { pillar_name: 'Change Management', pillar_short_name: 'CHANGE', score: 55, weight: 10 }
  ],
  insights: {
    overall_assessment: 'Good AI maturity with opportunities for strategic enhancement',
    strengths: [
      { area: 'Strategy & Vision', score: 85, description: 'Strong performance in Strategy & Vision' },
      { area: 'Governance & Ethics', score: 80, description: 'Strong performance in Governance & Ethics' }
    ],
    improvement_areas: [
      { area: 'Change Management', score: 55, priority: 'Medium', description: 'Change Management requires focused attention' },
      { area: 'Innovation & R&D', score: 60, priority: 'Medium', description: 'Innovation & R&D requires focused attention' }
    ],
    gap_analysis: [
      'Change Management (55.0%): Change Management requires focused attention',
      'Innovation & R&D (60.0%): Innovation & R&D requires focused attention',
      'Talent & Culture (65.0%): Talent & Culture requires focused attention'
    ],
    service_recommendations: [
      'Focus on building foundational AI capabilities and governance',
      'Prioritize improvements in Change Management - highest impact opportunity (10% of overall score)',
      'Invest in data quality and governance infrastructure',
      'Consider engaging AI readiness experts for detailed transformation planning'
    ],
    weighted_priorities: [
      {
        area: 'Change Management',
        score: 55,
        weight: 10,
        impact_score: 4.5,
        priority: 'Medium',
        description: 'Change Management (10% weight) has 45% improvement potential'
      },
      {
        area: 'Talent & Culture',
        score: 65,
        weight: 12.5,
        impact_score: 4.4,
        priority: 'Medium',
        description: 'Talent & Culture (12.5% weight) has 35% improvement potential'
      }
    ]
  }
};

console.log('📧 Generating sample assessment email...\n');
console.log('This will send an email to:', testUserData.email);
console.log('\nPress Ctrl+C to cancel, or wait 3 seconds to send...\n');

setTimeout(async () => {
  try {
    const result = await sendAssessmentResults(testUserData, testAssessmentData);
    if (result.success) {
      console.log('✅ Sample email sent successfully!');
      console.log('Message ID:', result.messageId);
    } else {
      console.log('❌ Failed to send email:', result.error);
    }
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}, 3000);
