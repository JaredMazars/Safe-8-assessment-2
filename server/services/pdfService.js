import PDFDocument from 'pdfkit';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Generate professional PDF assessment report following Forvis Mazars branding guidelines
 */
export const generateAssessmentPDF = (userData, assessmentData, outputPath) => {
  return new Promise((resolve, reject) => {
    try {
      const { contact_name, email, company_name, job_title } = userData;
      const { 
        overall_score, 
        dimension_scores, 
        insights,
        assessment_type,
        completed_at 
      } = assessmentData;

      // Create PDF document with proper margins
      const doc = new PDFDocument({
        size: 'A4',
        margins: {
          top: 50,
          bottom: 50,
          left: 50,
          right: 50
        },
        info: {
          Title: `SAFE-8 Assessment Report - ${contact_name}`,
          Author: 'Forvis Mazars',
          Subject: `${assessment_type} Assessment Results`,
          Keywords: 'AI, Assessment, SAFE-8, Digital Transformation'
        }
      });

      // Create write stream
      const stream = fs.createWriteStream(outputPath);
      doc.pipe(stream);

      // Forvis Mazars colors
      const colors = {
        primaryBlue: '#00539F',
        secondaryRed: '#E31B23',
        accentOrange: '#F7941D',
        darkGray: '#333333',
        mediumGray: '#666666',
        lightGray: '#E5E5E5',
        white: '#FFFFFF'
      };

      const scoreCategory = overall_score >= 80 ? 'AI Leader' : 
                           overall_score >= 60 ? 'AI Adopter' : 
                           overall_score >= 40 ? 'AI Explorer' : 'AI Starter';

      const categoryColor = overall_score >= 80 ? '#00A651' : 
                           overall_score >= 60 ? '#0098DB' : 
                           overall_score >= 40 ? colors.accentOrange : colors.secondaryRed;

      let yPosition = 50;

      // ===== PAGE 1: HEADER & EXECUTIVE SUMMARY =====
      
      // Header with blue bar
      doc.rect(0, 0, doc.page.width, 4).fill(colors.primaryBlue);

      // Forvis Mazars Logo (image)
      yPosition = 30;
      const logoPath = path.join(__dirname, '..', 'assets', 'forvis-mazars-logo.jpg');
      
      try {
        if (fs.existsSync(logoPath)) {
          doc.image(logoPath, 50, yPosition, { 
            width: 180,
            height: 50,
            fit: [180, 50]
          });
          yPosition += 55;
        } else {
          // Fallback to text if logo not found
          doc.fontSize(26)
             .font('Helvetica-Bold')
             .fillColor(colors.primaryBlue)
             .text('Forvis ', 50, yPosition, { continued: true })
             .fillColor(colors.darkGray)
             .text('Mazars');
          yPosition += 35;
        }
      } catch (err) {
        console.error('Error loading logo:', err);
        // Fallback to text
        doc.fontSize(26)
           .font('Helvetica-Bold')
           .fillColor(colors.primaryBlue)
           .text('Forvis ', 50, yPosition, { continued: true })
           .fillColor(colors.darkGray)
           .text('Mazars');
        yPosition += 35;
      }

      doc.fontSize(9)
         .font('Helvetica')
         .fillColor(colors.mediumGray)
         .text('SAFE-8 ASSESSMENT PLATFORM', 50, yPosition);

      // Title section with blue background
      yPosition = 100;
      doc.rect(0, yPosition, doc.page.width, 80).fill(colors.primaryBlue);
      
      doc.fontSize(28)
         .font('Helvetica-Bold')
         .fillColor(colors.white)
         .text('SAFE-8 Assessment Report', 50, yPosition + 20, {
           width: doc.page.width - 100
         });

      doc.fontSize(12)
         .font('Helvetica')
         .fillColor(colors.white)
         .text(`${assessment_type} Assessment`, 50, yPosition + 55);

      // Report metadata
      yPosition = 200;
      doc.fontSize(11)
         .font('Helvetica-Bold')
         .fillColor(colors.darkGray)
         .text('Prepared for:', 50, yPosition);

      doc.fontSize(10)
         .font('Helvetica')
         .fillColor(colors.mediumGray)
         .text(contact_name, 50, yPosition + 18);

      if (job_title) {
        doc.text(job_title, 50, yPosition + 33);
        yPosition += 15;
      }

      if (company_name) {
        doc.font('Helvetica-Bold')
           .fillColor(colors.darkGray)
           .text(company_name, 50, yPosition + 33);
        yPosition += 15;
      }

      yPosition += 50;
      doc.fontSize(9)
         .font('Helvetica')
         .fillColor(colors.mediumGray)
         .text(`Assessment Date: ${new Date(completed_at).toLocaleDateString('en-GB', { 
           day: '2-digit', 
           month: 'long', 
           year: 'numeric' 
         })}`, 50, yPosition);

      // Overall Score Card
      yPosition += 40;
      
      // Draw score box with left border accent
      doc.rect(45, yPosition, 5, 80).fill(categoryColor);
      doc.rect(50, yPosition, doc.page.width - 100, 80)
         .fillAndStroke('#F5F5F5', colors.lightGray);

      doc.fontSize(10)
         .font('Helvetica')
         .fillColor(colors.mediumGray)
         .text('OVERALL PERFORMANCE', 70, yPosition + 20);

      doc.fontSize(18)
         .font('Helvetica-Bold')
         .fillColor(colors.darkGray)
         .text(scoreCategory, 70, yPosition + 38);

      // Score on the right
      doc.fontSize(40)
         .font('Helvetica-Bold')
         .fillColor(categoryColor)
         .text(`${overall_score.toFixed(1)}%`, doc.page.width - 180, yPosition + 20, {
           width: 130,
           align: 'right'
         });

      // Executive Summary
      yPosition += 120;
      doc.fontSize(16)
         .font('Helvetica-Bold')
         .fillColor(colors.primaryBlue)
         .text('Executive Summary', 50, yPosition);

      doc.moveTo(50, yPosition + 22)
         .lineTo(doc.page.width - 50, yPosition + 22)
         .strokeColor(colors.primaryBlue)
         .lineWidth(2)
         .stroke();

      yPosition += 40;
      const summaryText = `This report presents the results of the SAFE-8 ${assessment_type} assessment for ${company_name || 'your organization'}. The assessment evaluates AI maturity across eight critical pillars, providing insights into current capabilities and recommendations for advancement.`;

      doc.fontSize(10)
         .font('Helvetica')
         .fillColor(colors.darkGray)
         .text(summaryText, 50, yPosition, {
           width: doc.page.width - 100,
           align: 'justify',
           lineGap: 4
         });

      // ===== PAGE 2: PILLAR PERFORMANCE BREAKDOWN =====
      doc.addPage();
      yPosition = 50;

      doc.fontSize(20)
         .font('Helvetica-Bold')
         .fillColor(colors.primaryBlue)
         .text('Pillar Performance Breakdown', 50, yPosition);

      doc.moveTo(50, yPosition + 28)
         .lineTo(doc.page.width - 50, yPosition + 28)
         .strokeColor(colors.primaryBlue)
         .lineWidth(2)
         .stroke();

      yPosition += 50;

      // Draw each pillar with professional formatting
      dimension_scores.forEach((pillar, index) => {
        if (yPosition > 700) {
          doc.addPage();
          yPosition = 50;
        }

        // Pillar name
        doc.fontSize(12)
           .font('Helvetica-Bold')
           .fillColor(colors.darkGray)
           .text(pillar.pillar_name, 50, yPosition);

        // Score
        doc.fontSize(14)
           .font('Helvetica-Bold')
           .fillColor(colors.primaryBlue)
           .text(`${pillar.score.toFixed(1)}%`, doc.page.width - 100, yPosition, {
             width: 50,
             align: 'right'
           });

        yPosition += 20;

        // Progress bar background
        const barWidth = doc.page.width - 100;
        const barHeight = 16;
        
        doc.rect(50, yPosition, barWidth, barHeight)
           .fillAndStroke('#F5F5F5', colors.lightGray);

        // Progress bar fill
        const fillWidth = (barWidth * pillar.score) / 100;
        doc.rect(50, yPosition, fillWidth, barHeight)
           .fill(colors.primaryBlue);

        yPosition += 35;

        // Separator line
        if (index < dimension_scores.length - 1) {
          doc.moveTo(50, yPosition)
             .lineTo(doc.page.width - 50, yPosition)
             .strokeColor(colors.lightGray)
             .lineWidth(0.5)
             .stroke();
          yPosition += 20;
        }
      });

      // ===== PAGE 3: GAP ANALYSIS & RECOMMENDATIONS =====
      doc.addPage();
      yPosition = 50;

      // Gap Analysis Section
      doc.fontSize(18)
         .font('Helvetica-Bold')
         .fillColor(colors.secondaryRed)
         .text('Critical Gap Analysis', 50, yPosition);

      doc.moveTo(50, yPosition + 25)
         .lineTo(doc.page.width - 50, yPosition + 25)
         .strokeColor(colors.secondaryRed)
         .lineWidth(2)
         .stroke();

      yPosition += 45;

      // Calculate gaps for each pillar
      const bestPractice = 80;
      const gaps = dimension_scores
        .map(pillar => ({
          name: pillar.pillar_name,
          current: pillar.score,
          gap: bestPractice - pillar.score,
          priority: (bestPractice - pillar.score) >= 40 ? 'Critical' :
                   (bestPractice - pillar.score) >= 20 ? 'High' : 'Moderate'
        }))
        .filter(g => g.gap > 0)
        .sort((a, b) => b.gap - a.gap);

      if (gaps.length > 0) {
        gaps.forEach((gap, index) => {
          if (yPosition > 700) {
            doc.addPage();
            yPosition = 50;
          }

          // Priority color
          const priorityColor = gap.priority === 'Critical' ? colors.secondaryRed :
                               gap.priority === 'High' ? colors.accentOrange : '#F7C948';

          // Priority badge
          doc.rect(50, yPosition, 8, 45)
             .fill(priorityColor);

          // Gap box
          doc.rect(58, yPosition, doc.page.width - 108, 45)
             .fillAndStroke('#FAFAFA', colors.lightGray);

          // Pillar name
          doc.fontSize(11)
             .font('Helvetica-Bold')
             .fillColor(colors.darkGray)
             .text(gap.name, 70, yPosition + 8);

          // Gap details
          doc.fontSize(9)
             .font('Helvetica')
             .fillColor(colors.mediumGray)
             .text(`Current: ${gap.current.toFixed(1)}% | Best Practice: ${bestPractice}% | Gap: ${gap.gap.toFixed(0)} points`, 
                   70, yPosition + 24);

          // Priority label
          doc.fontSize(8)
             .font('Helvetica-Bold')
             .fillColor(priorityColor)
             .text(`${gap.priority} Priority`, doc.page.width - 140, yPosition + 15);

          yPosition += 55;
        });
      } else {
        doc.fontSize(10)
           .font('Helvetica')
           .fillColor(colors.mediumGray)
           .text('No significant gaps identified. You\'re performing at or above best practice levels!', 75, yPosition);
        yPosition += 30;
      }

      // Summary Statistics
      yPosition += 20;
      if (yPosition > 680) {
        doc.addPage();
        yPosition = 50;
      }

      const excellent = dimension_scores.filter(d => d.score >= 80).length;
      const good = dimension_scores.filter(d => d.score >= 60 && d.score < 80).length;
      const focus = dimension_scores.filter(d => d.score < 60).length;

      doc.fontSize(14)
         .font('Helvetica-Bold')
         .fillColor(colors.primaryBlue)
         .text('Performance Summary', 50, yPosition);

      yPosition += 30;

      // Three stat boxes side by side
      const boxWidth = (doc.page.width - 130) / 3;
      const boxStartX = 50;

      // Excellent
      doc.rect(boxStartX, yPosition, boxWidth, 60)
         .fillAndStroke('#E8F5E9', '#4CAF50');
      
      doc.fontSize(24)
         .font('Helvetica-Bold')
         .fillColor('#4CAF50')
         .text(excellent.toString(), boxStartX, yPosition + 12, {
           width: boxWidth,
           align: 'center'
         });

      doc.fontSize(10)
         .font('Helvetica')
         .fillColor(colors.mediumGray)
         .text('Excellent', boxStartX, yPosition + 42, {
           width: boxWidth,
           align: 'center'
         });

      // Good
      doc.rect(boxStartX + boxWidth + 10, yPosition, boxWidth, 60)
         .fillAndStroke('#E3F2FD', '#2196F3');

      doc.fontSize(24)
         .font('Helvetica-Bold')
         .fillColor('#2196F3')
         .text(good.toString(), boxStartX + boxWidth + 10, yPosition + 12, {
           width: boxWidth,
           align: 'center'
         });

      doc.fontSize(10)
         .font('Helvetica')
         .fillColor(colors.mediumGray)
         .text('Good', boxStartX + boxWidth + 10, yPosition + 42, {
           width: boxWidth,
           align: 'center'
         });

      // Focus Areas
      doc.rect(boxStartX + (boxWidth + 10) * 2, yPosition, boxWidth, 60)
         .fillAndStroke('#FFF3E0', '#FF9800');

      doc.fontSize(24)
         .font('Helvetica-Bold')
         .fillColor('#FF9800')
         .text(focus.toString(), boxStartX + (boxWidth + 10) * 2, yPosition + 12, {
           width: boxWidth,
           align: 'center'
         });

      doc.fontSize(10)
         .font('Helvetica')
         .fillColor(colors.mediumGray)
         .text('Focus Areas', boxStartX + (boxWidth + 10) * 2, yPosition + 42, {
           width: boxWidth,
           align: 'center'
         });

      yPosition += 80;

      // ===== PAGE 4: RECOMMENDED SERVICES =====
      doc.addPage();
      yPosition = 50;

      doc.fontSize(18)
         .font('Helvetica-Bold')
         .fillColor(colors.primaryBlue)
         .text('Recommended Services & Solutions', 50, yPosition);

      doc.moveTo(50, yPosition + 25)
         .lineTo(doc.page.width - 50, yPosition + 25)
         .strokeColor(colors.primaryBlue)
         .lineWidth(2)
         .stroke();

      yPosition += 45;

      // Service 1: AI Strategy & Roadmap
      doc.rect(50, yPosition, doc.page.width - 100, 100)
         .fillAndStroke('#F0F7FF', colors.lightGray);

      // Icon circle
      doc.circle(70, yPosition + 20, 12)
         .fill(colors.primaryBlue);

      doc.fontSize(10)
         .font('Helvetica-Bold')
         .fillColor(colors.white)
         .text('💡', 66, yPosition + 14);

      doc.fontSize(12)
         .font('Helvetica-Bold')
         .fillColor(colors.darkGray)
         .text('AI Strategy & Roadmap Development', 95, yPosition + 15);

      // Recommended badge
      doc.rect(95, yPosition + 35, 180, 16)
         .fillAndStroke('#FFF3CD', '#FFC107');

      doc.fontSize(8)
         .font('Helvetica-Bold')
         .fillColor('#856404')
         .text('⭐ Recommended for scores below 60%', 102, yPosition + 40);

      doc.fontSize(9)
         .font('Helvetica')
         .fillColor(colors.mediumGray)
         .text('Develop a comprehensive AI strategy aligned with business objectives and create a prioritized implementation roadmap.', 
               95, yPosition + 60, {
                 width: doc.page.width - 190,
                 lineGap: 2
               });

      yPosition += 115;

      // Service 2: Data Foundation & Governance
      doc.rect(50, yPosition, doc.page.width - 100, 100)
         .fillAndStroke('#F0F7FF', colors.lightGray);

      doc.circle(70, yPosition + 20, 12)
         .fill(colors.primaryBlue);

      doc.fontSize(10)
         .font('Helvetica-Bold')
         .fillColor(colors.white)
         .text('📊', 66, yPosition + 14);

      doc.fontSize(12)
         .font('Helvetica-Bold')
         .fillColor(colors.darkGray)
         .text('Data Foundation & Governance', 95, yPosition + 15);

      doc.rect(95, yPosition + 35, 140, 16)
         .fillAndStroke('#D1F2EB', '#00A67E');

      doc.fontSize(8)
         .font('Helvetica-Bold')
         .fillColor('#004D40')
         .text('✓ Essential for AI success', 102, yPosition + 40);

      doc.fontSize(9)
         .font('Helvetica')
         .fillColor(colors.mediumGray)
         .text('Establish robust data governance frameworks and improve data quality to support AI initiatives.', 
               95, yPosition + 60, {
                 width: doc.page.width - 190,
                 lineGap: 2
               });

      yPosition += 115;

      // Service 3: AI Talent & Capability Building
      doc.rect(50, yPosition, doc.page.width - 100, 100)
         .fillAndStroke('#F0F7FF', colors.lightGray);

      doc.circle(70, yPosition + 20, 12)
         .fill(colors.primaryBlue);

      doc.fontSize(10)
         .font('Helvetica-Bold')
         .fillColor(colors.white)
         .text('👥', 66, yPosition + 14);

      doc.fontSize(12)
         .font('Helvetica-Bold')
         .fillColor(colors.darkGray)
         .text('AI Talent & Capability Building', 95, yPosition + 15);

      doc.rect(95, yPosition + 35, 180, 16)
         .fillAndStroke('#E8F5E9', '#4CAF50');

      doc.fontSize(8)
         .font('Helvetica-Bold')
         .fillColor('#1B5E20')
         .text('✓ Long-term competitive advantage', 102, yPosition + 40);

      doc.fontSize(9)
         .font('Helvetica')
         .fillColor(colors.mediumGray)
         .text('Build internal AI capabilities through training programs and strategic hiring recommendations.', 
               95, yPosition + 60, {
                 width: doc.page.width - 190,
                 lineGap: 2
               });

      yPosition += 130;

      // ===== PAGE 5: NEXT STEPS & INSIGHTS =====
      if (yPosition > 650) {
        doc.addPage();
        yPosition = 50;
      }

      doc.fontSize(16)
         .font('Helvetica-Bold')
         .fillColor(colors.primaryBlue)
         .text('Key Insights & Recommendations', 50, yPosition);

      doc.moveTo(50, yPosition + 22)
         .lineTo(doc.page.width - 50, yPosition + 22)
         .strokeColor(colors.primaryBlue)
         .lineWidth(2)
         .stroke();

      yPosition += 45;

      if (insights.service_recommendations && insights.service_recommendations.length > 0) {
        insights.service_recommendations.forEach((rec, index) => {
          if (yPosition > 720) {
            doc.addPage();
            yPosition = 50;
          }

          // Numbered bullet
          doc.fontSize(10)
             .font('Helvetica-Bold')
             .fillColor(colors.primaryBlue)
             .text(`${index + 1}.`, 50, yPosition);

          doc.font('Helvetica')
             .fillColor(colors.darkGray)
             .text(rec, 75, yPosition, {
               width: doc.page.width - 125,
               align: 'justify',
               lineGap: 3
             });

          yPosition += doc.heightOfString(rec, {
            width: doc.page.width - 125,
            lineGap: 3
          }) + 12;
        });
      } else {
        doc.fontSize(10)
           .font('Helvetica')
           .fillColor(colors.mediumGray)
           .text('Complete your assessment for personalized recommendations.', 75, yPosition);
      }

      // Expert Guidance Box
      yPosition += 30;
      if (yPosition > 650) {
        doc.addPage();
        yPosition = 50;
      }

      doc.rect(50, yPosition, doc.page.width - 100, 100)
         .fillAndStroke('#F5F5F5', colors.lightGray);

      doc.fontSize(14)
         .font('Helvetica-Bold')
         .fillColor(colors.primaryBlue)
         .text('Need Expert Guidance?', 70, yPosition + 20);

      const guidanceText = 'Our specialists at Forvis Mazars can help you translate these insights into actionable strategies. We offer comprehensive AI transformation services tailored to your organization\'s unique needs.';

      doc.fontSize(9)
         .font('Helvetica')
         .fillColor(colors.darkGray)
         .text(guidanceText, 70, yPosition + 42, {
           width: doc.page.width - 140,
           align: 'left',
           lineGap: 2
         });

      doc.fontSize(9)
         .font('Helvetica-Bold')
         .fillColor(colors.primaryBlue)
         .text('Contact: ai.advisory@forvismazars.com', 70, yPosition + 75);

      // Finalize PDF
      doc.end();

      stream.on('finish', () => {
        resolve(outputPath);
      });

      stream.on('error', (error) => {
        reject(error);
      });

    } catch (error) {
      reject(error);
    }
  });
};

/**
 * Generate PDF and return as buffer (for email attachments)
 */
export const generateAssessmentPDFBuffer = (userData, assessmentData) => {
  return new Promise((resolve, reject) => {
    try {
      const { contact_name, email, company_name, job_title } = userData;
      const { 
        overall_score, 
        dimension_scores, 
        insights,
        assessment_type,
        completed_at 
      } = assessmentData;

      // Debug logging
      console.log('📄 PDF Generation Debug:', {
        overall_score,
        dimension_scores_type: typeof dimension_scores,
        dimension_scores_length: Array.isArray(dimension_scores) ? dimension_scores.length : 'NOT ARRAY',
        dimension_scores_sample: Array.isArray(dimension_scores) ? dimension_scores.slice(0, 2) : dimension_scores,
        insights_keys: insights ? Object.keys(insights) : 'NO INSIGHTS'
      });

      const chunks = [];
      const doc = new PDFDocument({
        size: 'A4',
        margins: {
          top: 50,
          bottom: 50,
          left: 50,
          right: 50
        },
        info: {
          Title: `SAFE-8 Assessment Report - ${contact_name}`,
          Author: 'Forvis Mazars',
          Subject: `${assessment_type} Assessment Results`,
          Keywords: 'AI, Assessment, SAFE-8, Digital Transformation'
        }
      });

      doc.on('data', (chunk) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', (error) => reject(error));

      // Forvis Mazars colors
      const colors = {
        primaryBlue: '#00539F',
        secondaryRed: '#E31B23',
        accentOrange: '#F7941D',
        darkGray: '#333333',
        mediumGray: '#666666',
        lightGray: '#E5E5E5',
        white: '#FFFFFF'
      };

      const scoreCategory = overall_score >= 80 ? 'AI Leader' : 
                           overall_score >= 60 ? 'AI Adopter' : 
                           overall_score >= 40 ? 'AI Explorer' : 'AI Starter';

      const categoryColor = overall_score >= 80 ? '#00A651' : 
                           overall_score >= 60 ? '#0098DB' : 
                           overall_score >= 40 ? colors.accentOrange : colors.secondaryRed;

      let yPosition = 50;

      // ===== PAGE 1: HEADER & EXECUTIVE SUMMARY =====
      
      doc.rect(0, 0, doc.page.width, 4).fill(colors.primaryBlue);

      // Forvis Mazars Logo (image)
      yPosition = 30;
      const logoPath = path.join(__dirname, '..', 'assets', 'forvis-mazars-logo.jpg');
      
      try {
        if (fs.existsSync(logoPath)) {
          doc.image(logoPath, 50, yPosition, { 
            width: 180,
            height: 50,
            fit: [180, 50]
          });
          yPosition += 55;
        } else {
          // Fallback to text if logo not found
          doc.fontSize(26)
             .font('Helvetica-Bold')
             .fillColor(colors.primaryBlue)
             .text('Forvis ', 50, yPosition, { continued: true })
             .fillColor(colors.darkGray)
             .text('Mazars');
          yPosition += 35;
        }
      } catch (err) {
        console.error('Error loading logo:', err);
        // Fallback to text
        doc.fontSize(26)
           .font('Helvetica-Bold')
           .fillColor(colors.primaryBlue)
           .text('Forvis ', 50, yPosition, { continued: true })
           .fillColor(colors.darkGray)
           .text('Mazars');
        yPosition += 35;
      }

      doc.fontSize(9)
         .font('Helvetica')
         .fillColor(colors.mediumGray)
         .text('SAFE-8 ASSESSMENT PLATFORM', 50, yPosition);

      yPosition = 100;
      doc.rect(0, yPosition, doc.page.width, 80).fill(colors.primaryBlue);
      
      doc.fontSize(28)
         .font('Helvetica-Bold')
         .fillColor(colors.white)
         .text('SAFE-8 Assessment Report', 50, yPosition + 20, {
           width: doc.page.width - 100
         });

      doc.fontSize(12)
         .font('Helvetica')
         .fillColor(colors.white)
         .text(`${assessment_type} Assessment`, 50, yPosition + 55);

      yPosition = 200;
      doc.fontSize(11)
         .font('Helvetica-Bold')
         .fillColor(colors.darkGray)
         .text('Prepared for:', 50, yPosition);

      doc.fontSize(10)
         .font('Helvetica')
         .fillColor(colors.mediumGray)
         .text(contact_name, 50, yPosition + 18);

      if (job_title) {
        doc.text(job_title, 50, yPosition + 33);
        yPosition += 15;
      }

      if (company_name) {
        doc.font('Helvetica-Bold')
           .fillColor(colors.darkGray)
           .text(company_name, 50, yPosition + 33);
        yPosition += 15;
      }

      yPosition += 50;
      doc.fontSize(9)
         .font('Helvetica')
         .fillColor(colors.mediumGray)
         .text(`Assessment Date: ${new Date(completed_at).toLocaleDateString('en-GB', { 
           day: '2-digit', 
           month: 'long', 
           year: 'numeric' 
         })}`, 50, yPosition);

      yPosition += 40;
      
      doc.rect(45, yPosition, 5, 80).fill(categoryColor);
      doc.rect(50, yPosition, doc.page.width - 100, 80)
         .fillAndStroke('#F5F5F5', colors.lightGray);

      doc.fontSize(10)
         .font('Helvetica')
         .fillColor(colors.mediumGray)
         .text('OVERALL PERFORMANCE', 70, yPosition + 20);

      doc.fontSize(18)
         .font('Helvetica-Bold')
         .fillColor(colors.darkGray)
         .text(scoreCategory, 70, yPosition + 38);

      doc.fontSize(40)
         .font('Helvetica-Bold')
         .fillColor(categoryColor)
         .text(`${overall_score.toFixed(1)}%`, doc.page.width - 180, yPosition + 20, {
           width: 130,
           align: 'right'
         });

      yPosition += 120;
      doc.fontSize(16)
         .font('Helvetica-Bold')
         .fillColor(colors.primaryBlue)
         .text('Executive Summary', 50, yPosition);

      doc.moveTo(50, yPosition + 22)
         .lineTo(doc.page.width - 50, yPosition + 22)
         .strokeColor(colors.primaryBlue)
         .lineWidth(2)
         .stroke();

      yPosition += 40;
      const summaryText = `This report presents the results of the SAFE-8 ${assessment_type} assessment for ${company_name || 'your organization'}. The assessment evaluates AI maturity across eight critical pillars, providing insights into current capabilities and recommendations for advancement.`;

      doc.fontSize(10)
         .font('Helvetica')
         .fillColor(colors.darkGray)
         .text(summaryText, 50, yPosition, {
           width: doc.page.width - 100,
           align: 'justify',
           lineGap: 4
         });

      // ===== PAGE 2: PILLAR PERFORMANCE =====
      doc.addPage();
      yPosition = 50;

      doc.fontSize(20)
         .font('Helvetica-Bold')
         .fillColor(colors.primaryBlue)
         .text('Pillar Performance Breakdown', 50, yPosition);

      doc.moveTo(50, yPosition + 28)
         .lineTo(doc.page.width - 50, yPosition + 28)
         .strokeColor(colors.primaryBlue)
         .lineWidth(2)
         .stroke();

      yPosition += 50;

      dimension_scores.forEach((pillar, index) => {
        if (yPosition > 700) {
          doc.addPage();
          yPosition = 50;
        }

        doc.fontSize(12)
           .font('Helvetica-Bold')
           .fillColor(colors.darkGray)
           .text(pillar.pillar_name, 50, yPosition);

        doc.fontSize(14)
           .font('Helvetica-Bold')
           .fillColor(colors.primaryBlue)
           .text(`${pillar.score.toFixed(1)}%`, doc.page.width - 100, yPosition, {
             width: 50,
             align: 'right'
           });

        yPosition += 20;

        const barWidth = doc.page.width - 100;
        const barHeight = 16;
        
        doc.rect(50, yPosition, barWidth, barHeight)
           .fillAndStroke('#F5F5F5', colors.lightGray);

        const fillWidth = (barWidth * pillar.score) / 100;
        doc.rect(50, yPosition, fillWidth, barHeight)
           .fill(colors.primaryBlue);

        yPosition += 35;

        if (index < dimension_scores.length - 1) {
          doc.moveTo(50, yPosition)
             .lineTo(doc.page.width - 50, yPosition)
             .strokeColor(colors.lightGray)
             .lineWidth(0.5)
             .stroke();
          yPosition += 20;
        }
      });

      // ===== PAGE 3: GAP ANALYSIS & RECOMMENDATIONS =====
      doc.addPage();
      yPosition = 50;

      // Gap Analysis Section
      doc.fontSize(18)
         .font('Helvetica-Bold')
         .fillColor(colors.secondaryRed)
         .text('Critical Gap Analysis', 50, yPosition);

      doc.moveTo(50, yPosition + 25)
         .lineTo(doc.page.width - 50, yPosition + 25)
         .strokeColor(colors.secondaryRed)
         .lineWidth(2)
         .stroke();

      yPosition += 45;

      // Calculate gaps for each pillar
      const bestPractice = 80;
      const gaps = dimension_scores
        .map(pillar => ({
          name: pillar.pillar_name,
          current: pillar.score,
          gap: bestPractice - pillar.score,
          priority: (bestPractice - pillar.score) >= 40 ? 'Critical' :
                   (bestPractice - pillar.score) >= 20 ? 'High' : 'Moderate'
        }))
        .filter(g => g.gap > 0)
        .sort((a, b) => b.gap - a.gap);

      if (gaps.length > 0) {
        gaps.forEach((gap, index) => {
          if (yPosition > 700) {
            doc.addPage();
            yPosition = 50;
          }

          // Priority color
          const priorityColor = gap.priority === 'Critical' ? colors.secondaryRed :
                               gap.priority === 'High' ? colors.accentOrange : '#F7C948';

          // Priority badge
          doc.rect(50, yPosition, 8, 45)
             .fill(priorityColor);

          // Gap box
          doc.rect(58, yPosition, doc.page.width - 108, 45)
             .fillAndStroke('#FAFAFA', colors.lightGray);

          // Pillar name
          doc.fontSize(11)
             .font('Helvetica-Bold')
             .fillColor(colors.darkGray)
             .text(gap.name, 70, yPosition + 8);

          // Gap details
          doc.fontSize(9)
             .font('Helvetica')
             .fillColor(colors.mediumGray)
             .text(`Current: ${gap.current.toFixed(1)}% | Best Practice: ${bestPractice}% | Gap: ${gap.gap.toFixed(0)} points`, 
                   70, yPosition + 24);

          // Priority label
          doc.fontSize(8)
             .font('Helvetica-Bold')
             .fillColor(priorityColor)
             .text(`${gap.priority} Priority`, doc.page.width - 140, yPosition + 15);

          yPosition += 55;
        });
      } else {
        doc.fontSize(10)
           .font('Helvetica')
           .fillColor(colors.mediumGray)
           .text('No significant gaps identified. You\'re performing at or above best practice levels!', 75, yPosition);
        yPosition += 30;
      }

      // Summary Statistics
      yPosition += 20;
      if (yPosition > 680) {
        doc.addPage();
        yPosition = 50;
      }

      const excellent = dimension_scores.filter(d => d.score >= 80).length;
      const good = dimension_scores.filter(d => d.score >= 60 && d.score < 80).length;
      const focus = dimension_scores.filter(d => d.score < 60).length;

      doc.fontSize(14)
         .font('Helvetica-Bold')
         .fillColor(colors.primaryBlue)
         .text('Performance Summary', 50, yPosition);

      yPosition += 30;

      // Three stat boxes side by side
      const boxWidth = (doc.page.width - 130) / 3;
      const boxStartX = 50;

      // Excellent
      doc.rect(boxStartX, yPosition, boxWidth, 60)
         .fillAndStroke('#E8F5E9', '#4CAF50');
      
      doc.fontSize(24)
         .font('Helvetica-Bold')
         .fillColor('#4CAF50')
         .text(excellent.toString(), boxStartX, yPosition + 12, {
           width: boxWidth,
           align: 'center'
         });

      doc.fontSize(10)
         .font('Helvetica')
         .fillColor(colors.mediumGray)
         .text('Excellent', boxStartX, yPosition + 42, {
           width: boxWidth,
           align: 'center'
         });

      // Good
      doc.rect(boxStartX + boxWidth + 10, yPosition, boxWidth, 60)
         .fillAndStroke('#E3F2FD', '#2196F3');

      doc.fontSize(24)
         .font('Helvetica-Bold')
         .fillColor('#2196F3')
         .text(good.toString(), boxStartX + boxWidth + 10, yPosition + 12, {
           width: boxWidth,
           align: 'center'
         });

      doc.fontSize(10)
         .font('Helvetica')
         .fillColor(colors.mediumGray)
         .text('Good', boxStartX + boxWidth + 10, yPosition + 42, {
           width: boxWidth,
           align: 'center'
         });

      // Focus Areas
      doc.rect(boxStartX + (boxWidth + 10) * 2, yPosition, boxWidth, 60)
         .fillAndStroke('#FFF3E0', '#FF9800');

      doc.fontSize(24)
         .font('Helvetica-Bold')
         .fillColor('#FF9800')
         .text(focus.toString(), boxStartX + (boxWidth + 10) * 2, yPosition + 12, {
           width: boxWidth,
           align: 'center'
         });

      doc.fontSize(10)
         .font('Helvetica')
         .fillColor(colors.mediumGray)
         .text('Focus Areas', boxStartX + (boxWidth + 10) * 2, yPosition + 42, {
           width: boxWidth,
           align: 'center'
         });

      yPosition += 80;

      // ===== PAGE 4: RECOMMENDED SERVICES =====
      doc.addPage();
      yPosition = 50;

      doc.fontSize(18)
         .font('Helvetica-Bold')
         .fillColor(colors.primaryBlue)
         .text('Recommended Services & Solutions', 50, yPosition);

      doc.moveTo(50, yPosition + 25)
         .lineTo(doc.page.width - 50, yPosition + 25)
         .strokeColor(colors.primaryBlue)
         .lineWidth(2)
         .stroke();

      yPosition += 45;

      // Service 1: AI Strategy & Roadmap
      doc.rect(50, yPosition, doc.page.width - 100, 100)
         .fillAndStroke('#F0F7FF', colors.lightGray);

      // Icon circle
      doc.circle(70, yPosition + 20, 12)
         .fill(colors.primaryBlue);

      doc.fontSize(10)
         .font('Helvetica-Bold')
         .fillColor(colors.white)
         .text('S', 66, yPosition + 14);

      doc.fontSize(12)
         .font('Helvetica-Bold')
         .fillColor(colors.darkGray)
         .text('AI Strategy & Roadmap Development', 95, yPosition + 15);

      // Recommended badge
      doc.rect(95, yPosition + 35, 180, 16)
         .fillAndStroke('#FFF3CD', '#FFC107');

      doc.fontSize(8)
         .font('Helvetica-Bold')
         .fillColor('#856404')
         .text('★ Recommended for scores below 60%', 102, yPosition + 40);

      doc.fontSize(9)
         .font('Helvetica')
         .fillColor(colors.mediumGray)
         .text('Develop a comprehensive AI strategy aligned with business objectives and create a prioritized implementation roadmap.', 
               95, yPosition + 60, {
                 width: doc.page.width - 190,
                 lineGap: 2
               });

      yPosition += 115;

      // Service 2: Data Foundation & Governance
      doc.rect(50, yPosition, doc.page.width - 100, 100)
         .fillAndStroke('#F0F7FF', colors.lightGray);

      doc.circle(70, yPosition + 20, 12)
         .fill(colors.primaryBlue);

      doc.fontSize(10)
         .font('Helvetica-Bold')
         .fillColor(colors.white)
         .text('D', 66, yPosition + 14);

      doc.fontSize(12)
         .font('Helvetica-Bold')
         .fillColor(colors.darkGray)
         .text('Data Foundation & Governance', 95, yPosition + 15);

      doc.rect(95, yPosition + 35, 140, 16)
         .fillAndStroke('#D1F2EB', '#00A67E');

      doc.fontSize(8)
         .font('Helvetica-Bold')
         .fillColor('#004D40')
         .text('✓ Essential for AI success', 102, yPosition + 40);

      doc.fontSize(9)
         .font('Helvetica')
         .fillColor(colors.mediumGray)
         .text('Establish robust data governance frameworks and improve data quality to support AI initiatives.', 
               95, yPosition + 60, {
                 width: doc.page.width - 190,
                 lineGap: 2
               });

      yPosition += 115;

      // Service 3: AI Talent & Capability Building
      doc.rect(50, yPosition, doc.page.width - 100, 100)
         .fillAndStroke('#F0F7FF', colors.lightGray);

      doc.circle(70, yPosition + 20, 12)
         .fill(colors.primaryBlue);

      doc.fontSize(10)
         .font('Helvetica-Bold')
         .fillColor(colors.white)
         .text('T', 66, yPosition + 14);

      doc.fontSize(12)
         .font('Helvetica-Bold')
         .fillColor(colors.darkGray)
         .text('AI Talent & Capability Building', 95, yPosition + 15);

      doc.rect(95, yPosition + 35, 180, 16)
         .fillAndStroke('#E8F5E9', '#4CAF50');

      doc.fontSize(8)
         .font('Helvetica-Bold')
         .fillColor('#1B5E20')
         .text('✓ Long-term competitive advantage', 102, yPosition + 40);

      doc.fontSize(9)
         .font('Helvetica')
         .fillColor(colors.mediumGray)
         .text('Build internal AI capabilities through training programs and strategic hiring recommendations.', 
               95, yPosition + 60, {
                 width: doc.page.width - 190,
                 lineGap: 2
               });

      yPosition += 130;

      yPosition += 30;
      if (yPosition > 650) {
        doc.addPage();
        yPosition = 50;
      }

      doc.rect(50, yPosition, doc.page.width - 100, 100)
         .fillAndStroke('#F5F5F5', colors.lightGray);

      doc.fontSize(14)
         .font('Helvetica-Bold')
         .fillColor(colors.primaryBlue)
         .text('Need Expert Guidance?', 70, yPosition + 20);

      const guidanceText = 'Our specialists at Forvis Mazars can help you translate these insights into actionable strategies. We offer comprehensive AI transformation services tailored to your organization\'s unique needs.';

      doc.fontSize(9)
         .font('Helvetica')
         .fillColor(colors.darkGray)
         .text(guidanceText, 70, yPosition + 42, {
           width: doc.page.width - 140,
           align: 'left',
           lineGap: 2
         });

      doc.fontSize(9)
         .font('Helvetica-Bold')
         .fillColor(colors.primaryBlue)
         .text('Contact: ai.advisory@forvismazars.com', 70, yPosition + 75);

      // Finalize PDF first
      doc.end();

    } catch (error) {
      reject(error);
    }
  });
};
