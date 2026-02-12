import { generateAssessmentPDF } from './services/pdfService.js';
import path from 'path';

// Dummy test data
const userData = {
  contact_name: 'John Smith',
  email: 'john.smith@example.com',
  company_name: 'Tech Innovations Ltd',
  job_title: 'Chief Technology Officer'
};

const assessmentData = {
  overall_score: 78.5,
  assessment_type: 'Comprehensive',
  completed_at: new Date(),
  dimension_scores: [
    { pillar_name: 'Strategy & Vision', score: 85.0 },
    { pillar_name: 'Data & Infrastructure', score: 72.5 },
    { pillar_name: 'AI Capabilities', score: 80.0 },
    { pillar_name: 'Governance & Ethics', score: 75.0 },
    { pillar_name: 'Talent & Culture', score: 70.0 },
    { pillar_name: 'Change Management', score: 82.5 },
    { pillar_name: 'Partnerships & Ecosystem', score: 76.0 },
    { pillar_name: 'Measurement & ROI', score: 87.0 }
  ],
  insights: {
    gap_analysis: [
      'Data infrastructure requires modernization to support advanced AI workloads and ensure scalability across the organization.',
      'Talent development programs need enhancement to build internal AI capabilities and reduce dependency on external consultants.',
      'Governance frameworks should be strengthened to address emerging ethical considerations and regulatory requirements in AI deployment.'
    ],
    service_recommendations: [
      'Conduct a comprehensive data architecture review to identify optimization opportunities and create a modernization roadmap.',
      'Implement an AI Center of Excellence to centralize expertise, standardize best practices, and accelerate capability building.',
      'Develop an AI ethics framework aligned with industry standards and establish a governance committee for oversight.',
      'Create a phased training program to upskill existing workforce in AI fundamentals and domain-specific applications.'
    ],
    risk_assessment: [
      'Medium risk: Data quality issues may impact AI model accuracy',
      'Low risk: Current governance structure adequate for short-term needs',
      'High priority: Talent retention critical for sustained AI initiatives'
    ]
  }
};

console.log('📄 Generating PDF assessment report...');

const outputPath = path.join(process.cwd(), 'SAFE-8_Assessment_Report_Test.pdf');

generateAssessmentPDF(userData, assessmentData, outputPath)
  .then((filePath) => {
    console.log('✅ PDF generated successfully!');
    console.log('📁 File location:', filePath);
  })
  .catch((error) => {
    console.error('❌ Error generating PDF:', error);
    process.exit(1);
  });
